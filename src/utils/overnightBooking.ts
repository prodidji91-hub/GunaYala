import { Language } from '../types';
import { ISLAND_PACKAGES, IslandPackageDetail } from '../data/islandPackages';
import { EXPERIENCES_DATA } from '../data/experiences';

export interface AccommodationOption {
  id: string;
  label: { en: string; es: string };
  sub: { en: string; es: string };
  value: string;
}

export interface OvernightSelectablePackage {
  id: string;
  name: string;
  kind: 'island' | 'expedition';
  title: { en: string; es: string };
  subtitle: { en: string; es: string };
  description: { en: string; es: string };
  duration: { en: string; es: string };
  firstNightRate: { en: string; es: string };
  additionalNightRate: { en: string; es: string };
  isPriceOnRequest: boolean;
  accommodationSummary: { en: string; es: string };
  highlights: { en: string[]; es: string[] };
  image?: string;
  imageType?: 'overnight' | 'multi-day' | 'sailing';
  accommodationOptions: AccommodationOption[];
  experienceModalId: string;
  experienceCategory: 'overnight' | 'multi-day' | 'sailing';
}

const ISLAND_TITLES: Record<string, { en: string; es: string }> = {
  'chichime-grande': {
    en: 'Chichime Grande Overnight Experience',
    es: 'Experiencia Nocturna en Chichime Grande',
  },
  'chichime-chico': {
    en: 'Chichime Chico Overnight Experience',
    es: 'Experiencia Nocturna en Chichime Chico',
  },
  guasirdub: {
    en: 'Guasirdub Overnight Experience',
    es: 'Experiencia Nocturna en Guasirdub',
  },
  'perro-chico': {
    en: 'Perro Chico Overnight Experience',
    es: 'Experiencia Nocturna en Perro Chico',
  },
  'franklin-island': {
    en: 'Franklin Island Overnight Experience',
    es: 'Experiencia Nocturna en Isla Franklin',
  },
  yansailadub: {
    en: 'Yansailadub Overnight Experience',
    es: 'Experiencia Nocturna en Yansailadub',
  },
  'nurdub-community': {
    en: 'Nurdub Community Overnight Experience',
    es: 'Experiencia Nocturna en Comunidad Nurdub',
  },
};

const ISLAND_ACCOMMODATIONS: Record<string, AccommodationOption[]> = {
  'chichime-grande': [
    {
      id: 'chichime-private-beach-cabin-private-bath',
      label: { en: 'Private Beach Cabin', es: 'Cabaña Privada de Playa' },
      sub: { en: 'Private bathroom · Oceanfront', es: 'Baño privado · Frente al mar' },
      value: 'Private Beach Cabin (Private Bathroom)',
    },
  ],
  'chichime-chico': [
    {
      id: 'chichime-chico-rustic-shared-bath',
      label: { en: 'Rustic Beachfront Wooden Cabin', es: 'Cabaña Rústica de Madera' },
      sub: { en: 'Shared bathroom · White coral beach', es: 'Baño compartido · Frente al mar' },
      value: 'Rustic Beachfront Wooden Cabin (Shared Bathroom)',
    },
  ],
  guasirdub: [
    {
      id: 'guasirdub-overwater-shared-bath',
      label: { en: 'Private Overwater Cabin', es: 'Cabaña Privada Sobre el Agua' },
      sub: { en: 'Shared bathroom · Above turquoise water', es: 'Baño compartido · Sobre el agua' },
      value: 'Private Overwater Cabin (Shared Bathroom)',
    },
  ],
  'perro-chico': [
    {
      id: 'perro-chico-beachfront-private-bath',
      label: { en: 'Private Beachfront Cabin', es: 'Cabaña Privada Frente al Mar' },
      sub: { en: 'Private bathroom · Renovated', es: 'Baño privado · Renovada' },
      value: 'Private Beachfront Cabin (Private Bathroom)',
    },
    {
      id: 'perro-chico-overwater-private-bath',
      label: { en: 'Private Overwater Cabin', es: 'Cabaña Privada Sobre el Agua' },
      sub: { en: 'Private bathroom · Renovated', es: 'Baño privado · Renovada' },
      value: 'Private Overwater Cabin (Private Bathroom)',
    },
  ],
  'franklin-island': [
    {
      id: 'franklin-rustic-beachfront-shared-bath',
      label: { en: 'Private Rustic Beachfront Cabin', es: 'Cabaña Privada Rústica Frente al Mar' },
      sub: { en: 'Shared bathroom · White coral sands', es: 'Baño compartido · Arena blanca' },
      value: 'Private Rustic Beachfront Cabin (Shared Bathroom)',
    },
  ],
  yansailadub: [
    {
      id: 'yansailadub-overwater-shared-bath',
      label: { en: 'Private Overwater Cabin', es: 'Cabaña Privada Sobre el Agua' },
      sub: { en: 'Shared bathroom · Turquoise Caribbean view', es: 'Baño compartido · Sobre el mar' },
      value: 'Private Overwater Cabin (Shared Bathroom)',
    },
  ],
  'nurdub-community': [
    {
      id: 'nurdub-traditional-cabana-shared',
      label: { en: 'Traditional Rustic Guna Cabana', es: 'Cabaña Rústica Tradicional Guna' },
      sub: { en: 'Shared community facilities', es: 'Instalaciones comunitarias compartidas' },
      value: 'Traditional Rustic Guna Cabana (Shared Community Facilities)',
    },
  ],
};

