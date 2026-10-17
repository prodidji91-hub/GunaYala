import React from 'react';
import { Language } from '../../types';
import { Sun, Moon, Sparkles, Compass, ArrowRight, ShieldCheck, Anchor, Ship, Calendar } from 'lucide-react';

export type SelectorCategoryPath =
  | 'day-trip'
  | 'overnight'
  | 'multi-day'
  | 'private-custom'
  | 'sailing'
  | 'catamaran'
  | 'help-me-choose';

interface ExperienceSelectorProps {
  currentLang: Language;
  onSelectPath: (path: SelectorCategoryPath) => void;
}

export const ExperienceSelector: React.FC<ExperienceSelectorProps> = ({
  currentLang,
  onSelectPath,
}) => {
  const isEs = currentLang === 'es';

  const categoryCards: {
    id: SelectorCategoryPath;
    badge: { en: string; es: string };
    title: { en: string; es: string };
    duration: { en: string; es: string };
    desc: { en: string; es: string };
    image: string;
    icon: React.ReactNode;
    features: { en: string; es: string }[];
    cta: { en: string; es: string };
    accentColor: string;
    borderHighlight?: boolean;
  }[] = [
    {
      id: 'day-trip',
      badge: { en: 'Book Online', es: 'Reserva en Línea' },
      title: { en: 'Day Trip', es: 'Pasadía' },
      duration: { en: '1 Full Day', es: '1 Día Completo' },
      desc: {
        en: 'Explore Guna Yala for one unforgettable day. Early pickup, 2 to 3 coral islands, starfish natural pool, and evening return.',
        es: 'Explore Guna Yala durante un día inolvidable. Salida temprano desde Ciudad de Panamá, 2 a 3 islas, piscina natural y regreso en la tarde.',
      },
      image: '/pictures/10 Boat Day Tour.jpg',
      icon: <Sun className="w-4 h-4 text-[#0e7490]" />,
      features: [
        { en: 'Roundtrip 4x4 & boat transfers', es: 'Traslado 4x4 y bote incluido' },
        { en: 'Fresh traditional island lunch', es: 'Almuerzo tradicional de la isla' },
        { en: 'Direct online booking available', es: 'Reserva directa en línea' },
      ],
      cta: { en: 'Select Day Trip', es: 'Elegir Pasadía' },
      accentColor: '#0e7490',
      borderHighlight: true,
    },
    {
      id: 'overnight',
      badge: { en: 'Planned with Petra', es: 'Planificación con Petra' },
      title: { en: 'Overnight Stay', es: 'Estadía Nocturna' },
      duration: { en: '1 to 2 Nights', es: '1 a 2 Noches' },
      desc: {
        en: 'Sleep in beachfront traditional wooden cabanas, enjoy peaceful island sunsets, and wake up to serene ocean waters.',
        es: 'Duerma frente al mar en cabañas tradicionales de madera, disfrute de atardeceres apacibles y amanezca frente al océano.',
      },
      image: '/pictures/04 Franklin.jpg',
      icon: <Moon className="w-4 h-4 text-[#1e3a5f]" />,
      features: [
        { en: 'Beachfront wooden cabanas', es: 'Cabañas sobre arena de playa' },
        { en: 'Island hopping excursion', es: 'Tour en bote por islas cercanas' },
        { en: 'Personalized cabana check', es: 'Verificación de cabaña con Petra' },
      ],
      cta: { en: 'Select Overnight', es: 'Elegir Estadía' },
      accentColor: '#1e3a5f',
    },
    {
      id: 'multi-day',
      badge: { en: 'Outer Atolls', es: 'Atolones Exteriores' },
      title: { en: 'Multi-Day Experience', es: 'Expedición Multidía' },
      duration: { en: '3 to 5+ Days', es: '3 a 5+ Días' },
      desc: {
        en: 'Deeper exploration across Cayos Holandeses, remote barrier reefs, and authentic indigenous community village visits.',
        es: 'Exploración profunda por Cayos Holandeses, arrecifes alejados y visita cultural a comunidades indígenas tradicionales.',
      },
      image: '/pictures/multidaytravel.jpg',
      icon: <Calendar className="w-4 h-4 text-[#0f766e]" />,
      features: [
        { en: 'Remote Cayos Holandeses', es: 'Exploración de Cayos Holandeses' },
        { en: 'Indigenous village cultural visit', es: 'Visita cultural a comunidad' },
        { en: 'Custom multi-night itinerary', es: 'Itinerario multidía personalizado' },
      ],
      cta: { en: 'Select Multi-Day', es: 'Elegir Expedición' },
      accentColor: '#0f766e',
    },
    {
      id: 'private-custom',
      badge: { en: 'Bespoke Charter', es: 'A Medida & Privado' },
      title: { en: 'Private / Custom', es: 'Privado / A Medida' },
      duration: { en: 'Custom Schedule', es: 'Horario Personalizado' },
      desc: {
        en: 'Dedicated 4x4 SUV and private Guna boat exclusively for your family or party. Complete freedom over schedule and island stops.',
        es: 'Vehículo 4x4 y lancha guna totalmente privados para su grupo. Libertad total sobre horarios, ritmo y selección de islas.',
      },
      image: '/pictures/01 Boat Day Tour .jpg',
      icon: <Sparkles className="w-4 h-4 text-[#b45309]" />,
      features: [
        { en: '100% private 4x4 & boat captain', es: 'Transporte y bote 100% privados' },
        { en: 'Custom departure and timing', es: 'Horarios y rutas a la medida' },
        { en: 'Ideal for families or groups', es: 'Ideal para familias o celebraciones' },
      ],
      cta: { en: 'Select Private Trip', es: 'Elegir Viaje Privado' },
      accentColor: '#b45309',
    },
    {
      id: 'sailing',
      badge: { en: 'Wind Power', es: 'Navegación a Vela' },
      title: { en: 'Sailing', es: 'Velero Monocasco' },
      duration: { en: '2+ Nights Minimum', es: 'Mínimo 2 Noches' },
      desc: {
        en: 'Classic wind-powered navigation between outer coral lagoons. Anchor in sheltered bays with onboard private cabins and fresh seafood.',
        es: 'Navegación clásica a vela entre lagunas de coral. Fondee en bahías protegidas con cabinas privadas y comidas preparadas a bordo.',
      },
      image: '/pictures/09 Velero .jpg',
      icon: <Anchor className="w-4 h-4 text-[#0369a1]" />,
      features: [
        { en: 'Private nautical cabins onboard', es: 'Cabinas privadas a bordo' },
        { en: 'Full board with fresh meals', es: 'Pensión completa a bordo' },
        { en: 'Snorkel gear & paddleboards', es: 'Paddleboards y equipo de snorkel' },
      ],
      cta: { en: 'Inquire Sailing', es: 'Consultar Velero' },
      accentColor: '#0369a1',
    },
    {
      id: 'catamaran',
      badge: { en: 'Luxury Living', es: 'Catamarán de Confort' },
      title: { en: 'Catamaran', es: 'Catamarán Privado' },
      duration: { en: '2+ Nights Minimum', es: 'Mínimo 2 Noches' },
      desc: {
        en: 'Maximum stability, wide sun deck trampoline nets, en-suite double cabins, and private chef service in crystal Caribbean waters.',
        es: 'Máxima estabilidad, amplias mallas de sol, camarotes dobles en suite y servicio de chef privado en aguas cristalinas.',
      },
      image: '/pictures/catamaran.jpg',
      icon: <Ship className="w-4 h-4 text-[#0e7490]" />,
      features: [
        { en: 'En-suite cabins & maximum stability', es: 'Camarotes en suite y estabilidad' },
        { en: 'Onboard private chef meals', es: 'Chef a bordo y comidas frescas' },
        { en: 'Access to shallow secluded cays', es: 'Acceso a bahías tranquilas' },
      ],
      cta: { en: 'Inquire Catamaran', es: 'Consultar Catamarán' },
      accentColor: '#0e7490',
    },
    {
      id: 'help-me-choose',
      badge: { en: '30-Second Finder', es: 'Guía de 30 Segundos' },
      title: { en: 'Help Me Choose', es: 'Ayúdenme a Elegir' },
      duration: { en: 'Interactive Questionnaire', es: 'Cuestionario Orientativo' },
      desc: {
        en: 'Not sure which option matches your schedule and style? Answer 4 quick questions for an instant tailored recommendation.',
        es: '¿Indeciso sobre cuál opción se adapta mejor? Responda 4 breves preguntas para recibir una sugerencia personalizada.',
      },
      image: '/pictures/placeholder/islands.jpg',
      icon: <Compass className="w-4 h-4 text-[#b45309]" />,
      features: [
        { en: 'Based on your available time', es: 'Basado en su tiempo disponible' },
        { en: 'Matches interests & group style', es: 'Sugerencia por intereses y grupo' },
        { en: 'Direct route to your best fit', es: 'Guía clara a su opción ideal' },
      ],
      cta: { en: 'Start Help Me Choose', es: 'Iniciar Asesoría' },
      accentColor: '#b45309',
    },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 select-none">
      {/* Primary Question Header (Exact Prompt Copy Requirement) */}
      <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0e7490]/10 border border-[#0e7490]/20 text-[#0e7490] text-[11px] font-mono uppercase tracking-[0.2em] mb-4">
          <Compass className="w-3.5 h-3.5" />
          <span>{isEs ? 'Planificador de Experiencias' : 'Curated Travel Concierge'}</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-light text-[#06121e] tracking-tight leading-tight uppercase">
          {isEs ? '¿Qué tipo de experiencia estás buscando?' : 'What kind of experience are you looking for?'}
        </h2>
        <p className="mt-4 text-sm sm:text-base text-[#475569] font-light leading-relaxed max-w-2xl mx-auto">
          {isEs
            ? 'Seleccione la categoría que se adapte a su tiempo y estilo de viaje en San Blas, Panamá.'
            : 'Select the category that matches your travel time and desired style in San Blas, Panama.'}
        </p>
      </div>

      {/* 7 Category Selections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-6">
        {categoryCards.map((cat) => (
          <div
            key={cat.id}
            className={`group relative bg-white rounded-3xl border ${
              cat.borderHighlight ? 'border-2 border-[#0e7490]/40 hover:border-[#0e7490]' : 'border-[#e2d8c5] hover:border-[#06121e]'
            } p-6 flex flex-col justify-between shadow-xs hover:shadow-xl transition-all duration-300`}
          >
            {/* Category Top Badge */}
            <div className="absolute -top-3 left-6 z-10 bg-[#06121e] text-white text-[10px] font-mono uppercase tracking-[0.2em] px-3 py-0.5 rounded-full shadow-xs flex items-center gap-1">
              <span>{cat.badge[currentLang]}</span>
            </div>

            <div>
              {/* Image Frame */}
              <div className="relative aspect-[16/10] rounded-2xl overflow-hidden mb-5 border border-[#e2d8c5] bg-[#e8e2d5]">
                <img
                  src={cat.image}
                  alt={cat.title[currentLang]}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                    cat.id === 'day-trip' || cat.image.includes('10 Boat Day Tour') ? 'object-[center_65%]' : ''
                  }`}
                />
                <div className="absolute bottom-2.5 left-2.5 w-8 h-8 rounded-xl bg-white/95 backdrop-blur-xs flex items-center justify-center shadow-xs">
                  {cat.icon}
                </div>
              </div>

              {/* Sub-kicker duration */}
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#0e7490] mb-1">
                {cat.duration[currentLang]}
              </div>

              {/* Title */}
              <h3 className="text-xl sm:text-2xl font-display font-medium text-[#06121e] mb-2.5">
                {cat.title[currentLang]}
              </h3>

              {/* Description */}
              <p className="text-xs sm:text-sm text-[#475569] font-light leading-relaxed mb-4 line-clamp-3">
                {cat.desc[currentLang]}
              </p>

              {/* Features List */}
              <div className="space-y-1.5 pt-3 border-t border-[#f1f5f9] text-xs text-[#334155] font-light mb-6">
                {cat.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[#0e7490] font-bold">✓</span>
                    <span className="truncate">{feat[currentLang]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Selection Action Button (Min 44px height hit target) */}
            <button
              onClick={() => onSelectPath(cat.id)}
              className="w-full min-h-[44px] py-3.5 px-4 rounded-xl bg-[#06121e] hover:bg-[#0e7490] text-white text-xs uppercase tracking-[0.16em] font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-xs group-hover:shadow-md active:scale-[0.98]"
            >
              <span>{cat.cta[currentLang]}</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Helpful Guarantee Banner */}
      <div className="mt-12 bg-white/80 border border-[#e5dccb] rounded-2xl p-5 text-center text-xs text-[#64748b] font-light flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-2 text-[#06121e]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="font-medium">
            {isEs ? 'Atención Personalizada Guna:' : 'Guna Indigenous Operation:'}
          </span>
          <span>
            {isEs
              ? 'Todas las experiencias son coordinadas y operadas por capitanes y familias indígenas gunas.'
              : 'All experiences are operated and coordinated by licensed Guna indigenous captains and local families.'}
          </span>
        </div>
        <div className="text-[11px] font-mono text-[#0e7490] tracking-wider uppercase">
          {isEs ? 'Cotizaciones Transparentes' : 'Transparent Quotes · Zero Hidden Fees'}
        </div>
      </div>
    </div>
  );
};
