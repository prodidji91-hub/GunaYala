/**
 * Luxury Media & Video Assets Configuration for Guna Yala Panama Travel
 * Concept: "The Island Collection"
 * 
 * Local video files are served from /videos/ or public/videos/
 * Clean architecture allows dropping in future MP4 files without altering UI code.
 */

export interface HeroSceneConfig {
  id: 'islands' | 'sailing' | 'culture';
  index: '01' | '02' | '03';
  label: { en: string; es: string };
  headline: { en: string; es: string };
  subtitle: { en: string; es: string };
  videoUrl?: string; // Optional local MP4 path
  posterUrl: string; // High-definition local poster fallback
  coordinates: string;
  location: string;
}

export const HERO_SCENES: HeroSceneConfig[] = [
  {
    id: 'islands',
    index: '01',
    label: {
      en: 'The Islands',
      es: 'Las Islas',
    },
    headline: {
      en: 'Discover Islands Beyond the Ordinary',
      es: 'Descubra Islas Más Allá de lo Ordinario',
    },
    subtitle: {
      en: 'Experience the extraordinary beauty of Guna Yala through authentic journeys designed by local experts.',
      es: 'Viva la extraordinaria belleza de Guna Yala mediante travesías auténticas diseñadas por expertos locales.',
    },
    videoUrl: '/videos/guna-yala-hero.mp4',
    posterUrl: '/pictures/hero/guna-yala-hero.jpg',
    coordinates: "9°33'N 78°50'W",
    location: 'Cayos Limón & Holandeses',
  },
  {
    id: 'sailing',
    index: '02',
    label: {
      en: 'Sailing',
      es: 'Navegación',
    },
    headline: {
      en: 'Your Private Escape Begins at Sea',
      es: 'Su Escape Privado Comienza en el Mar',
    },
    subtitle: {
      en: 'Explore breathtaking Caribbean waters through unforgettable sailing experiences.',
      es: 'Explore aguas caribeñas deslumbrantes a través de inolvidables travesías a vela.',
    },
    // If local sailing MP4 is added, put '/videos/guna-yala-sailing.mp4'
    videoUrl: undefined,
    posterUrl: '/pictures/catamaran.jpg',
    coordinates: "9°35'N 78°44'W",
    location: 'San Blas Archipelago',
  },
  {
    id: 'culture',
    index: '03',
    label: {
      en: 'Guna Culture',
      es: 'Cultura Guna',
    },
    headline: {
      en: 'Travel Through Local Eyes',
      es: 'Viaje a Través de Ojos Locales',
    },
    subtitle: {
      en: 'Discover the people, traditions, and stories that make Guna Yala truly extraordinary.',
      es: 'Descubra a las personas, tradiciones e historias que hacen a Guna Yala verdaderamente extraordinaria.',
    },
    // If local culture MP4 is added, put '/videos/guna-yala-culture.mp4'
    videoUrl: undefined,
    posterUrl: '/pictures/04 Learn about the Guna Community in San Blas.jpg',
    coordinates: "9°30'N 78°58'W",
    location: 'Comarca Guna Yala',
  },
];

export const LUXURY_HERO_SCENES = HERO_SCENES;

/**
 * Island Film registry:
 * Each island can have an optional videoUrl. If present, the UI displays
 * "Watch Island Film". If undefined or empty, the button is cleanly hidden.
 */
export interface IslandMediaItem {
  id: string;
  name: string;
  videoUrl?: string;
  posterUrl: string;
  gallery: string[];
  durationLabel?: string;
}

export const ISLAND_MEDIA_REGISTRY: Record<string, IslandMediaItem> = {
  'cayos-limon': {
    id: 'cayos-limon',
    name: 'Cayos Limón',
    videoUrl: '/videos/guna-yala-hero.mp4', // Featured archipelago reel
    posterUrl: '/pictures/piscinanat.jpg',
    gallery: [
      '/pictures/piscinanat.jpg',
      '/pictures/10 Boat Day Tour.jpg',
      '/pictures/01 Boat Day Tour .jpg',
      '/pictures/perrochico.jpg',
    ],
    durationLabel: '1:45 Film',
  },
  'cayos-holandeses': {
    id: 'cayos-holandeses',
    name: 'Cayos Holandeses',
    videoUrl: '/videos/guna-yala-hero.mp4',
    posterUrl: '/pictures/cayouholandese.jpg',
    gallery: [
      '/pictures/cayouholandese.jpg',
      '/pictures/multidaytravel.jpg',
      '/pictures/09 Velero .jpg',
      '/pictures/catamaran.jpg',
    ],
    durationLabel: '1:30 Film',
  },
  'isla-perro-chico': {
    id: 'isla-perro-chico',
    name: 'Isla Perro Chico',
    videoUrl: undefined, // Hidden until video uploaded
    posterUrl: '/pictures/perrochico.jpg',
    gallery: [
      '/pictures/perrochico.jpg',
      '/pictures/10 Boat Day Tour.jpg',
      '/pictures/01 Boat Day Tour .jpg',
    ],
  },
  'isla-franklin': {
    id: 'isla-franklin',
    name: 'Isla Franklin',
    videoUrl: undefined, // Hidden until video uploaded
    posterUrl: '/pictures/04 Franklin.jpg',
    gallery: [
      '/pictures/04 Franklin.jpg',
      '/pictures/Franklin.jpg',
      '/pictures/header1.jpg',
    ],
  },
  'cayos-chichime': {
    id: 'cayos-chichime',
    name: 'Cayos Chichime',
    videoUrl: undefined,
    posterUrl: '/pictures/catamaran.jpg',
    gallery: [
      '/pictures/catamaran.jpg',
      '/pictures/09 Velero .jpg',
      '/pictures/04 Catamaran San Blas Island .jpg',
    ],
  },
  'isla-pelicano': {
    id: 'isla-pelicano',
    name: 'Isla Pelícano',
    videoUrl: undefined,
    posterUrl: '/pictures/images (1).jpg',
    gallery: [
      '/pictures/images (1).jpg',
      '/pictures/01 Boat Day Tour .jpg',
      '/pictures/header-bg.jpg',
    ],
  },
};

// Legacy config export for backward compatibility
export const HERO_VIDEO_CONFIG = {
  localPath: HERO_SCENES[0].videoUrl || '/videos/guna-yala-hero.mp4',
  posterImage: HERO_SCENES[0].posterUrl,
  title: 'Guna Yala San Blas Archipelago Cinematic Experience',
  location: 'San Blas, Panama',
  coordinates: "9°33'N 78°50'W",
};
