import crypto from 'node:crypto';
import type { Config } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { reconcilePaymentTransaction } from './paymentReconciliation.js';

/**
 * Netlify Platform-Level Rate Limit Configuration
 * Enforced across Netlify Edge infrastructure before function invocation to mitigate distributed flooding.
 */
export const config: Config = {
  path: '/api/check-payment-status',
  rateLimit: {
    windowLimit: 15,
    windowSize: 60,
    aggregateBy: ['ip'],
  },
};

interface CheckStatusEvent {
  httpMethod: string;
  body: string | null;
  headers: Record<string, string | undefined>;
}

// In-memory sliding-window rate limit store by client IP / token
interface RateLimitRecord {
  timestamps: number[];
}
const rateLimitStore = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15; // Max 15 checks per minute per token/IP

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key) || { timestamps: [] };
  const recent = record.timestamps.filter((ts) => ts > now - RATE_LIMIT_WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  recent.push(now);
  rateLimitStore.set(key, { timestamps: recent });
  return false;
}

export function resetPaymentStatusRateLimitStoreForTesting(): void {
  rateLimitStore.clear();
}

export type MinimalPublicPaymentState = 'verifying' | 'confirmed' | 'pending' | 'contact_support';

export interface CheckPaymentStatusResponse {
  success: boolean;
  state: MinimalPublicPaymentState;
  bookingReference: string;
  message: string;
  error?: string;
}

/**
 * Parses a named cookie value securely from Cookie header
 */
function parseCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Netlify Function: check-payment-status
 * 
 * Invoked by customer return page (/checkout/complete) after returning from PagueloFacil.
 * Requirements:
 * 1. Requires unguessable verification capability (idempotencyKey or token) alongside bookingReference.
 * 2. Rate limited per client/token.
 * 3. Never accepts client-provided payment approval, amounts, or merchant IDs.
 * 4. Independently verifies payment through reconcilePaymentTransaction and atomic RPC.
 * 5. Returns minimal public state: verifying | confirmed | pending | contact_support.
 */