function buildIslandPackage(island: IslandPackageDetail): OvernightSelectablePackage {
  const title = ISLAND_TITLES[island.id] || {
    en: `${island.name} Overnight Experience`,
    es: `Experiencia Nocturna en ${island.name}`,
  };

  const accommodationOptions = ISLAND_ACCOMMODATIONS[island.id] || [
    {
      id: `${island.id}-default-accommodation`,
      label: { en: island.accommodation.en, es: island.accommodation.es },
      sub: { en: 'Confirmed with Petra', es: 'Confirmado con Petra' },
      value: island.accommodation.en,
    },
  ];

  const duration = island.isPriceOnRequest
    ? {
        en: '1+ Nights (Price on Request)',
        es: '1+ Noches (Precio a consultar)',
      }
    : {
        en: `${island.firstNightRate.en} · Extra ${island.additionalNightRate.en}`,
        es: `${island.firstNightRate.es} · Extra ${island.additionalNightRate.es}`,
      };

  return {
    id: island.id,
    name: island.name,
    kind: 'island',
    title,
    subtitle: island.subtitle,
    description: island.description,
    duration,
    firstNightRate: island.firstNightRate,
    additionalNightRate: island.additionalNightRate,
    isPriceOnRequest: Boolean(island.isPriceOnRequest),
    accommodationSummary: island.accommodation,
    highlights: island.highlights,
    image: island.image,
    imageType: 'overnight',
    accommodationOptions,
    experienceModalId: 'overnight-island-stay',
    experienceCategory: 'overnight',
  };
}

const EXPEDITION_PACKAGES: OvernightSelectablePackage[] = EXPERIENCES_DATA.filter(
  (exp) => exp.category === 'multi-day' || exp.category === 'sailing'
).map((exp) => {
  const accommodationOptions: AccommodationOption[] =
    exp.category === 'sailing'
      ? [
          {
            id: 'sailing-private-double-cabin',
            label: { en: 'Private Double Vessel Cabin', es: 'Cabina Doble Privada a Bordo' },
            sub: { en: 'Sailboat shared marine head', es: 'Velero con baño marino compartido' },
            value: 'Private Double Cabin Onboard Sailing Vessel',
          },
        ]
      : [
          {
            id: 'multi-day-selected-cabana',
            label: { en: 'Selected Island Cabanas', es: 'Cabañas Seleccionadas en Islas' },
            sub: { en: 'Coordinated island-to-island', es: 'Coordinado de isla en isla' },
            value: 'Selected Island Cabanas (Multi-Day Itinerary)',
          },
        ];

  return {
    id: exp.id,
    name: exp.title.en,
    kind: 'expedition',
    title: exp.title,
    subtitle: exp.subtitle,
    description: exp.overview,
    duration: exp.duration,
    firstNightRate: exp.pricingNote,
    additionalNightRate: exp.duration,
    isPriceOnRequest: true,
    accommodationSummary: exp.accommodation || exp.subtitle,
    highlights: exp.highlights,
    imageType: exp.imageType === 'sailing' ? 'sailing' : 'multi-day',
    accommodationOptions,
    experienceModalId: exp.id,
    experienceCategory: exp.category === 'sailing' ? 'sailing' : 'multi-day',
  };
});

