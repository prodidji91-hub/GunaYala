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
  ControlledLiveTestBookingResponse,
  ControlledLiveTestStatusResponse,
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

export function resetRateLimitStoreForTesting(): void {
  rateLimitStore.clear();
}

let liveTestCreationInProgress = false;

export function resetLiveTestMutexForTesting(): void {
  liveTestCreationInProgress = false;
}

export const CONTROLLED_LIVE_TEST_LOCK_NAME = 'CONTROLLED_LIVE_TEST_ACTIVE_LOCK';
export const DEFAULT_LOCK_TTL_SECONDS = 300; // 5 minutes (300 seconds)

export async function acquireAtomicLiveTestLock(
  supabase: any,
  adminUserId: string,
  ttlSeconds: number = DEFAULT_LOCK_TTL_SECONDS
): Promise<{ acquired: boolean; ownerToken?: string; error?: string }> {
  const ownerToken = crypto.randomUUID();
  try {
    if (!supabase || typeof supabase.rpc !== 'function') {
      return {
        acquired: false,
        error: 'Database lock acquisition failed: Supabase RPC client unavailable.',
      };
    }

    const { data, error } = await supabase.rpc('acquire_controlled_live_test_lock', {
      p_lock_name: CONTROLLED_LIVE_TEST_LOCK_NAME,
      p_owner_token: ownerToken,
      p_admin_user_id: adminUserId,
      p_ttl_seconds: ttlSeconds,
    });

    if (error || !data) {
      return {
        acquired: false,
        error: `Database lock acquisition failed: ${error?.message || 'RPC returned no data'}`,
      };
    }

    if (data.acquired === true) {
      return { acquired: true, ownerToken };
    }

    return {
      acquired: false,
      error: data.message || 'A controlled live test creation request is currently in progress across function instances. Please wait.',
    };
  } catch (err: any) {
    // CRITICAL SECURITY RULE: Exception handler MUST NEVER return acquired: true!
    return {
      acquired: false,
      error: `Database lock acquisition failed: ${err?.message || 'Unknown database exception'}`,
    };
  }
}

export async function releaseAtomicLiveTestLock(
  supabase: any,
  ownerToken?: string | null
): Promise<{ released: boolean; reason?: string }> {
  if (!ownerToken) {
    return { released: false, reason: 'missing_owner_token' };
  }

  try {
    if (!supabase || typeof supabase.rpc !== 'function') {
      return { released: false, reason: 'rpc_unavailable' };
    }

    const { data, error } = await supabase.rpc('release_controlled_live_test_lock', {
      p_lock_name: CONTROLLED_LIVE_TEST_LOCK_NAME,
      p_owner_token: ownerToken,
    });

    if (error || !data) {
      return { released: false, reason: error?.message || 'rpc_error' };
    }

    return { released: Boolean(data.released), reason: data.reason };
  } catch (err: any) {
    return { released: false, reason: err?.message || 'error' };
  }
}

