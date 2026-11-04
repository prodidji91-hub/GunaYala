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
   * Submits a booking request strictly through the validated backend Netlify Function.
   * Direct-to-Supabase client persistence has been removed for security and data integrity.
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

    try {
      const response = await fetch('/api/booking-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errMessage = `Server error (${response.status})`;
        try {
          const errData = await response.json();
          if (errData.error) errMessage = errData.error;
        } catch {
          // fallback
        }
        throw new Error(errMessage);
      }

      const resData = await response.json();

      if (!resData.success || !resData.bookingReference) {
        throw new Error(resData.error || 'Failed to record booking request.');
      }

      return {
        success: true,
        bookingReference: resData.bookingReference,
        status: resData.status || 'request_received',
        idempotentReplay: Boolean(resData.idempotentReplay),
        message: resData.message || 'Booking request submitted successfully.',
      };
    } catch (netErr: any) {
      console.error('[BookingRequestService Error] Request failed:', netErr);
      return {
        success: false,
        bookingReference: '',
        status: 'error',
        message: netErr?.message || 'Unable to submit booking request. Please check your connection and retry.',
        error: netErr?.message || 'Network or server error',
      };
    }
  }
}

export const bookingRequestService = new BookingRequestService();
