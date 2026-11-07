import { Language } from '../types';

export type SeoRoute =
  | 'home'
  | 'terms-hub'
  | 'terms-day-tour'
  | 'terms-overnight'
  | 'landing-day-trips'
  | 'landing-overnight-stays'
  | 'landing-sailing';

export interface SeoConfig {
  title: string;
  description: string;
  canonical: string;
  ogLocale: string;
  langAttr: string;
  ogImage: string;
  hreflangEn: string;
  hreflangEs: string;
  hreflangXDefault: string;
}

export const SEO_CONTENT: Record<SeoRoute, Record<Language, SeoConfig>> = {
  home: {
    en: {
      title: 'San Blas Islands Tours Panama | Guna Yala Panama Travel',
      description: 'Explore the San Blas Islands with Guna Yala Panama Travel. Discover day trips, overnight island stays, sailing experiences and authentic Guna culture.',
      canonical: 'https://gunayalapanama.com/',
      ogLocale: 'en_US',
      langAttr: 'en',
      ogImage: 'https://gunayalapanama.com/pictures/header1.jpg',
      hreflangEn: 'https://gunayalapanama.com/',
      hreflangEs: 'https://gunayalapanama.com/?lang=es',
      hreflangXDefault: 'https://gunayalapanama.com/',
    },
    es: {
      title: 'Tours en Islas San Blas Panamá | Guna Yala Panama Travel',
      description: 'Explore las Islas San Blas con Guna Yala Panama Travel. Excursiones de un día, estadías en islas, veleros y auténtica cultura guna en Panamá.',
      canonical: 'https://gunayalapanama.com/?lang=es',
      ogLocale: 'es_PA',
      langAttr: 'es',
      ogImage: 'https://gunayalapanama.com/pictures/header1.jpg',
      hreflangEn: 'https://gunayalapanama.com/',
      hreflangEs: 'https://gunayalapanama.com/?lang=es',
      hreflangXDefault: 'https://gunayalapanama.com/',
    },
  },
  'terms-hub': {
    en: {
      title: 'Official Terms & Conditions | Guna Yala Panama Travel',
      description: 'Review governing terms and conditions for day tours, overnight island stays, and travel policies with Guna Yala Panama Travel.',
      canonical: 'https://gunayalapanama.com/terms-and-conditions',
      ogLocale: 'en_US',
      langAttr: 'en',
      ogImage: 'https://gunayalapanama.com/pictures/header1.jpg',
      hreflangEn: 'https://gunayalapanama.com/terms-and-conditions',
      hreflangEs: 'https://gunayalapanama.com/terms-and-conditions?lang=es',
      hreflangXDefault: 'https://gunayalapanama.com/terms-and-conditions',
    },
    es: {
      title: 'Términos y Condiciones Oficiales | Guna Yala Panama Travel',
      description: 'Consulte los términos y condiciones que rigen los tours de un día, estadías en islas y políticas de viaje con Guna Yala Panama Travel.',
      canonical: 'https://gunayalapanama.com/terms-and-conditions?lang=es',
      ogLocale: 'es_PA',
      langAttr: 'es',
      ogImage: 'https://gunayalapanama.com/pictures/header1.jpg',
      hreflangEn: 'https://gunayalapanama.com/terms-and-conditions',
      hreflangEs: 'https://gunayalapanama.com/terms-and-conditions?lang=es',
      hreflangXDefault: 'https://gunayalapanama.com/terms-and-conditions',
    },
  },
  'terms-day-tour': {
    en: {
      title: 'Day Tour Terms & Conditions | Guna Yala Panama Travel',
      description: 'Official booking conditions, cancellation policy, SINAPROC weather guidelines, and logistics for shared day tours in San Blas, Panama.',
      canonical: 'https://gunayalapanama.com/terms-and-conditions/day-tour',
      ogLocale: 'en_US',
      langAttr: 'en',
      ogImage: 'https://gunayalapanama.com/pictures/header1.jpg',
      hreflangEn: 'https://gunayalapanama.com/terms-and-conditions/day-tour',
      hreflangEs: 'https://gunayalapanama.com/terms-and-conditions/day-tour?lang=es',
      hreflangXDefault: 'https://gunayalapanama.com/terms-and-conditions/day-tour',
    },
    es: {
      title: 'Términos y Condiciones para Tours de Día | Guna Yala Panama Travel',
      description: 'Condiciones de reserva, políticas de cancelación, normativas meteorológicas de SINAPROC y logística para tours de un día en San Blas, Panamá.',
      canonical: 'https://gunayalapanama.com/terms-and-conditions/day-tour?lang=es',
      ogLocale: 'es_PA',
      langAttr: 'es',
      ogImage: 'https://gunayalapanama.com/pictures/header1.jpg',
      hreflangEn: 'https://gunayalapanama.com/terms-and-conditions/day-tour',
      hreflangEs: 'https://gunayalapanama.com/terms-and-conditions/day-tour?lang=es',
      hreflangXDefault: 'https://gunayalapanama.com/terms-and-conditions/day-tour',
    },
  },
  'terms-overnight': {
    en: {
      title: 'Overnight Stay Terms & Conditions | Guna Yala Panama Travel',
      description: 'Official booking terms, deposit deadlines, cancellation schedules, and island regulations for overnight stays in Guna Yala (San Blas), Panama.',
      canonical: 'https://gunayalapanama.com/terms-and-conditions/overnight',
      ogLocale: 'en_US',
      langAttr: 'en',
      ogImage: 'https://gunayalapanama.com/pictures/header1.jpg',
      hreflangEn: 'https://gunayalapanama.com/terms-and-conditions/overnight',
      hreflangEs: 'https://gunayalapanama.com/terms-and-conditions/overnight?lang=es',
      hreflangXDefault: 'https://gunayalapanama.com/terms-and-conditions/overnight',
    },
    es: {
      title: 'Términos y Condiciones para Estadías en Isla | Guna Yala Panama Travel',
      description: 'Condiciones de reserva, plazos de depósito, cronograma de cancelación y normativas para estadías en cabañas en Guna Yala (San Blas), Panamá.',
      canonical: 'https://gunayalapanama.com/terms-and-conditions/overnight?lang=es',
      ogLocale: 'es_PA',
      langAttr: 'es',
      ogImage: 'https://gunayalapanama.com/pictures/header1.jpg',
      hreflangEn: 'https://gunayalapanama.com/terms-and-conditions/overnight',
      hreflangEs: 'https://gunayalapanama.com/terms-and-conditions/overnight?lang=es',
      hreflangXDefault: 'https://gunayalapanama.com/terms-and-conditions/overnight',
    },
  },
  'landing-day-trips': {
    en: {
      title: 'San Blas Day Trips from Panama City | Guna Yala Panama Travel',
      description: 'Experience the pristine San Blas Islands on an unforgettable day trip from Panama City. Includes 4x4 mountain transfer, island hopping, natural pool snorkeling and traditional lunch.',
      canonical: 'https://gunayalapanama.com/san-blas-day-trips',
      ogLocale: 'en_US',
      langAttr: 'en',
      ogImage: 'https://gunayalapanama.com/pictures/10%20Boat%20Day%20Tour.jpg',
      hreflangEn: 'https://gunayalapanama.com/san-blas-day-trips',
      hreflangEs: 'https://gunayalapanama.com/es/san-blas-day-trips',
      hreflangXDefault: 'https://gunayalapanama.com/san-blas-day-trips',
    },
    es: {
      title: 'Pasadías en San Blas desde Ciudad de Panamá | Guna Yala Panama Travel',
      description: 'Descubra las Islas San Blas en un tour de un día completo desde Ciudad de Panamá. Incluye traslado 4x4, navegación en bote tradicional, snorkel en la Piscina Natural y almuerzo caribeño.',
      canonical: 'https://gunayalapanama.com/es/san-blas-day-trips',
      ogLocale: 'es_PA',
      langAttr: 'es',
      ogImage: 'https://gunayalapanama.com/pictures/10%20Boat%20Day%20Tour.jpg',
      hreflangEn: 'https://gunayalapanama.com/san-blas-day-trips',
      hreflangEs: 'https://gunayalapanama.com/es/san-blas-day-trips',
      hreflangXDefault: 'https://gunayalapanama.com/san-blas-day-trips',
    },
  },
  'landing-overnight-stays': {
    en: {
      title: 'San Blas Overnight Stays & Island Experiences | Guna Yala Panama Travel',
      description: 'Stay overnight in traditional beachfront or overwater cabanas in San Blas, Panama. Fall asleep to gentle Caribbean waves and experience authentic Guna hospitality.',
      canonical: 'https://gunayalapanama.com/san-blas-overnight-stays',
      ogLocale: 'en_US',
      langAttr: 'en',
      ogImage: 'https://gunayalapanama.com/pictures/04%20Franklin.jpg',
      hreflangEn: 'https://gunayalapanama.com/san-blas-overnight-stays',
      hreflangEs: 'https://gunayalapanama.com/es/san-blas-overnight-stays',
      hreflangXDefault: 'https://gunayalapanama.com/san-blas-overnight-stays',
    },
    es: {
      title: 'Estadías y Cabañas en Islas San Blas | Guna Yala Panama Travel',
      description: 'Disfrute de una estadía nocturna en cabañas rústicas de playa o sobre el agua en San Blas, Panamá. Transporte 4x4, comidas tradicionales, paseos en bote y desconexión total.',
      canonical: 'https://gunayalapanama.com/es/san-blas-overnight-stays',
      ogLocale: 'es_PA',
      langAttr: 'es',
      ogImage: 'https://gunayalapanama.com/pictures/04%20Franklin.jpg',
      hreflangEn: 'https://gunayalapanama.com/san-blas-overnight-stays',
      hreflangEs: 'https://gunayalapanama.com/es/san-blas-overnight-stays',
      hreflangXDefault: 'https://gunayalapanama.com/san-blas-overnight-stays',
    },
  },
  'landing-sailing': {
    en: {
      title: 'San Blas Sailing & Private Charters | Guna Yala Panama Travel',
      description: 'Sail the San Blas archipelago aboard private catamarans and classic sailboats. Explore secluded outer reefs like Cayos Holandeses with personalized all-inclusive itineraries.',
      canonical: 'https://gunayalapanama.com/san-blas-sailing',
      ogLocale: 'en_US',
      langAttr: 'en',
      ogImage: 'https://gunayalapanama.com/pictures/catamaran.jpg',
      hreflangEn: 'https://gunayalapanama.com/san-blas-sailing',
      hreflangEs: 'https://gunayalapanama.com/es/san-blas-sailing',
      hreflangXDefault: 'https://gunayalapanama.com/san-blas-sailing',
    },
    es: {
      title: 'Veleros y Catamaranes en San Blas Panamá | Guna Yala Panama Travel',
      description: 'Navegue por el archipiélago de San Blas a bordo de veleros y catamaranes privados. Explore atolones vírgenes como Cayos Holandeses con itinerarios a la medida y capitán local.',
      canonical: 'https://gunayalapanama.com/es/san-blas-sailing',
      ogLocale: 'es_PA',
      langAttr: 'es',
      ogImage: 'https://gunayalapanama.com/pictures/catamaran.jpg',
      hreflangEn: 'https://gunayalapanama.com/san-blas-sailing',
      hreflangEs: 'https://gunayalapanama.com/es/san-blas-sailing',
      hreflangXDefault: 'https://gunayalapanama.com/san-blas-sailing',
    },
  },
};

