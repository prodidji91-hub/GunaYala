import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  validateCclw,
  maskCredential,
  validatePagueloFacilCheckoutUrl,
  PAGUELOFACIL_ENDPOINTS,
} from './paymentGateway.js';
import {
  AdminSandboxTestResponse,
  PagueloFacilLinkDaemonRequest,
  PagueloFacilLinkDaemonResponse,
  ExistingTransactionDiagnosticResult,
} from '../../src/types/payment.js';
import { reconcilePaymentTransaction, validatePaymentRelationship } from './paymentReconciliation.js';

// In-memory rate limiting and cooldown state
interface RateLimitRecord {
  timestamps: number[];
  lastRequestTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_REQUESTS_PER_WINDOW = 5;
const COOLDOWN_INTERVAL_MS = 5 * 1000; // 5 seconds cooldown

function checkRateLimit(adminId: string): { allowed: boolean; error?: string } {
  const now = Date.now();
  const record = rateLimitStore.get(adminId) || { timestamps: [], lastRequestTime: 0 };

  // 1. Check cooldown between consecutive requests
  if (now - record.lastRequestTime < COOLDOWN_INTERVAL_MS) {
    const waitSeconds = Math.ceil((COOLDOWN_INTERVAL_MS - (now - record.lastRequestTime)) / 1000);
    return {
      allowed: false,
      error: `Cooldown active: Please wait ${waitSeconds}s before initiating another sandbox connection test.`,
    };
  }

  // 2. Filter timestamps to rolling window
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const recentTimestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (recentTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      error: `Rate limit reached: Maximum ${MAX_REQUESTS_PER_WINDOW} test attempts permitted per 5 minutes. Please wait before retrying.`,
    };
  }

  // Record this attempt
  recentTimestamps.push(now);
  rateLimitStore.set(adminId, {
    timestamps: recentTimestamps,
    lastRequestTime: now,
  });

  return { allowed: true };
}

export interface AdminSandboxTestDependencies {
  supabaseClient?: SupabaseClient;
  testTransport?: (payload: PagueloFacilLinkDaemonRequest) => Promise<PagueloFacilLinkDaemonResponse>;
  envOverride?: Record<string, string | undefined>;
}

/**
 * Secure Read-Only Admin Diagnostic for Existing Approved Transaction (TEST-DAYTOUR-GNY-643300)
 */
