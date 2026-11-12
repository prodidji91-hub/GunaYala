import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import {
  calculateAuthoritativeDayTripAmount,
  PagueloFacilGatewayAdapter,
} from './paymentGateway.js';

interface CheckoutRequestBody {
  bookingReference?: string;
  bookingType: 'overnight' | 'day-trip' | 'private-charter';
  dayTourPackageId?: 'day-tour-panama-city' | 'day-tour-port' | string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  targetDate?: string;
  adults?: number;
  children?: number;
  pickupLocation?: string;
  specialNotes?: string;
  termsAccepted?: boolean;
  customerLanguage?: 'en' | 'es';
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
    bookingType,
    customerName,
    customerEmail,
    adults = 1,
    children = 0,
    quotationId,
    idempotencyKey,
  } = body;

  const effectiveBookingReference =
    (body.bookingReference || '').trim() ||
    `GNY-${Math.floor(100000 + Math.random() * 900000)}`;

  // 1. Mandatory common fields
  if (!customerEmail || !customerName || !idempotencyKey) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Missing required fields: customerEmail, customerName, and idempotencyKey are mandatory.',
      }),
    };
  }

  // 2. Strict Business Rule Enforcement by Booking Type
  let authoritativeAmount = 0;
  let authoritativeAmountInCents = 0;
  let pricingBreakdown: any = null;
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
    authoritativeAmountInCents = Math.round(authoritativeAmount * 100);
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
    authoritativeAmountInCents = Math.round(authoritativeAmount * 100);
    paymentType = body.paymentType ?? 'deposit';
  } else if (bookingType === 'day-trip') {
    // Day tours calculate server-authoritative pricing in integer cents (never trust client amount)
    const requestedPkg = body.dayTourPackageId;
    const pricing = calculateAuthoritativeDayTripAmount(adults, children, requestedPkg);
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
          bookingReference: effectiveBookingReference,
        }),
      };
    }
    authoritativeAmount = pricing.amount;
    authoritativeAmountInCents = pricing.amountInCents;
    pricingBreakdown = pricing.breakdown;
    paymentType = 'full';
  } else {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: `Invalid bookingType: "${bookingType}".` }),
    };
  }

  // Check optional administrator Bearer token for authorized admin-only sandbox day-tour testing
  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || null;
  let isAdminAuthorized = false;

  if (authHeader && authHeader.trim()) {
    const cleanToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (supabaseUrl && supabaseServiceKey && cleanToken) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: authData, error: authError } = await supabase.auth.getUser(cleanToken);
        if (!authError && authData?.user?.id) {
          const { data: adminRecord } = await supabase
            .from('quotation_admins')
            .select('user_id')
            .eq('user_id', authData.user.id)
            .maybeSingle();
          if (adminRecord?.user_id) {
            isAdminAuthorized = true;
          }
        }
      } catch (err) {
        console.error('[PaymentCheckout] Admin authorization check error:', err);
      }
    }
  }

  const finalBookingReference =
    isAdminAuthorized &&
    (process.env.PAGUELOFACIL_ENV || '').trim().toLowerCase() === 'sandbox' &&
    !(body.bookingReference || '').startsWith('TEST-')
      ? `TEST-DAYTOUR-${effectiveBookingReference}`
      : effectiveBookingReference;

  // 3. Gateway Adapter Evaluation (Environment selected EXCLUSIVELY server-side)
  const gateway = new PagueloFacilGatewayAdapter({
    enableSandboxPayments: isAdminAuthorized ? true : undefined,
  });
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
        calculatedAmountInCents: authoritativeAmountInCents,
        currency: 'USD',
        bookingReference: finalBookingReference,
        status: 'pending_payment',
      }),
    };
  }

  // 4. Generate cryptographically secure payment-verification token on the server
  const verificationToken = `pvt_${crypto.randomBytes(24).toString('hex')}`;
  const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
  const verificationTokenExpiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4-hour validity

  // Create Gateway Payment Session via server-configured adapter
  const sessionResult = await gateway.createPaymentSession({
    bookingReference: finalBookingReference,
    bookingType,
    quotationId,
    customerName,
    customerEmail,
    customerPhone: body.customerPhone,
    amount: authoritativeAmount,
    currency: 'USD',
    paymentType,
    description: `Guna Yala Panama Travel - ${bookingType.toUpperCase()} ${finalBookingReference}`,
    expiresInSeconds: 7200, // 2 hours
    idempotencyKey,
    verificationToken,
  });

  // 5. Persist trusted server-selected payment transaction record & pending booking
  // STRICT RULE: Never accept environment from request body/headers. Stored environment matches active gateway.
  if (sessionResult.success) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        // 5a. Record day tour booking in booking_requests as pending_payment with test tagging in special_notes
        if (bookingType === 'day-trip') {
          const testSpecialNotes = isAdminAuthorized
            ? `[TEST / ADMIN SANDBOX CHECKOUT] ${(body.specialNotes || '').trim()}`.trim()
            : (body.specialNotes || '').trim();

          await supabase
            .from('booking_requests')
            .upsert(
              {
                booking_reference: finalBookingReference,
                booking_type: 'day-trip',
                customer_name: customerName,
                customer_email: customerEmail,
                customer_phone: body.customerPhone || '',
                experience_title: pricingBreakdown?.packageName || 'San Blas Day Tour',
                target_date: body.targetDate || '',
                adults,
                children,
                pickup_location: body.pickupLocation || '',
                special_notes: testSpecialNotes,
                terms_accepted: Boolean(body.termsAccepted),
                terms_version: '2026-10-18',
                customer_language: body.customerLanguage || 'en',
                status: 'pending_payment',
                idempotency_key: idempotencyKey,
              },
              { onConflict: 'booking_reference' }
            );
        }

        // 5b. Record payment transaction in payment_transactions with integer cents and SHA-256 token hash
        const activeEnvironment: 'sandbox' | 'production' =
          gatewayConfig.environment === 'production' ? 'production' : 'sandbox';

        await supabase
          .from('payment_transactions')
          .upsert(
            {
              booking_reference: finalBookingReference,
              quotation_id: quotationId || null,
              booking_type: bookingType,
              gateway: 'paguelofacil',
              environment: activeEnvironment,
              gateway_link_code: sessionResult.gatewayLinkCode || null,
              payment_url: sessionResult.paymentUrl || null,
              currency: 'USD',
              expected_amount: authoritativeAmount,
              amount_in_cents: authoritativeAmountInCents,
              payment_type: paymentType,
              status: 'pending',
              idempotency_key: idempotencyKey,
              expires_at: sessionResult.expiresAt || null,
              audit_metadata: {
                environment: activeEnvironment,
                is_demo: activeEnvironment === 'sandbox',
                is_test: isAdminAuthorized,
                amount_in_cents: authoritativeAmountInCents,
                package_id: body.dayTourPackageId || null,
                created_via: 'payment-checkout',
                created_at: new Date().toISOString(),
                verification_token_hash: verificationTokenHash,
                verification_token_created_at: new Date().toISOString(),
                verification_token_expires_at: verificationTokenExpiresAt,
              },
            },
            { onConflict: 'idempotency_key' }
          );
      } catch (dbErr: any) {
        console.error('[PaymentCheckout] Database record creation warning:', dbErr.message);
      }
    }
  }

  const responseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const cookieHeader = `__Host-payment-capability=${verificationToken}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=14400`;

  // Set secure cookie capability when checkout is initiated
  if (sessionResult.success) {
    responseHeaders['Set-Cookie'] = cookieHeader;
  }

  return {
    statusCode: sessionResult.success ? 200 : 500,
    headers: responseHeaders,
    multiValueHeaders: sessionResult.success ? { 'Set-Cookie': [cookieHeader] } : undefined,
    body: JSON.stringify({
      ...sessionResult,
      bookingReference: finalBookingReference,
      amount: authoritativeAmount,
      amountInCents: authoritativeAmountInCents,
      pricingBreakdown,
      status: 'pending_payment',
    }),
  };
};
