import { createClient } from '@supabase/supabase-js';
import { PagueloFacilGatewayAdapter } from './paymentGateway.js';

interface NetlifyEvent {
  httpMethod: string;
  body: string | null;
  headers: Record<string, string | undefined>;
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Method Not Allowed. Webhooks require POST.' }),
    };
  }

  // 2. Parse Payload
  let payload: any;
  try {
    if (!event.body) {
      throw new Error('Empty payload');
    }
    // Handle JSON or Form URL-encoded
    if (typeof event.body === 'string') {
      try {
        payload = JSON.parse(event.body);
      } catch {
        // Try parsing URL-encoded parameters (PagueloFacil standard callback format)
        const params = new URLSearchParams(event.body);
        payload = {};
        params.forEach((value, key) => {
          payload[key] = value;
        });
      }
    } else {
      payload = event.body;
    }
  } catch (err: any) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: `Invalid webhook payload: ${err.message}` }),
    };
  }

  // 3. Webhook Signature & Status Parsing via Gateway Adapter
  const gateway = new PagueloFacilGatewayAdapter();
  const parsed = gateway.parseWebhook(payload, event.headers);

  if (!parsed.isValid) {
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
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: `Invalid payment amount: $${parsed.amountPaid}. Minimum transaction is $1.00 USD.`,
      }),
    };
  }

  // 5. Pre-Load Existing Payment Transaction via Unique Identifier
  // TASK 2 REQUIREMENT:
  // A booking reference may have multiple payment attempts.
  // The webhook MUST identify the correct individual transaction using unique gateway operation ID,
  // link code, or verified payment attempt ID (idempotency key).
  // Do NOT select an arbitrary transaction using booking_reference alone. Reject ambiguous callbacks safely.
  const hasUniqueOperationId = Boolean(parsed.gatewayOperationId && parsed.gatewayOperationId.trim());
  const hasUniqueAttemptId = Boolean(parsed.idempotencyKey && parsed.idempotencyKey.trim());
  const hasUniqueLinkCode = Boolean(parsed.gatewayLinkCode && parsed.gatewayLinkCode.trim());

  if (!hasUniqueOperationId && !hasUniqueAttemptId && !hasUniqueLinkCode) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Ambiguous callback rejected: Webhook does not provide a unique gateway operation ID (Oper), payment attempt ID, or link code. Transactions cannot be identified by booking reference alone.',
      }),
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let supabase: any = null;
  let existingTx: any = null;

  if (supabaseUrl && supabaseKey) {
    try {
      supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // 1. Primary lookup: By unique gateway_operation_id
      if (hasUniqueOperationId) {
        const { data } = await supabase
          .from('payment_transactions')
          .select('id, status, environment, expected_amount, currency, gateway_operation_id, booking_reference, idempotency_key, gateway_link_code')
          .eq('gateway_operation_id', parsed.gatewayOperationId)
          .maybeSingle();
        existingTx = data;
      }

      // 2. Secondary lookup: By verified payment attempt identifier (idempotency_key)
      if (!existingTx && hasUniqueAttemptId) {
        const { data } = await supabase
          .from('payment_transactions')
          .select('id, status, environment, expected_amount, currency, gateway_operation_id, booking_reference, idempotency_key, gateway_link_code')
          .eq('idempotency_key', parsed.idempotencyKey)
          .maybeSingle();
        existingTx = data;
      }

      // 3. Tertiary lookup: By unique gateway_link_code
      if (!existingTx && hasUniqueLinkCode) {
        const { data } = await supabase
          .from('payment_transactions')
          .select('id, status, environment, expected_amount, currency, gateway_operation_id, booking_reference, idempotency_key, gateway_link_code')
          .eq('gateway_link_code', parsed.gatewayLinkCode)
          .maybeSingle();
        existingTx = data;
      }

      // If no unique record was matched, check if booking has multiple attempts to prevent arbitrary selection
      if (!existingTx && parsed.bookingReference) {
        const { data: attempts } = await supabase
          .from('payment_transactions')
          .select('id, status, environment')
          .eq('booking_reference', parsed.bookingReference);

        if (attempts && attempts.length > 0) {
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              success: false,
              error: `Ambiguous callback rejected: Booking "${parsed.bookingReference}" has ${attempts.length} payment record(s), but none match the provided gateway identifiers. Arbitrary selection by booking reference is prohibited.`,
            }),
          };
        }
      }
    } catch (err: any) {
      console.error('[PaymentWebhook] Pre-load database lookup warning:', err.message);
    }
  }

  // 6. Security & Relationship Verifications
  // 6a. Booking relationship verification
  if (existingTx && parsed.bookingReference) {
    if (existingTx.booking_reference !== parsed.bookingReference) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: `Booking relationship mismatch: Transaction belongs to booking "${existingTx.booking_reference}", but webhook specified "${parsed.bookingReference}".`,
        }),
      };
    }
  }

  // 6b. Cross-Environment Mismatch Rejection
  if (existingTx && existingTx.environment && parsed.environment) {
    if (existingTx.environment !== parsed.environment) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: `Cross-environment rejection: Webhook environment "${parsed.environment}" does not match existing transaction environment "${existingTx.environment}".`,
        }),
      };
    }
  }

  // 6c. Idempotency check: see if this specific transaction has already been approved
  if (existingTx && existingTx.status === 'approved') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        duplicate: true,
        message: 'Transaction already recorded and approved. Skipped duplicate processing.',
        bookingReference: parsed.bookingReference,
        gatewayOperationId: parsed.gatewayOperationId,
        environment: existingTx.environment || parsed.environment,
      }),
    };
  }

  // 6d. Verify payment amount against expected amount if known
  if (existingTx && existingTx.expected_amount && parsed.amountPaid !== undefined) {
    if (parsed.amountPaid < existingTx.expected_amount) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: `Payment amount $${parsed.amountPaid} is less than expected amount $${existingTx.expected_amount}.`,
        }),
      };
    }
  }

  // 7. Authoritative Server-to-Server Verification Scoped to Environment
  // Only process sandbox transactions using sandbox credentials; production with production credentials
  const targetVerificationEnv: 'sandbox' | 'production' =
    existingTx?.environment || parsed.environment || 'sandbox';

  let isAuthoritativelyApproved = false;

  if (parsed.eventType === 'payment_approved') {
    const verification = await gateway.verifyTransaction({
      gatewayOperationId: parsed.gatewayOperationId,
      bookingReference: parsed.bookingReference,
      expectedAmount: parsed.amountPaid,
      environment: targetVerificationEnv,
    });

    if (verification.verified && verification.status === 'approved') {
      isAuthoritativelyApproved = true;
    } else if (verification.missingRequirement) {
      // If authoritative verification cannot be implemented without additional merchant documentation,
      // leave the payment unconfirmed (status pending) and report the missing requirement.
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          verified: false,
          status: 'pending',
          environment: targetVerificationEnv,
          missingRequirement: verification.missingRequirement,
          message: 'Payment received but left unconfirmed pending merchant authoritative API token setup.',
          bookingReference: parsed.bookingReference,
          gatewayOperationId: parsed.gatewayOperationId,
        }),
      };
    } else {
      return {
        statusCode: 422,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          verified: false,
          environment: targetVerificationEnv,
          error: 'Authoritative server-to-server transaction verification failed. Payment not marked as approved.',
        }),
      };
    }
  }

  // 8. Idempotent Supabase Persistence with Individual Record Isolation
  if (supabase) {
    try {
      const activeEnv: 'sandbox' | 'production' =
        existingTx?.environment || parsed.environment || 'sandbox';

      const updateData: Record<string, any> = {
        status: isAuthoritativelyApproved
          ? 'approved'
          : parsed.eventType === 'payment_rejected'
          ? 'rejected'
          : 'pending',
        gateway_operation_id: parsed.gatewayOperationId || existingTx?.gateway_operation_id,
        amount_paid: parsed.amountPaid,
        card_type: parsed.cardType,
        auth_code: parsed.authCode,
        environment: activeEnv,
        verified_at: isAuthoritativelyApproved ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
        audit_metadata: {
          environment: activeEnv,
          is_demo: activeEnv === 'sandbox',
          event_type: parsed.eventType,
          verified: isAuthoritativelyApproved,
          processed_at: new Date().toISOString(),
        },
      };

      if (parsed.error) {
        updateData.error_message = parsed.error;
      }

      // Individual Record Targeting: Update by primary id or unique gateway_operation_id
      // NEVER update by booking_reference alone to preserve multi-attempt isolation
      if (existingTx?.id) {
        await supabase
          .from('payment_transactions')
          .update(updateData)
          .eq('id', existingTx.id);
      } else if (parsed.gatewayOperationId) {
        await supabase
          .from('payment_transactions')
          .update(updateData)
          .eq('gateway_operation_id', parsed.gatewayOperationId);
      }

      // SAFETY INVARIANT (Task 3):
      // Sandbox payments MUST NOT update public.booking_requests or send customer confirmation emails.
      // Production payment confirmation logic remains disabled until authorised.
    } catch (dbErr: any) {
      console.error('[PaymentWebhook] Database update warning:', dbErr.message);
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      verified: isAuthoritativelyApproved,
      eventType: parsed.eventType,
      bookingReference: parsed.bookingReference,
      gatewayOperationId: parsed.gatewayOperationId,
      amountPaid: parsed.amountPaid,
      environment: targetVerificationEnv,
    }),
  };
};
