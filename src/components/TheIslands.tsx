import React, { useState } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import {
  Compass,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Clock,
  Car,
  Ship,
  Utensils,
  Sun,
  ShieldAlert,
  ArrowRight,
  Info,
  Layers,
  MapPin,
  Waves,
  Anchor,
} from 'lucide-react';

interface TheIslandsProps {
  currentLang: Language;
  onOpenPlanner?: (category?: string, islandName?: string) => void;
}

export interface IslandPackageDetail {
  id: string;
  name: string;
  title: string;
  subtitle: { en: string; es: string };
  description: { en: string; es: string };
  accommodation: { en: string; es: string };
  highlights: { en: string[]; es: string[] };
  firstNightRate: { en: string; es: string };
  additionalNightRate: { en: string; es: string };
  isPriceOnRequest?: boolean;
  image: string;
  isVerifiedImage: boolean;
  optionalActivity?: { en: string; es: string };
  packageInclusions: {
    included: { en: string[]; es: string[] };
    excluded: { en: string[]; es: string[] };
    transportation: { en: string; es: string };
    meals: { en: string; es: string };
    excursions: { en: string; es: string };
  };
}

export const ISLAND_PACKAGES: IslandPackageDetail[] = [
  {
    id: 'chichime-grande',
    name: 'Chichime Grande',
    title: 'CHICHIME ISLAND',
    subtitle: {
      en: 'Unwind. Explore. Recharge.',
      es: 'Desconecta. Explora. Recarga.',
    },
    description: {
      en: 'Discover a peaceful Caribbean escape on one of Guna Yala’s larger islands, where white sand beaches, crystal-clear waters, and a relaxed atmosphere invite you to reconnect with nature.',
      es: 'Descubre un pacífico refugio caribeño en una de las islas más grandes de Guna Yala, donde las playas de arena blanca, aguas cristalinas y un ambiente relajado te invitan a reconectarte con la naturaleza.',
    },
    accommodation: {
      en: 'Private beach cabin with private bathroom.',
      es: 'Cabaña privada de playa con baño privado.',
    },
    highlights: {
      en: [
        'Island Relaxation — White sand beaches and peaceful surroundings.',
        'Swimming & Snorkeling — Enjoy the clear Caribbean waters.',
        'Island Excursion — Shared boat excursion to a nearby island and the Natural Pool.',
      ],
      es: [
        'Relajación Insular — Playas de arena blanca y entorno tranquilo.',
        'Natación y Snorkel — Disfruta de las cristalinas aguas del Caribe.',
        'Excursión Insular — Excursión compartida en bote a una isla cercana y la Piscina Natural.',
      ],
    },
    firstNightRate: {
      en: 'From USD 259 per person',
      es: 'Desde USD 259 por persona',
    },
    additionalNightRate: {
      en: 'From USD 119 per person',
      es: 'Desde USD 119 por persona',
    },
    image: '/pictures/10 Boat Day Tour.jpg',
    isVerifiedImage: true,
    packageInclusions: {
      included: {
        en: [
          'Shared 4x4 overland transport from Panama City',
          'Shared boat transfers Cartí Port ↔ Island',
          'Private beach cabin accommodation with private bathroom',
          'Daily traditional meals (Breakfast, Lunch, Dinner)',
          'Shared boat excursion to nearby island and Natural Pool',
        ],
        es: [
          'Transporte terrestre compartido 4x4 desde Ciudad de Panamá',
          'Traslado marítimo en lancha Puerto Cartí ↔ Isla',
          'Alojamiento en cabaña privada con baño privado',
          'Comidas tradicionales diarias (Desayuno, Almuerzo, Cena)',
          'Excursión en lancha a isla cercana y Piscina Natural',
        ],
      },
      excluded: {
        en: [
          'Guna Yala Comarca entrance fee ($20 non-resident / $5 resident - pending confirmation)',
          'Cartí Port tax ($5 per person)',
          'Drinks and personal expenses',
        ],
        es: [
          'Impuesto de entrada a la Comarca ($20 no residente / $5 residente - pendiente confirmación)',
          'Tasa de Puerto Cartí ($5 por persona)',
          'Bebidas adicionales y gastos personales',
        ],
      },
      transportation: {
        en: 'Pickup 5:00 AM in 4x4 SUV from hotel or residence in Panama City. 2.5-hour mountain drive to Cartí Port, followed by a 30-minute Guna boat ride.',
        es: 'Recogida a las 5:00 AM en SUV 4x4 en hotel o residencia en Ciudad de Panamá. 2.5 horas de recorrido de montaña hasta Puerto Cartí y 30 minutos en lancha guna.',
      },
      meals: {
        en: 'Fresh catch Caribbean meals (fresh fish, fried plantains, coconut rice, salad). Chicken or vegetarian options available upon advance request.',
        es: 'Platos tradicionales del Caribe (pescado fresco del día, patacones, arroz con coco y ensalada). Opciones de pollo o vegetariano con aviso previo.',
      },
      excursions: {
        en: 'Includes 1 afternoon boat excursion to a neighboring coral cay and the offshore Natural Pool with giant sea stars.',
        es: 'Incluye 1 excursión por la tarde a un cayo de coral vecino y a la Piscina Natural con estrellas de mar.',
      },
    },
  },
  {
    id: 'chichime-chico',
    name: 'Chichime Chico',
    title: 'CHICHIME CHICO',
    subtitle: {
      en: 'Simplicity. Nature. Guna Hospitality.',
      es: 'Simplicidad. Naturaleza. Hospitalidad Guna.',
    },
    description: {
      en: 'Experience a small, peaceful island with five beachfront cabins, home-cooked meals, and welcoming local hospitality.',
      es: 'Experimenta una isla pequeña y tranquila con cinco cabañas frente al mar, comidas caseras y una cálida hospitalidad local.',
    },
    accommodation: {
      en: 'Beachfront cabin with shared bathroom facilities.',
      es: 'Cabaña frente a la playa con baño compartido.',
    },
    highlights: {
      en: [
        'Beachfront Accommodation — Intimate wood and thatch cabins.',
        'Traditional Island Meals — Home-cooked island dishes.',
        'Peaceful Island Experience — Quiet tropical surroundings.',
      ],
      es: [
        'Alojamiento Frente al Mar — Cabañas íntimas de madera y paja.',
        'Comidas Tradicionales — Gastronomía casera de la isla.',
        'Experiencia Tranquila — Entorno tropical apacible.',
      ],
    },
    firstNightRate: {
      en: 'Price on request (Provisional)',
      es: 'Precio bajo solicitud (Provisional)',
    },
    additionalNightRate: {
      en: 'Price on request (Provisional)',
      es: 'Precio bajo solicitud (Provisional)',
    },
    isPriceOnRequest: true,
    image: '/pictures/01 Boat Day Tour .jpg',
    isVerifiedImage: false,
    packageInclusions: {
      included: {
        en: [
          'Shared 4x4 overland transport from Panama City',
          'Shared boat transfers Cartí Port ↔ Island',
          'Beachfront cabin accommodation with shared bathrooms',
          'Home-cooked traditional meals',
          'Local Guna hospitality',
        ],
        es: [
          'Transporte terrestre compartido 4x4 desde Ciudad de Panamá',
          'Traslado marítimo en lancha Puerto Cartí ↔ Isla',
          'Alojamiento en cabaña frente a la playa con baños compartidos',
          'Comidas tradicionales caseras',
          'Cálida hospitalidad guna local',
        ],
      },
      excluded: {
        en: [
          'Comarca entrance fee ($20 non-resident / $5 resident - pending confirmation)',
          'Cartí Port fee ($5 per person)',
          'Personal beverages and snacks',
        ],
        es: [
          'Entrada a la Comarca ($20 no residente / $5 residente - pendiente confirmación)',
          'Tasa del Puerto Cartí ($5 por persona)',
          'Bebidas personales y snacks',
        ],
      },
      transportation: {
        en: '4x4 SUV pickup in Panama City at 5:00 AM to Cartí Port. Motorboat transfer to Chichime Chico.',
        es: 'Recogida en SUV 4x4 en Ciudad de Panamá a las 5:00 AM hacia Puerto Cartí. Traslado en lancha a Chichime Chico.',
      },
      meals: {
        en: 'Home-cooked traditional meals prepared by local Guna hosts.',
        es: 'Comidas tradicionales caseras preparadas por anfitriones gunas.',
      },
      excursions: {
        en: 'Island hopping excursions available upon request with local captain.',
        es: 'Excursiones entre islas disponibles bajo solicitud con el capitán local.',
      },
    },
  },
  {
    id: 'guasirdub',
    name: 'Guasirdub',
    title: 'GUASIRDUB',
    subtitle: {
      en: 'Peace. Comfort. Tranquility.',
      es: 'Paz. Confort. Tranquilidad.',
    },
    description: {
      en: 'Discover an intimate island retreat with just three spacious overwater cabins, surrounded by the turquoise waters of Guna Yala.',
      es: 'Descubre un refugio insular íntimo con solo tres espaciosas cabañas sobre el agua, rodeadas por las aguas turquesas de Guna Yala.',
    },
    accommodation: {
      en: 'Private overwater cabin with shared bathroom facilities.',
      es: 'Cabaña privada sobre el agua con baño compartido.',
    },
    highlights: {
      en: [
        'Overwater Cabins — Intimate retreat with only three cabins.',
        'Peaceful Island Escape — Uninterrupted ocean horizon views.',
        'Shared Island Excursion — Visit nearby reefs and Natural Pool.',
      ],
      es: [
        'Cabañas Sobre el Agua — Refugio íntimo de solo tres cabañas.',
        'Escapada de Paz — Vistas ininterrumpidas del horizonte marino.',
        'Excursión Compartida — Visita a arrecifes cercanos y Piscina Natural.',
      ],
    },
    firstNightRate: {
      en: 'From USD 249 per person',
      es: 'Desde USD 249 por persona',
    },
    additionalNightRate: {
      en: 'From USD 119 per person',
      es: 'Desde USD 119 por persona',
    },
    image: '/pictures/04 Catamaran San Blas Island .jpg',
    isVerifiedImage: false,
    packageInclusions: {
      included: {
        en: [
          'Shared 4x4 overland transport from Panama City',
          'Shared boat transfers Cartí Port ↔ Island',
          'Private overwater cabin stay',
          'Daily traditional meals (Breakfast, Lunch, Dinner)',
          'Shared boat excursion to nearby island and Natural Pool',
        ],
        es: [
          'Transporte terrestre compartido 4x4 desde Ciudad de Panamá',
          'Traslado marítimo en lancha Puerto Cartí ↔ Isla',
          'Estadía en cabaña privada sobre el agua',
          'Comidas tradicionales diarias (Desayuno, Almuerzo, Cena)',
          'Excursión en lancha a isla cercana y Piscina Natural',
        ],
      },
      excluded: {
        en: [
          'Guna Yala entrance fee ($20 non-resident / $5 resident - pending confirmation)',
          'Port fee ($5 per person)',
          'Beverages and personal items',
        ],
        es: [
          'Entrada a la Comarca Guna Yala ($20 no residente / $5 residente - pendiente confirmación)',
          'Tasa de puerto ($5 por persona)',
          'Bebidas y consumo personal',
        ],
      },
      transportation: {
        en: '4x4 SUV overland transfer from Panama City to Cartí Port + boat transfer to Guasirdub.',
        es: 'Traslado 4x4 desde Ciudad de Panamá a Puerto Cartí + traslado en lancha a Guasirdub.',
      },
      meals: {
        en: 'Fresh seafood and traditional Guna meals served daily.',
        es: 'Mariscos frescos y platos tradicionales gunas servidos diariamente.',
      },
      excursions: {
        en: 'Includes shared boat trip to nearby coral island and natural sandbar pool.',
        es: 'Incluye recorrido en bote a cayo cercano y banco de arena natural.',
      },
    },
  },
  {
    id: 'perro-chico',
    name: 'Perro Chico',
    title: 'PERRO CHICO',
    subtitle: {
      en: 'Relax. Snorkel. Explore.',
      es: 'Relájate. Snorkel. Explora.',
    },
    description: {
      en: 'Discover white sand beaches, crystal-clear Caribbean waters, and the famous sunken shipwreck just offshore.',
      es: 'Descubre playas de arena blanca, aguas cristalinas del Caribe y el famoso barco hundido a pocos metros de la orilla.',
    },
    accommodation: {
      en: 'Beachfront or overwater cabin with private bathroom.',
      es: 'Cabaña frente al mar o sobre el agua con baño privado.',
    },
    highlights: {
      en: [
        'Snorkeling Adventure — Famous offshore coral-encrusted shipwreck.',
        'Island Accommodation — Recently renovated cabins with private bathroom.',
        'Island Atmosphere — Rooftop sunset views and outdoor beach bar.',
      ],
      es: [
        'Aventura de Snorkel — Famoso barco hundido cubierto de coral.',
        'Alojamiento Renovado — Cabañas recientemente renovadas con baño privado.',
        'Ambiente de la Isla — Vistas al atardecer y bar playero.',
      ],
    },
    firstNightRate: {
      en: 'From USD 249 per person',
      es: 'Desde USD 249 por persona',
    },
    additionalNightRate: {
      en: 'From USD 109 per person',
      es: 'Desde USD 109 por persona',
    },
    image: '/pictures/perrochico.jpg',
    isVerifiedImage: true,
    packageInclusions: {
      included: {
        en: [
          'Shared 4x4 overland transport from Panama City',
          'Shared boat transfers Cartí Port ↔ Island',
          'Renovated cabin stay with private bathroom',
          'Daily traditional meals',
          'Shared boat excursion to Natural Pool & neighboring cays',
          'Local Guna guide during excursion',
        ],
        es: [
          'Transporte terrestre compartido 4x4 desde Ciudad de Panamá',
          'Traslado marítimo en lancha Puerto Cartí ↔ Isla',
          'Estadía en cabaña renovada con baño privado',
          'Comidas tradicionales diarias',
          'Excursión en lancha a la Piscina Natural y cayos vecinos',
          'Guía guna local durante la excursión',
        ],
      },
      excluded: {
        en: [
          'Comarca entrance fee ($20 non-resident / $5 resident - pending confirmation)',
          'Cartí Port tax ($5 per person)',
          'Snorkel gear hire ($5 USD optional rental if not brought)',
          'Drinks at the island beach bar',
        ],
        es: [
          'Entrada a la Comarca ($20 no residente / $5 residente - pendiente confirmación)',
          'Tasa de Puerto Cartí ($5 por persona)',
          'Alquiler de equipo de snorkel ($5 USD opcional si no trae el propio)',
          'Bebidas en el bar playero',
        ],
      },
      transportation: {
        en: '4x4 SUV pickup in Panama City between 5:00 AM – 5:30 AM to Cartí Port. 25-minute boat ride to Perro Chico.',
        es: 'Recogida en SUV 4x4 en Ciudad de Panamá entre 5:00 AM y 5:30 AM hacia Puerto Cartí. 25 minutos de lancha a Perro Chico.',
      },
      meals: {
        en: 'Includes breakfast, lunch, and dinner. Fresh fish, chicken, plantains, rice, and fresh salad.',
        es: 'Incluye desayuno, almuerzo y cena. Pescado fresco, pollo, patacones, arroz y ensalada.',
      },
      excursions: {
        en: 'Includes 1 guided boat excursion to the Natural Pool with sea stars.',
        es: 'Incluye 1 excursión guiada en bote a la Piscina Natural con estrellas de mar.',
      },
    },
  },
  {
    id: 'franklin-island',
    name: 'Franklin Island',
    title: 'FRANKLIN ISLAND',
    subtitle: {
      en: 'Relax. Connect. Explore.',
      es: 'Relájate. Conecta. Explora.',
    },
    description: {
      en: 'Experience rustic beachfront accommodation, beautiful white sand beaches, and a relaxed social island atmosphere.',
      es: 'Vive una experiencia en cabañas rústicas frente al mar, hermosas playas de arena blanca y un ambiente insular acogedor.',
    },
    accommodation: {
      en: 'Rustic beachfront cabin with shared bathroom facilities.',
      es: 'Cabaña rústica frente a la playa con baño compartido.',
    },
    highlights: {
      en: [
        'Beachfront Cabins — Authentic wood and thatch construction.',
        'Island Atmosphere — Evening beach bonfires and gathering.',
        'Swimming & Excursions — Clear turquoise waters and boat tours.',
      ],
      es: [
        'Cabañas Playeras — Construcción tradicional de madera y paja.',
        'Ambiente Festivo — Fogatas nocturnas en la playa.',
        'Natación y Excursiones — Aguas turquesas y recorridos en lancha.',
      ],
    },
    firstNightRate: {
      en: 'USD 229 per person',
      es: 'USD 229 por persona',
    },
    additionalNightRate: {
      en: 'USD 79 per person',
      es: 'USD 79 por persona',
    },
    image: '/pictures/04 Franklin.jpg',
    isVerifiedImage: true,
    packageInclusions: {
      included: {
        en: [
          'Shared 4x4 overland transport from Panama City',
          'Shared boat transfers Cartí Port ↔ Island',
          'Rustic beachfront cabin stay',
          'Traditional meals (Breakfast, Lunch, Dinner)',
          'Shared boat excursion to Natural Pool',
        ],
        es: [
          'Transporte terrestre compartido 4x4 desde Ciudad de Panamá',
          'Traslado marítimo en lancha Puerto Cartí ↔ Isla',
          'Alojamiento en cabaña rústica frente al mar',
          'Comidas tradicionales (Desayuno, Almuerzo, Cena)',
          'Excursión en lancha a la Piscina Natural',
        ],
      },
      excluded: {
        en: [
          'Guna Comarca entry fee ($20 non-resident / $5 resident - pending confirmation)',
          'Port tax ($5 per person)',
          'Island bar drinks',
        ],
        es: [
          'Entrada a la Comarca Guna ($20 no residente / $5 residente - pendiente confirmación)',
          'Tasa de puerto ($5 por persona)',
          'Bebidas en el bar de la isla',
        ],
      },
      transportation: {
        en: '4x4 SUV pickup in Panama City at 5:00 AM to Cartí Port. 30-minute boat ride to Franklin Island.',
        es: 'Recogida en SUV 4x4 en Ciudad de Panamá a las 5:00 AM hacia Puerto Cartí. 30 minutos de lancha a Isla Franklin.',
      },
      meals: {
        en: 'Traditional island meals served in the communal open-air dining cabana.',
        es: 'Comidas tradicionales servidas en el comedor comunitario al aire libre.',
      },
      excursions: {
        en: 'Includes afternoon boat tour to neighboring cays and sandbars.',
        es: 'Incluye recorrido por la tarde en bote a cayos y bancos de arena vecinos.',
      },
    },
  },
  {
    id: 'yansailadub',
    name: 'Yansailadub',
    title: 'YANSAILADUB',
    subtitle: {
      en: 'The Simple Beauty of Island Living.',
      es: 'La Simple Belleza de la Vida Insular.',
    },
    description: {
      en: 'Wake up surrounded by turquoise Caribbean waters and experience the peaceful rhythm of island life.',
      es: 'Despierta rodeado de aguas turquesas del Caribe y experimenta el ritmo apacible de la vida en la isla.',
    },
    accommodation: {
      en: 'Private overwater cabin with shared bathroom facilities.',
      es: 'Cabaña privada sobre el agua con baño compartido.',
    },
    highlights: {
      en: [
        'Overwater Living — Cabins perched above crystal turquoise water.',
        'Caribbean Relaxation — Quiet palm-fringed coral shores.',
        'Island Excursion — Boat trip to neighboring cays.',
      ],
      es: [
        'Vida Sobre el Agua — Cabañas suspendidas sobre aguas turquesas.',
        'Relajación Caribeña — Orillas de coral con palmeras tranquilas.',
        'Excursión Insular — Recorrido en bote a cayos vecinos.',
      ],
    },
    firstNightRate: {
      en: 'From USD 229 per person',
      es: 'Desde USD 229 por persona',
    },
    additionalNightRate: {
      en: 'From USD 109 per person',
      es: 'Desde USD 109 por persona',
    },
    image: '/pictures/piscinanat.jpg',
    isVerifiedImage: false,
    packageInclusions: {
      included: {
        en: [
          'Shared 4x4 overland transport from Panama City',
          'Shared boat transfers Cartí Port ↔ Island',
          'Overwater cabin accommodation',
          'Daily traditional meals',
          'Shared boat excursion',
        ],
        es: [
          'Transporte terrestre compartido 4x4 desde Ciudad de Panamá',
          'Traslado marítimo en lancha Puerto Cartí ↔ Isla',
          'Alojamiento en cabaña sobre el agua',
          'Comidas tradicionales diarias',
          'Excursión compartida en lancha',
        ],
      },
      excluded: {
        en: [
          'Guna Comarca fee ($20 non-resident / $5 resident - pending confirmation)',
          'Port tax ($5 per person)',
          'Personal beverages',
        ],
        es: [
          'Tasa Comarcal Guna ($20 no residente / $5 residente - pendiente confirmación)',
          'Tasa de puerto ($5 por persona)',
          'Bebidas personales',
        ],
      },
      transportation: {
        en: 'Overland 4x4 pickup in Panama City at 5:00 AM + Guna boat transfer.',
        es: 'Traslado terrestre en 4x4 con recogida en Ciudad de Panamá a las 5:00 AM + lancha guna.',
      },
      meals: {
        en: 'Fresh seafood, chicken, and traditional side dishes.',
        es: 'Mariscos frescos, pollo y acompañamientos tradicionales.',
      },
      excursions: {
        en: 'Includes boat tour to nearby coral sandbar.',
        es: 'Incluye paseo en lancha a banco de arena coralina cercano.',
      },
    },
  },
  {
    id: 'nurdub-community',
    name: 'Nurdub Community',
    title: 'NURDUB COMMUNITY',
    subtitle: {
      en: 'Culture. Community. Immersion.',
      es: 'Cultura. Comunidad. Inmersión.',
    },
    description: {
      en: 'Experience Guna community life through traditional accommodation, local hospitality, and cultural experiences.',
      es: 'Vive la vida en una comunidad guna a través de alojamiento tradicional, hospitalidad local y experiencias culturales.',
    },
    accommodation: {
      en: 'Traditional Guna cabin with shared bathroom facilities.',
      es: 'Cabaña tradicional Guna con baño compartido.',
    },
    highlights: {
      en: [
        'Guna Community & Culture — Authentic indigenous village life.',
        'Traditional Accommodation — Handcrafted wood and thatch cabana.',
        'Cultural Experiences — Mola artisan storytelling & heritage.',
        'Island Exploration — Boat trips to surrounding reefs.',
      ],
      es: [
        'Comunidad y Cultura Guna — Auténtica vida comunitaria indígena.',
        'Alojamiento Tradicional — Cabaña de madera y paja artesanal.',
        'Experiencias Culturales — Historias de molas y patrimonio cultural.',
        'Exploración Insular — Paseos en bote a arrecifes cercanos.',
      ],
    },
    firstNightRate: {
      en: 'From USD 229 per person',
      es: 'Desde USD 229 por persona',
    },
    additionalNightRate: {
      en: 'From USD 119 per person',
      es: 'Desde USD 119 por persona',
    },
    optionalActivity: {
      en: 'Optional Mola-making cultural workshop: From USD 40 per person (subject to artisan availability).',
      es: 'Taller cultural opcional de confección de Mola: Desde USD 40 por persona (sujeto a disponibilidad de artesanas).',
    },
    image: '/pictures/Gunamola.jpg',
    isVerifiedImage: true,
    packageInclusions: {
      included: {
        en: [
          'Shared 4x4 overland transport from Panama City',
          'Shared boat transfers Cartí Port ↔ Island',
          'Traditional Guna village cabin stay',
          'Daily traditional meals prepared by community hosts',
          'Community tour and cultural introduction',
        ],
        es: [
          'Transporte terrestre compartido 4x4 desde Ciudad de Panamá',
          'Traslado marítimo en lancha Puerto Cartí ↔ Isla',
          'Estadía en cabaña tradicional en aldea guna',
          'Comidas tradicionales preparadas por anfitriones de la comunidad',
          'Recorrido comunitario e introducción cultural',
        ],
      },
      excluded: {
        en: [
          'Guna Comarca entrance fee ($20 non-resident / $5 resident - pending confirmation)',
          'Port fee ($5 per person)',
          'Optional Mola workshop ($40 USD per person)',
        ],
        es: [
          'Entrada a la Comarca Guna ($20 no residente / $5 residente - pendiente confirmación)',
          'Tasa de puerto ($5 por persona)',
          'Taller de Mola opcional ($40 USD por persona)',
        ],
      },
      transportation: {
        en: '4x4 SUV pickup in Panama City at 5:00 AM + boat to Nurdub community.',
        es: 'Recogida en SUV 4x4 en Ciudad de Panamá a las 5:00 AM + lancha a la comunidad Nurdub.',
      },
      meals: {
        en: 'Authentic Guna family meals prepared with local fish and agricultural produce.',
        es: 'Comidas familiares gunas elaboradas con pesca local y cosechas de la comarca.',
      },
      excursions: {
        en: 'Guided village walk + boat visit to surrounding coral cays.',
        es: 'Caminata guiada por la aldea + visita en bote a cayos de coral vecinos.',
      },
    },
  },
];

