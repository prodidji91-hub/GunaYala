import { Language } from '../types';
import {
  getPanamaTodayDateISO,
  isValidOvernightCalendarDate,
} from './overnightBooking';

export type DayTourPackageId = 'day-tour-panama-city' | 'day-tour-port';

export interface DayTripDatePill {
  iso: string;
  dayName: string;
  dayNumber: number;
  monthName: string;
}

export function addDaysToISODate(isoDate: string, daysToAdd: number): string {
  const [yStr, mStr, dStr] = isoDate.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);
  const utc = new Date(Date.UTC(y, m - 1, d + daysToAdd, 12, 0, 0));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utc.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function getPanamaTomorrowDateISO(now: Date = new Date()): string {
  const todayPanama = getPanamaTodayDateISO(now);
  return addDaysToISODate(todayPanama, 1);
}

export function getPanamaUpcomingDates(
  lang: Language,
  daysCount: number = 14,
  now: Date = new Date()
): DayTripDatePill[] {
  const todayPanama = getPanamaTodayDateISO(now);
  const locale = lang === 'es' ? 'es-PA' : 'en-US';

  return Array.from({ length: daysCount }).map((_, index) => {
    const iso = addDaysToISODate(todayPanama, 1 + index);
    const [yStr, mStr, dStr] = iso.split('-');
    const middayUtc = new Date(Date.UTC(Number(yStr), Number(mStr) - 1, Number(dStr), 12, 0, 0));
    return {
      iso,
      dayName: middayUtc.toLocaleDateString(locale, { weekday: 'short', timeZone: 'UTC' }),
      dayNumber: Number(dStr),
      monthName: middayUtc.toLocaleDateString(locale, { month: 'short', timeZone: 'UTC' }),
    };
  });
}

export function getDayTripPickupDefault(packageId: DayTourPackageId): string {
  return packageId === 'day-tour-port' ? 'Cartí Port (Puerto Cartí)' : '';
}

export function validateDayTripStep4(params: {
  selectedPackageId: DayTourPackageId;
  fullName: string;
  email: string;
  phone: string;
  pickupLocation: string;
  customerLanguage: Language;
}): {
  valid: boolean;
  fieldErrors: { [key: string]: string };
} {
  const isEs = params.customerLanguage === 'es';
  const fieldErrors: { [key: string]: string } = {};

  if (!params.fullName.trim()) {
    fieldErrors.fullName = isEs
      ? 'Por favor ingrese su nombre completo'
      : 'Please enter your full name';
  }

  const trimmedEmail = params.email.trim();
  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    fieldErrors.email = isEs
      ? 'Por favor ingrese un correo electrónico válido'
      : 'Please enter a valid email address';
  }

  const trimmedPhone = params.phone.trim();
  const digitCount = trimmedPhone.replace(/\D/g, '').length;
  if (!trimmedPhone || digitCount < 6) {
    fieldErrors.phone = isEs
      ? 'Por favor ingrese un número de teléfono o WhatsApp válido'
      : 'Please enter a valid WhatsApp or phone number';
  }

  if (
    params.selectedPackageId === 'day-tour-panama-city' &&
    !params.pickupLocation.trim()
  ) {
    fieldErrors.pickupLocation = isEs
      ? 'Por favor ingrese su hotel o dirección en Ciudad de Panamá'
      : 'Please enter your hotel or pickup address in Panama City';
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    fieldErrors,
  };
}

export function validateDayTripCheckoutStep(params: {
  selectedDate: string;
  adults: number;
  children: number;
  termsAccepted: boolean;
  beforeYouTravelAccepted: boolean;
  customerLanguage: Language;
  todayISO?: string;
}): { valid: boolean; error: string | null } {
  const isEs = params.customerLanguage === 'es';
  const todayISO = params.todayISO || getPanamaTodayDateISO();
  const dateTrimmed = params.selectedDate.trim();

  if (!isValidOvernightCalendarDate(dateTrimmed) || dateTrimmed < todayISO) {
    return {
      valid: false,
      error: isEs
        ? 'Por favor seleccione una fecha futura válida para su excursión.'
        : 'Please select a valid upcoming date for your excursion.',
    };
  }

  if (params.adults < 1 || params.children < 0 || params.adults + params.children < 1) {
    return {
      valid: false,
      error: isEs
        ? 'Debe incluir al menos 1 pasajero adulto.'
        : 'At least 1 adult traveler is required.',
    };
  }

  if (!params.termsAccepted || !params.beforeYouTravelAccepted) {
    return {
      valid: false,
      error: isEs
        ? 'Debe aceptar los Términos y Condiciones y los Requisitos de Antes de Viajar para continuar.'
        : 'Please acknowledge both the Terms & Conditions and Before You Travel requirements to proceed.',
    };
  }

  return { valid: true, error: null };
}

export interface DayTripDraftInput {
  selectedPackageId: DayTourPackageId;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  selectedDate: string;
  adults: number;
  children: number;
  pickupLocation: string;
  specialNotes: string;
  customerLanguage: Language;
}

export function computeDayTripDraftFingerprint(draft: DayTripDraftInput): string {
  const normalizedPickup =
    draft.selectedPackageId === 'day-tour-port'
      ? 'Cartí Port'
      : draft.pickupLocation.trim().toLowerCase();

  return [
    draft.selectedPackageId,
    draft.customerName.trim().toLowerCase(),
    draft.customerEmail.trim().toLowerCase(),
    draft.customerPhone.trim(),
    draft.selectedDate.trim(),
    String(draft.adults),
    String(draft.children),
    normalizedPickup,
    draft.specialNotes.trim().toLowerCase(),
    draft.customerLanguage,
  ].join('|');
}

export function buildDayTripCheckoutPayload(
  draft: DayTripDraftInput & {
    bookingReference: string;
    idempotencyKey: string;
  }
) {
  const adults = Number.isFinite(Number(draft.adults))
    ? Math.max(1, Math.floor(Number(draft.adults)))
    : 1;
  const children = Number.isFinite(Number(draft.children))
    ? Math.max(0, Math.floor(Number(draft.children)))
    : 0;

  return {
    bookingReference: draft.bookingReference.trim(),
    bookingType: 'day-trip' as const,
    dayTourPackageId: draft.selectedPackageId,
    customerName: draft.customerName.trim(),
    customerEmail: draft.customerEmail.trim().toLowerCase(),
    customerPhone: draft.customerPhone.trim(),
    targetDate: draft.selectedDate.trim(),
    adults,
    children,
    pickupLocation:
      draft.selectedPackageId === 'day-tour-port'
        ? 'Cartí Port'
        : draft.pickupLocation.trim(),
    specialNotes: draft.specialNotes.trim(),
    termsAccepted: true,
    customerLanguage: draft.customerLanguage,
    idempotencyKey: draft.idempotencyKey.trim(),
  };
}
