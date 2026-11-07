export interface DayTourPackageInfo {
  id: 'day-tour-panama-city' | 'day-tour-port';
  title: { en: string; es: string };
  subtitle: { en: string; es: string };
  pricePerPerson: number;
  priceInCents: number;
  includesTransport: boolean;
  duration: { en: string; es: string };
  highlights: { en: string[]; es: string[] };
}

export const DAY_TOUR_PACKAGES_CLIENT: Record<string, DayTourPackageInfo> = {
  'day-tour-panama-city': {
    id: 'day-tour-panama-city',
    title: {
      en: 'Day Tour from Panama City (Full Day with 4x4 Transport)',
      es: 'Pasadía desde Ciudad de Panamá (Completo con Traslado 4x4)',
    },
    subtitle: {
      en: 'Includes round-trip 4x4 transport from Panama City, boat excursion, 2 islands, Natural Pool, and lunch.',
      es: 'Incluye transporte 4x4 ida y vuelta desde Ciudad de Panamá, recorrido en lancha, 2 islas, Piscina Natural y almuerzo.',
    },
    pricePerPerson: 142.0,
    priceInCents: 14200,
    includesTransport: true,
    duration: {
      en: 'Full Day (approx. 5:00 AM – 7:00 PM return)',
      es: 'Día Completo (aprox. 5:00 AM – 7:00 PM regreso)',
    },
    highlights: {
      en: [
        'Roundtrip shared 4x4 SUV hotel pickup & dropoff in Panama City',
        'Motorboat excursion to 2-3 pristine coral islands & Natural Pool',
        'Traditional fresh lunch (fish or chicken with coconut rice) & 1 drink',
        'Snorkeling equipment and experienced local Guna guide',
      ],
      es: [
        'Traslado 4x4 compartido ida y vuelta desde hoteles en Ciudad de Panamá',
        'Excursión en lancha a 2-3 islas de coral y Piscina Natural',
        'Almuerzo tradicional fresco (pescado o pollo con arroz con coco) y bebida',
        'Equipo de snorkel y guía local guna experimentado',
      ],
    },
  },
  'day-tour-port': {
    id: 'day-tour-port',
    title: {
      en: 'Day Tour from Guna Yala Port (Maritime Excursion from Port Cartí)',
      es: 'Pasadía desde Puerto Cartí (Excursión Marítima desde Puerto)',
    },
    subtitle: {
      en: 'Includes shared boat excursion from Cartí Port, 2 islands, Natural Pool, lunch, and snorkeling gear. Ground transport excluded.',
      es: 'Incluye excursión en lancha desde Puerto Cartí, 2 islas, Piscina Natural, almuerzo y equipo de snorkel. No incluye transporte terrestre.',
    },
    pricePerPerson: 69.0,
    priceInCents: 6900,
    includesTransport: false,
    duration: {
      en: 'Port Excursion (Meet at Cartí Port by 8:30 AM)',
      es: 'Excursión desde Puerto (Presentarse en Puerto Cartí a las 8:30 AM)',
    },
    highlights: {
      en: [
        'Shared boat excursion departing directly from Port Cartí',
        'Visits to 2 paradise islands and the shallow starfish sandbank',
        'Traditional island lunch with refreshing beverage',
        'Snorkeling gear and local Guna guide',
      ],
      es: [
        'Excursión en lancha compartida saliendo directamente desde Puerto Cartí',
        'Visita a 2 islas paradisíacas y banco de arena de la Piscina Natural',
        'Almuerzo tradicional isleño con bebida refrescante',
        'Equipo de snorkel y guía local guna',
      ],
    },
  },
};
