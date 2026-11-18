export interface BookingRequestInput {
  bookingType: 'overnight' | 'day-trip' | 'private-charter';
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  experienceTitle: string;
  targetDate?: string;
  departureDate?: string;
  nights?: string;
  adults: number;
  children: number;
  accommodationPreference?: string;
  pickupLocation?: string;
  specialNotes?: string;
  termsAccepted: boolean;
  termsVersion?: string;
  customerLanguage?: 'en' | 'es';
  idempotencyKey?: string;
}

export interface BookingRequestResult {
  success: boolean;
  bookingReference: string;
  status: string;
  message: string;
  idempotentReplay?: boolean;
  error?: string;
}

export class BookingRequestService {
  /**
   * Generates a client-side idempotency key for network retry protection
   */
  public generateIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `idempotent_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Submits a booking request strictly through the Netlify Function.
   * Features a dual-endpoint fallback (/api/booking-request -> /.netlify/functions/booking-request)
   * and an HTML response guard to prevent silent SPA catch-all parsing failures.
   */
  public async submitBookingRequest(input: BookingRequestInput): Promise<BookingRequestResult> {
    const customerLanguage = input.customerLanguage || 'en';
    const termsVersion = input.termsVersion || '2026-10-18';
    const idempotencyKey = input.idempotencyKey || this.generateIdempotencyKey();

    if (!input.termsAccepted) {
      return {
        success: false,
        bookingReference: '',
        status: 'rejected',
        message: 'Terms & Conditions must be accepted.',
        error: 'Terms & Conditions acceptance is required.',
      };
    }

    const payload = {
      idempotencyKey,
      bookingType: input.bookingType,
      customerName: (input.customerName || '').trim(),
      customerEmail: (input.customerEmail || '').trim().toLowerCase(),
      customerPhone: (input.customerPhone || '').trim(),
      experienceTitle: (input.experienceTitle || '').trim(),
      targetDate: (input.targetDate || '').trim(),
      departureDate: (input.departureDate || '').trim(),
      nights: (input.nights || '').trim(),
      adults: Number.isFinite(Number(input.adults)) ? Math.max(1, Math.floor(Number(input.adults))) : 1,
      children: Number.isFinite(Number(input.children)) ? Math.max(0, Math.floor(Number(input.children))) : 0,
      accommodationPreference: (input.accommodationPreference || '').trim(),
      pickupLocation: (input.pickupLocation || '').trim(),
      specialNotes: (input.specialNotes || '').trim(),
      termsAccepted: true,
      termsVersion,
      customerLanguage,
      submittedAt: new Date().toISOString(),
    };

    // Endpoints to attempt in order (rewritten route first, then direct function URL)
    const endpoints = [
      '/api/booking-request',
      '/.netlify/functions/booking-request',
    ];

    let lastError: string = '';

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': idempotencyKey,
          },
          body: JSON.stringify(payload),
        });

        const contentType = (response.headers.get('content-type') || '').toLowerCase();

        // Guard against Netlify SPA fallback serving index.html
        if (contentType.includes('text/html')) {
          console.warn(`[BookingRequestService] Endpoint ${endpoint} returned HTML (SPA fallback). Retrying next endpoint...`);
          lastError =
            customerLanguage === 'es'
              ? 'El servicio de solicitudes requiere el entorno de servidor activo. Intente nuevamente o contáctenos por WhatsApp.'
              : 'Booking service endpoint is unavailable in this preview environment. Please try again or reach Petra directly on WhatsApp.';
          continue;
        }

        const rawText = await response.text();
        let resData: any = null;
        if (rawText) {
          try {
            resData = JSON.parse(rawText);
          } catch {
            resData = null;
          }
        }

        if (!resData || typeof resData !== 'object') {
          lastError = `Endpoint ${endpoint} returned non-JSON response (${response.status}).`;
          continue;
        }

        // Deterministic client validation errors (4xx): surface immediately without blind retry
        if (response.status >= 400 && response.status < 500) {
          const clientErrorMsg =
            resData.error ||
            resData.message ||
            (customerLanguage === 'es'
              ? 'Por favor verifique los datos de su solicitud e intente nuevamente.'
              : 'Please review your booking request details and try again.');
          return {
            success: false,
            bookingReference: '',
            status: 'rejected',
            message: clientErrorMsg,
            error: clientErrorMsg,
          };
        }

        if (!response.ok || !resData.success || !resData.dbSaved || !resData.bookingReference) {
          throw new Error(
            resData.error ||
              `Booking persistence could not be verified by server (${response.status}).`
          );
        }

        return {
          success: true,
          bookingReference: resData.bookingReference,
          status: resData.status || 'request_received',
          idempotentReplay: Boolean(resData.idempotentReplay),
          message: resData.message || 'Booking request submitted successfully.',
        };
      } catch (err: any) {
        console.warn(`[BookingRequestService] Attempt on ${endpoint} failed:`, err.message);
        lastError = err.message || 'Network error';
      }
    }

    // Both endpoints failed or returned non-JSON
    console.error('[BookingRequestService Error] All API endpoints failed:', lastError);
    return {
      success: false,
      bookingReference: '',
      status: 'error',
      message:
        lastError ||
        'Unable to submit booking request. Our booking system is briefly verifying connection settings. Please try again.',
      error: lastError || 'Server error or endpoint offline',
    };
  }
}

export const bookingRequestService = new BookingRequestService();
