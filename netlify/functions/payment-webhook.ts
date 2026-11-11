import { createClient } from '@supabase/supabase-js';
import { PagueloFacilGatewayAdapter } from './paymentGateway.js';
import { reconcilePaymentTransaction } from './paymentReconciliation.js';

interface NetlifyEvent {
  httpMethod: string;
  body: string | null;
  headers: Record<string, string | undefined>;
}

function logWebhookDiagnostic(step: number, stepName: string, data: Record<string, any>) {
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

export const handler = async (event: NetlifyEvent) => {
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

  const targetBookingRef = 'TEST-DAYTOUR-GNY-643300';
  const parm1Value = parsed.bookingReference || '';
  const parm1ExactMatch = parm1Value === targetBookingRef;
  const parm1TrimmedMatch = parm1Value.trim() === targetBookingRef;

  logWebhookDiagnostic(3, 'Identifiers Present', {
    hasPARM1: Boolean(parm1Value),
    parm1Length: parm1Value.length,
    parm1ExactMatch,
    parm1TrimmedMatch,
    hasPARM2: Boolean(parsed.idempotencyKey),
    hasOper: Boolean(parsed.gatewayOperationId),
    hasLinkCode: Boolean(parsed.gatewayLinkCode),
  });

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

  // 4. Currency and Amount Validation
  if (parsed.currency && parsed.currency !== 'USD') {
    logWebhookDiagnostic(8, 'Validation Checks', { currencyValid: false, currency: parsed.currency });
    logWebhookDiagnostic(10, 'Webhook Response', { statusCode: 400, success: false, error: 'Unsupported currency' });
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: `Unsupported currency: ${parsed.currency}. Must be USD.`,
      }),
    };
  }

  if (parsed.amountPaid !== undefined && (typeof parsed.amountPaid !== 'number' || parsed.amountPaid < 1.00)) {
    logWebhookDiagnostic(8, 'Validation Checks', { amountValid: false, amountPaid: parsed.amountPaid });
    logWebhookDiagnostic(10, 'Webhook Response', { statusCode: 400, success: false, error: 'Invalid payment amount' });
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: `Invalid payment amount: $${parsed.amountPaid}. Minimum transaction is $1.00 USD.`,
      }),
    };
  }

  logWebhookDiagnostic(8, 'Validation Checks', { currencyValid: true, amountValid: true });

  // 5. Pre-Load Existing Payment Transaction via Unique Identifier (Reject ambiguous callbacks lacking unique identifiers)
  const hasUniqueOperationId = Boolean(parsed.gatewayOperationId && parsed.gatewayOperationId.trim());
  const hasUniqueAttemptId = Boolean(parsed.idempotencyKey && parsed.idempotencyKey.trim());
  const hasUniqueLinkCode = Boolean(parsed.gatewayLinkCode && parsed.gatewayLinkCode.trim());

  if (!hasUniqueOperationId && !hasUniqueAttemptId && !hasUniqueLinkCode) {
    logWebhookDiagnostic(10, 'Webhook Response', { statusCode: 400, success: false, error: 'Ambiguous callback' });
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Ambiguous callback rejected: Webhook does not provide a unique gateway operation ID (Oper), payment attempt ID, or link code. Transactions cannot be identified by booking reference alone.',
      }),
    };
  }

  // 6. Initialize Supabase client and execute shared reconciliation helper
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Supabase credentials are not configured in webhook environment.' }),
    };
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Only perform reconciliation for approved events; for rejected events, log and respond 200
  if (parsed.eventType === 'payment_rejected') {
    logWebhookDiagnostic(7, 'Verification Result', { category: 'payment_rejected', verified: false });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        verified: false,
        eventType: parsed.eventType,
        error: parsed.error || 'Payment was declined.',
      }),
    };
  }

  const reconciliation = await reconcilePaymentTransaction({
    bookingReference: parsed.bookingReference,
    operationCode: parsed.gatewayOperationId,
    linkCode: parsed.gatewayLinkCode,
    idempotencyKey: parsed.idempotencyKey,
    environment: parsed.environment || 'sandbox',
    supabaseClient: supabase,
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
