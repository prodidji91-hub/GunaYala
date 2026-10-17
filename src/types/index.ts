export type Language = 'en' | 'es';

export type ExperienceCategory =
  | 'day-trip'
  | 'overnight'
  | 'multi-day'
  | 'private-custom'
  | 'sailing'
  | 'catamaran';

export interface Experience {
  id: string;
  category: ExperienceCategory;
  title: {
    en: string;
    es: string;
  };
  subtitle: {
    en: string;
    es: string;
  };
  duration: {
    en: string;
    es: string;
  };
  suitableFor: {
    en: string;
    es: string;
  };
  overview: {
    en: string;
    es: string;
  };
  highlights: {
    en: string[];
    es: string[];
  };
  accommodation?: {
    en: string;
    es: string;
  };
  transportation: {
    en: string;
    es: string;
  };
  included: {
    en: string[];
    es: string[];
  };
  notIncluded: {
    en: string[];
    es: string[];
  };
  pricingNote: {
    en: string;
    es: string;
  };
  importantInfo: {
    en: string[];
    es: string[];
  };
  whatToBring: {
    en: string[];
    es: string[];
  };
  imageType: 'day-trip' | 'overnight' | 'multi-day' | 'private' | 'sailing' | 'catamaran';
}

export interface Review {
  id: string;
  author: string;
  country: string;
  date: string;
  rating: number;
  text: {
    en: string;
    es: string;
  };
  tripType: {
    en: string;
    es: string;
  };
}

export interface FaqItem {
  id: string;
  category: 'logistics' | 'islands' | 'packing' | 'booking';
  question: {
    en: string;
    es: string;
  };
  answer: {
    en: string;
    es: string;
  };
}

export interface PlannerState {
  experienceType: ExperienceCategory | '';
  adults: number;
  children: number;
  dateType: 'exact' | 'flexible';
  travelDate: string;
  durationNights: number;
  departureCity: 'panama_city' | 'own_transport';
  cabinPreference?: 'rustic_cabana' | 'private_room' | 'catamaran_cabin' | 'not_applicable';
  specialNotes: string;
}
