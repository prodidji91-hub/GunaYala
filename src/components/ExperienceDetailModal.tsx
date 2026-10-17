import React, { useEffect, useState } from 'react';
import { Experience, Language, ExperienceCategory } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { EXPERIENCES_DATA } from '../data/experiences';
import { FAQ_DATA } from '../data/faq';
import { FlagUS, FlagPanama } from './FlagIcons';
import {
  X,
  Check,
  AlertTriangle,
  Luggage,
  Navigation,
  Bed,
  Clock,
  Users,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Calendar,
  Compass,
  ShieldCheck,
  Maximize2,
  Anchor,
  Compass as CompassIcon,
  MessageCircle,
  Share2,
  CheckCheck,
} from 'lucide-react';

interface ExperienceDetailModalProps {
  experience: Experience | null;
  currentLang: Language;
  onLanguageChange?: (lang: Language) => void;
  onClose: () => void;
  onInquire: (category: ExperienceCategory) => void;
  onSelectExperience?: (exp: Experience) => void;
}

// Local Photo Gallery Mapping for each experience (all local project assets)
const EXPERIENCE_GALLERIES: Record<
  string,
  { url: string; title: { en: string; es: string }; caption: { en: string; es: string } }[]
> = {
  'day-trip-classic': [
    {
      url: '/pictures/perrochico.jpg',
      title: { en: 'Perro Chico Island (Dog Island)', es: 'Isla Perro Chico' },
      caption: {
        en: 'Iconic shipwreck snorkeling and powder-white sand beaches on Perro Chico Island.',
        es: 'Snorkel en barco hundido y playas de arena blanca en Isla Perro Chico.',
      },
    },
    {
      url: '/pictures/10 Boat Day Tour.jpg',
      title: { en: 'Pristine Coral Cay', es: 'Isla Virgen de Coral' },
      caption: {
        en: 'Relaxing on secluded white sand beaches during island hopping.',
        es: 'Descanso en playas de arena blanca durante el recorrido por las islas.',
      },
    },
    {
      url: '/pictures/placeholder/snorkeling.jpg',
      title: { en: 'Natural Pool Sandbank', es: 'Piscina Natural de Estrellas de Mar' },
      caption: {
        en: 'Shallow waist-deep ocean sandbar in the open Caribbean sea.',
        es: 'Banco de arena a la cintura en medio del mar Caribe.',
      },
    },
    {
      url: '/pictures/placeholder/islands.jpg',
      title: { en: 'Archipelago Perspective', es: 'Vista del Archipiélago' },
      caption: {
        en: 'Palm-fringed coral cays surrounded by protective reefs.',
        es: 'Cayos de coral rodeados por arrecifes protectores.',
      },
    },
  ],
  'overnight-island-stay': [
    {
      url: '/pictures/04 Franklin.jpg',
      title: { en: 'Beachfront Island Cabana', es: 'Cabaña Playera de Isla' },
      caption: {
        en: 'Traditional wooden cabanas stepping directly onto white beach sand.',
        es: 'Cabañas tradicionales de madera con acceso directo a la playa.',
      },
    },
    {
      url: '/pictures/04 Franklin.jpg',
      title: { en: 'Rustic Overwater Living', es: 'Cabaña sobre la Orilla Marítima' },
      caption: {
        en: 'Gentle Caribbean waves at night under unpolluted starry skies.',
        es: 'Suaves olas caribeñas en la noche bajo cielos estrellados.',
      },
    },
    {
      url: '/pictures/placeholder/islands.jpg',
      title: { en: 'Serene Island Sunset', es: 'Atardecer en la Isla' },
      caption: {
        en: 'Peaceful evenings after daytime excursion boats depart.',
        es: 'Tardes apacibles una vez finalizadas las visitas de pasadía.',
      },
    },
    {
      url: '/pictures/placeholder/culture.jpg',
      title: { en: 'Guna Island Hospitality', es: 'Hospitalidad Guna en la Isla' },
      caption: {
        en: 'Authentic family-run island accommodations.',
        es: 'Hospedaje auténtico atendido por familias locales.',
      },
    },
  ],
  'multi-day-exploration': [
    {
      url: '/pictures/multidaytravel.jpg',
      title: { en: 'Outer Archipelago Atolls', es: 'Atolones del Archipiélago Exterior' },
      caption: {
        en: 'Deep island navigation into Cayos Holandeses and Lemon Cays.',
        es: 'Navegación profunda hacia Cayos Holandeses y Cayos Limón.',
      },
    },
    {
      url: '/pictures/multidaytravel.jpg',
      title: { en: 'Secluded Caribbean Reaches', es: 'Cayos Remotos del Caribe' },
      caption: {
        en: 'Exploring uninhabited coral sandbanks beyond standard routes.',
        es: 'Exploración de bancos de arena deshabitados fuera del circuito tradicional.',
      },
    },
    {
      url: '/pictures/04 Learn about the Guna Community in San Blas.jpg',
      title: { en: 'Guna Cultural Heritage', es: 'Patrimonio Cultural Guna' },
      caption: {
        en: 'Visiting traditional island villages and mola artisan centers.',
        es: 'Visita a comunidades tradicionales y centros de artesanía mola.',
      },
    },
    {
      url: '/pictures/placeholder/cayuco.jpg',
      title: { en: 'Traditional Cayuco Craft', es: 'Cayuco Tradicional de Madera' },
      caption: {
        en: 'Hand-carved wooden cayucos used in daily island life.',
        es: 'Cayucos de madera esculpidos a mano usados en la vida cotidiana.',
      },
    },
  ],
  'private-custom-experience': [
    {
      url: '/pictures/01 Boat Day Tour .jpg',
      title: { en: 'Private Charter SUV & Boat', es: 'Transporte y Bote Privado' },
      caption: {
        en: 'Bespoke island schedules tailored for your private family or group.',
        es: 'Itinerario a medida diseñado para su familia o grupo privado.',
      },
    },
    {
      url: '/pictures/01 Boat Day Tour .jpg',
      title: { en: 'Dedicated Land & Water Transfers', es: 'Traslados Exclusivos por Tierra y Mar' },
      caption: {
        en: 'Private 4x4 SUV pickup directly from your hotel or residence.',
        es: 'Recogida en 4x4 privado directo en su hotel o residencia.',
      },
    },
    {
      url: '/pictures/placeholder/islands.jpg',
      title: { en: 'Custom Island Stops', es: 'Elección de Islas a Medida' },
      caption: {
        en: 'Flexibility to linger longer at uncrowded reefs and sandbars.',
        es: 'Flexibilidad para disfrutar más tiempo en arrecifes poco concurridos.',
      },
    },
  ],
  'sailing-adventure': [
    {
      url: '/pictures/09 Velero .jpg',
      title: { en: 'Monohull Sailing Vessel', es: 'Velero Monocasco en San Blas' },
      caption: {
        en: 'Wind-powered navigation between calm reef-protected lagoons.',
        es: 'Navegación a vela entre lagunas tranquilas protegidas por arrecifes.',
      },
    },
    {
      url: '/pictures/09 Velero .jpg',
      title: { en: 'Sailing Deck Life', es: 'Vida a Bordo del Velero' },
      caption: {
        en: 'Relaxing on deck with panoramic views of outer cays.',
        es: 'Descanso en cubierta con vistas panorámicas de cayos exteriores.',
      },
    },
    {
      url: '/pictures/placeholder/snorkeling.jpg',
      title: { en: 'Reef Anchorage Waters', es: 'Fondeadero en Arrecife' },
      caption: {
        en: 'Snorkeling and paddleboarding directly from the vessel.',
        es: 'Snorkel y paddleboard directamente desde el barco.',
      },
    },
  ],
  'luxury-catamaran-charter': [
    {
      url: '/pictures/catamaran.jpg',
      title: { en: 'Private Catamaran Charter', es: 'Chárter Privado en Catamarán' },
      caption: {
        en: 'Maximum comfort and stability anchored in crystal lagoons.',
        es: 'Máximo confort y estabilidad fondeado en lagunas cristalinas.',
      },
    },
    {
      url: '/pictures/catamaran.jpg',
      title: { en: 'Spacious Trampoline Net', es: 'Amplia Red de Proa' },
      caption: {
        en: 'Lounge in shade or sun with gourmet dining prepared onboard.',
        es: 'Área de descanso al sol o sombra con gastronomía a bordo.',
      },
    },
    {
      url: '/pictures/placeholder/islands.jpg',
      title: { en: 'Crystal Reef Anchorages', es: 'Fondeaderos en Arrecife' },
      caption: {
        en: 'Access to shallow secluded bays inaccessible to larger ships.',
        es: 'Acceso a bahías someras inaccesibles para barcos grandes.',
      },
    },
  ],
};