/**
 * Generates Schema.org JSON-LD for landing pages including BreadcrumbList and TouristTrip.
 */
export function getLandingSchemaJsonLd(route: 'landing-day-trips' | 'landing-overnight-stays' | 'landing-sailing', lang: Language): object {
  const config = SEO_CONTENT[route][lang];
  const isEs = lang === 'es';

  let tripName = '';
  let tripDescription = '';
  let tripId = '';
  let breadcrumbName = '';

  if (route === 'landing-day-trips') {
    tripName = isEs ? 'Pasadía en San Blas desde Ciudad de Panamá' : 'San Blas Day Trip from Panama City';
    tripDescription = isEs
      ? 'Excursión organizada de un día completo desde Ciudad de Panamá hacia las islas de Guna Yala con traslado 4x4, navegación en bote, snorkel y almuerzo tradicional.'
      : 'Full-day excursion from Panama City to San Blas Islands including 4x4 overland transport, traditional boat navigation, island hopping, natural pool stop, and fresh catch lunch.';
    tripId = `${config.canonical}#day-trip`;
    breadcrumbName = isEs ? 'Pasadías' : 'Day Trips';
  } else if (route === 'landing-overnight-stays') {
    tripName = isEs ? 'Estadías Nocturnas en Cabañas de San Blas' : 'San Blas Overnight Island Stays';
    tripDescription = isEs
      ? 'Estadías con alojamiento en cabañas tradicionales de playa y sobre el agua en el archipiélago de Guna Yala, con comidas incluidas y excursiones en bote.'
      : 'Multi-day island stay in traditional beachfront or overwater cabanas in Guna Yala archipelago, including 4x4 logistics, daily meals, and guided boat excursions.';
    tripId = `${config.canonical}#overnight-stay`;
    breadcrumbName = isEs ? 'Estadías en Isla' : 'Overnight Stays';
  } else {
    tripName = isEs ? 'Chárter Privado de Velero y Catamarán en San Blas' : 'Private Catamaran & Sailboat Charters in San Blas';
    tripDescription = isEs
      ? 'Navegación privada a vela entre los atolones vírgenes de San Blas (Cayos Holandeses y Coco Bandero) con capitán, tripulación y comidas a bordo.'
      : 'Private liveaboard sailing charters navigating Cayos Holandeses and outer atolls with dedicated skipper, crew, and meals included.';
    tripId = `${config.canonical}#sailing-charter`;
    breadcrumbName = isEs ? 'Veleros y Catamaranes' : 'Sailing Charters';
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        '@id': `${config.canonical}#breadcrumbs`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: isEs ? 'Inicio' : 'Home',
            item: isEs ? 'https://gunayalapanama.com/?lang=es' : 'https://gunayalapanama.com/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: breadcrumbName,
            item: config.canonical,
          },
        ],
      },
      {
        '@type': 'TouristTrip',
        '@id': tripId,
        name: tripName,
        description: tripDescription,
        provider: {
          '@id': 'https://gunayalapanama.com/#organization',
        },
        touristType: isEs ? 'Viajeros e invitados internacionales' : 'International island travelers',
      },
    ],
  };
}

