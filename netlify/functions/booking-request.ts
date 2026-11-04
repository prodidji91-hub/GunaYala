import { createClient } from '@supabase/supabase-js';

interface NetlifyEvent {
  httpMethod: string;
  body: string | null;
  headers: Record<string, string | undefined>;
}

// Generate unique booking reference GNY-XXXXXX
function generateBookingReference(): string {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `GNY-${num}`;
}

// Calculate current Panama calendar date directly using Intl.DateTimeFormat
export function getPanamaTodayISO(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Panama',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === 'year')?.value || '1970';
  const month = parts.find((p) => p.type === 'month')?.value || '01';
  const day = parts.find((p) => p.type === 'day')?.value || '01';

  return `${year}-${month}-${day}`;
}

// Strict UTC round-trip calendar date validation
export function isValidCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;

  const [yStr, mStr, dStr] = dateStr.split('-');
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const day = parseInt(dStr, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return (
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() === month - 1 &&
    utcDate.getUTCDate() === day
  );
}

export const handler = async (event: NetlifyEvent) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Idempotency-Key',
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

  try {
    const data = JSON.parse(event.body || '{}');

    // Extract headers for idempotency key if present
    const idempotencyKey =
      data.idempotencyKey ||
      event.headers['x-idempotency-key'] ||
      event.headers['X-Idempotency-Key'] ||
      null;

    const fullName = (data.fullName || data.customerName || '').trim();
    const email = (data.email || data.customerEmail || '').trim().toLowerCase();
    const phone = (data.phone || data.whatsapp || data.customerPhone || '').trim();
    const bookingType = (data.bookingType || 'overnight') as 'overnight' | 'day-trip' | 'private-charter';
    const experienceTitle = data.experienceTitle || data.experience_interest || 'Guna Yala Island Experience';
    const targetDate = data.targetDate || data.arrival_date || '';
    const departureDate = data.departureDate || data.departure_date || '';
    const nights = data.nights ? String(data.nights) : '';
    const adults = typeof data.adults === 'number' ? data.adults : 1;
    const children = typeof data.children === 'number' ? data.children : 0;
    const accommodationPreference = data.accommodationPreference || data.cabanaStyle || '';
    const pickupLocation = data.pickupLocation || '';
    const specialNotes = data.specialNotes || data.notes || '';
    const termsAccepted = Boolean(data.termsAccepted);
    const termsVersion = data.termsVersion || '2026-10-18';
    const customerLanguage = (data.customerLanguage || 'en') as 'en' | 'es';

    // 1. SERVER-SIDE INPUT & TERMS VALIDATION
    if (!fullName) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Customer full name is required.' }),
      };
    }

    if (!email || !email.includes('@')) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Valid customer email address is required.' }),
      };
    }

    if (!phone) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Customer phone or WhatsApp number is required.' }),
      };
    }

    if (!termsAccepted) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Terms & Conditions acceptance is required to submit a booking request.',
        }),
      };
    }

    // 2. TRAVELLER BOUNDS VALIDATION
    const totalTravelers = adults + children;
    if (adults < 0 || children < 0 || totalTravelers <= 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Total travelers count (adults + children) must be at least 1.' }),
      };
    }

    if (adults > 50 || children > 50) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Party size exceeds online booking capacity limit (50). Please contact us for group charters.' }),
      };
    }

    // 3. STRICT CALENDAR DATE & PANAMA TIMEZONE VALIDATION
    const todayPanamaISO = getPanamaTodayISO();

    if (targetDate) {
      if (!isValidCalendarDate(targetDate)) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Target travel date is not a valid calendar date (YYYY-MM-DD).' }),
        };
      }
      if (targetDate < todayPanamaISO) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Target travel date cannot be in the past.' }),
        };
      }
    }

    if (departureDate) {
      if (!isValidCalendarDate(departureDate)) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Departure date is not a valid calendar date (YYYY-MM-DD).' }),
        };
      }
      if (targetDate && departureDate < targetDate) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Departure date cannot be earlier than arrival date.' }),
        };
      }
    }

    // 4. REQUIRE SERVER-SIDE CREDENTIALS ONLY (No VITE_ client key fallback)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[BookingRequest] Request ${requestId} failed: Missing required server-side Supabase credentials (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).`);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          dbSaved: false,
          error: 'Server configuration error: Required database credentials are missing.',
          requestId,
        }),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const initialBookingReference = generateBookingReference();

    const customerSubject = customerLanguage === 'es'
      ? `[${initialBookingReference}] Solicitud de Reserva Recibida — Guna Yala Panama Travel`
      : `[${initialBookingReference}] Booking Request Received — Guna Yala Panama Travel`;

    const petraSubject = `[NEW BOOKING REQUEST] ${initialBookingReference} — ${experienceTitle} (${fullName})`;
    const petraEmail = process.env.PETRA_NOTIFICATION_EMAIL || 'info@gunayalapanamatravel.com';

    // 5. ATOMIC POSTGRES RPC TRANSACTION ONLY (NO SEQUENTIAL FALLBACK INSERTS)
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'create_booking_request_transaction',
      {
        p_idempotency_key: idempotencyKey,
        p_booking_reference: initialBookingReference,
        p_booking_type: bookingType,
        p_customer_name: fullName,
        p_customer_email: email,
        p_customer_phone: phone,
        p_experience_title: experienceTitle,
        p_target_date: targetDate,
        p_departure_date: departureDate,
        p_nights: nights,
        p_adults: adults,
        p_children: children,
        p_accommodation_preference: accommodationPreference,
        p_pickup_location: pickupLocation,
        p_special_notes: specialNotes,
        p_terms_accepted: true,
        p_terms_version: termsVersion,
        p_customer_language: customerLanguage,
        p_customer_subject: customerSubject,
        p_petra_subject: petraSubject,
        p_petra_email: petraEmail,
      }
    );

    // Concurrency / Idempotency race safety check
    if (rpcError && idempotencyKey) {
      const { data: existingIdem } = await supabase
        .from('booking_requests')
        .select('booking_reference')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existingIdem?.booking_reference) {
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: true,
            dbSaved: true,
            bookingReference: existingIdem.booking_reference,
            status: 'request_received',
            idempotentReplay: true,
            message: 'Booking request completed by concurrent transaction.',
            timestamp: new Date().toISOString(),
          }),
        };
      }
    }

    if (rpcError || !rpcData || !rpcData.success || !rpcData.booking_reference) {
      console.error(`[BookingRequest] Request ${requestId} RPC error:`, {
        code: rpcError?.code || 'UNKNOWN_RPC_ERROR',
        message: rpcError?.message || 'Transaction returned unsuccessful result.',
      });

      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          success: false,
          dbSaved: false,
          error: 'Failed to record booking request in database. Please try again.',
          requestId,
        }),
      };
    }

    // 6. VERIFIED ATOMIC SUCCESS RESPONSE
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        dbSaved: true,
        bookingReference: rpcData.booking_reference,
        status: 'request_received',
        idempotentReplay: Boolean(rpcData.idempotent_replay),
        message: 'Booking request successfully received and recorded in database.',
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (err: any) {
    console.error(`[BookingRequest Exception] Request ${requestId}:`, err?.message || err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        dbSaved: false,
        error: 'An internal server error occurred while processing your booking request.',
        requestId,
      }),
    };
  }
};