export async function executeExistingTransactionDiagnostic(
  authToken: string | null,
  requestBody: any = {},
  dependencies: AdminSandboxTestDependencies = {}
): Promise<{ statusCode: number; body: AdminSandboxTestResponse }> {
  const env = dependencies.envOverride || process.env;
  const supabaseUrl = env.SUPABASE_URL || '';
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

  // 1. Authenticate administrator server-side using quotation_admins authorization table
  if (!authToken || !authToken.trim()) {
    return {
      statusCode: 401,
      body: {
        success: false,
        environment: 'sandbox',
        testReference: '',
        amount: 69.00,
        currency: 'USD',
        error: 'Unauthorized: Administrator Bearer token is required.',
      },
    };
  }

  const cleanToken = authToken.replace(/^Bearer\s+/i, '').trim();
  const supabase = dependencies.supabaseClient || createClient(supabaseUrl, supabaseServiceKey);

  const { data: authData, error: authError } = await supabase.auth.getUser(cleanToken);
  if (authError || !authData?.user?.id) {
    return {
      statusCode: 401,
      body: {
        success: false,
        environment: 'sandbox',
        testReference: '',
        amount: 69.00,
        currency: 'USD',
        error: 'Unauthorized: Invalid or expired administrator credentials.',
      },
    };
  }

  const adminUserId = authData.user.id;
  const { data: adminRecord, error: adminError } = await supabase
    .from('quotation_admins')
    .select('user_id')
    .eq('user_id', adminUserId)
    .maybeSingle();

  if (adminError || !adminRecord?.user_id) {
    return {
      statusCode: 403,
      body: {
        success: false,
        environment: 'sandbox',
        testReference: '',
        amount: 69.00,
        currency: 'USD',
        error: 'Forbidden: Access restricted to authorized quotation administrators.',
      },
    };
  }

  const bookingRef = requestBody?.bookingReference || 'TEST-DAYTOUR-GNY-643300';
  const operationCode = requestBody?.operationCode || 'LK-BMMRPXP4MZDB';

  // 2. Query Supabase payment_transactions for this exact booking reference using service-role credentials
  const { data: dbRows, error: dbError } = await supabase
    .from('payment_transactions')
    .select('id, booking_reference, status, environment, expected_amount, amount_paid, gateway_operation_id, gateway_link_code, currency, created_at, updated_at')
    .eq('booking_reference', bookingRef);

  const rowFound = Boolean(dbRows && dbRows.length > 0);
  const exactOneRow = Boolean(dbRows && dbRows.length === 1);
  const matchCount = dbRows?.length ?? 0;

  const dbLookupResult = {
    rowFound,
    exactOneRow,
    matchCount,
    dbErrorCode: dbError?.code || null,
    dbErrorMessage: dbError ? 'Sanitized Database Error' : null,
    transactionRecord: exactOneRow && dbRows ? dbRows[0] : (rowFound && dbRows ? dbRows : null),
  };

  // 3. Query official sandbox MerchantTransactions endpoint using filter=codOper::<operation code>
  // Authorization header sends raw access token directly without Bearer prefix
  const sandboxToken = (
    env.PAGUELOFACIL_SANDBOX_ACCESS_TOKEN ||
    env.PAGUELOFACIL_DEMO_ACCESS_TOKEN ||
    ''
  ).trim();

  const verifyUrl = 'https://sandbox.paguelofacil.com/PFManagementServices/api/v1/MerchantTransactions';
  const filterParam = `codOper::${operationCode}`;

  let gatewayHttpStatus: number | undefined;
  let gatewayRecords: any[] = [];
  let diagnosticCategory: ExistingTransactionDiagnosticResult['gatewayDiagnostic']['diagnosticCategory'] = 'absent_records';
  let parsedRecord: any = null;
  let apiErrorMsg: string | undefined;

  if (!sandboxToken) {
    diagnosticCategory = 'authentication_failure';
    apiErrorMsg = 'Sandbox API access token not configured in environment.';
  } else {
    try {
      const response = await fetch(`${verifyUrl}?filter=${encodeURIComponent(filterParam)}`, {
        method: 'GET',
        headers: {
          Authorization: sandboxToken, // Direct access token without Bearer
          Accept: 'application/json',
        },
      });

      gatewayHttpStatus = response.status;

      if (response.status === 401 || response.status === 403) {
        diagnosticCategory = 'authentication_failure';
        apiErrorMsg = `Gateway authentication failed (HTTP ${response.status}).`;
      } else if (!response.ok) {
        diagnosticCategory = 'parsing_problem';
        apiErrorMsg = `Gateway returned HTTP ${response.status} ${response.statusText}.`;
      } else {
        const json = await response.json();
        const allRecords = Array.isArray(json?.data) ? json.data : (json?.data ? [json.data] : (Array.isArray(json) ? json : []));
        gatewayRecords = allRecords.filter((r: any) => String(r.codOper || r.oper || r.id || '').trim() === String(operationCode).trim());

        if (gatewayRecords.length === 0) {
          diagnosticCategory = 'absent_records';
          apiErrorMsg = `No transaction records found for operation code ${operationCode}.`;
        } else if (gatewayRecords.length > 1) {
          diagnosticCategory = 'ambiguous_records' as any;
          apiErrorMsg = `Multiple gateway records found for operation code ${operationCode}.`;
        } else {
          const matched = gatewayRecords[0];
          const rawStatus = matched.status !== undefined ? Number(matched.status) : String(matched.estado || '').trim().toLowerCase();
          const isApproved = rawStatus === 1 || rawStatus === '1' || rawStatus === 'aprobada' || rawStatus === 'approved';
          const isDeclined = rawStatus === 0 || rawStatus === '0' || rawStatus === 'rechazada' || rawStatus === 'declined';
          const txType = String(matched.txType || matched.type || matched.operationType || matched.tipo || '').trim().toUpperCase();
          const isAuthCapture = txType === 'AUTH_CAPTURE' || txType === 'SALE' || txType === 'CAPTURE';
          const rawAmount = matched.authAmount ?? matched.amount ?? matched.total ?? 0;
          const amt = Number(rawAmount);
          const rawCurrency = String(matched.authCurrency ?? matched.currency ?? matched.moneda ?? 'USD').trim().toUpperCase();
          const merchantId = String(matched.idMerchant ?? matched.id_merchant ?? '').trim();
          const returnedRef = String(matched.customParm1 ?? matched.parm1 ?? matched.bookingReference ?? '').trim();

          parsedRecord = {
            codOper: matched.codOper || matched.oper || matched.id,
            status: rawStatus,
            txType,
            amount: amt,
            currency: rawCurrency,
            idMerchant: merchantId,
            bookingReference: returnedRef,
          };

          if (isDeclined) {
            diagnosticCategory = 'declined';
          } else if (!isApproved || !isAuthCapture) {
            diagnosticCategory = 'validation_rejection';
            apiErrorMsg = `Transaction status or type not fully captured/approved (status: ${rawStatus}, txType: ${txType}).`;
          } else {
            const amtCents = Math.round(amt * 100);
            const expectedCents = 6900;
            const isUsd = rawCurrency === 'USD' || rawCurrency === '840' || rawCurrency === 'US_DOLLAR';

            if (!isUsd) {
              diagnosticCategory = 'validation_rejection';
              apiErrorMsg = `Invalid or missing currency "${rawCurrency}". USD (840) required.`;
            } else if (amtCents !== expectedCents) {
              diagnosticCategory = 'validation_rejection';
              apiErrorMsg = `Amount mismatch: expected $69.00 (6900c), received ${amtCents}c.`;
            } else {
              diagnosticCategory = 'approved';
            }
          }
        }
      }
    } catch (err: any) {
      diagnosticCategory = 'parsing_problem';
      apiErrorMsg = `Network or parsing error querying MerchantTransactions API: ${err.message}`;
    }
  }

  // Detailed Record Inspection & Relationship Verification
  const rawTxRecord = dbLookupResult.transactionRecord;
  const dbTxRecord = Array.isArray(rawTxRecord) ? rawTxRecord[0] : rawTxRecord;
  const storedRef = String(dbTxRecord?.booking_reference || bookingRef).trim();
  const storedLinkCode = String(dbTxRecord?.gateway_link_code || '').trim();

  const matchedRawRecord = gatewayRecords.length === 1 ? gatewayRecords[0] : null;
  const matchedFieldNames = matchedRawRecord ? Object.keys(matchedRawRecord) : [];

  const candidateIdentifierKeys = ['customParm1', 'parm1', 'PARM_1', 'bookingReference', 'linkCode', 'code', 'gatewayLinkCode'];
  const identifierFieldsPresence: Record<string, boolean> = {};
  const identifierFieldMatches: Record<string, boolean> = {};

  if (matchedRawRecord) {
    for (const key of candidateIdentifierKeys) {
      const actualKey = key in matchedRawRecord ? key : Object.keys(matchedRawRecord).find(k => k.toLowerCase() === key.toLowerCase());
      const hasField = Boolean(actualKey && matchedRawRecord[actualKey] !== undefined && matchedRawRecord[actualKey] !== null && String(matchedRawRecord[actualKey]).trim() !== '');
      identifierFieldsPresence[key] = hasField;
      if (hasField && actualKey) {
        const val = String(matchedRawRecord[actualKey]).trim();
        identifierFieldMatches[key] = Boolean((val === storedRef) || (storedLinkCode && val === storedLinkCode));
      } else {
        identifierFieldMatches[key] = false;
      }
    }
  }

  const relCheck = validatePaymentRelationship(matchedRawRecord, {
    booking_reference: storedRef,
    gateway_link_code: storedLinkCode,
    environment: dbTxRecord?.environment || 'sandbox',
  });

  const relationshipVerified = relCheck.verified;
  const relationshipEvidence = relCheck.evidence;
  const provingField = relCheck.provingField;
  const relationshipDetails = relCheck.details;

  // Additional Field Inspections (customFields, urlString, txDescription, txConcept)
  const additionalFieldsToInspect = ['customFields', 'urlString', 'txDescription', 'txConcept'];
  const additionalFieldInspections: Array<{
    fieldName: string;
    exists: boolean;
    hasValue: boolean;
    containsBookingRef: boolean;
    containsLinkCode: boolean;
    matchedIdentifier: string | null;
    isAuthoritativeEvidence: boolean;
    assessment: string;
  }> = [];

  if (matchedRawRecord) {
    for (const fName of additionalFieldsToInspect) {
      const actualKey = fName in matchedRawRecord ? fName : Object.keys(matchedRawRecord).find(k => k.toLowerCase() === fName.toLowerCase());
      const exists = Boolean(actualKey);
      const rawVal = actualKey ? matchedRawRecord[actualKey] : undefined;
      const hasValue = Boolean(rawVal !== undefined && rawVal !== null && (typeof rawVal === 'string' ? rawVal.trim() !== '' : true));
      
      const strVal = typeof rawVal === 'object' ? JSON.stringify(rawVal) : String(rawVal || '');
      const containsBookingRef = strVal.includes(storedRef) || (bookingRef && strVal.includes(bookingRef)) || strVal.includes('TEST-DAYTOUR-GNY-643300');
      const containsLinkCode = (storedLinkCode && strVal.includes(storedLinkCode)) || strVal.includes('LK-DT62QXZMT3AHTACA') || strVal.includes('LK-BMMRPXP4MZDB');

      let matchedIdentifier: string | null = null;
      if (containsBookingRef) matchedIdentifier = storedRef || bookingRef || 'TEST-DAYTOUR-GNY-643300';
      else if (containsLinkCode) matchedIdentifier = storedLinkCode || 'LK-DT62QXZMT3AHTACA';

      const isStructuredField = fName === 'customFields' || fName === 'urlString';
      const isAuthoritativeEvidence = Boolean(matchedIdentifier && isStructuredField);

      let assessment = '';
      if (!exists || !hasValue) {
        assessment = 'Field does not exist or has no value.';
      } else if (!containsBookingRef && !containsLinkCode) {
        assessment = 'Field exists but contains no matching identifier token.';
      } else if (isStructuredField) {
        assessment = `Contains matching identifier (${matchedIdentifier}) in structured field; suitable as authoritative relationship evidence.`;
      } else {
        assessment = `Contains matching identifier (${matchedIdentifier}) in descriptive text field (${fName}); treated as descriptive text, not independently suitable as authoritative relationship evidence.`;
      }

      additionalFieldInspections.push({
        fieldName: fName,
        exists,
        hasValue,
        containsBookingRef,
        containsLinkCode,
        matchedIdentifier,
        isAuthoritativeEvidence,
        assessment,
      });
    }
  }

  const overallSuccess = diagnosticCategory === 'approved' && relationshipVerified;

  // ZERO DATABASE MUTATIONS: Read-only diagnostic only
  const diagnosticResult: ExistingTransactionDiagnosticResult = {
    success: overallSuccess,
    action: 'diagnose_existing_transaction',
    bookingReference: bookingRef,
    targetOperationCode: operationCode,
    databaseLookup: dbLookupResult,
    gatewayDiagnostic: {
      endpoint: verifyUrl,
      tokenConfigured: Boolean(sandboxToken),
      httpStatus: gatewayHttpStatus,
      recordsFoundCount: gatewayRecords.length,
      diagnosticCategory,
      parsedRecord,
      error: apiErrorMsg,
    },
    matchedFieldNames,
    identifierFieldsPresence,
    identifierFieldMatches,
    additionalFieldInspections,
    relationshipVerification: relCheck,
    message: `Read-only sandbox diagnostic completed. Gateway Category: ${diagnosticCategory}, Relationship Verified: ${relationshipVerified}. Database rows found: ${matchCount}.`,
    timestamp: new Date().toISOString(),
  };

  return {
    statusCode: 200,
    body: {
      success: diagnosticCategory === 'approved',
      environment: 'sandbox',
      testReference: bookingRef,
      amount: 69.00,
      currency: 'USD',
      message: diagnosticResult.message,
      existingTransactionDiagnostic: diagnosticResult,
    },
  };
}

