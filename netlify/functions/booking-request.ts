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

    // Server-Side Supabase Client (Service Role for security)
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      '';

    let bookingReference = generateBookingReference();
    let dbSaved = false;
    let idempotentReplay = false;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      const customerSubject = customerLanguage === 'es'
        ? `[${bookingReference}] Solicitud de Reserva Recibida — Guna Yala Panama Travel`
        : `[${bookingReference}] Booking Request Received — Guna Yala Panama Travel`;

      const petraSubject = `[NEW BOOKING REQUEST] ${bookingReference} — ${experienceTitle} (${fullName})`;
      const petraEmail = process.env.PETRA_NOTIFICATION_EMAIL || 'info@gunayalapanamatravel.com';

      // 1. Try Transactional Postgres Function (Atomic & Idempotent)
      let rpcSuccess = false;
      let rpcAttempts = 0;

      while (rpcAttempts < 3 && !rpcSuccess) {
        rpcAttempts++;
        const currentRef = rpcAttempts === 1 ? bookingReference : generateBookingReference();

        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'create_booking_request_transaction',
          {
            p_idempotency_key: idempotencyKey,
            p_booking_reference: currentRef,
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

        if (!rpcError && rpcData?.success) {
          rpcSuccess = true;
          dbSaved = true;
          bookingReference = rpcData.booking_reference || currentRef;
          idempotentReplay = Boolean(rpcData.idempotent_replay);
        } else if (rpcError) {
          // Check if concurrent transaction won with the same idempotency key
          if (idempotencyKey) {
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
                  bookingReference: existingIdem.booking_reference,
                  status: 'request_received',
                  idempotentReplay: true,
                  dbSaved: true,
                  message: 'Booking request completed by concurrent transaction.',
                  timestamp: new Date().toISOString(),
                }),
              };
            }
          }
          console.warn(`[Netlify Function] RPC transaction attempt ${rpcAttempts} warning:`, rpcError.message);
        }
      }

      // 2. Fallback sequential insert if RPC function is not yet created in Supabase project
      if (!dbSaved) {
        let attempts = 0;
        let insertSuccess = false;

        while (attempts < 3 && !insertSuccess) {
          attempts++;
          const currentRef = attempts === 1 ? bookingReference : generateBookingReference();

          // Customer record lookup/insert
          let customerId: string | null = null;
          const { data: existingCust } = await supabase
            .from('crm_customers')
            .select('id')
            .eq('email', email)
            .maybeSingle();

          if (existingCust?.id) {
            customerId = existingCust.id;
          } else {
            const { data: newCust } = await supabase
              .from('crm_customers')
              .insert([{ full_name: fullName, email, whatsapp: phone }])
              .select('id')
              .single();
            customerId = newCust?.id || null;
          }

          // Booking Request Record
          const { error: reqError } = await supabase.from('booking_requests').insert([
            {
              booking_reference: currentRef,
              idempotency_key: idempotencyKey || null,
              booking_type: bookingType,
              customer_id: customerId,
              customer_name: fullName,
              customer_email: email,
              customer_phone: phone,
              experience_title: experienceTitle,
              target_date: targetDate,
              departure_date: departureDate,
              nights,
              adults,
              children,
              accommodation_preference: accommodationPreference,
              pickup_location: pickupLocation,
              special_notes: specialNotes,
              terms_accepted: true,
              terms_version: termsVersion,
              customer_language: customerLanguage,
              status: 'request_received',
            },
          ]);

          if (!reqError) {
            bookingReference = currentRef;
            insertSuccess = true;
            dbSaved = true;

            // Insert CRM Inquiry (Using exact CRM pipeline_status 'New Inquiry')
            await supabase.from('crm_inquiries').insert([
              {
                customer_id: customerId,
                experience_interest: experienceTitle,
                arrival_date: targetDate || null,
                departure_date: departureDate || null,
                travelers_count: totalTravelers,
                inquiry_source: 'Website Booking Request',
                pipeline_status: 'New Inquiry',
                internal_notes: `Ref: ${bookingReference}. Pickup: ${pickupLocation}`,
                booking_reference: bookingReference,
                booking_type: bookingType,
                accommodation_preference: accommodationPreference,
                pickup_location: pickupLocation,
                terms_accepted: true,
                terms_version: termsVersion,
                customer_language: customerLanguage,
              },
            ]);

            // Insert Email Audit Logs with 'pending' status
            await supabase.from('email_logs').insert([
              {
                booking_reference: bookingReference,
                recipient_email: email,
                recipient_role: 'customer',
                email_type: 'customer_acknowledgement',
                subject: customerSubject,
                delivery_status: 'pending',
              },
              {
                booking_reference: bookingReference,
                recipient_email: petraEmail,
                recipient_role: 'petra',
                email_type: 'petra_notification',
                subject: petraSubject,
                delivery_status: 'pending',
              },
            ]);
          }
        }
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        bookingReference,
        status: 'request_received',
        idempotentReplay,
        dbSaved,
        message: 'Booking request successfully received and recorded.',
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (err: any) {
    console.error('[Netlify Function Error] Handler exception:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'An internal server error occurred while processing your booking request.',
        details: err?.message,
      }),
    };
  }
};