/**
 * Dynamically updates document metadata, OpenGraph, Twitter, canonical, and hreflang links.
 */
export function updateSeoMetadata(route: SeoRoute, lang: Language): void {
  if (typeof document === 'undefined') return;

  const config = SEO_CONTENT[route]?.[lang] || SEO_CONTENT.home[lang];

  // 1. Title
  document.title = config.title;

  // 2. HTML lang attribute
  document.documentElement.lang = config.langAttr;

  // 3. Meta Description
  setMetaTag('name', 'description', config.description);

  // 4. Open Graph Tags
  setMetaTag('property', 'og:title', config.title);
  setMetaTag('property', 'og:description', config.description);
  setMetaTag('property', 'og:url', config.canonical);
  setMetaTag('property', 'og:locale', config.ogLocale);
  setMetaTag('property', 'og:image', config.ogImage);

  // 5. Twitter Card Tags
  setMetaTag('name', 'twitter:title', config.title);
  setMetaTag('name', 'twitter:description', config.description);
  setMetaTag('name', 'twitter:url', config.canonical);
  setMetaTag('name', 'twitter:image', config.ogImage);

  // 6. Canonical link
  let canonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.rel = 'canonical';
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.href = config.canonical;

  // 7. Alternate Hreflang links
  setAlternateLink('en', config.hreflangEn);
  setAlternateLink('es', config.hreflangEs);
  setAlternateLink('x-default', config.hreflangXDefault);

  // 8. Inject dynamic Schema.org JSON-LD if landing route
  if (route === 'landing-day-trips' || route === 'landing-overnight-stays' || route === 'landing-sailing') {
    const schema = getLandingSchemaJsonLd(route, lang);
    let schemaScript = document.getElementById('dynamic-landing-schema') as HTMLScriptElement | null;
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.id = 'dynamic-landing-schema';
      schemaScript.type = 'application/ld+json';
      document.head.appendChild(schemaScript);
    }
    schemaScript.textContent = JSON.stringify(schema);
  } else {
    const existing = document.getElementById('dynamic-landing-schema');
    if (existing) {
      existing.remove();
    }
  }
}

function setMetaTag(attrType: 'name' | 'property', attrValue: string, content: string): void {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attrType}="${attrValue}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrType, attrValue);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setAlternateLink(hreflang: string, href: string): void {
  let el = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${hreflang}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = 'alternate';
    el.hreflang = hreflang;
    document.head.appendChild(el);
  }
  el.href = href;
}