/**
 * Admin-Only Action: Verify & Reconcile Existing Payment (TEST-DAYTOUR-GNY-643300)
 */
export async function executeReconcileExistingTransaction(
  authToken: string | null,
  requestBody: any = {},
  dependencies: AdminSandboxTestDependencies = {}
): Promise<{ statusCode: number; body: any }> {
  const env = dependencies.envOverride || process.env;
  const supabaseUrl = env.SUPABASE_URL || '';
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!authToken || !authToken.trim()) {
    return {
      statusCode: 401,
      body: { success: false, error: 'Unauthorized: Administrator Bearer token is required.' },
    };
  }

  const cleanToken = authToken.replace(/^Bearer\s+/i, '').trim();
  const supabase = dependencies.supabaseClient || createClient(supabaseUrl, supabaseServiceKey);

  const { data: authData, error: authError } = await supabase.auth.getUser(cleanToken);
  if (authError || !authData?.user?.id) {
    return {
      statusCode: 401,
      body: { success: false, error: 'Unauthorized: Invalid or expired administrator credentials.' },
    };
  }

  const adminUserId = authData.user.id;
  const { data: adminRecord, error: adminError } = await supabase
    .from('quotation_admins')
    .select('user_id')
    .eq('user_id', adminUserId)
    .maybeSingle();

  if (adminError || !adminRecord?.user_id) {
    return {
      statusCode: 403,
      body: { success: false, error: 'Forbidden: Access restricted to authorized quotation administrators.' },
    };
  }

  const bookingRef = requestBody?.bookingReference || 'TEST-DAYTOUR-GNY-643300';
  const operationCode = requestBody?.operationCode || 'LK-BMMRPXP4MZDB';

  const reconciliation = await reconcilePaymentTransaction({
    bookingReference: bookingRef,
    operationCode: operationCode,
    environment: 'sandbox',
    supabaseClient: supabase,
    env,
  });

  return {
    statusCode: reconciliation.success ? 200 : 422,
    body: {
      success: reconciliation.success,
      action: 'reconcile_existing_transaction',
      bookingReference: bookingRef,
      operationCode,
      reconciliation,
      message: reconciliation.message,
    },
  };
}

