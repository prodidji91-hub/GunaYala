import React, { useState } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { Sparkles, MapPin, Compass, Waves, Anchor, Eye, ArrowUpRight } from 'lucide-react';

interface TheIslandsProps {
  currentLang: Language;
  onExploreExperience: (categoryId?: string) => void;
}

interface IslandData {
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
  imageSvg: {
    bgGradient: string;
    sandColor: string;
    palmCount: number;
    waterType: 'turquoise' | 'deep-lagoon' | 'coral-barrier' | 'sandbar';
  };
}

const ISLANDS_LIST: IslandData[] = [
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
    imageSvg: {
      bgGradient: 'from-[#0ea5e9] via-[#14b8a6] to-[#042f2e]',
      sandColor: '#fef3c7',
      palmCount: 4,
      waterType: 'sandbar',
    },
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
    imageSvg: {
      bgGradient: 'from-[#0284c7] via-[#0d9488] to-[#0f172a]',
      sandColor: '#fffbeb',
      palmCount: 6,
      waterType: 'coral-barrier',
    },
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
    imageSvg: {
      bgGradient: 'from-[#06b6d4] via-[#0891b2] to-[#164e63]',
      sandColor: '#fef08a',
      palmCount: 5,
      waterType: 'turquoise',
    },
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
      en: 'Classic palm-fringed coral cay with traditional beachfront wood-and-thatch cabanas, calm turquoise swimming, and fresh island dining.',
      es: 'Cayo tradicional con cabañas de madera y paja frente al mar, aguas calmas y almuerzo de pescado fresco.',
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
    imageSvg: {
      bgGradient: 'from-[#0284c7] via-[#0d9488] to-[#042f2e]',
      sandColor: '#fef08a',
      palmCount: 6,
      waterType: 'turquoise',
    },
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
      en: 'A pair of idyllic islands embracing a tranquil, deep blue natural anchorage. A favorite mooring spot for private sailing yachts and catamarans, with calm nights, bioluminescence, and authentic thatched cabanas.',
      es: 'Dos islas idílicas que abrazan un fondeadero tranquilo de aguas serenas. El punto de anclaje favorito para veleros y catamaranes, con noches estrelladas y cabañas tradicionales de paja.',
    },
    waterVisibility: '25m+ Lagoon Calm',
    highlights: {
      en: ['Sheltered sailing anchorage', 'Traditional wooden cabanas', 'Fresh lobster dining'],
      es: ['Fondeadero protegido para veleros', 'Cabañas rústicas tradicionales', 'Langosta fresca local'],
    },
    bestFor: {
      en: 'Overnight Island Cabanas & Sailing Charters',
      es: 'Noches en Cabañas y Veleros / Catamarán',
    },
    categoryLink: 'overnight',
    imageSvg: {
      bgGradient: 'from-[#38bdf8] via-[#2dd4bf] to-[#134e4a]',
      sandColor: '#fef9c3',
      palmCount: 7,
      waterType: 'deep-lagoon',
    },
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
    categoryLink: 'private',
    imageSvg: {
      bgGradient: 'from-[#0284c7] via-[#06b6d4] to-[#042f2e]',
      sandColor: '#fef3c7',
      palmCount: 3,
      waterType: 'turquoise',
    },
  },
];