export interface AdminSandboxTestDependencies {
  supabaseClient?: SupabaseClient;
  testTransport?: (payload: PagueloFacilLinkDaemonRequest) => Promise<PagueloFacilLinkDaemonResponse>;
  envOverride?: Record<string, string | undefined>;
  fetchFn?: typeof fetch;
  skipRateLimit?: boolean;
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
    fetchFn: dependencies.fetchFn,
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
 * Admin-Only Action: Secure Read-Only PagueloFacil LIVE REST API Connection Test (No Charge)
 * Verifies production REST API credential without creating payments, modifying bookings, or enabling checkout.
 */
export async function executeTestLiveApiConnection(
  authToken: string | null,
  dependencies: AdminSandboxTestDependencies = {}
): Promise<{ statusCode: number; body: any }> {
  const env = dependencies.envOverride || process.env;
  const supabaseUrl = env.SUPABASE_URL || '';
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const fetchFn = dependencies.fetchFn || global.fetch;

  // 1. Authenticate administrator server-side using quotation_admins authorization table
  if (!authToken || !authToken.trim()) {
    return {
      statusCode: 401,
      body: {
        success: false,
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
        error: 'Forbidden: Access restricted to authorized quotation administrators.',
      },
    };
  }

  // 2. Read PAGUELOFACIL_ACCESS_TOKEN only from server-side environment variables
  // Never read sandbox credentials or fall back to sandbox credentials.
  // Never expose this token in results, error messages, or logs.
  const liveToken = (env.PAGUELOFACIL_ACCESS_TOKEN || '').trim();
  const endpoint = 'https://admin.paguelofacil.com/PFManagementServices/api/v1/MerchantTransactions';
  const timestamp = new Date().toISOString();

  if (!liveToken) {
    return {
      statusCode: 200,
      body: {
        success: false,
        action: 'test_live_api_connection',
        liveApiTest: {
          reachable: false,
          authenticated: false,
          httpStatus: null,
          category: 'missing_configuration',
          explanation: 'PAGUELOFACIL_ACCESS_TOKEN is not configured in server environment variables.',
          endpoint,
          timestamp,
        },
      },
    };
  }

  // 3. Perform read-only GET request to production MerchantTransactions API endpoint
  // Using a deliberately nonexistent, well-formed operation code filter so no real customer transaction data is requested.
  const probeCodOper = 'LK-LIVE-PROBE-NONEXISTENT-000';
  const filterParam = `codOper::${probeCodOper}`;
  const requestUrl = `${endpoint}?filter=${encodeURIComponent(filterParam)}`;

  try {
    const response = await fetchFn(requestUrl, {
      method: 'GET',
      headers: {
        Authorization: liveToken, // Documented raw token header
        Accept: 'application/json',
      },
    });

    const httpStatus = response.status;

    // 4. Inspect HTTP status & API-level response
    if (httpStatus === 401 || httpStatus === 403) {
      return {
        statusCode: 200,
        body: {
          success: false,
          action: 'test_live_api_connection',
          liveApiTest: {
            reachable: true,
            authenticated: false,
            httpStatus,
            category: httpStatus === 401 ? 'invalid_credentials' : 'unauthorized',
            explanation: `PagueloFacil production API rejected authentication (HTTP ${httpStatus}). The configured PAGUELOFACIL_ACCESS_TOKEN is invalid or unauthorized.`,
            endpoint,
            timestamp,
          },
        },
      };
    }

    if (httpStatus === 404 || httpStatus === 405 || httpStatus === 501) {
      return {
        statusCode: 200,
        body: {
          success: false,
          action: 'test_live_api_connection',
          liveApiTest: {
            reachable: true,
            authenticated: 'unknown',
            httpStatus,
            category: 'unsupported_endpoint',
            explanation: `PagueloFacil endpoint returned unexpected HTTP ${httpStatus}. The requested endpoint path may have changed.`,
            endpoint,
            timestamp,
          },
        },
      };
    }

    if (httpStatus >= 500) {
      return {
        statusCode: 200,
        body: {
          success: false,
          action: 'test_live_api_connection',
          liveApiTest: {
            reachable: true,
            authenticated: 'unknown',
            httpStatus,
            category: 'network_error',
            explanation: `PagueloFacil gateway service returned HTTP ${httpStatus}. Gateway may be experiencing temporary issues.`,
            endpoint,
            timestamp,
          },
        },
      };
    }

    if (httpStatus !== 200) {
      return {
        statusCode: 200,
        body: {
          success: false,
          action: 'test_live_api_connection',
          liveApiTest: {
            reachable: true,
            authenticated: 'unknown',
            httpStatus,
            category: 'inconclusive',
            explanation: `PagueloFacil returned unexpected HTTP status ${httpStatus}.`,
            endpoint,
            timestamp,
          },
        },
      };
    }

    // Inspect HTTP 200 response body - do NOT treat HTTP 200 alone as proof of authentication
    let payload: any;
    try {
      payload = await response.json();
    } catch {
      return {
        statusCode: 200,
        body: {
          success: false,
          action: 'test_live_api_connection',
          liveApiTest: {
            reachable: true,
            authenticated: 'unknown',
            httpStatus: 200,
            category: 'inconclusive',
            explanation: 'Received HTTP 200 from production endpoint, but response body was not valid JSON.',
            endpoint,
            timestamp,
          },
        },
      };
    }

    // Check if body signals authentication failure or error despite HTTP 200
    const rawHeaderCode = payload?.headerStatus?.code;
    const isHeaderAuthFail = rawHeaderCode === 401 || rawHeaderCode === 403 || payload?.status === 401 || payload?.status === 403;
    const bodyStr = JSON.stringify(payload);
    const hasAuthFailureText = /unauthorized|token.*inv[aá]lido|invalid.*token|no.*autorizado|credencial.*inv[aá]lida|authentication.*fail/i.test(bodyStr);

    if (isHeaderAuthFail || hasAuthFailureText) {
      return {
        statusCode: 200,
        body: {
          success: false,
          action: 'test_live_api_connection',
          liveApiTest: {
            reachable: true,
            authenticated: false,
            httpStatus: 200,
            category: 'invalid_credentials',
            explanation: 'PagueloFacil API returned HTTP 200 but reported authentication failure in response body.',
            endpoint,
            timestamp,
          },
        },
      };
    }

    // Check for records in response
    const records = Array.isArray(payload?.data)
      ? payload.data
      : (payload?.data ? [payload.data] : (Array.isArray(payload) ? payload : []));

    if (records.length === 0) {
      return {
        statusCode: 200,
        body: {
          success: true,
          action: 'test_live_api_connection',
          liveApiTest: {
            reachable: true,
            authenticated: true,
            httpStatus: 200,
            category: 'authenticated_empty',
            explanation: 'Production REST API credential verified successfully! Connected and authenticated to MerchantTransactions with zero matching records for probe filter.',
            endpoint,
            timestamp,
          },
        },
      };
    }

    return {
      statusCode: 200,
      body: {
        success: true,
        action: 'test_live_api_connection',
        liveApiTest: {
          reachable: true,
          authenticated: true,
          httpStatus: 200,
          category: 'authenticated',
          explanation: 'Production REST API credential verified successfully.',
          endpoint,
          timestamp,
        },
      },
    };
  } catch (err: any) {
    return {
      statusCode: 200,
      body: {
        success: false,
        action: 'test_live_api_connection',
        liveApiTest: {
          reachable: false,
          authenticated: 'unknown',
          httpStatus: null,
          category: 'network_error',
          explanation: `Network error connecting to PagueloFacil production API: ${err.message}`,
          endpoint,
          timestamp,
        },
      },
    };
  }
}

/**
 * Admin-Only Action: Secure Read-Only PagueloFacil LIVE CCLW Checkout-Link Creation Test (No Charge)
 * Generates an isolated $1.00 USD probe checkout link to verify production CCLW.
 * Never opens, shares, captures, or pays the link; validates the returned HTTPS host against trusted production hosts.
 */
export async function executeTestLiveCheckoutConnection(
  authToken: string | null,
  dependencies: AdminSandboxTestDependencies = {}
): Promise<{ statusCode: number; body: any }> {
  const env = dependencies.envOverride || process.env;
  const supabaseUrl = env.SUPABASE_URL || '';
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const fetchFn = dependencies.fetchFn || global.fetch;

  // 1. Authenticate administrator server-side using quotation_admins authorization table
  if (!authToken || !authToken.trim()) {
    return {
      statusCode: 401,
      body: {
        success: false,
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
        error: 'Forbidden: Access restricted to authorized quotation administrators.',
      },
    };
  }

  // 2. Read PAGUELOFACIL_CCLW only from server-side environment variables
  // Never read sandbox CCLW or require PAGUELOFACIL_ENV to be changed.
  // Never expose CCLW or generated checkout URL to browser or logs.
  const liveCclw = (env.PAGUELOFACIL_CCLW || '').trim();
  const endpoint = 'https://secure.paguelofacil.com/LinkDeamon.cfm';
  const timestamp = new Date().toISOString();

  if (!liveCclw) {
    return {
      statusCode: 200,
      body: {
        success: false,
        action: 'test_live_checkout_connection',
        liveCheckoutTest: {
          reachable: false,
          httpStatus: null,
          category: 'missing_configuration',
          credentialAccepted: false,
          checkoutUrlGenerated: false,
          validatedHost: null,
          sanitizedErrorReason: 'PAGUELOFACIL_CCLW is not configured in server environment variables.',
          endpoint,
          timestamp,
        },
      },
    };
  }

  if (!validateCclw(liveCclw)) {
    return {
      statusCode: 200,
      body: {
        success: false,
        action: 'test_live_checkout_connection',
        liveCheckoutTest: {
          reachable: false,
          httpStatus: null,
          category: 'invalid_cclw',
          credentialAccepted: false,
          checkoutUrlGenerated: false,
          validatedHost: null,
          sanitizedErrorReason: 'PAGUELOFACIL_CCLW contains invalid characters or format.',
          endpoint,
          timestamp,
        },
      },
    };
  }

  // 3. Construct Documented LinkDeamon Request Payload
  const probeReference = `LIVE-CONNECTION-PROBE-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const probeAttemptKey = `idem_live_probe_${Date.now()}`;

  const formParams = new URLSearchParams();
  formParams.append('CCLW', liveCclw);
  formParams.append('CMTN', '1.00'); // $1.00 USD
  formParams.append('CDSC', 'Connection test - do not pay');
  formParams.append('RETURN_URL', 'https://gunayalapanama.com/admin?live-probe=complete');
  formParams.append('PARM_1', probeReference);
  formParams.append('PARM_2', probeAttemptKey);
  formParams.append('EXPIRES_IN', '900'); // 15-minute short probe expiry

  try {
    const response = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formParams.toString(),
    });

    const httpStatus = response.status;

    if (!response.ok) {
      const isAuthStatus = httpStatus === 401 || httpStatus === 403 || httpStatus === 422;
      return {
        statusCode: 200,
        body: {
          success: false,
          action: 'test_live_checkout_connection',
          liveCheckoutTest: {
            reachable: true,
            httpStatus,
            category: isAuthStatus ? 'invalid_cclw' : 'gateway_error',
            credentialAccepted: isAuthStatus ? false : 'unknown',
            checkoutUrlGenerated: false,
            validatedHost: null,
            sanitizedErrorReason: `Production LinkDeamon returned HTTP ${httpStatus}.`,
            endpoint,
            timestamp,
          },
        },
      };
    }

    let responseData: any;
    try {
      responseData = await response.json();
    } catch {
      return {
        statusCode: 200,
        body: {
          success: false,
          action: 'test_live_checkout_connection',
          liveCheckoutTest: {
            reachable: true,
            httpStatus,
            category: 'malformed_response',
            credentialAccepted: 'unknown',
            checkoutUrlGenerated: false,
            validatedHost: null,
            sanitizedErrorReason: 'Production endpoint returned HTTP 200 but response body was not valid JSON.',
            endpoint,
            timestamp,
          },
        },
      };
    }

    // Inspect API-level response code & presence of checkout URL
    if (responseData.headerStatus?.code !== 200 || !responseData.data?.url) {
      const errorMsg =
        responseData.headerStatus?.description ||
        responseData.message ||
        'PagueloFacil rejected hosted checkout link generation.';
      const isCclwError = /cclw|merchant|credencial|invalido|unauthorized|no.*autorizado/i.test(errorMsg);

      return {
        statusCode: 200,
        body: {
          success: false,
          action: 'test_live_checkout_connection',
          liveCheckoutTest: {
            reachable: true,
            httpStatus,
            category: isCclwError ? 'invalid_cclw' : 'gateway_error',
            credentialAccepted: isCclwError ? false : 'unknown',
            checkoutUrlGenerated: false,
            validatedHost: null,
            sanitizedErrorReason: errorMsg,
            endpoint,
            timestamp,
          },
        },
      };
    }

    // Validate the generated checkout URL strictly against trusted PagueloFacil production hostnames
    const rawUrl = String(responseData.data.url);
    const urlValidation = validatePagueloFacilCheckoutUrl(rawUrl, 'production');

    if (!urlValidation.valid || !urlValidation.url) {
      return {
        statusCode: 200,
        body: {
          success: false,
          action: 'test_live_checkout_connection',
          liveCheckoutTest: {
            reachable: true,
            httpStatus,
            category: 'untrusted_hostname',
            credentialAccepted: true,
            checkoutUrlGenerated: false,
            validatedHost: null,
            sanitizedErrorReason: 'Checkout URL does not match trusted PagueloFacil production hostnames.',
            endpoint,
            timestamp,
          },
        },
      };
    }

    const validatedHost = new URL(urlValidation.url).hostname.toLowerCase();

    // SUCCESS: Credential accepted, checkout URL generated, host validated
    // Crucial: The full checkout URL and CCLW are NEVER logged or returned to the client
    return {
      statusCode: 200,
      body: {
        success: true,
        action: 'test_live_checkout_connection',
        liveCheckoutTest: {
          reachable: true,
          httpStatus: 200,
          category: 'checkout_link_created',
          credentialAccepted: true,
          checkoutUrlGenerated: true,
          validatedHost,
          endpoint,
          timestamp,
        },
      },
    };
  } catch (err: any) {
    return {
      statusCode: 200,
      body: {
        success: false,
        action: 'test_live_checkout_connection',
        liveCheckoutTest: {
          reachable: false,
          httpStatus: null,
          category: 'gateway_error',
          credentialAccepted: 'unknown',
          checkoutUrlGenerated: false,
          validatedHost: null,
          sanitizedErrorReason: `Network error connecting to production LinkDeamon: ${err.message}`,
          endpoint,
          timestamp,
        },
      },
    };
  }
}

/**
 * Admin-Only Action: Create Controlled Single LIVE Payment Test ($69.00 USD Carti Port)
 * Explicit admin confirmation required.
 * Enforces single authorized outstanding live test transaction.
 * Creates genuine production booking and pending payment row in Supabase.
 * Generates genuine production checkout URL via PagueloFacil LinkDeamon.
 * Returns checkout link ONLY to the authenticated admin.
 */
export async function executeCreateControlledLiveTest(
  authToken: string | null,
  requestBody: any = {},
  dependencies: AdminSandboxTestDependencies = {}
): Promise<{ statusCode: number; body: any }> {
  const env = dependencies.envOverride || process.env;
  const supabaseUrl = env.SUPABASE_URL || '';
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const fetchFn = dependencies.fetchFn || global.fetch;

  // 1. Authenticate administrator server-side using quotation_admins authorization table
  if (!authToken || !authToken.trim()) {
    return {
      statusCode: 401,
      body: {
        success: false,
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
        error: 'Forbidden: Access restricted to authorized quotation administrators.',
      },
    };
  }

  // Rate limit check
  if (!dependencies.skipRateLimit) {
    const rateLimit = checkRateLimit(adminUserId);
    if (!rateLimit.allowed) {
      return {
        statusCode: 429,
        body: {
          success: false,
          error: rateLimit.error,
        },
      };
    }
  }

  // Concurrency Guard: Make one-active-LIVE-test creation safe against simultaneous admin requests
  if (liveTestCreationInProgress) {
    return {
      statusCode: 409,
      body: {
        success: false,
        action: 'create_controlled_live_test',
        error: 'A controlled live test creation request is currently in progress. Please wait for it to complete.',
      },
    };
  }

  liveTestCreationInProgress = true;
  let atomicLockAcquired = false;
  let activeOwnerToken: string | undefined = undefined;

  try {
    // 2. Explicit Administrator Confirmation Check
    if (requestBody?.confirmed !== true) {
      return {
        statusCode: 400,
        body: {
          success: false,
          action: 'create_controlled_live_test',
          error: 'Explicit administrator confirmation is required before creating a real production payment checkout link.',
        },
      };
    }

    // 3. Acquire atomic database-backed lock across serverless function instances
    const dbLock = await acquireAtomicLiveTestLock(supabase, adminUserId);
    if (!dbLock.acquired || !dbLock.ownerToken) {
      return {
        statusCode: 409,
        body: {
          success: false,
          action: 'create_controlled_live_test',
          error: dbLock.error || 'A controlled live test creation request is currently in progress across function instances. Please wait.',
        },
      };
    }
    atomicLockAcquired = true;
    activeOwnerToken = dbLock.ownerToken;

    // 3. Enforce single authorized outstanding live test transaction
    // MUST apply ONLY to controlled live test records (LIVE-DAYTOUR-GNY-*), never to unrelated future production customers!
    const { data: allProdTxs } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('environment', 'production');

    const controlledLiveTxs = (allProdTxs || []).filter((tx: any) =>
      String(tx.booking_reference || '').startsWith('LIVE-DAYTOUR-GNY-') &&
      (tx.audit_metadata?.is_live_test === true || tx.audit_metadata?.created_via === 'admin_controlled_live_test' || !tx.audit_metadata)
    );

    const now = Date.now();

    // Cancellation Safety Check:
    // Block creation if any controlled live test is:
    // 1. In needs_manual_review status (uncertain gateway failure requiring independent resolution), REGARDLESS of expires_at!
    // 2. Pending and still within its payable window (expires_at in future).
    const unresolvedTest = controlledLiveTxs.find((tx: any) => {
      if (tx.status === 'approved') return false;
      if (tx.status === 'needs_manual_review') return true;
      if (tx.status === 'pending') {
        return tx.expires_at ? new Date(tx.expires_at).getTime() > now : true;
      }
      return false;
    });

    if (unresolvedTest) {
      const isManualReview = unresolvedTest.status === 'needs_manual_review';
      return {
        statusCode: 200,
        body: {
          success: false,
          action: 'create_controlled_live_test',
          error: isManualReview
            ? `An authorized production live test is awaiting manual review (Booking: ${unresolvedTest.booking_reference}). Replacement link creation is blocked until the previous attempt is independently resolved.`
            : `An authorized production live test is already outstanding (Booking: ${unresolvedTest.booking_reference}). Only one active live test is permitted to prevent duplicate charges. Check status or cancel previous test first.`,
          activeBookingReference: unresolvedTest.booking_reference,
          activeStatus: unresolvedTest.status,
          activeExpiresAt: unresolvedTest.expires_at,
          gatewayLinkStillPayable: unresolvedTest.status === 'pending',
          requiresManualReview: isManualReview,
        },
      };
    }

    // Check if any expired pending live tests exist
    const expiredPendingTxs = controlledLiveTxs.filter((tx: any) =>
      tx.status === 'pending' &&
      tx.expires_at &&
      new Date(tx.expires_at).getTime() <= now
    );

    if (expiredPendingTxs.length > 0) {
      if (requestBody?.forceCancelPrevious === true) {
        for (const oldTx of expiredPendingTxs) {
          await supabase
            .from('payment_transactions')
            .update({
              status: 'expired',
              audit_metadata: {
                ...(oldTx.audit_metadata || {}),
                expired_at_payable_window_end: true,
                canceled_by_admin: true,
                canceled_at: new Date().toISOString(),
                cancel_reason: 'Replaced after payable window ended',
              },
            })
            .eq('id', oldTx.id)
            .select('id');

          if (oldTx.booking_reference) {
            await supabase
              .from('booking_requests')
              .update({
                status: 'cancelled',
                updated_at: new Date().toISOString(),
              })
              .eq('booking_reference', oldTx.booking_reference)
              .select('booking_reference');
          }
        }
      } else {
        const activeTx = expiredPendingTxs[0];
        return {
          statusCode: 200,
          body: {
            success: false,
            action: 'create_controlled_live_test',
            error: `An authorized production live test has expired (Booking: ${activeTx.booking_reference}). Clean up expired test with forceCancelPrevious before issuing a new one.`,
            activeBookingReference: activeTx.booking_reference,
            activeExpiresAt: activeTx.expires_at,
          },
        };
      }
    }

    // 4. Verify Server-Side Production CCLW
    const liveCclw = (env.PAGUELOFACIL_CCLW || '').trim();
    if (!liveCclw || !validateCclw(liveCclw)) {
      return {
        statusCode: 200,
        body: {
          success: false,
          action: 'create_controlled_live_test',
          error: 'PAGUELOFACIL_CCLW is missing or invalid in server environment.',
        },
      };
    }

    // 5. Generate Distinct Production Live Test Booking Reference & Parameters
    const bookingRef = `LIVE-DAYTOUR-GNY-${Math.floor(100000 + Math.random() * 900000)}`;
    const idempotencyKey = `idem_prod_live_test_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const amount = 69.00;
    const amountInCents = 6900;
    const expiresAt = new Date(Date.now() + 7200 * 1000).toISOString();

    // 6. Record Genuine Production Day Tour Booking in booking_requests
    // Check errors and exactly-one-row results
    const customerName = (requestBody?.customerName || 'Petra (Live Acceptance Test)').trim();
    const customerEmail = (requestBody?.customerEmail || authData.user.email || 'petra@gunayalapanama.com').trim();

    const { data: bookingRows, error: bookingErr } = await supabase
      .from('booking_requests')
      .upsert(
        {
          booking_reference: bookingRef,
          booking_type: 'day-trip',
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: (requestBody?.customerPhone || '').trim(),
          experience_title: 'San Blas Day Tour (Cartí Port Direct Arrival)',
          target_date: new Date().toISOString().split('T')[0],
          adults: 1,
          children: 0,
          pickup_location: 'Cartí Port (Direct Arrival)',
          special_notes: '[PROD LIVE TEST] Authorized single production payment test by administrator. Carti Port $69.00 USD.',
          terms_accepted: true,
          terms_version: '2026-10-18',
          customer_language: 'es',
          status: 'pending_payment',
          idempotency_key: idempotencyKey,
        },
        { onConflict: 'booking_reference' }
      )
      .select('*');

    if (bookingErr || !bookingRows || bookingRows.length !== 1) {
      return {
        statusCode: 500,
        body: {
          success: false,
          action: 'create_controlled_live_test',
          error: `Database write failure on booking_requests: ${bookingErr?.message || 'Expected exactly 1 row'}`,
        },
      };
    }

    // 7. Record Production Payment Transaction in payment_transactions
    // Check errors and exactly-one-row results
    const { data: txRows, error: txErr } = await supabase
      .from('payment_transactions')
      .upsert(
        {
          booking_reference: bookingRef,
          booking_type: 'day-trip',
          gateway: 'paguelofacil',
          environment: 'production',
          currency: 'USD',
          expected_amount: amount,
          amount_in_cents: amountInCents,
          payment_type: 'full',
          status: 'pending',
          idempotency_key: idempotencyKey,
          expires_at: expiresAt,
          audit_metadata: {
            environment: 'production',
            is_live_test: true,
            is_demo: false,
            is_test: false,
            amount_in_cents: amountInCents,
            package_id: 'day-tour-port',
            created_via: 'admin_controlled_live_test',
            created_by_admin: adminUserId,
            created_at: new Date().toISOString(),
          },
        },
        { onConflict: 'idempotency_key' }
      )
      .select('*');

    if (txErr || !txRows || txRows.length !== 1) {
      // Rollback booking_requests to prevent orphaned records
      await supabase.from('booking_requests').delete().eq('booking_reference', bookingRef);
      return {
        statusCode: 500,
        body: {
          success: false,
          action: 'create_controlled_live_test',
          error: `Database write failure on payment_transactions: ${txErr?.message || 'Expected exactly 1 row'}`,
        },
      };
    }

    // 8. Generate Genuine Production Checkout Link via PagueloFacil LinkDeamon
    const endpoint = 'https://secure.paguelofacil.com/LinkDeamon.cfm';
    const returnUrl = `https://gunayalapanama.com/checkout/complete?bookingReference=${bookingRef}`;

    const formParams = new URLSearchParams();
    formParams.append('CCLW', liveCclw);
    formParams.append('CMTN', '69.00'); // $69.00 USD
    formParams.append('CDSC', 'Guna Yala Day Tour Carti Port Live Test');
    formParams.append('RETURN_URL', returnUrl);
    formParams.append('PARM_1', bookingRef);
    formParams.append('PARM_2', idempotencyKey);
    formParams.append('EXPIRES_IN', '7200'); // 2 hours

    try {
      const response = await fetchFn(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formParams.toString(),
      });

      if (!response.ok) {
        return {
          statusCode: 200,
          body: {
            success: false,
            action: 'create_controlled_live_test',
            error: `Production LinkDeamon returned HTTP ${response.status}.`,
          },
        };
      }

      let responseData: any;
      try {
        responseData = await response.json();
      } catch {
        return {
          statusCode: 200,
          body: {
            success: false,
            action: 'create_controlled_live_test',
            error: 'Production LinkDeamon returned non-JSON response.',
          },
        };
      }

      if (responseData.headerStatus?.code !== 200 || !responseData.data?.url) {
        const errorMsg =
          responseData.headerStatus?.description ||
          responseData.message ||
          'PagueloFacil rejected production checkout link creation.';
        return {
          statusCode: 200,
          body: {
            success: false,
            action: 'create_controlled_live_test',
            error: errorMsg,
          },
        };
      }

      // Validate returned URL against trusted PagueloFacil production hostnames
      const rawUrl = String(responseData.data.url);
      const urlValidation = validatePagueloFacilCheckoutUrl(rawUrl, 'production');

      if (!urlValidation.valid || !urlValidation.url) {
        return {
          statusCode: 200,
          body: {
            success: false,
            action: 'create_controlled_live_test',
            error: 'Generated checkout URL does not match trusted PagueloFacil production hostnames.',
          },
        };
      }

      // Check errors and exactly-one-row for gateway link persistence
      const { data: updatedTxRows, error: updateErr } = await supabase
        .from('payment_transactions')
        .update({
          gateway_link_code: responseData.data.code || null,
          payment_url: urlValidation.url,
        })
        .eq('booking_reference', bookingRef)
        .select('*');

      if (updateErr || !updatedTxRows || updatedTxRows.length !== 1) {
        // Link was generated but failed to persist durably in database!
        // Suppress payable link so it cannot be orphaned or blindly paid
        await supabase
          .from('payment_transactions')
          .update({
            status: 'needs_manual_review',
            audit_metadata: {
              ...(txRows[0].audit_metadata || {}),
              link_persistence_failed: true,
              gateway_code: responseData.data.code,
              error: updateErr?.message,
            },
          })
          .eq('booking_reference', bookingRef);

        return {
          statusCode: 500,
          body: {
            success: false,
            action: 'create_controlled_live_test',
            error: `Database failure: Failed to durably persist gateway checkout link in database: ${updateErr?.message || 'Expected exactly 1 row'}. Link suppressed for safety.`,
          },
        };
      }

      // Return genuine checkout link to the authenticated administrator only for secure sharing with Petra
      return {
        statusCode: 200,
        body: {
          success: true,
          action: 'create_controlled_live_test',
          controlledLiveTestBooking: {
            success: true,
            bookingReference: bookingRef,
            paymentUrl: urlValidation.url,
            gatewayLinkCode: responseData.data.code,
            amount: 69.00,
            currency: 'USD',
            status: 'pending_payment',
            environment: 'production',
            expiresAt,
            message: 'Production $69.00 Carti Port checkout link generated successfully for Petra.',
          },
        },
      };
    } catch (err: any) {
      // Conservative failure handling on uncertain production LinkDeamon failures:
      // Preserve transaction as needs_manual_review (NOT expired) so replacement links remain blocked until independently resolved.
      if (typeof bookingRef === 'string' && bookingRef) {
        try {
          await supabase
            .from('payment_transactions')
            .update({
              status: 'needs_manual_review',
              audit_metadata: {
                gateway_creation_failed: true,
                uncertain_gateway_failure: true,
                error: err?.message || 'Uncertain gateway creation error',
              },
            })
            .eq('booking_reference', bookingRef);

          await supabase
            .from('booking_requests')
            .update({ status: 'needs_manual_review' })
            .eq('booking_reference', bookingRef);
        } catch {
          // Ignore cleanup error
        }
      }

      return {
        statusCode: 200,
        body: {
          success: false,
          action: 'create_controlled_live_test',
          error: `Uncertain network error connecting to production LinkDeamon: ${err.message}. Transaction preserved as needs_manual_review for safe manual review.`,
        },
      };
    }
  } finally {
    if (atomicLockAcquired && activeOwnerToken) {
      await releaseAtomicLiveTestLock(supabase, activeOwnerToken);
    }
    liveTestCreationInProgress = false;
  }
}

