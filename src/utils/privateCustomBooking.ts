import { Language } from '../types';
import {
  getPanamaTodayDateISO,
  isValidOvernightCalendarDate,
} from './overnightBooking';

export type CharterTypeId =
  | 'private-day'
  | 'private-overnight'
  | 'sailboat'
  | 'catamaran'
  | 'custom-event';

export interface CharterOption {
  id: CharterTypeId;
  title: { en: string; es: string };
  desc: { en: string; es: string };
}

export const CHARTER_OPTIONS: CharterOption[] = [
  {
    id: 'private-day',
    title: {
      en: 'Private Day Trip (Exclusive 4x4 & Boat)',
      es: 'Pasadía Privado (4x4 y Bote Exclusivo)',
    },
    desc: {
      en: 'Custom departure time, exclusive boat for your party',
      es: 'Horarios a su medida, sin compartir con otros grupos',
    },
  },
  {
    id: 'private-overnight',
    title: {
      en: 'Private Island Overnight Stay',
      es: 'Estadía Nocturna Privada en Isla',
    },
    desc: {
      en: 'Dedicated transfers and private beachfront cabana',
      es: 'Cabaña privada en la playa con traslados dedicados',
    },
  },
  {
    id: 'sailboat',
    title: {
      en: 'Private Monohull Sailboat Charter',
      es: 'Velero Monocasco Privado a Vela',
    },
    desc: {
      en: 'Wind sailing between secluded outer atolls',
      es: 'Navegación tradicional a vela entre arrecifes exteriores',
    },
  },
  {
    id: 'catamaran',
    title: {
      en: 'Private Luxury Catamaran Charter',
      es: 'Catamarán de Lujo Exclusivo',
    },
    desc: {
      en: 'Wide sun decks, en-suite cabins, and maximum stability',
      es: 'Máxima amplitud, cabinas en suite y confort de alta gama',
    },
  },
  {
    id: 'custom-event',
    title: {
      en: 'Family Gathering / Special Event',
      es: 'Celebración Familiar / Viaje Especial',
    },
    desc: {
      en: 'Anniversaries, honeymoons, photography, or group travel',
      es: 'Cumpleaños, fotografía, luna de miel o evento privado',
    },
  },
];

export function resolveInitialCharterType(initial?: string | null): CharterTypeId {
  if (!initial) return 'private-day';
  const normalized = initial.trim().toLowerCase();
  if (normalized === 'sailing' || normalized === 'sailboat') return 'sailboat';
  if (normalized === 'catamaran') return 'catamaran';
  if (normalized === 'private-overnight') return 'private-overnight';
  if (normalized === 'custom-event') return 'custom-event';
  return 'private-day';
}

export function getCharterTitle(charterType: CharterTypeId, lang: Language): string {
  const option = CHARTER_OPTIONS.find((opt) => opt.id === charterType) || CHARTER_OPTIONS[0];
  return option.title[lang];
}

export interface PrivateCustomSubmissionDraft {
  idempotencyKey: string;
  charterType: CharterTypeId;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  targetDate: string;
  adults: number;
  children: number;
  interests: string[];
  message: string;
  termsAccepted: boolean;
  customerLanguage: Language;
}

export function validatePrivateCustomInquiry(params: {
  fullName: string;
  email: string;
  phone: string;
  targetDate: string;
  adults: number;
  children: number;
  termsAccepted: boolean;
  customerLanguage: Language;
  todayISO?: string;
}): {
  valid: boolean;
  fieldErrors: { [key: string]: string };
  summaryError: string | null;
} {
  const isEs = params.customerLanguage === 'es';
  const fieldErrors: { [key: string]: string } = {};

  const trimmedName = params.fullName.trim();
  const trimmedEmail = params.email.trim();
  const trimmedPhone = params.phone.trim();
  const trimmedDate = params.targetDate.trim();
  const todayISO = params.todayISO || getPanamaTodayDateISO();

  if (!trimmedName) {
    fieldErrors.fullName = isEs
      ? 'Ingrese su nombre completo.'
      : 'Please enter your full name.';
  }

  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    fieldErrors.email = isEs
      ? 'Ingrese un correo electrónico válido.'
      : 'Please enter a valid email address.';
  }

  const digitCount = trimmedPhone.replace(/\D/g, '').length;
  if (!trimmedPhone || digitCount < 6) {
    fieldErrors.phone = isEs
      ? 'Ingrese un número de WhatsApp o teléfono válido.'
      : 'Please enter a valid WhatsApp or phone number.';
  }

  if (trimmedDate) {
    if (!isValidOvernightCalendarDate(trimmedDate)) {
      fieldErrors.targetDate = isEs
        ? 'Seleccione una fecha de viaje válida.'
        : 'Please select a valid travel date.';
    } else if (trimmedDate < todayISO) {
      fieldErrors.targetDate = isEs
        ? 'La fecha de viaje no puede estar en el pasado.'
        : 'Target travel date cannot be in the past.';
    }
  }

  const adults = Number(params.adults) || 0;
  const children = Number(params.children) || 0;
  if (adults + children < 1) {
    fieldErrors.travelers = isEs
      ? 'Debe incluir al menos 1 viajero.'
      : 'At least 1 traveler is required.';
  } else if (adults > 50 || children > 50) {
    fieldErrors.travelers = isEs
      ? 'El tamaño del grupo supera el límite en línea (50). Contáctenos por WhatsApp para grupos grandes.'
      : 'Party size exceeds online limit (50). Contact us on WhatsApp for large group charters.';
  }

  if (!params.termsAccepted) {
    fieldErrors.termsAccepted = isEs
      ? 'Debe aceptar los Términos y Condiciones para enviar su solicitud.'
      : 'Please acknowledge the Terms & Conditions to submit your booking request.';
  }

  const errorValues = Object.values(fieldErrors);
  if (errorValues.length === 0) {
    return { valid: true, fieldErrors: {}, summaryError: null };
  }

  const summaryError =
    errorValues.length === 1
      ? errorValues[0]
      : isEs
      ? `Por favor corrija los campos marcados (${errorValues[0]})`
      : `Please complete the highlighted fields (${errorValues[0]})`;

  return { valid: false, fieldErrors, summaryError };
}