export const TheIslands: React.FC<TheIslandsProps> = ({ currentLang, onOpenPlanner }) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [activeHighlightTab, setActiveHighlightTab] = useState<number>(0);
  const [isPackageExpanded, setIsPackageExpanded] = useState<boolean>(false);

  const isEs = currentLang === 'es';
  const currentIsland = ISLAND_PACKAGES[selectedIndex];

  const handleSelectIsland = (idx: number) => {
    setSelectedIndex(idx);
    setActiveHighlightTab(0);
    setIsPackageExpanded(false);
  };

  return (
    <section id="islands" className="bg-[#06121e] text-[#f6f2e9] py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 relative overflow-hidden border-t border-[#1e3a5f]/60">
      <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6 md:space-y-7">
        {/* ========================================================
            1. SECTION HEADER
           ======================================================== */}
        <div className="text-center space-y-2 sm:space-y-2.5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#c8ac75]/15 border border-[#c8ac75]/40 text-[#c8ac75] text-[11px] font-mono uppercase tracking-[0.25em]">
            <Compass className="w-3.5 h-3.5 text-[#c8ac75]" />
            <span>{isEs ? 'Colección de Islas Oficial' : 'Official Island Collection'}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#f6f2e9] tracking-tight">
            DISCOVER THE ISLANDS OF GUNA YALA
          </h2>

          <p className="text-sm sm:text-base text-[#cbd5e1] font-light leading-relaxed max-w-2xl mx-auto">
            {isEs
              ? 'Siete experiencias insulares extraordinarias, cada una con su propio carácter, belleza natural y hospitalidad local.'
              : 'Seven extraordinary island experiences, each with its own character, natural beauty, and local hospitality.'}
          </p>
        </div>

        {/* ========================================================
            2. INTERACTIVE 7-ISLAND SELECTOR BAR
           ======================================================== */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none justify-start md:justify-center">
          {ISLAND_PACKAGES.map((isl, idx) => {
            const isSelected = selectedIndex === idx;
            return (
              <button
                key={isl.id}
                onClick={() => handleSelectIsland(idx)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all shrink-0 border ${
                  isSelected
                    ? 'bg-[#c8ac75] text-[#06121e] border-[#c8ac75] font-bold shadow-md scale-102 ring-2 ring-[#c8ac75]/40'
                    : 'bg-[#091b2e]/90 text-[#94a3b8] border-[#1e3a5f] hover:text-white hover:border-[#c8ac75]/50'
                }`}
              >
                <div className="w-5 h-5 rounded-md overflow-hidden border border-white/20 shrink-0">
                  <img src={isl.image} alt={isl.name} className="w-full h-full object-cover" />
                </div>
                <span>{isl.name}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================
            3. MAIN INTERACTIVE ISLAND DISPLAY PANEL (DESIGN 03)
           ======================================================== */}
        <div className="bg-[#091b2e]/90 rounded-3xl border border-[#1e3a5f] p-5 sm:p-7 md:p-8 shadow-2xl space-y-6 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* LEFT: Cinematic Destination Photograph */}
            <div className="lg:col-span-7 space-y-4">
              <div className="relative aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden border border-[#c8ac75]/30 bg-[#06121e] shadow-2xl group">
                <img
                  key={currentIsland.id}
                  src={currentIsland.image}
                  alt={currentIsland.title}
                  className="w-full h-full object-cover transition-all duration-700 animate-in fade-in zoom-in-95 group-hover:scale-105"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Verification Status Badge */}
                <div className="absolute top-4 left-4 z-10">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest backdrop-blur-md border ${
                    currentIsland.isVerifiedImage
                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                      : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                  }`}>
                    <Sparkles className="w-3 h-3" />
                    <span>{currentIsland.isVerifiedImage ? (isEs ? 'Fotografía Verificada' : 'Verified Photo') : (isEs ? 'Muestra Preliminar' : 'Preview Media')}</span>
                  </span>
                </div>

                {/* Island Overlay Title */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs font-mono text-[#c8ac75] bg-black/65 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10">
                  <span className="font-serif text-sm font-semibold text-white">{currentIsland.title}</span>
                  <span>Guna Yala · San Blas</span>
                </div>
              </div>

              {/* Documented Starting Rate Strip */}
              <div className="p-4 rounded-2xl bg-[#06121e]/90 border border-[#c8ac75]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-[#c8ac75]">
                  <Sparkles className="w-4 h-4" />
                  <span>{isEs ? 'Tarifa Documentada:' : 'Documented Rate:'}</span>
                  <span className="text-white font-bold text-sm">{currentIsland.firstNightRate[currentLang]}</span>
                </div>
                <div className="text-[#94a3b8] text-[11px]">
                  {currentIsland.additionalNightRate[currentLang]}
                </div>
              </div>
            </div>

            {/* RIGHT: Detailed Information Panel */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-widest text-[#c8ac75]">
                  {currentIsland.name} (Guna Yala)
                </div>
                <h3 className="text-3xl sm:text-4xl font-serif text-white tracking-tight">
                  {currentIsland.title}
                </h3>
                <p className="text-base font-serif italic text-[#c8ac75]">
                  {currentIsland.subtitle[currentLang]}
                </p>
              </div>

              <div className="h-px w-20 bg-[#c8ac75]" />

              <p className="text-sm text-[#cbd5e1] font-light leading-relaxed">
                {currentIsland.description[currentLang]}
              </p>

              <div className="p-4 rounded-2xl bg-[#06121e] border border-[#1e3a5f] space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#c8ac75] block font-semibold">
                  {isEs ? 'Alojamiento Incluido:' : 'Included Accommodation:'}
                </span>
                <p className="text-xs text-white font-medium">
                  {currentIsland.accommodation[currentLang]}
                </p>
              </div>

              {/* Interactive Highlights List */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-mono uppercase tracking-widest text-[#c8ac75] block">
                  {isEs ? 'Aspectos Destacados de la Isla:' : 'Key Island Highlights:'}
                </span>
                <div className="space-y-1.5">
                  {currentIsland.highlights[currentLang].map((hl, hIdx) => (
                    <div key={hIdx} className="flex items-start gap-2 text-xs text-[#cbd5e1]">
                      <Check className="w-4 h-4 text-[#c8ac75] shrink-0 mt-0.5" />
                      <span>{hl}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Optional Cultural Activity Note if Present */}
              {currentIsland.optionalActivity && (
                <div className="p-3 rounded-xl bg-[#c8ac75]/10 border border-[#c8ac75]/30 text-xs text-[#c8ac75]">
                  {currentIsland.optionalActivity[currentLang]}
                </div>
              )}

              {/* Inquiry CTA */}
              <div className="pt-2">
                <button
                  onClick={() => onOpenPlanner?.('overnight', currentIsland.name)}
                  className="w-full py-4 px-6 rounded-2xl bg-[#c8ac75] hover:bg-[#d4af37] text-[#06121e] font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl hover:shadow-[#c8ac75]/20"
                >
                  <span>{isEs ? 'SOLICITAR ESTA EXPERIENCIA' : 'REQUEST THIS EXPERIENCE'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================
              4. EXPANDABLE PACKAGE DETAILS ACCORDION
             ======================================================== */}
          <div className="border-t border-[#1e3a5f] pt-6">
            <button
              onClick={() => setIsPackageExpanded(!isPackageExpanded)}
              className="w-full py-3 px-4 rounded-2xl bg-[#06121e] border border-[#1e3a5f] hover:border-[#c8ac75]/50 flex items-center justify-between text-xs font-mono text-[#c8ac75] uppercase tracking-wider transition-all"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#c8ac75]" />
                <span>
                  {isEs
                    ? `Ver Detalles del Paquete y Logística para ${currentIsland.name}`
                    : `View Package Details & Logistics for ${currentIsland.name}`}
                </span>
              </div>
              {isPackageExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {isPackageExpanded && (
              <div className="mt-4 p-6 rounded-2xl bg-[#06121e] border border-[#1e3a5f] space-y-6 text-xs text-[#cbd5e1] font-light animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Included Services */}
                  <div className="space-y-2">
                    <h4 className="font-mono text-xs text-[#c8ac75] uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>{isEs ? 'Lo Que Incluye El Paquete' : 'What is Included'}</span>
                    </h4>
                    <ul className="space-y-1.5 pl-2">
                      {currentIsland.packageInclusions.included[currentLang].map((inc, iIdx) => (
                        <li key={iIdx} className="flex items-start gap-2">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Excluded Services & Cash Notes */}
                  <div className="space-y-2">
                    <h4 className="font-mono text-xs text-[#c8ac75] uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <X className="w-4 h-4 text-amber-400" />
                      <span>{isEs ? 'Lo Que NO Incluye / Gastos en Efectivo' : 'What is Not Included / Cash Fees'}</span>
                    </h4>
                    <ul className="space-y-1.5 pl-2">
                      {currentIsland.packageInclusions.excluded[currentLang].map((exc, eIdx) => (
                        <li key={eIdx} className="flex items-start gap-2">
                          <span className="text-amber-400 font-bold">•</span>
                          <span>{exc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Transportation & Meals Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#1e3a5f] pt-4">
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-[#c8ac75] uppercase tracking-wider block font-semibold flex items-center gap-1">
                      <Car className="w-3.5 h-3.5" />
                      <span>{isEs ? 'Transporte' : 'Transportation'}</span>
                    </span>
                    <p className="text-[11px] leading-relaxed">{currentIsland.packageInclusions.transportation[currentLang]}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-[#c8ac75] uppercase tracking-wider block font-semibold flex items-center gap-1">
                      <Utensils className="w-3.5 h-3.5" />
                      <span>{isEs ? 'Alimentación' : 'Meals'}</span>
                    </span>
                    <p className="text-[11px] leading-relaxed">{currentIsland.packageInclusions.meals[currentLang]}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-[#c8ac75] uppercase tracking-wider block font-semibold flex items-center gap-1">
                      <Ship className="w-3.5 h-3.5" />
                      <span>{isEs ? 'Excursiones' : 'Excursions'}</span>
                    </span>
                    <p className="text-[11px] leading-relaxed">{currentIsland.packageInclusions.excursions[currentLang]}</p>
                  </div>
                </div>

                {/* Required Confirmation Notice */}
                <div className="p-3.5 rounded-xl bg-[#0b2438] border border-[#1e3a5f] flex items-start gap-2.5 text-[11px] text-[#94a3b8]">
                  <ShieldAlert className="w-4 h-4 text-[#c8ac75] shrink-0 mt-0.5" />
                  <p>
                    {isEs
                      ? 'Nota Provisional de Petra: Las tarifas de entrada a la Comarca Guna Yala ($20 USD no residentes / $5 USD residentes o nacionales) y las tasas portuarias ($5 USD) se pagan en efectivo directamente a las autoridades locales. Confirmación requerida antes de la reserva.'
                      : 'Petra’s Provisional Notice: Guna Yala Comarca entrance fees ($20 USD non-residents / $5 USD residents) and port taxes ($5 USD) are payable in cash directly to local authorities. Rates subject to final confirmation by Petra.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            5. DAY TOURS INTEGRATION STRIP (PHASE 5)
           ======================================================== */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-[#0b2438] via-[#091b2e] to-[#0b2438] border border-[#c8ac75]/40 shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#c8ac75]">
                <Sun className="w-4 h-4" />
                <span>{isEs ? 'Opciones de Pasadías (Day Tours)' : 'Official Day Tour Packages'}</span>
              </div>
              <h3 className="text-2xl font-serif text-white mt-1">
                {isEs ? '¿Prefieres Visitar San Blas en Pasadía de Un Día?' : 'Prefer a Single Day Caribbean Excursion?'}
              </h3>
            </div>

            <span className="text-[11px] font-mono text-[#c8ac75] italic">
              {isEs ? 'Precios sujeto a confirmación final de Petra' : 'Provisional rates subject to Petra’s approval'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Day Tour Panama City */}
            <div className="p-6 rounded-2xl bg-[#06121e] border border-[#1e3a5f] space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#38bdf8]">
                    {isEs ? 'Pasadía Completo con Traslado' : 'Full Day Tour with Transport'}
                  </span>
                  <h4 className="text-lg font-serif text-white font-medium">
                    {isEs ? 'Pasadía desde Ciudad de Panamá' : 'Day Tour from Panama City'}
                  </h4>
                </div>
                <div className="text-right font-mono">
                  <div className="text-lg font-bold text-[#c8ac75]">USD 142</div>
                  <div className="text-[10px] text-[#94a3b8]">{isEs ? '/ persona' : '/ person'}</div>
                </div>
              </div>

              <p className="text-xs text-[#cbd5e1] leading-relaxed">
                {isEs
                  ? 'Incluye transporte 4x4 ida y vuelta desde Ciudad de Panamá, recorrido en lancha, visita a 2 islas, Piscina Natural, almuerzo con 1 bebida, equipo de snorkel y guía guna.'
                  : 'Includes round-trip 4x4 transport from Panama City, boat excursion, 2 islands, Natural Pool, lunch with 1 drink, snorkeling equipment, and Guna guide.'}
              </p>

              <button
                onClick={() => onOpenPlanner?.('day-trip', 'Day Tour Panama City')}
                className="w-full py-2.5 rounded-xl bg-[#0e7490] hover:bg-[#0284c7] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-all"
              >
                {isEs ? 'SOLICITAR PASADÍA COMPLETO' : 'REQUEST FULL DAY TOUR'}
              </button>
            </div>

            {/* Day Tour Port */}
            <div className="p-6 rounded-2xl bg-[#06121e] border border-[#1e3a5f] space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#38bdf8]">
                    {isEs ? 'Pasadía Marítimo Desde Puerto' : 'Maritime Day Tour from Port'}
                  </span>
                  <h4 className="text-lg font-serif text-white font-medium">
                    {isEs ? 'Pasadía desde Puerto Cartí' : 'Day Tour from Guna Yala Port'}
                  </h4>
                </div>
                <div className="text-right font-mono">
                  <div className="text-lg font-bold text-[#c8ac75]">USD 69</div>
                  <div className="text-[10px] text-[#94a3b8]">{isEs ? '/ persona' : '/ person'}</div>
                </div>
              </div>

              <p className="text-xs text-[#cbd5e1] leading-relaxed">
                {isEs
                  ? 'Incluye excursión en lancha compartida desde Puerto Cartí, visita a 2 islas, Piscina Natural, almuerzo con 1 bebida, equipo de snorkel y guía guna. (No incluye traslado terrestre).'
                  : 'Includes shared boat excursion from Cartí Port, 2 islands, Natural Pool, lunch with 1 drink, snorkeling gear, and Guna guide. (Ground transfer excluded).'}
              </p>

              <button
                onClick={() => onOpenPlanner?.('day-trip', 'Day Tour Guna Yala Port')}
                className="w-full py-2.5 rounded-xl bg-[#0e7490] hover:bg-[#0284c7] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-all"
              >
                {isEs ? 'SOLICITAR PASADÍA DESDE PUERTO' : 'REQUEST PORT DAY TOUR'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