// Verified Itinerary for Day Trip Classic
const VERIFIED_DAY_TRIP_ITINERARY = [
  {
    time: '05:00 AM',
    title: { en: 'Panama City Pickup', es: 'Recogida en Ciudad de Panamá' },
    desc: {
      en: 'Shared or private 4x4 SUV pickup at your accommodation. Scenic drive across Serranía del Darién.',
      es: 'Recogida en 4x4 en su alojamiento. Recorrido panorámico por la Serranía del Darién.',
    },
  },
  {
    time: '07:30 AM',
    title: { en: 'Comarca Border Checkpoint', es: 'Punto de Control de la Comarca' },
    desc: {
      en: 'Original physical passport verification by SENAFRONT and Guna General Congress at Cartí entrance.',
      es: 'Verificación de pasaporte físico original en la entrada a Cartí.',
    },
  },
  {
    time: '08:30 AM',
    title: { en: 'Guna Boat Navigation & Islands', es: 'Navegación en Bote Guna e Islas' },
    desc: {
      en: 'Board motorboat at Cartí port. Island hopping to pristine coral sand cays and natural swimming pool.',
      es: 'Abordaje de bote en puerto Cartí. Visita a islas de coral y la piscina natural de estrellas de mar.',
    },
  },
  {
    time: '12:30 PM',
    title: { en: 'Fresh Island Lunch', es: 'Almuerzo Tradicional de la Isla' },
    desc: {
      en: 'Freshly prepared traditional lunch (catch of the day or chicken with coconut rice and plantains).',
      es: 'Almuerzo preparado en la isla (pescado del día o pollo con arroz con coco y patacones).',
    },
  },
  {
    time: '03:30 PM',
    title: { en: 'Afternoon Port Return', es: 'Regreso al Puerto en la Tarde' },
    desc: {
      en: 'Boat transfer back to Cartí port and boarding 4x4 vehicle for return journey.',
      es: 'Retorno en bote a puerto Cartí y abordaje del vehículo 4x4 para el viaje de regreso.',
    },
  },
  {
    time: '07:00 PM',
    title: { en: 'Panama City Arrival', es: 'Llegada a Ciudad de Panamá' },
    desc: {
      en: 'Drop-off at your hotel or residence in Panama City.',
      es: 'Llegada y entrega en su hotel o residencia en Ciudad de Panamá.',
    },
  },
];