export function buildPrivateCustomBookingRequestPayload(draft: PrivateCustomSubmissionDraft) {
  const adults = Number.isFinite(Number(draft.adults))
    ? Math.min(50, Math.max(1, Math.floor(Number(draft.adults))))
    : 1;
  const children = Number.isFinite(Number(draft.children))
    ? Math.min(50, Math.max(0, Math.floor(Number(draft.children))))
    : 0;
  const trimmedDate = draft.targetDate.trim();
  const safeTargetDate = trimmedDate && isValidOvernightCalendarDate(trimmedDate) ? trimmedDate : '';
  const interestsPart = draft.interests.length > 0 ? draft.interests.join(', ') : 'General';
  const msgPart = draft.message.trim();

  return {
    idempotencyKey: draft.idempotencyKey.trim(),
    bookingType: 'private-charter' as const,
    customerName: draft.customerName.trim(),
    customerEmail: draft.customerEmail.trim().toLowerCase(),
    customerPhone: draft.customerPhone.trim(),
    experienceTitle: getCharterTitle(draft.charterType, draft.customerLanguage),
    targetDate: safeTargetDate,
    adults,
    children,
    specialNotes: msgPart
      ? `Interests: ${interestsPart}. Message: ${msgPart}`
      : `Interests: ${interestsPart}`,
    termsAccepted: Boolean(draft.termsAccepted),
    termsVersion: '2026-10-18',
    customerLanguage: draft.customerLanguage,
  };
}

export function computePrivateCustomDraftFingerprint(
  draft: Omit<PrivateCustomSubmissionDraft, 'idempotencyKey'>
): string {
  return [
    draft.charterType,
    draft.customerName.trim().toLowerCase(),
    draft.customerEmail.trim().toLowerCase(),
    draft.customerPhone.trim(),
    draft.targetDate.trim(),
    String(draft.adults),
    String(draft.children),
    [...draft.interests].sort().join(','),
    draft.message.trim().toLowerCase(),
    draft.customerLanguage,
  ].join('|');
}

export function buildPrivateCustomWhatsappText(params: {
  charterType: CharterTypeId;
  customerLanguage: Language;
  targetDate: string;
  adults: number;
  children: number;
  interests: string[];
  message: string;
}): string {
  const isEs = params.customerLanguage === 'es';
  const charterTitle = getCharterTitle(params.charterType, params.customerLanguage);
  const dateStr = params.targetDate.trim() || 'Flexible';
  const interestsStr = params.interests.length > 0 ? params.interests.join(', ') : 'General';
  const specialRequests = params.message.trim() || (isEs ? 'Ninguna' : 'None');

  if (isEs) {
    return encodeURIComponent(
      `¡Hola Guna Yala Panama Travel!\n\nMe gustaría solicitar información sobre una experiencia de ${charterTitle}.\n\nFecha preferida: ${dateStr}\nAdultos: ${params.adults}\nNiños: ${params.children}\nIntereses: ${interestsStr}\nSolicitudes especiales: ${specialRequests}\n\n¿Podrían confirmar disponibilidad y enviarme una cotización?`
    );
  }

  return encodeURIComponent(
    `Hello Guna Yala Panama Travel!\n\nI would like to inquire about a ${charterTitle} experience.\n\nPreferred date: ${dateStr}\nAdults: ${params.adults}\nChildren: ${params.children}\nInterests: ${interestsStr}\nSpecial requests: ${specialRequests}\n\nCould you please confirm availability and provide a quotation?`
  );
}