export const OVERNIGHT_PACKAGES: OvernightSelectablePackage[] = [
  ...ISLAND_PACKAGES.map(buildIslandPackage),
  ...EXPEDITION_PACKAGES,
];

const SELECTION_ALIASES: Record<string, string> = {
  'overnight-island-stay': 'chichime-grande',
  'chichime island': 'chichime-grande',
  'chichime grande': 'chichime-grande',
  'chichime chico': 'chichime-chico',
  guasirdub: 'guasirdub',
  'perro chico': 'perro-chico',
  'franklin island': 'franklin-island',
  'isla franklin': 'franklin-island',
  yansailadub: 'yansailadub',
  'yansailadub island': 'yansailadub',
  nurdub: 'nurdub-community',
  'nurdub community': 'nurdub-community',
  'comunidad nurdub': 'nurdub-community',
  'multi-day': 'multi-day-exploration',
  sailing: 'sailing-adventure',
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function findOvernightPackageBySelection(
  selection?: string | null
): OvernightSelectablePackage | null {
  if (!selection || typeof selection !== 'string') return null;
  const normalized = selection.trim().toLowerCase();
  if (!normalized) return null;

  const aliasedId = SELECTION_ALIASES[normalized];
  if (aliasedId) {
    const matched = OVERNIGHT_PACKAGES.find((pkg) => pkg.id === aliasedId);
    if (matched) return matched;
  }

  const normalizedSlug = slugify(normalized);

  return (
    OVERNIGHT_PACKAGES.find(
      (pkg) =>
        pkg.id.toLowerCase() === normalized ||
        pkg.name.toLowerCase() === normalized ||
        pkg.title.en.toLowerCase() === normalized ||
        pkg.title.es.toLowerCase() === normalized ||
        slugify(pkg.id) === normalizedSlug ||
        slugify(pkg.name) === normalizedSlug
    ) || null
  );
}

export function resolveOvernightPackage(selection?: string | null): OvernightSelectablePackage {
  return findOvernightPackageBySelection(selection) || OVERNIGHT_PACKAGES[0];
}

export function getValidAccommodationOptions(packageId: string): AccommodationOption[] {
  return resolveOvernightPackage(packageId).accommodationOptions;
}

export function resolveAccommodationOption(
  packageId: string,
  optionId?: string | null
): AccommodationOption {
  const pkg = resolveOvernightPackage(packageId);
  if (optionId) {
    const match = pkg.accommodationOptions.find(
      (opt) => opt.id === optionId || opt.value === optionId
    );
    if (match) return match;
  }
  return pkg.accommodationOptions[0];
}

export interface OvernightSubmissionDraft {
  idempotencyKey: string;
  packageId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  targetDate: string;
  nights: '1' | '2' | '3+';
  adults: number;
  children: number;
  selectedAccommodationId?: string | null;
  specialNotes: string;
  termsAccepted: boolean;
  customerLanguage: Language;
}

export function buildOvernightBookingRequestPayload(draft: OvernightSubmissionDraft) {
  const pkg = resolveOvernightPackage(draft.packageId);
  const accommodation = resolveAccommodationOption(pkg.id, draft.selectedAccommodationId);
  const adults = Number.isFinite(Number(draft.adults)) ? Math.max(1, Math.floor(Number(draft.adults))) : 1;
  const children = Number.isFinite(Number(draft.children)) ? Math.max(0, Math.floor(Number(draft.children))) : 0;

  return {
    idempotencyKey: draft.idempotencyKey.trim(),
    bookingType: 'overnight' as const,
    customerName: draft.customerName.trim(),
    customerEmail: draft.customerEmail.trim().toLowerCase(),
    customerPhone: draft.customerPhone.trim(),
    experienceTitle: pkg.title[draft.customerLanguage],
    targetDate: draft.targetDate.trim(),
    nights: draft.nights,
    adults,
    children,
    accommodationPreference: accommodation.value,
    specialNotes: draft.specialNotes.trim(),
    termsAccepted: Boolean(draft.termsAccepted),
    termsVersion: '2026-10-18',
    customerLanguage: draft.customerLanguage,
  };
}

export function getPanamaTodayDateISO(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Panama',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const year = parts.find((p) => p.type === 'year')?.value || '1970';
  const month = parts.find((p) => p.type === 'month')?.value || '01';
  const day = parts.find((p) => p.type === 'day')?.value || '01';

  return `${year}-${month}-${day}`;
}

export function isValidOvernightCalendarDate(dateStr: string): boolean {
  const trimmed = dateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;

  const [yStr, mStr, dStr] = trimmed.split('-');
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const day = parseInt(dStr, 10);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return (
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() === month - 1 &&
    utcDate.getUTCDate() === day
  );
}

export interface OvernightValidationResult {
  valid: boolean;
  fieldErrors: { [key: string]: string };
  summaryError: string | null;
}

export function validateOvernightInquiry(params: {
  fullName: string;
  email: string;
  phone: string;
  targetDate: string;
  adults: number;
  children: number;
  termsAccepted: boolean;
  customerLanguage: Language;
  todayISO?: string;
}): OvernightValidationResult {
  const isEs = params.customerLanguage === 'es';
  const fieldErrors: { [key: string]: string } = {};

  const trimmedName = params.fullName.trim();
  const trimmedEmail = params.email.trim();
  const trimmedPhone = params.phone.trim();
  const trimmedDate = params.targetDate.trim();
  const todayISO = params.todayISO || getPanamaTodayDateISO();

  if (!trimmedName) {
    fieldErrors.fullName = isEs ? 'Ingrese su nombre completo.' : 'Please enter your full name.';
  }

  if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    fieldErrors.email = isEs ? 'Ingrese un correo electrónico válido.' : 'Please enter a valid email address.';
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

  const totalTravelers = (Number(params.adults) || 0) + (Number(params.children) || 0);
  if (totalTravelers < 1) {
    fieldErrors.travelers = isEs
      ? 'Debe incluir al menos 1 viajero.'
      : 'At least 1 traveler is required.';
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

  return {
    valid: false,
    fieldErrors,
    summaryError,
  };
}

export function computeOvernightDraftFingerprint(
  draft: Omit<OvernightSubmissionDraft, 'idempotencyKey'>
): string {
  const pkg = resolveOvernightPackage(draft.packageId);
  const accommodation = resolveAccommodationOption(pkg.id, draft.selectedAccommodationId);
  return [
    pkg.id,
    draft.customerName.trim().toLowerCase(),
    draft.customerEmail.trim().toLowerCase(),
    draft.customerPhone.trim(),
    draft.targetDate.trim(),
    draft.nights,
    String(draft.adults),
    String(draft.children),
    accommodation.value.toLowerCase(),
    draft.specialNotes.trim().toLowerCase(),
    draft.customerLanguage,
  ].join('|');
}

export function buildOvernightWhatsappText(params: {
  packageId: string;
  customerLanguage: Language;
  targetDate: string;
  adults: number;
  children: number;
  nights: '1' | '2' | '3+';
  selectedAccommodationId?: string | null;
  specialNotes: string;
}): string {
  const isEs = params.customerLanguage === 'es';
  const pkg = resolveOvernightPackage(params.packageId);
  const accommodation = resolveAccommodationOption(pkg.id, params.selectedAccommodationId);
  const expTitle = pkg.title[params.customerLanguage];
  const dateStr = params.targetDate || 'Flexible';
  const interestsStr = accommodation.label[params.customerLanguage];
  const specialRequests = params.specialNotes.trim() || (isEs ? 'Ninguna' : 'None');
  const termsNote = isEs
    ? `\n\nEl cliente reconoció los Términos y Condiciones de Estadía Nocturna (versión 2026-10-18) antes de abrir WhatsApp.`
    : `\n\nCustomer acknowledged the Overnight Stay Terms & Conditions (version 2026-10-18) before opening WhatsApp.`;

  if (isEs) {
    return encodeURIComponent(
      `¡Hola Guna Yala Panama Travel!\n\nMe gustaría solicitar información sobre una experiencia de ${expTitle}.\n\nFecha preferida: ${dateStr}\nAdultos: ${params.adults}\nNiños: ${params.children}\nNoches: ${params.nights}\nAlojamiento: ${interestsStr}\nSolicitudes especiales: ${specialRequests}\n\n¿Podrían confirmar disponibilidad y enviarme una cotización?` +
        termsNote
    );
  }

  return encodeURIComponent(
    `Hello Guna Yala Panama Travel!\n\nI would like to inquire about a ${expTitle} package.\n\nPreferred date: ${dateStr}\nAdults: ${params.adults}\nChildren: ${params.children}\nNights: ${params.nights}\nAccommodation: ${interestsStr}\nSpecial requests: ${specialRequests}\n\nCould you please confirm availability and provide a quotation?` +
      termsNote
  );
}