export const ExperienceDetailModal: React.FC<ExperienceDetailModalProps> = ({
  experience,
  currentLang,
  onLanguageChange,
  onClose,
  onInquire,
  onSelectExperience,
}) => {
  const t = TRANSLATIONS[currentLang];
  const isEs = currentLang === 'es';

  // State for Interactive Photo Gallery Lightbox
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // State for Mobile Touch Swipe in Lightbox
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // State for Shareable Link Feedback
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyShareLink = () => {
    if (typeof window !== 'undefined' && experience) {
      const shareUrl = `${window.location.origin}${window.location.pathname}?experience=${experience.id}`;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareUrl);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // State for FAQ Accordion
  const [openFaqId, setOpenFaqId] = useState<string | null>('transportation-how');

  // Handle body scroll lock & Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxOpen) {
          setLightboxOpen(false);
        } else {
          onClose();
        }
      }
      if (lightboxOpen) {
        if (e.key === 'ArrowRight') handleNextPhoto();
        if (e.key === 'ArrowLeft') handlePrevPhoto();
      }
    };

    if (experience) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [experience, lightboxOpen, onClose]);

  if (!experience) return null;

  // Resolve gallery photos for this experience
  const galleryPhotos = EXPERIENCE_GALLERIES[experience.id] || EXPERIENCE_GALLERIES['day-trip-classic'];

  const handleOpenLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleNextPhoto = () => {
    setLightboxIndex((prev) => (prev + 1) % galleryPhotos.length);
  };

  const handlePrevPhoto = () => {
    setLightboxIndex((prev) => (prev - 1 + galleryPhotos.length) % galleryPhotos.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (diff > 50) {
      handleNextPhoto();
    } else if (diff < -50) {
      handlePrevPhoto();
    }
    setTouchStartX(null);
  };

  // Determine booking configuration type & labels
  const isAutomatedDayTrip = experience.category === 'day-trip';
  const isSailingOrCatamaran = experience.category === 'sailing' || experience.category === 'catamaran';

  // Primary CTA Button Label
  const primaryCtaLabel = isAutomatedDayTrip
    ? isEs
      ? 'Reservar Ahora'
      : 'Book Now'
    : isSailingOrCatamaran
    ? isEs
      ? 'Solicitar Precio y Disponibilidad'
      : 'Request Pricing & Availability'
    : isEs
    ? 'Solicitar Disponibilidad'
    : 'Request Availability';

  // Price Display Label
  const priceDisplayLabel = isSailingOrCatamaran
    ? isEs
      ? 'Precio a consultar previa disponibilidad'
      : 'Pricing upon availability inquiry'
    : isEs
    ? 'Tarifas confirmadas en su cotización'
    : 'Rates confirmed in your quotation';

  // Related experiences (3 max, excluding current)
  const relatedExperiences = EXPERIENCES_DATA.filter((e) => e.id !== experience.id).slice(0, 3);

  // Relevant FAQs
  const relevantFaqs = FAQ_DATA.slice(0, 4);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#06121e]/85 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 md:p-6 animate-in fade-in duration-200"
    >
      <div
        className="relative bg-[#faf7f2] text-[#1c242c] w-full max-w-5xl max-h-[100vh] sm:max-h-[94vh] sm:rounded-3xl overflow-y-auto shadow-2xl flex flex-col my-auto border border-[#e2d8c5]/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================
            TOP FROSTED HEADER & LANGUAGE SWITCHER
           ======================================================== */}
        <header className="sticky top-0 z-30 bg-[#faf7f2]/95 backdrop-blur-md px-4 sm:px-8 py-3.5 border-b border-[#e5dccb] flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#0e7490] font-semibold bg-[#0e7490]/10 border border-[#0e7490]/20 px-2.5 py-0.5 rounded-full">
              {experience.category.replace('-', ' ')}
            </span>
            <span aria-hidden="true" className="text-[#cbd5e1] hidden sm:inline">
              ·
            </span>
            <span className="text-xs font-display font-medium text-[#06121e] hidden sm:inline">
              Guna Yala, Panama
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-[#ede5d6]/80 border border-[#dcd2be] rounded-full p-0.5 text-xs font-mono tracking-wider">
              <button
                onClick={() => onLanguageChange && onLanguageChange('en')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all ${
                  currentLang === 'en'
                    ? 'font-bold text-[#06121e] bg-white border border-[#dcd2be] shadow-xs'
                    : 'text-[#64748b] hover:text-[#06121e]'
                }`}
                title="English (US)"
              >
                <FlagUS className="w-3.5 h-2.5" />
                <span>EN</span>
              </button>
              <span className="text-[#cbd5e1] text-[10px]" aria-hidden="true">
                |
              </span>
              <button
                onClick={() => onLanguageChange && onLanguageChange('es')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all ${
                  currentLang === 'es'
                    ? 'font-bold text-[#06121e] bg-white border border-[#dcd2be] shadow-xs'
                    : 'text-[#64748b] hover:text-[#06121e]'
                }`}
                title="Español (Panamá)"
              >
                <FlagPanama className="w-3.5 h-2.5" />
                <span>ES</span>
              </button>
            </div>

            {/* Shareable Link Button */}
            <button
              onClick={handleCopyShareLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono tracking-wider bg-[#ede5d6]/80 border border-[#dcd2be] text-[#06121e] hover:bg-white transition-all shadow-xs"
              title={isEs ? 'Copiar enlace directo de esta experiencia' : 'Copy direct link to this experience'}
            >
              {copiedLink ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-[#0e7490]" />}
              <span className="hidden sm:inline">{copiedLink ? (isEs ? '¡Copiado!' : 'Copied!') : (isEs ? 'Compartir' : 'Share')}</span>
            </button>

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="p-2 rounded-full text-[#475569] hover:text-[#06121e] hover:bg-[#ede5d6] transition-colors"
              aria-label="Close details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ========================================================
            MODAL SCROLLABLE BODY
           ======================================================== */}
        <div className="flex-1 space-y-12 pb-12">
          {/* A. CINEMATIC HERO SECTION */}
          <section className="relative w-full aspect-[16/10] sm:aspect-[21/9] min-h-[320px] sm:min-h-[420px] bg-[#06121e] overflow-hidden flex flex-col justify-end p-6 sm:p-10 text-white">
            <img
              src={galleryPhotos[0]?.url || '/pictures/experiences/san_blas_day_trip.jpg'}
              alt={experience.title[currentLang]}
              className={`absolute inset-0 w-full h-full object-cover opacity-85 ${
                (galleryPhotos[0]?.url || '').includes('10 Boat Day Tour') || experience.category === 'day-trip' ? 'object-[center_65%]' : ''
              }`}
            />
            {/* Scrim Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#06121e] via-[#06121e]/50 to-black/30 pointer-events-none" />

            <div className="relative z-10 max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-[#38bdf8] bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/15">
                <Compass className="w-3 h-3 text-[#38bdf8]" />
                <span>Guna Yala Archipelago · Panama</span>
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-display font-light text-white tracking-tight leading-tight text-balance">
                {experience.title[currentLang]}
              </h1>

              <p className="text-xs sm:text-base text-white/85 font-light leading-relaxed max-w-2xl">
                {experience.subtitle[currentLang]}
              </p>

              {/* Specs & Pricing Strip */}
              <div className="pt-2 flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-light text-white/90">
                <div className="flex items-center gap-1.5 bg-black/35 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15">
                  <Clock className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>{experience.duration[currentLang]}</span>
                </div>

                <div className="flex items-center gap-1.5 bg-black/35 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15">
                  <Users className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>{experience.suitableFor[currentLang].split(',')[0]}</span>
                </div>

                {isSailingOrCatamaran && (
                  <div className="flex items-center gap-1.5 bg-[#0e7490]/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#38bdf8]/30 font-medium text-cyan-200">
                    <Anchor className="w-3.5 h-3.5 text-cyan-300" />
                    <span>{isEs ? 'Chárter con Tripulación' : 'Crewed Nautical Charter'}</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* B. EXPERIENCE OVERVIEW (EDITORIAL TWO-COLUMN) */}
          <section className="px-6 sm:px-10 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-[#0e7490]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isEs ? 'Descripción General' : 'Experience Overview'}</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-light text-[#06121e]">
                  {experience.title[currentLang]}
                </h2>
                <p className="text-sm sm:text-base text-[#475569] font-light leading-relaxed whitespace-pre-line">
                  {experience.overview[currentLang]}
                </p>

                <div className="pt-2 text-xs text-[#64748b] font-light italic border-l-2 border-[#0e7490] pl-3">
                  {priceDisplayLabel}
                </div>
              </div>

              {/* Right: Featured Photograph */}
              <div className="lg:col-span-5">
                <div className="relative aspect-[4/3] rounded-3xl overflow-hidden border-2 border-[#e2d8c5] shadow-lg bg-[#e8e2d5]">
                  <img
                    src={galleryPhotos[1]?.url || galleryPhotos[0]?.url}
                    alt={experience.title[currentLang]}
                    className={`w-full h-full object-cover ${
                      (galleryPhotos[1]?.url || galleryPhotos[0]?.url || '').includes('10 Boat Day Tour') || experience.category === 'day-trip' ? 'object-[center_65%]' : ''
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-3 left-3 right-3 text-white text-[11px] font-light bg-black/50 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/10">
                    {galleryPhotos[1]?.caption[currentLang] || galleryPhotos[0]?.caption[currentLang]}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* C. EXPERIENCE HIGHLIGHTS */}
          <section className="px-6 sm:px-10 max-w-4xl mx-auto space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-[#0e7490]">
              <span>✦</span>
              <span>{isEs ? 'Aspectos Destacados' : 'Experience Highlights'}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {experience.highlights[currentLang].map((hl, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-white rounded-2xl border border-[#e2d8c5] shadow-2xs flex items-start gap-3"
                >
                  <span className="w-5 h-5 rounded-full bg-[#0e7490]/10 text-[#0e7490] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span className="text-xs sm:text-sm text-[#334155] font-light leading-relaxed">
                    {hl}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* D. ITINERARY (VERIFIED ONLY FOR DAY TRIP CLASSIC) */}
          {experience.id === 'day-trip-classic' && (
            <section className="px-6 sm:px-10 max-w-4xl mx-auto space-y-6">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-[#0e7490]">
                <Calendar className="w-3.5 h-3.5" />
                <span>{isEs ? 'Itinerario de Pasadía (Horarios)' : 'Full Day Schedule'}</span>
              </div>

              <div className="bg-white rounded-3xl border border-[#e2d8c5] p-6 sm:p-8 shadow-2xs space-y-6">
                <div className="relative border-l-2 border-[#0e7490]/30 ml-3 space-y-6">
                  {VERIFIED_DAY_TRIP_ITINERARY.map((step, idx) => (
                    <div key={idx} className="relative pl-6">
                      <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-[#0e7490] border-2 border-white shadow-2xs" />
                      <div className="text-[11px] font-mono font-bold text-[#0e7490] tracking-wider">
                        {step.time}
                      </div>
                      <h4 className="text-base font-display font-medium text-[#06121e]">
                        {step.title[currentLang]}
                      </h4>
                      <p className="text-xs text-[#475569] font-light mt-1 leading-relaxed">
                        {step.desc[currentLang]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* E. ACCOMMODATION OPTIONS (DISPLAYED ONLY WHEN RELEVANT) */}
          {experience.accommodation && (
            <section className="px-6 sm:px-10 max-w-4xl mx-auto space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-[#1e3a5f]">
                <Bed className="w-3.5 h-3.5 text-[#1e3a5f]" />
                <span>{isEs ? 'Opciones de Hospedaje y Cabina' : 'Accommodation & Cabana Details'}</span>
              </div>

              <div className="p-6 bg-white rounded-3xl border border-[#e2d8c5] shadow-2xs space-y-3">
                <p className="text-xs sm:text-sm text-[#334155] font-light leading-relaxed">
                  {experience.accommodation[currentLang]}
                </p>

                <div className="pt-3 border-t border-[#f1f5f9] text-[11px] text-[#64748b] font-light italic">
                  {isEs
                    ? 'La asignación de cabaña o habitación se confirma directamente en su cotización previa consulta de disponibilidad.'
                    : 'Specific cabana style and bathroom category availability is confirmed directly in your quotation.'}
                </div>
              </div>
            </section>
          )}

          {/* F. PHOTO GALLERY (RESPONSIVE GRID & INTERACTIVE LIGHTBOX) */}
          <section className="px-6 sm:px-10 max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-[#0e7490]">
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{isEs ? 'Galería de Fotos' : 'Photo Gallery'}</span>
              </div>
              <span className="text-[11px] font-mono text-[#64748b]">
                {galleryPhotos.length} {isEs ? 'imágenes' : 'photos'}
              </span>
            </div>

            {/* Gallery Thumbnails Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {galleryPhotos.map((photo, idx) => (
                <button
                  key={idx}
                  onClick={() => handleOpenLightbox(idx)}
                  className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-[#e2d8c5] bg-[#e8e2d5] text-left focus:outline-none focus:ring-2 focus:ring-[#0e7490] transition-all"
                >
                  <img
                    src={photo.url}
                    alt={photo.title[currentLang]}
                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                      photo.url.includes('10 Boat Day Tour') ? 'object-[center_65%]' : ''
                    }`}
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                  <div className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* G. INCLUDED / NOT INCLUDED */}
          <section className="px-6 sm:px-10 max-w-4xl mx-auto space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Included */}
              <div className="p-6 bg-emerald-50/60 rounded-3xl border border-emerald-200/80 space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-[0.18em] text-emerald-900 font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-700" />
                  <span>{isEs ? 'Servicios Incluidos' : 'What is Included'}</span>
                </h4>

                <ul className="space-y-2 text-xs sm:text-sm text-emerald-950 font-light">
                  {experience.included[currentLang].map((inc, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-700 font-bold">✓</span>
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Not Included */}
              <div className="p-6 bg-amber-50/60 rounded-3xl border border-amber-200/80 space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-[0.18em] text-amber-900 font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span>{isEs ? 'Información Importante & No Incluido' : 'Not Included'}</span>
                </h4>

                <ul className="space-y-2 text-xs sm:text-sm text-amber-950 font-light">
                  {experience.notIncluded[currentLang].map((notInc, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-700 font-bold">✕</span>
                      <span>{notInc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* H. FREQUENTLY ASKED QUESTIONS */}
          <section className="px-6 sm:px-10 max-w-4xl mx-auto space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-[#0e7490]">
              <span>?</span>
              <span>{isEs ? 'Preguntas Frecuentes' : 'Frequently Asked Questions'}</span>
            </div>

            <div className="space-y-2.5">
              {relevantFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="bg-white rounded-2xl border border-[#e2d8c5] overflow-hidden transition-all shadow-2xs"
                  >
                    <button
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 text-xs sm:text-sm font-display font-medium text-[#06121e]"
                    >
                      <span>{faq.question[currentLang]}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-[#0e7490] shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="px-4 sm:px-5 pb-5 pt-1 text-xs sm:text-sm text-[#475569] font-light leading-relaxed border-t border-[#f1f5f9]">
                        {faq.answer[currentLang]}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* I. BOOKING / INQUIRY CALL TO ACTION */}
          <section className="px-6 sm:px-10 max-w-4xl mx-auto">
            <div className="p-8 sm:p-10 bg-[#06121e] rounded-3xl text-white text-center space-y-5 border border-white/10 shadow-xl">
              <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.25em] text-[#38bdf8] bg-white/10 px-3 py-1 rounded-full border border-white/15">
                <CompassIcon className="w-3 h-3 text-[#38bdf8]" />
                <span>GUNA YALA PANAMA TRAVEL</span>
              </div>

              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-display font-light tracking-tight">
                {isEs ? '¿Listo para Experimentar San Blas?' : 'Ready to Experience San Blas?'}
              </h3>

              <p className="text-xs sm:text-sm text-white/80 font-light max-w-lg mx-auto leading-relaxed">
                {isEs
                  ? 'Reserve directamente en línea o consulte disponibilidad y detalles con Petra.'
                  : 'Reserve directly online or request dates and custom itinerary coordination with Petra.'}
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => {
                    onClose();
                    onInquire(experience.category);
                  }}
                  className="w-full sm:w-auto py-4 px-8 rounded-full bg-[#38bdf8] hover:bg-[#0284c7] text-[#06121e] hover:text-white font-semibold text-xs uppercase tracking-[0.18em] transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <span>{primaryCtaLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href="https://wa.me/50764443649"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto py-3.5 px-6 rounded-full bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-medium text-xs tracking-wider flex items-center justify-center gap-2 transition-all"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp (+507 6444-3649)</span>
                </a>
              </div>
            </div>
          </section>

          {/* J. RELATED EXPERIENCES */}
          <section className="px-6 sm:px-10 max-w-4xl mx-auto space-y-4 pt-4 border-t border-[#e2d8c5]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-[#0e7490]">
                <span>✦</span>
                <span>{isEs ? 'Otras Experiencias Curadas' : 'Explore Related Journeys'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedExperiences.map((relExp) => (
                <div
                  key={relExp.id}
                  className="group bg-white rounded-2xl border border-[#e2d8c5] overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-[16/10] overflow-hidden bg-[#e8e2d5] relative">
                      <img
                        src={EXPERIENCE_GALLERIES[relExp.id]?.[0]?.url || '/pictures/10 Boat Day Tour.jpg'}
                        alt={relExp.title[currentLang]}
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                          (EXPERIENCE_GALLERIES[relExp.id]?.[0]?.url || '').includes('10 Boat Day Tour') || relExp.category === 'day-trip' ? 'object-[center_65%]' : ''
                        }`}
                      />
                      <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full">
                        {relExp.category.replace('-', ' ')}
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <h4 className="text-sm font-display font-medium text-[#06121e] line-clamp-1 group-hover:text-[#0e7490] transition-colors">
                        {relExp.title[currentLang]}
                      </h4>
                      <p className="text-[11px] text-[#64748b] font-light line-clamp-2">
                        {relExp.subtitle[currentLang]}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <button
                      onClick={() => {
                        if (onSelectExperience) {
                          onSelectExperience(relExp);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className="w-full py-2 px-3 text-[11px] uppercase tracking-wider font-semibold text-[#06121e] bg-[#faf7f2] hover:bg-[#ede5d6] border border-[#e2d8c5] rounded-xl transition-colors text-center"
                    >
                      {isEs ? 'Ver Experiencia' : 'View Experience'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ========================================================
            MODAL STICKY FOOTER BAR
           ======================================================== */}
        <footer className="sticky bottom-0 bg-[#faf7f2] px-6 py-4 border-t border-[#e5dccb] flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="py-2.5 px-4 text-xs font-semibold text-[#64748b] hover:text-[#06121e] transition-colors uppercase tracking-wider"
          >
            {isEs ? 'Cerrar' : 'Close'}
          </button>

          <button
            onClick={() => {
              onClose();
              onInquire(experience.category);
            }}
            className="inline-flex items-center gap-2 py-3 px-6 text-xs uppercase tracking-[0.16em] font-semibold text-white bg-[#06121e] hover:bg-[#0e7490] rounded-full shadow-md transition-all active:scale-95"
          >
            <span>{primaryCtaLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </footer>
      </div>

      {/* ========================================================
          FULL-SCREEN LIGHTBOX MODAL
         ======================================================== */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200 select-none"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Lightbox Header */}
          <div className="flex items-center justify-between gap-4 text-white z-10">
            <div className="text-xs font-mono tracking-wider">
              <span>
                {lightboxIndex + 1} / {galleryPhotos.length}
              </span>
            </div>

            <button
              onClick={() => setLightboxOpen(false)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Close photo viewer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Lightbox Image Display */}
          <div className="relative flex-1 flex items-center justify-center p-2 sm:p-6 overflow-hidden">
            <button
              onClick={handlePrevPhoto}
              className="absolute left-2 sm:left-6 z-10 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all focus:outline-none"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <img
              src={galleryPhotos[lightboxIndex]?.url}
              alt={galleryPhotos[lightboxIndex]?.title[currentLang]}
              className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl transition-opacity duration-300"
            />

            <button
              onClick={handleNextPhoto}
              className="absolute right-2 sm:right-6 z-10 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white transition-all focus:outline-none"
              aria-label="Next photo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Lightbox Caption Footer */}
          <div className="text-center text-white space-y-1 pb-2 z-10 max-w-xl mx-auto">
            <h4 className="text-sm font-display font-medium">
              {galleryPhotos[lightboxIndex]?.title[currentLang]}
            </h4>
            <p className="text-xs text-white/70 font-light">
              {galleryPhotos[lightboxIndex]?.caption[currentLang]}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
