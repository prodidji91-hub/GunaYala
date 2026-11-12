import { createClient } from '@supabase/supabase-js';
import { PagueloFacilGatewayAdapter } from './paymentGateway.js';
import { reconcilePaymentTransaction } from './paymentReconciliation.js';

interface NetlifyEvent {
  httpMethod: string;
  body: string | null;
  headers: Record<string, string | undefined>;
}

export function logWebhookDiagnostic(step: number, stepName: string, data: Record<string, any>) {
  const isEnabled = process.env.ENABLE_WEBHOOK_DIAGNOSTIC_LOGS === 'true' || process.env.PAGUELOFACIL_ENV === 'sandbox';
  if (!isEnabled) return;

  const sanitized: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (/cclw|token|auth|pass|card|email|name|phone|key|secret/i.test(k)) {
      sanitized[k] = '[REDACTED]';
    } else {
      sanitized[k] = v;
    }
  }
  console.log(`[WebhookDiagnostic] [Step ${step}: ${stepName}]`, JSON.stringify(sanitized));
}

/**
 * Validates gateway urlString as a trusted merchant return URL and extracts the single authoritative bookingReference.
 * Enforces exact HTTPS protocol, trusted host, checkout pathname, and rejects duplicate/conflicting identifiers.
 */
export function extractVerifiedBookingReferenceFromUrl(
  rawUrl: string,
  expectedReturnUrlBase: string = process.env.PAGUELOFACIL_RETURN_URL || 'https://gunayalapanama.com/checkout/complete'
): { valid: boolean; bookingReference?: string; error?: string } {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return { valid: false, error: 'Missing or empty urlString in gateway record.' };
  }

  try {
    const parsed = new URL(rawUrl);
    const expectedBase = new URL(expectedReturnUrlBase);

    // 1. Require exact trusted HTTPS protocol
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Insecure protocol in urlString. HTTPS required.' };
    }
    if (parsed.port && parsed.port !== '443') {
      return { valid: false, error: 'Custom port detected in urlString.' };
    }
    if (parsed.username || parsed.password) {
      return { valid: false, error: 'Embedded credentials detected in urlString.' };
    }

    // 2. Require exact trusted origin
    const host = parsed.hostname.toLowerCase();
    const expectedHost = expectedBase.hostname.toLowerCase();
    const isAllowedHost = host === expectedHost || host === 'gunayalapanama.com' || host.endsWith('.gunayalapanama.com') || host === 'localhost' || host === '127.0.0.1';
    if (!isAllowedHost) {
      return { valid: false, error: `Untrusted host "${parsed.hostname}" in urlString.` };
    }

    // 3. Require expected pathname used by checkout
    const path = parsed.pathname.toLowerCase();
    const expectedPath = expectedBase.pathname.toLowerCase();
    const isAllowedPath = path === expectedPath || path.startsWith('/checkout/complete');
    if (!isAllowedPath) {
      return { valid: false, error: `Untrusted pathname "${parsed.pathname}" in urlString. Expected "${expectedBase.pathname}".` };
    }

    // 4. Reject fragments with identifiers
    if (parsed.hash && (parsed.hash.includes('booking') || parsed.hash.includes('ref') || parsed.hash.includes('parm'))) {
      return { valid: false, error: 'Fragment with identifier detected in urlString.' };
    }

    // 5. Require exactly one bookingReference query parameter
    const searchParams = parsed.searchParams;
    const bookingRefVals = searchParams.getAll('bookingReference');
    if (bookingRefVals.length > 1) {
      return { valid: false, error: 'Duplicate bookingReference query parameters detected in urlString.' };
    }

    let candidateRef = bookingRefVals.length === 1 ? bookingRefVals[0].trim() : '';

    if (!candidateRef) {
      const parm1Vals = searchParams.getAll('PARM_1');
      const bookingRefSnakeVals = searchParams.getAll('booking_reference');
      if (parm1Vals.length > 1 || bookingRefSnakeVals.length > 1) {
        return { valid: false, error: 'Duplicate reference query parameters detected in urlString.' };
      }
      candidateRef = (parm1Vals[0] || bookingRefSnakeVals[0] || '').trim();
    }

    if (!candidateRef) {
      return { valid: false, error: 'No bookingReference query parameter found in urlString.' };
    }

    // 6. Reject conflicting reference parameters
    const otherParams = ['PARM_1', 'booking_reference', 'ref', 'parm1'];
    for (const p of otherParams) {
      const vals = searchParams.getAll(p);
      for (const v of vals) {
        if (v && v.trim() !== candidateRef) {
          return { valid: false, error: `Conflicting reference parameter "${p}" in urlString.` };
        }
      }
    }

    return { valid: true, bookingReference: candidateRef };
  } catch (err: any) {
    return { valid: false, error: `Malformed urlString: ${err.message}` };
  }
}

