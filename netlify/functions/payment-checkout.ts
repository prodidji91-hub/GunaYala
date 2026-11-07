import { createClient } from '@supabase/supabase-js';
import {
  calculateAuthoritativeDayTripAmount,
  PagueloFacilGatewayAdapter,
} from './paymentGateway.js';

interface CheckoutRequestBody {
  bookingReference: string;
  bookingType: 'overnight' | 'day-trip' | 'private-charter';
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  targetDate?: string;
  adults?: number;
  children?: number;
  quotationId?: string;
  depositAmount?: number;
  paymentType?: 'deposit' | 'full' | 'balance';
  idempotencyKey: string;
}

interface NetlifyEvent {
  httpMethod: string;
  body: string | null;
  headers: Record<string, string | undefined>;
}

export const handler = async (event: NetlifyEvent) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, X-Idempotency-Key',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Method Not Allowed. Use POST.' }),
    };
  }

  let body: CheckoutRequestBody;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Invalid JSON request body.' }),
    };
  }

  const {
    bookingReference,
    bookingType,
    customerName,
    customerEmail,
    adults = 1,
    children = 0,
    quotationId,
    idempotencyKey,
  } = body;

  // 1. Mandatory common fields
  if (!bookingReference || !customerEmail || !customerName || !idempotencyKey) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Missing required fields: bookingReference, customerEmail, customerName, and idempotencyKey are mandatory.',
      }),
    };
  }

  // 2. Strict Business Rule Enforcement by Booking Type
  let authoritativeAmount = 0;
  let paymentType: 'deposit' | 'full' | 'balance' = 'full';

  if (bookingType === 'overnight') {
    // Overnight Stays REQUIRE quotation approval by Petra
    if (!quotationId) {
      return {
        statusCode: 422,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          requiresApproval: true,
          bookingType: 'overnight',
          error: 'Overnight stays require Petra\'s prior accommodation and island availability confirmation before payment can be generated.',
        }),
      };
    }
    authoritativeAmount = body.depositAmount ?? 0;
    paymentType = body.paymentType ?? 'deposit';
  } else if (bookingType === 'private-charter') {
    // Private Charters REQUIRE custom quotation approval
    if (!quotationId) {
      return {
        statusCode: 422,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          requiresApproval: true,
          bookingType: 'private-charter',
          error: 'Private charters require a custom itinerary quotation and approval before payment can be generated.',
        }),
      };
    }
    authoritativeAmount = body.depositAmount ?? 0;
    paymentType = body.paymentType ?? 'deposit';
  } else if (bookingType === 'day-trip') {
    // Day trips calculate server-authoritative pricing (never trust client amount)
    const pricing = calculateAuthoritativeDayTripAmount(adults, children);
    if (!pricing.valid || !pricing.isApproved) {
      // Safe mode: When pricing is not yet approved by Petra, automatic checkout is disabled
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          isConfigured: false,
          environment: 'unconfigured',
          mode: 'request_only',
          pricingStatus: 'rates_pending_approval',
          message: pricing.error || 'Day-trip rates are pending Petra\'s official pricing approval. Automatic checkout is disabled; please submit as a booking request.',
          bookingReference,
        }),
      };
    }
    authoritativeAmount = pricing.amount;
    paymentType = 'full';
  } else {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: `Invalid bookingType: "${bookingType}".` }),
    };
  }

  // 3. Gateway Adapter Evaluation (Environment selected EXCLUSIVELY server-side)
  const gateway = new PagueloFacilGatewayAdapter();
  const gatewayConfig = gateway.getConfig();

  // If server configuration is unconfigured, respond in safe request-only preparation mode
  if (gatewayConfig.environment === 'unconfigured') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        isConfigured: false,
        environment: 'unconfigured',
        mode: 'request_only',
        message: 'Online payment gateway is in safe preparation mode. Live card checkout is disabled pending merchant verification.',
        calculatedAmount: authoritativeAmount,
        currency: 'USD',
        bookingReference,
      }),
    };
  }

  // 4. Create Gateway Payment Session via server-configured adapter
  const sessionResult = await gateway.createPaymentSession({
    bookingReference,
    bookingType,
    quotationId,
    customerName,
    customerEmail,
    customerPhone: body.customerPhone,
    amount: authoritativeAmount,
    currency: 'USD',
    paymentType,
    description: `Guna Yala Panama Travel - ${bookingType.toUpperCase()} ${bookingReference}`,
    expiresInSeconds: 7200, // 2 hours
    idempotencyKey,
  });

  // 5. Persist trusted server-selected payment transaction record
  // STRICT RULE: Never accept environment from request body/headers. Stored environment matches active gateway.
  if (sessionResult.success) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const activeEnvironment: 'sandbox' | 'production' =
          gatewayConfig.environment === 'production' ? 'production' : 'sandbox';

        await supabase
          .from('payment_transactions')
          .upsert(
            {
              booking_reference: bookingReference,
              quotation_id: quotationId || null,
              booking_type: bookingType,
              gateway: 'paguelofacil',
              environment: activeEnvironment,
              gateway_link_code: sessionResult.gatewayLinkCode || null,
              payment_url: sessionResult.paymentUrl || null,
              currency: 'USD',
              expected_amount: authoritativeAmount,
              payment_type: paymentType,
              status: 'pending',
              idempotency_key: idempotencyKey,
              expires_at: sessionResult.expiresAt || null,
              audit_metadata: {
                environment: activeEnvironment,
                is_demo: activeEnvironment === 'sandbox',
                created_via: 'payment-checkout',
                created_at: new Date().toISOString(),
              },
            },
            { onConflict: 'idempotency_key' }
          );
      } catch (dbErr: any) {
        console.error('[PaymentCheckout] Database record creation warning:', dbErr.message);
      }
    }
  }

  return {
    statusCode: sessionResult.success ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionResult),
  };
};
