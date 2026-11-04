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
      customerName: input.customerName.trim(),
      customerEmail: input.customerEmail.trim().toLowerCase(),
      customerPhone: input.customerPhone.trim(),
      experienceTitle: input.experienceTitle,
      targetDate: input.targetDate || '',
      departureDate: input.departureDate || '',
      nights: input.nights || '',
      adults: input.adults || 1,
      children: input.children || 0,
      accommodationPreference: input.accommodationPreference || '',
      pickupLocation: input.pickupLocation || '',
      specialNotes: input.specialNotes || '',
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

        const contentType = response.headers.get('content-type') || '';

        // Guard against Netlify SPA fallback serving index.html
        if (contentType.includes('text/html')) {
          console.warn(`[BookingRequestService] Endpoint ${endpoint} returned HTML (SPA fallback). Retrying next endpoint...`);
          lastError = 'API endpoint returned HTML page instead of JSON.';
          continue;
        }

        if (!contentType.includes('application/json')) {
          lastError = `Endpoint ${endpoint} returned invalid content type: ${contentType}`;
          continue;
        }

        const resData = await response.json();

        if (!response.ok || !resData.success) {
          throw new Error(resData.error || `Server error (${response.status})`);
        }

        if (resData.success && resData.bookingReference) {
          return {
            success: true,
            bookingReference: resData.bookingReference,
            status: resData.status || 'request_received',
            idempotentReplay: Boolean(resData.idempotentReplay),
            message: resData.message || 'Booking request submitted successfully.',
          };
        }
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
      message: 'Unable to submit booking request. Our booking system is briefly verifying connection settings. Please try again.',
      error: lastError || 'Server error or endpoint offline',
    };
  }
}

export const bookingRequestService = new BookingRequestService();