export const handler = async (
  event: NetlifyEvent,
  context?: any,
  testOptions?: {
    supabaseClient?: any;
    env?: Record<string, string | undefined>;
    fetchFn?: typeof fetch;
  }
) => {
  const env = testOptions?.env || process.env;
  const fetchFn = testOptions?.fetchFn || global.fetch;

  // 1. CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-CCLW, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  // 1. Diagnostic: Request Received & HTTP Method
  logWebhookDiagnostic(1, 'Request Received', { method: event.httpMethod });

  if (event.httpMethod !== 'POST') {
    logWebhookDiagnostic(10, 'Webhook Response', { statusCode: 405, success: false, error: 'Method Not Allowed' });
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Method Not Allowed. Webhooks require POST.' }),
    };
  }

  // 2. Parse Payload
  let payload: any;
  let parsedFormat = 'unknown';
  try {
    if (!event.body) {
      throw new Error('Empty payload');
    }
    if (typeof event.body === 'string') {
      try {
        payload = JSON.parse(event.body);
        parsedFormat = 'json';
      } catch {
        const params = new URLSearchParams(event.body);
        payload = {};
        params.forEach((value, key) => {
          payload[key] = value;
        });
        parsedFormat = 'form-urlencoded';
      }
    } else {
      payload = event.body;
      parsedFormat = 'object';
    }
  } catch (err: any) {
    logWebhookDiagnostic(10, 'Webhook Response', { statusCode: 400, success: false, error: err.message });
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: `Invalid webhook payload: ${err.message}` }),
    };
  }

  logWebhookDiagnostic(2, 'Payload Parsed', { format: parsedFormat });

  // 3. Webhook Signature & Status Parsing via Gateway Adapter
  const gateway = new PagueloFacilGatewayAdapter();
  const parsed = gateway.parseWebhook(payload, event.headers);

  // Requirement 1: Treat callback PARM_1, Oper, status, and amount as UNTRUSTED
  const callbackParm1 = String(parsed.bookingReference || payload?.PARM_1 || '').trim();
  const oper = String(parsed.gatewayOperationId || payload?.Oper || payload?.codOper || '').trim();

  logWebhookDiagnostic(3, 'Identifiers Present', {
    hasPARM1: Boolean(callbackParm1),
    parm1Length: callbackParm1.length,
    hasPARM2: Boolean(parsed.idempotencyKey),
    hasOper: Boolean(oper),
    hasLinkCode: Boolean(parsed.gatewayLinkCode),
  });

  // Verify CCLW if present against server configuration
  if (!parsed.isValid) {
    logWebhookDiagnostic(10, 'Webhook Response', { statusCode: 400, success: false, error: parsed.error || 'Invalid webhook payload' });
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: parsed.error || 'Invalid or unauthorized webhook payload.',
      }),
    };
  }

  // Requirement 2: Require a well-formed gateway operation code for this recovery path
  if (!oper || !/^[A-Za-z0-9_-]+$/.test(oper)) {
    logWebhookDiagnostic(10, 'Webhook Response', { statusCode: 400, success: false, error: 'Ambiguous callback' });
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Ambiguous callback rejected: Webhook does not provide a valid, well-formed gateway operation ID (Oper). Transactions cannot be identified without an authoritative operation code.',
      }),
    };
  }

  // Initialize Supabase Client
  const supabaseUrl = env.SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = testOptions?.supabaseClient || (
    supabaseUrl && supabaseKey
      ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } })
      : null
  );

  if (!supabase) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Supabase credentials are not configured in webhook environment.' }),
    };
  }

  // Requirement 2: SERVER-SIDE authenticated MerchantTransactions API request using sandbox credentials
  // Never trust incoming environment value to select live credentials
  const sandboxToken = (env.PAGUELOFACIL_SANDBOX_ACCESS_TOKEN || env.PAGUELOFACIL_DEMO_ACCESS_TOKEN || '').trim();
  if (!sandboxToken) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Authoritative transaction verification requires configured PagueloFacil sandbox access token.' }),
    };
  }

  const verifyUrl = 'https://sandbox.paguelofacil.com/PFManagementServices/api/v1/MerchantTransactions';
  const filterParam = `codOper::${oper}`;

  let gatewayResponse: Response;
  try {
    gatewayResponse = await fetchFn(`${verifyUrl}?filter=${encodeURIComponent(filterParam)}`, {
      method: 'GET',
      headers: {
        Authorization: sandboxToken,
        Accept: 'application/json',
      },
    });
  } catch (err: any) {
    logWebhookDiagnostic(10, 'Webhook Response', { statusCode: 422, success: false, error: err.message });
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        verified: false,
        category: 'parsing_problem',
        error: `Gateway query exception: ${err.message}`,
      }),
    };
  }

  if (!gatewayResponse.ok) {
    logWebhookDiagnostic(10, 'Webhook Response', { statusCode: 422, success: false, error: `HTTP ${gatewayResponse.status}` });
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        verified: false,
        category: 'parsing_problem',
        error: `Gateway verification API returned HTTP ${gatewayResponse.status}`,
      }),
    };
  }

  let gatewayData: any;
  try {
    gatewayData = await gatewayResponse.json();
  } catch (err: any) {
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        verified: false,
        category: 'parsing_problem',
        error: `Failed to parse gateway JSON response: ${err.message}`,
      }),
    };
  }

  // Requirement 3: Require exactly one gateway transaction with an exact codOper match
  const records = Array.isArray(gatewayData?.data)
    ? gatewayData.data
    : (gatewayData?.data ? [gatewayData.data] : (Array.isArray(gatewayData) ? gatewayData : []));

  const matchingRecords = records.filter(
    (r: any) => String(r.codOper || r.oper || r.id || '').trim() === oper
  );

  if (matchingRecords.length === 0) {
    logWebhookDiagnostic(10, 'Webhook Response', { statusCode: 422, success: false, category: 'absent_records' });
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        verified: false,
        category: 'absent_records',
        error: `No authoritative gateway record found for operation code ${oper}.`,
      }),
    };
  }

  if (matchingRecords.length > 1) {
    logWebhookDiagnostic(10, 'Webhook Response', { statusCode: 422, success: false, category: 'ambiguous_records' });
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        verified: false,
        category: 'ambiguous_records',
        error: `Ambiguous gateway response: Multiple records found for operation code ${oper}.`,
      }),
    };
  }

  const matchedGw = matchingRecords[0];

  // Requirement 3: Verify captured approval (status=1 and AUTH_CAPTURE), exact expected USD currency, and merchant-account association
  const rawStatus = matchedGw.status !== undefined ? Number(matchedGw.status) : String(matchedGw.estado || '').trim().toLowerCase();
  const isStatusApproved = rawStatus === 1 || rawStatus === '1' || rawStatus === 'aprobada' || rawStatus === 'approved';
  const isStatusDeclined = rawStatus === 0 || rawStatus === '0' || rawStatus === 'rechazada' || rawStatus === 'declined';

  const txType = String(matchedGw.txType || matchedGw.type || matchedGw.operationType || matchedGw.tipo || '').trim().toUpperCase();
  const isAuthCapture = txType === 'AUTH_CAPTURE' || txType === 'SALE' || txType === 'CAPTURE';

  if (isStatusDeclined) {
    logWebhookDiagnostic(7, 'Verification Result', { category: 'declined', verified: false });
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        verified: false,
        category: 'declined',
        error: 'Gateway transaction status is declined (status 0). Booking remains pending.',
      }),
    };
  }

  if (!isStatusApproved || !isAuthCapture) {
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        verified: false,
        category: 'validation_rejection',
        error: `Gateway transaction not approved or not captured (status=${rawStatus}, txType=${txType}). Booking remains pending.`,
      }),
    };
  }

  const rawCurrency = String(matchedGw.authCurrency ?? matchedGw.currency ?? matchedGw.moneda ?? '').trim().toUpperCase();
  const isUsd = rawCurrency === 'USD' || rawCurrency === '840' || rawCurrency === 'US_DOLLAR';
  if (!isUsd) {
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        verified: false,
        category: 'validation_rejection',
        error: `Invalid currency "${rawCurrency}". USD (840) strictly required.`,
      }),
    };
  }

  const merchantId = String(matchedGw.idMerchant || matchedGw.id_merchant || matchedGw.merchant || matchedGw.cclw || '').trim();
  if (!merchantId) {
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        verified: false,
        category: 'validation_rejection',
        error: 'Missing merchant identifier in gateway record.',
      }),
    };
  }

  // Requirement 4: Parse urlString as merchant return URL and require exactly one bookingReference
  const urlStringVal = matchedGw.urlString || matchedGw.url || matchedGw.returnUrl;
  const expectedReturnBase = env.PAGUELOFACIL_RETURN_URL || 'https://gunayalapanama.com/checkout/complete';
  const urlExtraction = extractVerifiedBookingReferenceFromUrl(urlStringVal, expectedReturnBase);

  if (!urlExtraction.valid || !urlExtraction.bookingReference) {
    logWebhookDiagnostic(10, 'Webhook Response', { statusCode: 422, success: false, error: urlExtraction.error });
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        verified: false,
        category: 'needs_manual_review',
        error: `Authoritative relationship verification failed on urlString: ${urlExtraction.error}`,
      }),
    };
  }

  const verifiedBookingReference = urlExtraction.bookingReference;

  // Requirement 5: Use verified bookingReference from urlString to locate payment_transactions row in Supabase
  const { data: dbRows, error: dbErr } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('booking_reference', verifiedBookingReference);

  if (dbErr) {
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        verified: false,
        category: 'parsing_problem',
        error: `Database select error: ${dbErr.message}`,
      }),
    };
  }

  if (!dbRows || dbRows.length === 0) {
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        verified: false,
        category: 'absent_records',
        error: `No payment transaction found for verified booking reference "${verifiedBookingReference}".`,
      }),
    };
  }

  if (dbRows.length > 1) {
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        verified: false,
        category: 'ambiguous_records',
        error: `Multiple payment records found for verified booking reference "${verifiedBookingReference}".`,
      }),
    };
  }

  const targetTx = dbRows[0];

  // Verify unique sandbox-environment row
  if (targetTx.environment !== 'sandbox') {
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        verified: false,
        category: 'validation_rejection',
        error: 'Cross-environment mismatch: Found transaction is not in sandbox environment.',
      }),
    };
  }

  // Verify exact amount in integer cents
  const gwAmount = Number(matchedGw.authAmount ?? matchedGw.amount ?? matchedGw.total);
  if (!Number.isFinite(gwAmount) || gwAmount <= 0) {
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        verified: false,
        category: 'validation_rejection',
        error: 'Invalid amount paid in gateway record.',
      }),
    };
  }
  const gwCents = Math.round(gwAmount * 100);
  const expectedCents = targetTx.amount_in_cents || Math.round((targetTx.expected_amount || 0) * 100);
  if (gwCents !== expectedCents) {
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        verified: false,
        category: 'validation_rejection',
        error: `Exact amount mismatch: Paid ${gwCents} cents does not match expected ${expectedCents} cents.`,
      }),
    };
  }

  // Verify stored gateway operation ID if already set (reject mismatch)
  if (targetTx.gateway_operation_id && targetTx.gateway_operation_id.trim() !== oper) {
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        verified: false,
        category: 'mismatched_identifiers',
        error: `Mismatched stored operation ID: stored "${targetTx.gateway_operation_id}", received "${oper}".`,
      }),
    };
  }

  // Requirement 6: Call existing shared reconciliation helper with VERIFIED bookingReference and gateway operation code
  const reconciliation = await reconcilePaymentTransaction({
    bookingReference: verifiedBookingReference,
    operationCode: oper,
    linkCode: parsed.gatewayLinkCode,
    idempotencyKey: parsed.idempotencyKey,
    environment: 'sandbox',
    supabaseClient: supabase,
    env,
    fetchFn,
  });

  logWebhookDiagnostic(9, 'Database Update', {
    attempted: true,
    succeeded: reconciliation.success,
    category: reconciliation.category,
  });

  if (!reconciliation.success) {
    logWebhookDiagnostic(10, 'Webhook Response', { statusCode: 422, success: false, error: reconciliation.message });
    return {
      statusCode: 422,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        verified: false,
        category: reconciliation.category,
        error: reconciliation.message,
      }),
    };
  }

  logWebhookDiagnostic(10, 'Webhook Response', {
    statusCode: 200,
    success: true,
    verified: true,
    category: reconciliation.category,
  });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      verified: true,
      duplicate: reconciliation.duplicate || false,
      bookingReference: reconciliation.bookingReference,
      gatewayOperationId: reconciliation.operationCode,
      amountPaid: reconciliation.amountPaid,
      message: reconciliation.message,
    }),
  };
};