/**
 * Core test execution logic, separated for isolated unit testing with mocks.
 */
export async function executeAdminSandboxTest(
  authToken: string | null,
  dependencies: AdminSandboxTestDependencies = {},
  requestBody: any = {}
): Promise<{ statusCode: number; body: any }> {
  if (requestBody?.action === 'diagnose_existing_transaction') {
    return await executeExistingTransactionDiagnostic(authToken, requestBody, dependencies);
  }
  if (requestBody?.action === 'reconcile_existing_transaction') {
    return await executeReconcileExistingTransaction(authToken, requestBody, dependencies);
  }

  const env = dependencies.envOverride || process.env;

  const supabaseUrl = env.SUPABASE_URL || '';
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

  // 1. REQUIRE AUTHORIZED ADMINISTRATOR BEARER TOKEN
  if (!authToken || !authToken.trim()) {
    return {
      statusCode: 401,
      body: {
        success: false,
        environment: 'sandbox',
        testReference: '',
        amount: 1.00,
        currency: 'USD',
        error: 'Unauthorized: Administrator Bearer token is required.',
      },
    };
  }

  const cleanToken = authToken.replace(/^Bearer\s+/i, '').trim();

  // Initialize or use injected Supabase client
  const supabase = dependencies.supabaseClient || createClient(supabaseUrl, supabaseServiceKey);

  // Authenticate user session server-side
  const { data: authData, error: authError } = await supabase.auth.getUser(cleanToken);

  if (authError || !authData?.user?.id) {
    return {
      statusCode: 401,
      body: {
        success: false,
        environment: 'sandbox',
        testReference: '',
        amount: 1.00,
        currency: 'USD',
        error: 'Unauthorized: Invalid or expired administrator credentials.',
      },
    };
  }

  const adminUserId = authData.user.id;

  // Verify that the user exists in the quotation_admins authorization table
  const { data: adminRecord, error: adminError } = await supabase
    .from('quotation_admins')
    .select('user_id')
    .eq('user_id', adminUserId)
    .maybeSingle();

  if (adminError || !adminRecord?.user_id) {
    return {
      statusCode: 403,
      body: {
        success: false,
        environment: 'sandbox',
        testReference: '',
        amount: 1.00,
        currency: 'USD',
        error: 'Forbidden: Access restricted to authorized quotation administrators.',
      },
    };
  }

  // 2. CHECK EXPLICIT SANDBOX TEST ENABLE FLAG
  const isTestEnabled = env.ENABLE_SANDBOX_CONNECTIVITY_TEST === 'true';
  if (!isTestEnabled) {
    return {
      statusCode: 403,
      body: {
        success: false,
        environment: 'sandbox',
        testReference: '',
        amount: 1.00,
        currency: 'USD',
        error: 'Sandbox connectivity test is disabled by default. Configure ENABLE_SANDBOX_CONNECTIVITY_TEST=true in server environment variables to activate this test.',
      },
    };
  }

  // 3. REQUIRE GATEWAY ENVIRONMENT TO BE SANDBOX
  const serverGatewayEnv = (env.PAGUELOFACIL_ENV || '').trim().toLowerCase();
  if (serverGatewayEnv !== 'sandbox' && serverGatewayEnv !== 'demo') {
    return {
      statusCode: 400,
      body: {
        success: false,
        environment: 'sandbox',
        testReference: '',
        amount: 1.00,
        currency: 'USD',
        error: `PAGUELOFACIL_ENV must be set to "sandbox" to execute sandbox connectivity tests. Current server setting is "${serverGatewayEnv || 'unconfigured'}". Production checkout endpoints are strictly prohibited.`,
      },
    };
  }

  // 4. RATE LIMITING & COOLDOWN
  const rateLimitCheck = checkRateLimit(adminUserId);
  if (!rateLimitCheck.allowed) {
    return {
      statusCode: 429,
      body: {
        success: false,
        environment: 'sandbox',
        testReference: '',
        amount: 1.00,
        currency: 'USD',
        error: rateLimitCheck.error,
      },
    };
  }

  // 5. READ & VALIDATE SANDBOX CREDENTIALS (NEVER PRODUCTION CREDENTIALS)
  const sandboxCclw = (
    env.PAGUELOFACIL_SANDBOX_CCLW ||
    env.PAGUELOFACIL_DEMO_CCLW ||
    ''
  ).trim();

  const sandboxToken = (
    env.PAGUELOFACIL_SANDBOX_ACCESS_TOKEN ||
    env.PAGUELOFACIL_DEMO_ACCESS_TOKEN ||
    ''
  ).trim();

  const diagnosticInfo = {
    cclwConfigured: Boolean(sandboxCclw),
    cclwMasked: maskCredential(sandboxCclw),
    tokenConfigured: Boolean(sandboxToken),
    gatewayEndpoint: PAGUELOFACIL_ENDPOINTS.SANDBOX_LINK_DAEMON,
    requestedAmount: 1.00,
    requestTimestamp: new Date().toISOString(),
  };

  if (!validateCclw(sandboxCclw)) {
    return {
      statusCode: 422,
      body: {
        success: false,
        environment: 'sandbox',
        testReference: '',
        amount: 1.00,
        currency: 'USD',
        error: 'PAGUELOFACIL_SANDBOX_CCLW is missing or contains invalid characters. Configure valid sandbox credentials in Netlify.',
        diagnostic: diagnosticInfo,
      },
    };
  }

  // 6. CONSTRUCT UNIQUE TEST REFERENCE (NEVER REAL BOOKING REF)
  const testReference = `TEST-PF-SANDBOX-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const testAttemptKey = `idem_sandbox_test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const requestPayload: PagueloFacilLinkDaemonRequest = {
    CCLW: sandboxCclw,
    CMTN: 1.00, // Exact $1.00 USD
    CDSC: 'Guna Yala Admin Sandbox Connectivity Test ($1.00)',
    RETURN_URL: 'https://gunayalapanama.com/admin?sandbox-test=complete',
    PARM_1: testReference,
    PARM_2: testAttemptKey,
    EXPIRES_IN: 1800, // 30-minute test window
  };

  // 7. INITIATE GATEWAY REQUEST (MOCK TRANSPORT IN TESTS, REAL FETCH IN PROD)
  try {
    let responseData: PagueloFacilLinkDaemonResponse;

    if (dependencies.testTransport) {
      responseData = await dependencies.testTransport(requestPayload);
    } else {
      const formParams = new URLSearchParams();
      formParams.append('CCLW', requestPayload.CCLW);
      formParams.append('CMTN', requestPayload.CMTN.toFixed(2));
      formParams.append('CDSC', requestPayload.CDSC);
      formParams.append('RETURN_URL', requestPayload.RETURN_URL);
      formParams.append('PARM_1', requestPayload.PARM_1);
      if (requestPayload.PARM_2) formParams.append('PARM_2', requestPayload.PARM_2);
      if (requestPayload.EXPIRES_IN) formParams.append('EXPIRES_IN', String(requestPayload.EXPIRES_IN));

      const response = await fetch(PAGUELOFACIL_ENDPOINTS.SANDBOX_LINK_DAEMON, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formParams.toString(),
      });

      if (!response.ok) {
        return {
          statusCode: 502,
          body: {
            success: false,
            environment: 'sandbox',
            testReference,
            amount: 1.00,
            currency: 'USD',
            gatewayStatus: response.status,
            error: `PagueloFacil Sandbox returned HTTP ${response.status} ${response.statusText}.`,
            diagnostic: diagnosticInfo,
          },
        };
      }

      responseData = await response.json();
    }

    // 8. INSPECT GATEWAY RESPONSE STATUS
    if (responseData.headerStatus?.code !== 200 || !responseData.data?.url) {
      const errorMsg =
        responseData.headerStatus?.description ||
        responseData.message ||
        'PagueloFacil Sandbox rejected hosted checkout link generation.';

      return {
        statusCode: 502,
        body: {
          success: false,
          environment: 'sandbox',
          testReference,
          amount: 1.00,
          currency: 'USD',
          gatewayStatus: responseData.headerStatus?.code,
          error: errorMsg,
          diagnostic: diagnosticInfo,
        },
      };
    }

    // 9. VALIDATE RETURNED CHECKOUT URL HOSTNAME (MUST MATCH SANDBOX)
    const urlValidation = validatePagueloFacilCheckoutUrl(responseData.data.url, 'sandbox');
    if (!urlValidation.valid || !urlValidation.url) {
      return {
        statusCode: 502,
        body: {
          success: false,
          environment: 'sandbox',
          testReference,
          amount: 1.00,
          currency: 'USD',
          error: `Gateway returned untrusted sandbox checkout URL: ${urlValidation.error}`,
          diagnostic: diagnosticInfo,
        },
      };
    }

    // 10. RETURN SANITIZED SUCCESS RESULT WITH GENUINE SANDBOX LINK
    // NO DATABASE WRITES: Zero modifications to payment_transactions or booking_requests
    return {
      statusCode: 200,
      body: {
        success: true,
        environment: 'sandbox',
        testReference,
        checkoutUrl: urlValidation.url,
        linkCode: responseData.data.code,
        amount: 1.00,
        currency: 'USD',
        expiresAt: new Date(Date.now() + 1800 * 1000).toISOString(),
        message: 'PagueloFacil Sandbox connection successful! Genuine $1.00 USD test checkout link generated.',
        diagnostic: diagnosticInfo,
      },
    };
  } catch (err: any) {
    return {
      statusCode: 502,
      body: {
        success: false,
        environment: 'sandbox',
        testReference,
        amount: 1.00,
        currency: 'USD',
        error: `Network error connecting to PagueloFacil Sandbox: ${err.message}`,
        diagnostic: diagnosticInfo,
      },
    };
  }
}

/**
 * Netlify Function Entry Point
 */
export const handler = async (event: any) => {
  // Handle CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  // Enforce HTTP POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: 'Method Not Allowed. Use POST.',
      }),
    };
  }

  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || null;

  let requestBody: any = {};
  if (event.body) {
    try {
      requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch {
      requestBody = {};
    }
  }

  const result = await executeAdminSandboxTest(authHeader, {}, requestBody);

  return {
    statusCode: result.statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(result.body),
  };
};
