import React, { useState } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { ISLAND_MEDIA_REGISTRY } from '../videos';
import { Compass, Waves, Play, ArrowRight, Eye, Sparkles } from 'lucide-react';

interface TheIslandsProps {
  currentLang: Language;
  onExploreExperience: (categoryId?: string) => void;
  onOpenExperienceDetailsById?: (id: string) => void;
  onWatchFilm?: (island: { id: string; name: string; gunaName?: string }) => void;
}

export interface IslandData {
  id: string;
  name: string;
  gunaName: string;
  group: string;
  tagline: { en: string; es: string };
  description: { en: string; es: string };
  waterVisibility: string;
  highlights: { en: string[]; es: string[] };
  bestFor: { en: string; es: string };
  categoryLink: string;
  experienceId: string;
  posterImage: string;
  hasVideo: boolean;
}

export const ISLANDS_LIST: IslandData[] = [
  {
    id: 'cayos-limon',
    name: 'Cayos Limón (Lemon Cays)',
    gunaName: 'Garsudup Archipelago',
    group: 'Central Archipelago',
    tagline: {
      en: 'The legendary turquoise natural swimming pool and starfish sandbars',
      es: 'La legendaria piscina natural turquesa y bancos de estrellas marinas',
    },
    description: {
      en: 'A cluster of picture-perfect coral cays surrounded by shallow, tranquil water as clear as glass. Home to the sunken sandbar where giant cushion sea stars rest peacefully in waist-deep water.',
      es: 'Un grupo de cayos de coral rodeados de aguas someras y cristalinas como el vidrio. Hogar de la piscina natural donde habitan estrellas de mar gigantes en aguas que apenas cubren la cintura.',
    },
    waterVisibility: '25m+ Exceptional',
    highlights: {
      en: ['Waist-deep natural swimming pool', 'Starfish sanctuary', 'Powder white sandbars'],
      es: ['Piscina natural de poca profundidad', 'Santuario de estrellas de mar', 'Bancos de arena blanca'],
    },
    bestFor: {
      en: 'Swimming, Photography, Day Trips & Families',
      es: 'Natación, Fotografía, Pasadías y Familias',
    },
    categoryLink: 'day-trip',
    experienceId: 'day-trip-classic',
    posterImage: '/pictures/piscinanat.jpg',
    hasVideo: Boolean(ISLAND_MEDIA_REGISTRY['cayos-limon']?.videoUrl),
  },
  {
    id: 'cayos-holandeses',
    name: 'Cayos Holandeses (Dutch Cays)',
    gunaName: 'Mauki & Morbedup Atolls',
    group: 'Outer Barrier Reef',
    tagline: {
      en: 'The ultimate untouched Caribbean frontier and outer barrier reef',
      es: 'La última frontera caribeña virgen y el arrecife de barrera exterior',
    },
    description: {
      en: 'Located 1.5 hours offshore, Cayos Holandeses is the most remote and pristine part of San Blas. Surrounded by deep ocean waters on one side and a protected turquoise lagoon on the other, offering world-class snorkeling.',
      es: 'Ubicados a hora y media mar adentro, Cayos Holandeses es la zona más remota y prístina de San Blas. Protegida por una barrera coralina con lagunas color esmeralda y una vida marina sin igual.',
    },
    waterVisibility: '30m+ Virgin Clarity',
    highlights: {
      en: ['Pristine living coral wall', 'Sea turtles & eagle rays', 'Absolute seclusion'],
      es: ['Pared coralina viva inalterada', 'Tortugas marinas y rayas águila', 'Aislamiento absoluto'],
    },
    bestFor: {
      en: 'Multi-Day Expeditions, Sailing & Underwater Snorkel',
      es: 'Expediciones Multidía, Navegación y Snorkel Profundo',
    },
    categoryLink: 'multi-day',
    experienceId: 'multi-day-exploration',
    posterImage: '/pictures/cayouholandese.jpg',
    hasVideo: Boolean(ISLAND_MEDIA_REGISTRY['cayos-holandeses']?.videoUrl),
  },
  {
    id: 'isla-perro-chico',
    name: 'Isla Perro Chico (Dog Island)',
    gunaName: 'Assudup Dummad',
    group: 'Limón Sector',
    tagline: {
      en: 'World-famous coral-encrusted shipwreck and vibrant marine sanctuary',
      es: 'El famoso pecio cubierto de corales y vibrante santuario marino',
    },
    description: {
      en: 'Just 15 meters off the powder-white beach rests a historic sunken cargo ship, now overgrown with brain corals, sea fans, and thousands of colorful reef fish. Accessible directly from shore by swimming.',
      es: 'A solo 15 metros de la playa de arena blanca descansa un barco de carga histórico hundido, hoy cubierto de corales cerebro, abanicos marinos y cardúmenes de peces tropicales.',
    },
    waterVisibility: '20m+ Crystal Reef',
    highlights: {
      en: ['Shore-accessible shipwreck', 'Snorkeling alongside sergeant majors', 'Coconut palm canopy'],
      es: ['Pecio accesible nadando desde la playa', 'Snorkel entre peces de arrecife', 'Palmeras de coco'],
    },
    bestFor: {
      en: 'Shipwreck Snorkelers & Day Adventures',
      es: 'Snorkel en Pecios y Excursiones de Día',
    },
    categoryLink: 'day-trip',
    experienceId: 'day-trip-classic',
    posterImage: '/pictures/perrochico.jpg',
    hasVideo: Boolean(ISLAND_MEDIA_REGISTRY['isla-perro-chico']?.videoUrl),
  },
  {
    id: 'isla-franklin',
    name: 'Isla Franklin (Franklin Island)',
    gunaName: 'Franklin Dup',
    group: 'Limón Sector',
    tagline: {
      en: 'Classic palm-fringed coral cay with traditional beachfront wood-and-thatch cabanas',
      es: 'Cayo tradicional de coral con cabañas de madera y paja frente al mar',
    },
    description: {
      en: 'Classic palm-fringed coral cay with traditional beachfront wood-and-thatch cabanas, calm turquoise swimming, and fresh island dining under unpolluted starry skies.',
      es: 'Cayo tradicional con cabañas de madera y paja frente al mar, aguas calmas y almuerzo de pescado fresco bajo cielos estrellados.',
    },
    waterVisibility: '22m+ Crystal Lagoon',
    highlights: {
      en: ['Traditional beachfront cabanas', 'Fresh catch island lunch', 'Quiet coral beach shores'],
      es: ['Cabañas playeras tradicionales', 'Almuerzo fresco de pescado', 'Orillas tranquilas de coral'],
    },
    bestFor: {
      en: 'Overnight Stays & Traditional Beach Experience',
      es: 'Estadías Nocturnas y Experiencia Tradicional de Playa',
    },
    categoryLink: 'overnight',
    experienceId: 'overnight-island-stay',
    posterImage: '/pictures/04 Franklin.jpg',
    hasVideo: Boolean(ISLAND_MEDIA_REGISTRY['isla-franklin']?.videoUrl),
  },
  {
    id: 'cayos-chichime',
    name: 'Cayos Chichime',
    gunaName: 'Chichime Dup',
    group: 'Northern Lagoon',
    tagline: {
      en: 'Vast white sand lagoon and the premier anchorage for sailors',
      es: 'Extensa laguna de arena blanca y el fondeadero predilecto para navegantes',
    },
    description: {
      en: 'A pair of idyllic islands embracing a tranquil, deep blue natural anchorage. A favorite mooring spot for private sailing yachts and catamarans, with calm nights and authentic thatched cabanas.',
      es: 'Dos islas idílicas que abrazan un fondeadero tranquilo de aguas serenas. El punto de anclaje favorito para veleros y catamaranes, con noches estrelladas y cabañas tradicionales de paja.',
    },
    waterVisibility: '25m+ Lagoon Calm',
    highlights: {
      en: ['Sheltered sailing anchorage', 'Traditional wooden cabanas', 'Fresh catch seafood dining'],
      es: ['Fondeadero protegido para veleros', 'Cabañas rústicas tradicionales', 'Pescados y mariscos frescos locales'],
    },
    bestFor: {
      en: 'Overnight Island Cabanas & Sailing Charters',
      es: 'Noches en Cabañas y Veleros / Catamarán',
    },
    categoryLink: 'sailing',
    experienceId: 'private-sailing-charter',
    posterImage: '/pictures/catamaran.jpg',
    hasVideo: Boolean(ISLAND_MEDIA_REGISTRY['cayos-chichime']?.videoUrl),
  },
  {
    id: 'isla-pelicano',
    name: 'Isla Pelícano (Pelican Island)',
    gunaName: 'Pelícano Dup',
    group: 'Central Sector',
    tagline: {
      en: 'Intimate, cinematic sanctuary made famous by international cinema',
      es: 'Santuario íntimo y cinematográfico inmortalizado en el cine internacional',
    },
    description: {
      en: 'An unforgettable miniature jewel of an island surrounded by 360 degrees of pristine aquamarine water. Famously featured as the hideaway in Netflix’s "Money Heist" (La Casa de Papel).',
      es: 'Una inolvidable isla joya en miniatura rodeada en 360 grados por agua color aguamarina cristalina. Famosa por ser el refugio elegido en la serie de Netflix "La Casa de Papel".',
    },
    waterVisibility: '22m+ Aquamarine',
    highlights: {
      en: ['Cinematic 360° ocean panorama', 'Intimate secluded beach', 'Calm swimming perimeter'],
      es: ['Panorama oceánico de 360° de película', 'Playa íntima y aislada', 'Perímetro calmo para nadar'],
    },
    bestFor: {
      en: 'Couples, Film Enthusiasts & Private Charters',
      es: 'Parejas, Amantes del Cine y Paseos Privados',
    },
    categoryLink: 'private-custom',
    experienceId: 'private-boat-custom',
    posterImage: '/pictures/images (1).jpg',
    hasVideo: Boolean(ISLAND_MEDIA_REGISTRY['isla-pelicano']?.videoUrl),
  },
];

