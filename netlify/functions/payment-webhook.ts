import { createClient } from '@supabase/supabase-js';
import { PagueloFacilGatewayAdapter } from './paymentGateway.js';

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
    // Handle JSON or Form URL-encoded
    if (typeof event.body === 'string') {
      try {
        payload = JSON.parse(event.body);
        parsedFormat = 'json';
      } catch {
        // Try parsing URL-encoded parameters (PagueloFacil standard callback format)
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

  // 2. Diagnostic: Parsed Callback Format
  logWebhookDiagnostic(2, 'Payload Parsed', { format: parsedFormat });

  // 3. Webhook Signature & Status Parsing via Gateway Adapter
  const gateway = new PagueloFacilGatewayAdapter();
  const parsed = gateway.parseWebhook(payload, event.headers);

  // 3. Diagnostic: Identifiers Present
  logWebhookDiagnostic(3, 'Identifiers Present', {
    hasPARM1: Boolean(parsed.bookingReference),
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

  // 8. Diagnostic: Currency and Amount Validation Passed
  logWebhookDiagnostic(8, 'Validation Checks', { currencyValid: true, amountValid: true });

  // 5. Pre-Load Existing Payment Transaction via Unique Identifier
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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let supabase: any = null;
  let existingTx: any = null;
  let lookupMethodUsed = 'none';

  if (supabaseUrl && supabaseKey) {
    try {
      supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // 1. Primary lookup: By unique gateway_operation_id
      if (hasUniqueOperationId) {
        lookupMethodUsed = 'gateway_operation_id';
        const { data } = await supabase
          .from('payment_transactions')
          .select('id, status, environment, expected_amount, currency, gateway_operation_id, booking_reference, idempotency_key, gateway_link_code')
          .eq('gateway_operation_id', parsed.gatewayOperationId)
          .maybeSingle();
        existingTx = data;
      }

      // 2. Secondary lookup: By verified payment attempt identifier (idempotency_key)
      if (!existingTx && hasUniqueAttemptId) {
        lookupMethodUsed = 'idempotency_key';
        const { data } = await supabase
          .from('payment_transactions')
          .select('id, status, environment, expected_amount, currency, gateway_operation_id, booking_reference, idempotency_key, gateway_link_code')
          .eq('idempotency_key', parsed.idempotencyKey)
          .maybeSingle();
        existingTx = data;
      }

      // 3. Tertiary lookup: By unique gateway_link_code
      if (!existingTx && hasUniqueLinkCode) {
        lookupMethodUsed = 'gateway_link_code';
        const { data } = await supabase
          .from('payment_transactions')
          .select('id, status, environment, expected_amount, currency, gateway_operation_id, booking_reference, idempotency_key, gateway_link_code')
          .eq('gateway_link_code', parsed.gatewayLinkCode)
          .maybeSingle();
        existingTx = data;
      }

      // 4. Quaternary lookup: By booking reference (PARM_1) with strict uniqueness checks
      // Handles newly received webhooks where gateway_operation_id was initially null when session was created
      if (!existingTx && parsed.bookingReference) {
        lookupMethodUsed = 'booking_reference_fallback';
        const { data: attempts } = await supabase
          .from('payment_transactions')
          .select('id, status, environment, expected_amount, currency, gateway_operation_id, booking_reference, idempotency_key, gateway_link_code')
          .eq('booking_reference', parsed.bookingReference);

        if (attempts && attempts.length === 1) {
          lookupMethodUsed = 'booking_reference_strict_unique';
          existingTx = attempts[0];
        } else if (attempts && attempts.length > 1) {
          lookupMethodUsed = 'booking_reference_ambiguous';
          logWebhookDiagnostic(4, 'Supabase Record Lookup', { found: false, attemptsCount: attempts.length, lookupMethodUsed: 'booking_reference_ambiguous' });
          logWebhookDiagnostic(10, 'Webhook Response', { statusCode: 400, success: false, error: 'Ambiguous booking attempts' });
          return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              success: false,
              error: `Ambiguous callback rejected: Booking "${parsed.bookingReference}" has ${attempts.length} payment records. Cannot uniquely identify transaction by booking reference alone when multiple attempts exist.`,
            }),
          };
        }
      }
    } catch (err: any) {
      console.error('[PaymentWebhook] Pre-load database lookup warning:', err.message);
    }
  }

  // 4. Diagnostic: Supabase Record Found Status
  logWebhookDiagnostic(4, 'Supabase Record Lookup', {
    found: Boolean(existingTx),
    txId: existingTx?.id || null,
    lookupMethodUsed,
  });

  // 6. Security & Relationship Verifications
  // 6a. Booking relationship verification
  if (existingTx && parsed.bookingReference) {
    if (existingTx.booking_reference !== parsed.bookingReference) {
      logWebhookDiagnostic(8, 'Validation Checks', { relationshipValid: false });
      logWebhookDiagnostic(10, 'Webhook Response', { statusCode: 400, success: false, error: 'Booking relationship mismatch' });
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
  logWebhookDiagnostic(8, 'Validation Checks', { relationshipValid: true });

  // 6b. Cross-Environment Mismatch Rejection
  if (existingTx && existingTx.environment && parsed.environment) {
    if (existingTx.environment !== parsed.environment) {
      logWebhookDiagnostic(10, 'Webhook Response', { statusCode: 400, success: false, error: 'Cross-environment mismatch' });
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
    logWebhookDiagnostic(10, 'Webhook Response', { statusCode: 200, success: true, duplicate: true });
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
      logWebhookDiagnostic(8, 'Validation Checks', { amountMatchesExpected: false, expected: existingTx.expected_amount, paid: parsed.amountPaid });
      logWebhookDiagnostic(10, 'Webhook Response', { statusCode: 400, success: false, error: 'Amount less than expected' });
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
  logWebhookDiagnostic(8, 'Validation Checks', { amountMatchesExpected: true });

  // 5. Diagnostic: Selected Environment
  const targetVerificationEnv: 'sandbox' | 'production' =
    existingTx?.environment || parsed.environment || 'sandbox';
  logWebhookDiagnostic(5, 'Environment Selection', { environment: targetVerificationEnv });

  // 7. Authoritative Server-to-Server Verification Scoped to Environment
  let isAuthoritativelyApproved = false;
  let verificationResultCategory = 'skipped';

  // 6. Diagnostic: Verification API Attempted
  const isVerificationAttempted = parsed.eventType === 'payment_approved';
  logWebhookDiagnostic(6, 'Verification API Attempted', {
    attempted: isVerificationAttempted,
    environment: targetVerificationEnv,
  });

  if (isVerificationAttempted) {
    const verification = await gateway.verifyTransaction({
      gatewayOperationId: parsed.gatewayOperationId,
      bookingReference: parsed.bookingReference,
      expectedAmount: parsed.amountPaid,
      environment: targetVerificationEnv,
    });

    verificationResultCategory = verification.status || 'unknown';

    // 7. Diagnostic: Verification Result Category
    logWebhookDiagnostic(7, 'Verification Result', {
      category: verificationResultCategory,
      verified: verification.verified,
      missingRequirement: Boolean(verification.missingRequirement),
    });

    if (verification.verified && verification.status === 'approved') {
      isAuthoritativelyApproved = true;
    } else if (verification.missingRequirement) {
      logWebhookDiagnostic(10, 'Webhook Response', { statusCode: 200, success: true, verified: false, status: 'pending', missingRequirement: true });
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
      logWebhookDiagnostic(10, 'Webhook Response', { statusCode: 422, success: false, verified: false, error: 'Verification failed' });
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
  } else {
    verificationResultCategory = parsed.eventType || 'non_approved_event';
    logWebhookDiagnostic(7, 'Verification Result', {
      category: verificationResultCategory,
      verified: false,
      note: 'Skipped server-to-server verification for non-approved event type',
    });
  }

  // 8. Idempotent Supabase Persistence with Individual Record Isolation
  let dbUpdateAttempted = false;
  let dbUpdateSucceeded = false;

  if (supabase) {
    try {
      dbUpdateAttempted = true;
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

      if (existingTx?.id) {
        const { error: updateErr } = await supabase
          .from('payment_transactions')
          .update(updateData)
          .eq('id', existingTx.id);
        if (updateErr) throw updateErr;
        dbUpdateSucceeded = true;
      } else if (parsed.gatewayOperationId) {
        const { error: updateErr } = await supabase
          .from('payment_transactions')
          .update(updateData)
          .eq('gateway_operation_id', parsed.gatewayOperationId);
        if (updateErr) throw updateErr;
        dbUpdateSucceeded = true;
      }
    } catch (dbErr: any) {
      dbUpdateSucceeded = false;
      console.error('[PaymentWebhook] Database update warning:', dbErr.message);
    }
  }

  // 9. Diagnostic: Database Update Attempted & Succeeded/Failed
  logWebhookDiagnostic(9, 'Database Update', {
    attempted: dbUpdateAttempted,
    succeeded: dbUpdateSucceeded,
  });

  // 10. Diagnostic: Final Webhook Response
  logWebhookDiagnostic(10, 'Webhook Response', {
    statusCode: 200,
    success: true,
    verified: isAuthoritativelyApproved,
    eventType: parsed.eventType,
    bookingReference: parsed.bookingReference,
  });

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