/**
 * Admin-Only Action: Check Controlled LIVE Test Booking Status
 * Queries Supabase and reconciles against PagueloFacil production MerchantTransactions API if pending.
 * Never reports a payment approved based solely on browser return.
 */
export async function executeCheckControlledLiveTestStatus(
  authToken: string | null,
  requestBody: any = {},
  dependencies: AdminSandboxTestDependencies = {}
): Promise<{ statusCode: number; body: any }> {
  const env = dependencies.envOverride || process.env;
  const supabaseUrl = env.SUPABASE_URL || '';
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  const fetchFn = dependencies.fetchFn || global.fetch;

  // 1. Authenticate administrator
  if (!authToken || !authToken.trim()) {
    return {
      statusCode: 401,
      body: {
        success: false,
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
        error: 'Forbidden: Access restricted to authorized quotation administrators.',
      },
    };
  }

  // 2. Query target production live test transaction
  let targetTx: any = null;
  const bookingRef = requestBody?.bookingReference;

  if (bookingRef) {
    const { data: foundTx } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('booking_reference', bookingRef)
      .eq('environment', 'production')
      .maybeSingle();
    targetTx = foundTx;
  } else {
    // Look up latest production live test
    const { data: foundRows } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('environment', 'production')
      .ilike('booking_reference', 'LIVE-DAYTOUR-GNY-%')
      .order('created_at', { ascending: false })
      .limit(1);
    if (foundRows && foundRows.length > 0) {
      targetTx = foundRows[0];
    }
  }

  if (!targetTx) {
    return {
      statusCode: 200,
      body: {
        success: false,
        action: 'check_controlled_live_test_status',
        error: 'No production live test transaction found in database.',
      },
    };
  }

  // 3. If already approved, return authoritative status
  if (targetTx.status === 'approved') {
    const { data: bookingRow } = await supabase
      .from('booking_requests')
      .select('status')
      .eq('booking_reference', targetTx.booking_reference)
      .maybeSingle();

    return {
      statusCode: 200,
      body: {
        success: true,
        action: 'check_controlled_live_test_status',
        controlledLiveTestStatus: {
          success: true,
          bookingReference: targetTx.booking_reference,
          environment: 'production',
          paymentStatus: 'approved',
          bookingStatus: bookingRow?.status || 'fully_confirmed',
          amountPaid: targetTx.amount_paid || targetTx.expected_amount,
          expectedAmount: targetTx.expected_amount || 69.00,
          currency: 'USD',
          gatewayOperationId: targetTx.gateway_operation_id,
          verifiedAt: targetTx.verified_at,
          reconciled: true,
          message: 'Live test payment is confirmed and approved in Supabase!',
        },
      },
    };
  }

  // 4. If pending, query PagueloFacil production MerchantTransactions authoritatively to reconcile
  const reconciliation = await reconcilePaymentTransaction({
    bookingReference: targetTx.booking_reference,
    operationCode: targetTx.gateway_operation_id,
    linkCode: targetTx.gateway_link_code,
    idempotencyKey: targetTx.idempotency_key,
    environment: 'production',
    supabaseClient: supabase,
    env,
    fetchFn,
  });

  if (reconciliation.success && reconciliation.category === 'approved') {
    return {
      statusCode: 200,
      body: {
        success: true,
        action: 'check_controlled_live_test_status',
        controlledLiveTestStatus: {
          success: true,
          bookingReference: targetTx.booking_reference,
          environment: 'production',
          paymentStatus: 'approved',
          bookingStatus: 'fully_confirmed',
          amountPaid: reconciliation.amountPaid || 69.00,
          expectedAmount: targetTx.expected_amount || 69.00,
          currency: 'USD',
          gatewayOperationId: reconciliation.operationCode,
          verifiedAt: new Date().toISOString(),
          reconciled: true,
          message: 'Payment verified and confirmed via PagueloFacil production MerchantTransactions API!',
        },
      },
    };
  }

  if (reconciliation.category === 'needs_manual_review') {
    return {
      statusCode: 200,
      body: {
        success: true,
        action: 'check_controlled_live_test_status',
        controlledLiveTestStatus: {
          success: false,
          bookingReference: targetTx.booking_reference,
          environment: 'production',
          paymentStatus: 'needs_manual_review',
          bookingStatus: 'pending_payment',
          expectedAmount: targetTx.expected_amount || 69.00,
          currency: 'USD',
          reconciled: false,
          category: 'needs_manual_review',
          message: reconciliation.message || 'Multiple or ambiguous PagueloFacil transactions detected. Manual review required.',
        },
      },
    };
  }

  return {
    statusCode: 200,
    body: {
      success: true,
      action: 'check_controlled_live_test_status',
      controlledLiveTestStatus: {
        success: false,
        bookingReference: targetTx.booking_reference,
        environment: 'production',
        paymentStatus: targetTx.status,
        bookingStatus: 'pending_payment',
        expectedAmount: targetTx.expected_amount || 69.00,
        currency: 'USD',
        reconciled: false,
        category: reconciliation.category || 'absent_records',
        message: reconciliation.message || 'Payment has not yet been completed on PagueloFacil portal.',
      },
    },
  };
}