export const TheIslands: React.FC<TheIslandsProps> = ({
  currentLang,
  onExploreExperience,
  onOpenExperienceDetailsById,
  onWatchFilm,
}) => {
  const t = TRANSLATIONS[currentLang];
  const [activeIslandId, setActiveIslandId] = useState<string>(ISLANDS_LIST[0].id);

  const selectedIsland =
    ISLANDS_LIST.find((i) => i.id === activeIslandId) || ISLANDS_LIST[0];

  const handleOpenDetails = (island: IslandData) => {
    if (onOpenExperienceDetailsById) {
      onOpenExperienceDetailsById(island.experienceId);
    } else {
      onExploreExperience(island.categoryLink);
    }
  };

  const handleWatchFilm = (island: IslandData) => {
    if (onWatchFilm) {
      onWatchFilm({
        id: island.id,
        name: island.name,
        gunaName: island.gunaName,
      });
    }
  };

  return (
    <section
      id="islands"
      className="py-24 sm:py-32 bg-[#0B2924] text-[#F6F2E9] relative overflow-hidden scroll-mt-20 border-b border-[#C8AC75]/20"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[#153B49]/30 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Editorial Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 border-b border-[#C8AC75]/25 pb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-sans font-semibold uppercase tracking-[0.25em] text-[#C8AC75] mb-3">
              <Compass className="w-3.5 h-3.5 text-[#C8AC75]" />
              <span>{t.islands.collectionTag}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-white tracking-tight text-balance">
              {t.islands.collectionTitle}
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#F6F2E9]/80 max-w-lg leading-relaxed font-sans font-light">
            {t.islands.collectionSubtitle}
          </p>
        </div>

        {/* Island Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-10 scrollbar-none">
          {ISLANDS_LIST.map((island) => {
            const isSelected = island.id === selectedIsland.id;
            return (
              <button
                key={island.id}
                onClick={() => setActiveIslandId(island.id)}
                className={`px-4 sm:px-5 py-2.5 rounded-full text-xs font-sans uppercase tracking-[0.12em] font-medium whitespace-nowrap transition-all duration-300 focus:outline-none ${
                  isSelected
                    ? 'bg-[#C8AC75] text-[#0B2924] font-semibold shadow-lg'
                    : 'bg-white/10 hover:bg-white/15 text-[#F6F2E9]/80 hover:text-white border border-white/10'
                }`}
              >
                <span>{island.name.split('(')[0].trim()}</span>
              </button>
            );
          })}
        </div>

        {/* Featured Island Showcase (Information First, Video Optional) */}
        <div className="bg-[#061815] border border-[#C8AC75]/30 rounded-3xl overflow-hidden shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-0">
          
          {/* Island Imagery & Optional Film Trigger */}
          <div className="lg:col-span-6 relative aspect-[16/11] lg:aspect-auto min-h-[340px] sm:min-h-[440px] overflow-hidden bg-[#071F1B]">
            <img
              src={selectedIsland.posterImage}
              alt={selectedIsland.name}
              className="w-full h-full object-cover filter brightness-[0.92] contrast-[1.04] transition-all duration-700 ease-out"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#061815]/80 via-transparent to-transparent pointer-events-none" />

            {/* Optional Watch Island Film Button Overlay */}
            {selectedIsland.hasVideo && (
              <div className="absolute top-5 right-5 z-20">
                <button
                  onClick={() => handleWatchFilm(selectedIsland)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B2924]/90 hover:bg-[#0B2924] text-[#C8AC75] hover:text-white border border-[#C8AC75] rounded-full backdrop-blur-md text-xs font-sans uppercase tracking-[0.14em] font-medium shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none"
                  aria-label={`${t.islands.watchFilmBtn} - ${selectedIsland.name}`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{t.islands.watchFilmBtn}</span>
                </button>
              </div>
            )}

            {/* Water Clarity Badge (Clean unboxed presentation) */}
            <div className="absolute bottom-5 left-5 z-20 flex items-center gap-2 px-3.5 py-1.5 bg-[#0B2924]/85 backdrop-blur-md rounded-full border border-[#C8AC75]/40 text-xs text-[#F6F2E9]">
              <Waves className="w-3.5 h-3.5 text-[#C8AC75]" />
              <span className="font-sans text-[11px] font-medium">{t.islands.waterVisibilityLabel}: {selectedIsland.waterVisibility}</span>
            </div>
          </div>

          {/* Comprehensive Island Information (Information First) */}
          <div className="lg:col-span-6 p-7 sm:p-10 flex flex-col justify-between">
            <div>
              {/* Indigenous Guna Name & Sector */}
              <div className="flex items-center gap-2 text-xs font-sans text-[#C8AC75] uppercase tracking-[0.2em] font-semibold mb-2">
                <span>{selectedIsland.gunaName}</span>
                <span className="text-white/30">·</span>
                <span className="text-white/60 font-light">{selectedIsland.group}</span>
              </div>

              {/* Title */}
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-white font-light tracking-tight mb-4">
                {selectedIsland.name}
              </h3>

              {/* Tagline */}
              <p className="text-sm sm:text-base font-serif italic text-[#C8AC75] leading-relaxed mb-4">
                “{selectedIsland.tagline[currentLang]}”
              </p>

              {/* Description */}
              <p className="text-xs sm:text-sm text-[#F6F2E9]/80 font-sans font-light leading-relaxed mb-6">
                {selectedIsland.description[currentLang]}
              </p>

              {/* Highlights List */}
              <div className="space-y-2 mb-6 pt-5 border-t border-[#C8AC75]/20">
                <span className="text-[11px] font-sans uppercase tracking-[0.16em] text-[#C8AC75] font-semibold block mb-2">
                  {t.islands.highlightsLabel}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedIsland.highlights[currentLang].map((hl, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-[#F6F2E9]/90 font-light">
                      <span className="text-[#C8AC75]">✦</span>
                      <span>{hl}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Best For */}
              <div className="p-3.5 bg-white/5 rounded-xl border border-[#C8AC75]/20 text-xs text-[#F6F2E9]/85 mb-6">
                <span className="font-semibold text-[#C8AC75] mr-1.5 uppercase tracking-wider text-[10px]">
                  {t.islands.bestForLabel}:
                </span>
                <span className="font-light">{selectedIsland.bestFor[currentLang]}</span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-[#C8AC75]/20">
              <button
                onClick={() => handleOpenDetails(selectedIsland)}
                className="w-full sm:w-auto flex-1 py-3 px-6 bg-[#C8AC75] hover:bg-[#dfc38d] text-[#0B2924] font-semibold text-xs font-sans uppercase tracking-[0.14em] rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <span>{t.islands.viewDetailsBtn}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#0B2924]" />
              </button>

              {/* Optional Watch Island Film button in footer */}
              {selectedIsland.hasVideo && (
                <button
                  onClick={() => handleWatchFilm(selectedIsland)}
                  className="w-full sm:w-auto py-3 px-5 bg-white/10 hover:bg-white/15 text-[#F6F2E9] border border-[#C8AC75]/40 text-xs font-sans uppercase tracking-[0.14em] font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 text-[#C8AC75]" />
                  <span>{t.islands.watchFilmBtn}</span>
                </button>
              )}
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