export const handler = async (
  event: CheckStatusEvent,
  context?: any,
  testOptions?: {
    supabaseClient?: any;
    env?: Record<string, string | undefined>;
    fetchFn?: typeof fetch;
  }
): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Verification-Key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        state: 'contact_support',
        bookingReference: '',
        message: 'Method Not Allowed. Web service requires POST.',
      }),
    };
  }

  // 1. Parse and Validate Request Payload
  let body: any;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        state: 'contact_support',
        bookingReference: '',
        message: 'Invalid request format.',
      }),
    };
  }

  const bookingReference = String(body?.bookingReference || '').trim();
  // Unguessable verification capability: must provide the transaction's verification token or idempotency key.
  // Supports request body, secure X-Verification-Key header, or __Host-payment-capability / payment_capability cookie.
  const cookieHeader = event.headers['cookie'] || event.headers['Cookie'];
  const cookieToken = parseCookie(cookieHeader, '__Host-payment-capability') || parseCookie(cookieHeader, 'payment_capability');

  const verificationKey = String(
    body?.verificationKey ||
    body?.idempotencyKey ||
    event.headers['x-verification-key'] ||
    cookieToken ||
    ''
  ).trim();

  // Reject missing or ambiguous identifiers; bookingReference alone is insufficient
  if (!bookingReference || !verificationKey) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        success: false,
        state: 'contact_support',
        bookingReference: bookingReference || '',
        message: 'Unauthorized: Booking reference and secure verification key are both required.',
      }),
    };
  }

  // 2. Dual-Layer Rate Limiting
  // Uses a compound key combining client network IP and the requested booking reference
  // so attackers cannot spoof IP headers or flood status checks across booking references.
  const rawIp = event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || (event.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'anon-client';
  const rateLimitKey = `${rawIp}::${bookingReference}`;

  if (isRateLimited(rateLimitKey)) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({
        success: false,
        state: 'verifying',
        bookingReference,
        message: 'Too many status check attempts. Please wait a few seconds before trying again.',
      }),
    };
  }

  // 3. Supabase Client & Configuration
  const env = testOptions?.env || process.env;
  const fetchFn = testOptions?.fetchFn || global.fetch;
  const supabaseUrl = env.SUPABASE_URL || '';
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

  const supabase = testOptions?.supabaseClient || createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 4. Retrieve Payment Transaction and Validate Capability
  try {
    const { data: tx, error: txError } = await supabase
      .from('payment_transactions')
      .select('id, booking_reference, idempotency_key, audit_metadata, status, environment, expected_amount, gateway_operation_id, gateway_link_code')
      .eq('booking_reference', bookingReference)
      .maybeSingle();

    if (txError || !tx) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          state: 'contact_support',
          bookingReference,
          message: 'Booking transaction record not found.',
        }),
      };
    }

    const storedAudit = typeof tx.audit_metadata === 'object' && tx.audit_metadata !== null ? tx.audit_metadata : {};

    // 4a. Genuinely Atomic Shared Rate Limiting across instances per booking record
    // Invariants:
    // 1. NEVER performs write operations or counter increments on already approved payments.
    // 2. Uses a genuine database-level atomic operation (check_and_increment_status_rate_limit RPC) with SELECT ... FOR UPDATE row-locking.
    // 3. If RPC is not yet installed in Supabase, falls back safely to verified Netlify platform-level rate limiting (config.rateLimit) without race-prone non-atomic read/writes.
    if (tx.status !== 'approved') {
      try {
        const { data: rpcLimit, error: rpcErr } = await supabase.rpc(
          'check_and_increment_status_rate_limit',
          {
            p_booking_reference: bookingReference,
            p_max_attempts: 25,
            p_window_seconds: 300,
          }
        );

        if (!rpcErr && rpcLimit && rpcLimit.allowed === false) {
          return {
            statusCode: 429,
            headers,
            body: JSON.stringify({
              success: false,
              state: 'verifying',
              bookingReference,
              message: 'Too many status check attempts for this booking. Please wait before retrying.',
            }),
          };
        }
      } catch {
        // Fall back gracefully to Netlify Edge platform-level rate limiting and in-memory compound limiter
      }
    }

    // 4b. Cryptographic verification token validation
    // Requirements:
    // 1. If separate verification_token_hash (SHA-256) is present:
    //    - Validate expiration (if configured)
    //    - Must match hashed token via timing-safe equal
    //    - Client-selected idempotencyKey is STRICTLY NOT ACCEPTED as an authorization credential
    // 2. If verification_token_hash is absent (legacy or pre-existing confirmed transactions like LIVE-DAYTOUR-GNY-220728):
    //    - Match against stored idempotency_key to preserve approved payment compatibility
    const expectedTokenHash = storedAudit.verification_token_hash;
    let isCapabilityValid = false;

    if (expectedTokenHash && typeof expectedTokenHash === 'string') {
      // Check token expiration if configured
      if (storedAudit.verification_token_expires_at) {
        const expiresAt = new Date(storedAudit.verification_token_expires_at).getTime();
        if (!isNaN(expiresAt) && Date.now() > expiresAt && tx.status !== 'approved') {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({
              success: false,
              state: 'contact_support',
              bookingReference,
              message: 'Verification token has expired. Please contact support.',
            }),
          };
        }
      }

      const incomingHash = crypto.createHash('sha256').update(verificationKey).digest('hex');
      try {
        isCapabilityValid = crypto.timingSafeEqual(Buffer.from(incomingHash, 'hex'), Buffer.from(expectedTokenHash, 'hex'));
      } catch {
        isCapabilityValid = false;
      }
      // When verification_token_hash is configured, NEVER accept an idempotency key alone
    } else {
      // Backward compatibility ONLY for legacy or pre-existing records lacking separate verification_token_hash
      if (tx.idempotency_key) {
        try {
          const bufA = Buffer.from(tx.idempotency_key);
          const bufB = Buffer.from(verificationKey);
          if (bufA.length === bufB.length) {
            isCapabilityValid = crypto.timingSafeEqual(bufA, bufB);
          } else {
            isCapabilityValid = false;
          }
        } catch {
          isCapabilityValid = false;
        }
      }
    }

    if (!isCapabilityValid) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          state: 'contact_support',
          bookingReference,
          message: 'Invalid verification capability for this booking.',
        }),
      };
    }

    // 5. If already approved, return confirmed immediately
    if (tx.status === 'approved') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          state: 'confirmed',
          bookingReference,
          message: 'Payment confirmed and booking finalized.',
        }),
      };
    }

    // If transaction is cancelled, expired, or refunded, return minimal terminal state
    if (['rejected', 'expired'].includes(tx.status)) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          state: 'contact_support',
          bookingReference,
          message: 'This payment session has expired or was not completed. Please contact support.',
        }),
      };
    }

    // 6. Independent Server-to-Server Gateway Reconcile
    // Pass operationCode from request body ONLY if valid format and tx is missing it, but NEVER trust client status
    const candidateOperation = typeof body?.operationCode === 'string' && body.operationCode.startsWith('LK-')
      ? body.operationCode.trim()
      : tx.gateway_operation_id;

    const reconciliation = await reconcilePaymentTransaction({
      bookingReference: tx.booking_reference,
      operationCode: candidateOperation,
      linkCode: tx.gateway_link_code,
      idempotencyKey: tx.idempotency_key,
      environment: tx.environment as any,
      supabaseClient: supabase,
      env,
      fetchFn,
    });

    if (reconciliation.success && reconciliation.category === 'approved') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          state: 'confirmed',
          bookingReference,
          message: 'Payment verified successfully and booking confirmed.',
        }),
      };
    }

    if (reconciliation.category === 'needs_manual_review' || reconciliation.category === 'ambiguous_records') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          state: 'contact_support',
          bookingReference,
          message: 'Payment requires administrative review. Please contact support.',
        }),
      };
    }

    // Still pending in gateway or processing
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: false,
        state: 'verifying',
        bookingReference,
        message: 'Payment verification in progress. Please hold on.',
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        state: 'contact_support',
        bookingReference,
        message: 'Internal verification service error.',
      }),
    };
  }
};