/**
 * Admin-Only Action: Cancel Controlled LIVE Test Booking
 * Allows administrator to expire a pending live test so a fresh one can be issued after expiry.
 */
export async function executeCancelControlledLiveTest(
  authToken: string | null,
  requestBody: any = {},
  dependencies: AdminSandboxTestDependencies = {}
): Promise<{ statusCode: number; body: any }> {
  const env = dependencies.envOverride || process.env;
  const supabaseUrl = env.SUPABASE_URL || '';
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

  // 1. Authenticate administrator
  if (!authToken || !authToken.trim()) {
    return {
      statusCode: 401,
      body: {
        success: false,
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
        error: 'Forbidden: Access restricted to authorized quotation administrators.',
      },
    };
  }

  const bookingRef = requestBody?.bookingReference;
  let targetRef = bookingRef;

  // Strict check: if a bookingReference is provided, it must be a controlled live test
  if (targetRef && !targetRef.startsWith('LIVE-DAYTOUR-GNY-')) {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: 'Invalid booking reference: only controlled live test bookings (LIVE-DAYTOUR-GNY-*) can be cancelled here.',
      },
    };
  }

  let targetTx: any = null;

  if (targetRef) {
    const { data: foundTx } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('booking_reference', targetRef)
      .eq('environment', 'production')
      .maybeSingle();
    targetTx = foundTx;
  } else {
    const { data: latestRows } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('environment', 'production')
      .ilike('booking_reference', 'LIVE-DAYTOUR-GNY-%')
      .in('status', ['pending', 'cancelled_pending_expiry'])
      .order('created_at', { ascending: false })
      .limit(1);
    if (latestRows && latestRows.length > 0) {
      targetTx = latestRows[0];
      targetRef = targetTx.booking_reference;
    }
  }

  if (!targetTx) {
    return {
      statusCode: 200,
      body: {
        success: false,
        error: 'No active pending production live test found to cancel.',
      },
    };
  }

  if (targetTx.status === 'approved') {
    return {
      statusCode: 400,
      body: {
        success: false,
        error: `Cannot cancel live test ${targetRef} because the payment has already been approved and confirmed.`,
      },
    };
  }

  const isStillInPayableWindow = targetTx.expires_at && new Date(targetTx.expires_at).getTime() > Date.now();
  const newStatus = isStillInPayableWindow ? 'cancelled_pending_expiry' : 'expired';

  await supabase
    .from('payment_transactions')
    .update({
      status: newStatus,
      audit_metadata: {
        ...(typeof targetTx.audit_metadata === 'object' ? targetTx.audit_metadata : {}),
        canceled_by_admin: true,
        canceled_at: new Date().toISOString(),
        canceled_by_user_id: adminUserId,
        gateway_link_still_payable: isStillInPayableWindow,
      },
      updated_at: new Date().toISOString(),
    })
    .eq('booking_reference', targetRef)
    .eq('environment', 'production');

  await supabase
    .from('booking_requests')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('booking_reference', targetRef);

  return {
    statusCode: 200,
    body: {
      success: true,
      action: 'cancel_controlled_live_test',
      status: newStatus,
      gatewayLinkStillPayable: isStillInPayableWindow,
      expiresAt: targetTx.expires_at,
      message: isStillInPayableWindow
        ? `Production live test ${targetRef} marked as cancelled, but the PagueloFacil hosted link remains active until ${targetTx.expires_at}. No new live test can be created until this window expires to prevent duplicate charges.`
        : `Production live test ${targetRef} expired and cancelled successfully.`,
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
  if (requestBody?.action === 'test_live_api_connection') {
    return await executeTestLiveApiConnection(authToken, dependencies);
  }
  if (requestBody?.action === 'test_live_checkout_connection') {
    return await executeTestLiveCheckoutConnection(authToken, dependencies);
  }
  if (requestBody?.action === 'create_controlled_live_test') {
    return await executeCreateControlledLiveTest(authToken, requestBody, dependencies);
  }
  if (requestBody?.action === 'check_controlled_live_test_status') {
    return await executeCheckControlledLiveTestStatus(authToken, requestBody, dependencies);
  }
  if (requestBody?.action === 'cancel_controlled_live_test') {
    return await executeCancelControlledLiveTest(authToken, requestBody, dependencies);
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