export const TheIslands: React.FC<TheIslandsProps> = ({ currentLang, onExploreExperience }) => {
  const t = TRANSLATIONS[currentLang];
  const [selectedIsland, setSelectedIsland] = useState<IslandData>(ISLANDS_LIST[0]);

  return (
    <section id="islands" className="py-24 md:py-36 bg-[#06121E] text-white relative overflow-hidden scroll-mt-20 border-t border-[#C6A15B]/20">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[#0e7490]/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Editorial Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 border-b border-[#C6A15B]/20 pb-8">
          <div>
            <div className="flex items-center gap-2.5 text-[11px] font-mono font-semibold uppercase tracking-[0.25em] text-[#C6A15B] mb-3">
              <Compass className="w-4 h-4 text-[#C6A15B]" />
              <span>{t.islands.tag}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-white tracking-tight text-balance">
              {t.islands.title}
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#94a3b8] max-w-lg leading-relaxed font-light">
            {t.islands.subtitle}
          </p>
        </div>

        {/* Islands Interactive Feature Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Island Selector Tabs */}
          <div className="lg:col-span-5 space-y-2.5">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40 block mb-2 font-mono">
              {currentLang === 'es' ? 'Seleccionar Destino' : 'Select Destination'}
            </span>

            {ISLANDS_LIST.map((island) => {
              const isSelected = selectedIsland.id === island.id;
              return (
                <button
                  key={island.id}
                  onClick={() => setSelectedIsland(island)}
                  className={`w-full text-left p-4 sm:p-5 rounded-2xl transition-all duration-300 border flex flex-col justify-between group ${
                    isSelected
                      ? 'bg-white/10 border-cyan-400/40 shadow-lg shadow-cyan-950/40 backdrop-blur-md'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-300/80 block">
                        {island.gunaName}
                      </span>
                      <h3
                        className={`text-base sm:text-lg font-serif font-medium mt-0.5 transition-colors ${
                          isSelected ? 'text-white' : 'text-white/80 group-hover:text-white'
                        }`}
                      >
                        {island.name}
                      </h3>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-200'
                          : 'border-white/10 text-white/40 group-hover:text-white/70'
                      }`}
                    >
                      {island.group}
                    </span>
                  </div>

                  <p className="text-xs text-white/60 line-clamp-1 mt-2 font-light">
                    {island.tagline[currentLang]}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Right Column: Heroic Spotlight of the Selected Island */}
          <div className="lg:col-span-7 bg-white/[0.03] border border-white/10 rounded-3xl p-6 sm:p-8 lg:p-10 backdrop-blur-xl relative flex flex-col justify-between">
            
            {/* Visual Island Header */}
            <div>
              {/* Destination Image Preview */}
              <div className="relative aspect-[21/9] sm:aspect-[16/7] rounded-2xl overflow-hidden mb-6 border border-white/10 shadow-lg bg-[#0b1f30]">
                <img
                  src={
                    selectedIsland.id === 'isla-perro-chico' || selectedIsland.id === 'isla-perro'
                      ? '/pictures/perrochico.jpg'
                      : selectedIsland.id === 'isla-franklin'
                      ? '/pictures/Franklin.jpg'
                      : selectedIsland.id === 'cayos-limon'
                      ? '/pictures/placeholder/islands.jpg'
                      : selectedIsland.id === 'cayos-holandeses'
                      ? '/pictures/multidaytravel.jpg'
                      : '/pictures/01 Boat Day Tour .jpg'
                  }
                  alt={selectedIsland.name}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-all duration-500 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-4 text-[11px] font-mono tracking-wider text-cyan-200 uppercase bg-black/40 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-white/15">
                  {selectedIsland.gunaName}
                </div>
              </div>

              {/* Top metadata tags */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-6 mb-6">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono tracking-wider text-cyan-200 uppercase">
                    {selectedIsland.gunaName}
                  </span>
                  <span className="text-white/30 text-xs">·</span>
                  <span className="text-xs text-white/70">{selectedIsland.group}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs">
                  <Waves className="w-3.5 h-3.5" />
                  <span>{selectedIsland.waterVisibility}</span>
                </div>
              </div>

              {/* Island Title & Tagline */}
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-display font-light text-white tracking-tight">
                {selectedIsland.name}
              </h3>
              <p className="text-sm sm:text-base text-cyan-100/90 font-light mt-2 italic">
                "{selectedIsland.tagline[currentLang]}"
              </p>

              {/* Prose Description */}
              <p className="text-sm text-white/80 leading-relaxed font-light mt-4">
                {selectedIsland.description[currentLang]}
              </p>

              {/* Highlights List */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <span className="text-[11px] uppercase tracking-[0.2em] text-white/50 block mb-3 font-mono">
                  {currentLang === 'es' ? 'Aspectos Destacados' : 'Natural Highlights'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {selectedIsland.highlights[currentLang].map((hl, idx) => (
                    <div
                      key={idx}
                      className="bg-black/20 border border-white/10 rounded-xl p-3 text-xs text-white/90 flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      <span>{hl}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Best For Tag */}
              <div className="mt-5 text-xs text-white/70 flex items-center gap-2">
                <span className="text-cyan-400 font-medium">
                  {currentLang === 'es' ? 'Ideal para:' : 'Best for:'}
                </span>
                <span>{selectedIsland.bestFor[currentLang]}</span>
              </div>
            </div>

            {/* Action Zone: Connect directly to the experience visiting this island */}
            <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-white/60">
                <span>{currentLang === 'es' ? 'Coordinado directamente con familias locales' : 'Direct indigenous family access & protection'}</span>
              </div>

              <button
                onClick={() => onExploreExperience(selectedIsland.categoryLink)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold tracking-wider uppercase text-[#06131f] bg-white hover:bg-neutral-100 transition-all hover:scale-105 active:scale-95"
              >
                <span>{t.islands.exploreExpBtn}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
