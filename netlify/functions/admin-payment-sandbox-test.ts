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
} from '../../src/types/payment.js';

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
 * Core test execution logic, separated for isolated unit testing with mocks.
 */
export async function executeAdminSandboxTest(
  authToken: string | null,
  dependencies: AdminSandboxTestDependencies = {}
): Promise<{ statusCode: number; body: AdminSandboxTestResponse }> {
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
    RETURN_URL: 'https://gunayalapanama.com/admin?sandbox_test=complete',
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

  const result = await executeAdminSandboxTest(authHeader);

  return {
    statusCode: result.statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(result.body),
  };
};
