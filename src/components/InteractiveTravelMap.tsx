import React, { useState, useRef, useEffect } from 'react';
import { Language, ExperienceCategory } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { VisualAsset } from '../pictures';
import {
  Compass,
  MapPin,
  Clock,
  Car,
  Ship,
  Info,
  ChevronRight,
  Sparkles,
  ArrowRight,
  Anchor,
  CheckCircle2,
  X,
  Navigation,
} from 'lucide-react';

interface InteractiveTravelMapProps {
  currentLang: Language;
  onOpenPlanner?: (category?: ExperienceCategory) => void;
}

export interface MapDestination {
  id: string;
  name: { en: string; es: string };
  category: { en: string; es: string };
  coordinates: { x: number; y: number }; // percentage coords (0 - 100)
  imageVariant:
    | 'day-trip'
    | 'overnight'
    | 'multi-day'
    | 'private'
    | 'sailing'
    | 'catamaran'
    | 'culture'
    | 'cayuco'
    | 'community'
    | 'natural-pool'
    | 'snorkeling'
    | 'islands'
    | 'panama-city'
    | 'carti-port'
    | 'franklin'
    | 'perro-chico'
    | 'cayos-holandeses';
  imageFallback: string;
  boatTimeFromCarti: { en: string; es: string };
  isVerifiedTime: boolean;
  description: { en: string; es: string };
  highlights: { en: string[]; es: string[] };
  isSampleRouteStop?: boolean;
  sampleRouteOrder?: number;
  type: 'departure' | 'island' | 'sandbar' | 'archipelago';
}

const DESTINATIONS: MapDestination[] = [
  {
    id: 'panama-city',
    name: { en: 'Panama City', es: 'Ciudad de Panamá' },
    category: { en: 'Overland Starting Point', es: 'Punto de Partida Terrestre' },
    coordinates: { x: 12, y: 78 },
    imageVariant: 'panama-city',
    imageFallback: '/pictures/Panama City Skyline at Sunset.png',
    boatTimeFromCarti: { en: 'Starting Point (4x4 Transfer)', es: 'Punto de Partida (Traslado 4x4)' },
    isVerifiedTime: true,
    description: {
      en: 'Starting point for all San Blas journeys. Scenic 4x4 SUV pickup directly at your hotel or residence in Panama City.',
      es: 'Punto de inicio para todos los viajes a San Blas. Recogida directa en vehículo 4x4 en su hotel o residencia en Ciudad de Panamá.',
    },
    highlights: {
      en: ['Panama City skyline pickup at 5:00 AM', 'Scenic mountain drive', 'Serranía del Darién crossing'],
      es: ['Recogida en Ciudad de Panamá a las 5:00 AM', 'Recorrido por las montañas', 'Cruce de la Serranía del Darién'],
    },
    type: 'departure',
  },
  {
    id: 'carti-port',
    name: { en: 'Cartí Port (Puerto Cartí)', es: 'Puerto Cartí' },
    category: { en: 'Coastal Gateway & Boat Hub', es: 'Puerto Marítimo y Embarcadero' },
    coordinates: { x: 28, y: 64 },
    imageVariant: 'carti-port',
    imageFallback: '/pictures/carti port Island.jpg',
    boatTimeFromCarti: { en: 'Mainland Departure Hub', es: 'Puerto de Embarque Principal' },
    isVerifiedTime: true,
    description: {
      en: 'The official maritime portal into Guna Yala. Here you board traditional Guna motorboats with experienced local captains.',
      es: 'El puerto oficial de entrada a la Comarca Guna Yala. Aquí se abordan los botes con capitanes guna locales.',
    },
    highlights: {
      en: ['Comarca border verification', 'Guna motorboat boarding', 'Protected bay departure'],
      es: ['Verificación de entrada comarcal', 'Abordaje de lanchas guna', 'Salida desde bahía protegida'],
    },
    isSampleRouteStop: true,
    sampleRouteOrder: 1,
    type: 'departure',
  },
  {
    id: 'perro-chico',
    name: { en: 'Perro Chico Island (Dog Island)', es: 'Isla Perro Chico' },
    category: { en: 'Coral Island & Shipwreck', es: 'Isla de Coral y Barco Hundido' },
    coordinates: { x: 48, y: 44 },
    imageVariant: 'perro-chico',
    imageFallback: '/pictures/perrochico.jpg',
    boatTimeFromCarti: { en: '~25 – 30 mins from Cartí Port', es: '~25 – 30 mins desde Puerto Cartí' },
    isVerifiedTime: true,
    description: {
      en: 'World-famous coral cay featuring crystal-clear waters and an iconic sunken cargo ship teeming with tropical fish and coral reefs.',
      es: 'Famosa isla de aguas cristalinas con un icónico barco hundido repleto de peces tropicales y arrecifes de coral.',
    },
    highlights: {
      en: ['Sunken shipwreck snorkeling', 'Powder-white sand beach', 'Coconut palms & shallow lagoon'],
      es: ['Snorkel en barco hundido', 'Arena blanca fina', 'Cocoteros y laguna cristalina'],
    },
    isSampleRouteStop: true,
    sampleRouteOrder: 2,
    type: 'island',
  },
  {
    id: 'natural-pool',
    name: { en: 'Piscina Natural (Natural Pool)', es: 'Piscina Natural de Estrellas' },
    category: { en: 'Offshore Sandbank', es: 'Banco de Arena en Mar Abierto' },
    coordinates: { x: 62, y: 38 },
    imageVariant: 'natural-pool',
    imageFallback: '/pictures/piscinanat.jpg',
    boatTimeFromCarti: { en: '~10 – 15 mins from Perro Chico', es: '~10 – 15 mins desde Perro Chico' },
    isVerifiedTime: true,
    description: {
      en: 'Shallow waist-deep sandbar in the middle of the ocean inhabited by giant Cushion Sea Stars in clear turquoise water.',
      es: 'Banco de arena poco profundo en medio del mar con aguas turquesas transparentes y estrellas de mar gigantes.',
    },
    highlights: {
      en: ['Waist-deep turquoise water', 'Giant sea stars viewing', 'Unobstructed 360° ocean view'],
      es: ['Aguas turquesas a la cintura', 'Avistamiento de estrellas de mar', 'Vista panorámica de 360°'],
    },
    isSampleRouteStop: true,
    sampleRouteOrder: 3,
    type: 'sandbar',
  },
  {
    id: 'isla-franklin',
    name: { en: 'Isla Franklin (Franklin Island)', es: 'Isla Franklin' },
    category: { en: 'Traditional Island & Cabanas', es: 'Cayo Tradicional y Cabañas' },
    coordinates: { x: 55, y: 58 },
    imageVariant: 'franklin',
    imageFallback: '/pictures/Franklin.jpg',
    boatTimeFromCarti: { en: '~30 – 35 mins from Cartí Port', es: '~30 – 35 mins desde Puerto Cartí' },
    isVerifiedTime: true,
    description: {
      en: 'Classic palm-fringed coral cay with traditional beachfront wood-and-thatch cabanas, calm turquoise swimming, and fresh island dining.',
      es: 'Cayo tradicional con cabañas de madera y paja frente al mar, aguas calmas y almuerzo de pescado fresco.',
    },
    highlights: {
      en: ['Traditional beach cabanas', 'Fresh catch lunch included', 'Quiet coral beach shores'],
      es: ['Cabañas playeras tradicionales', 'Almuerzo fresco de pescado', 'Orillas tranquilas de coral'],
    },
    isSampleRouteStop: true,
    sampleRouteOrder: 4,
    type: 'island',
  },
  {
    id: 'cayos-limon',
    name: { en: 'Cayos Limón (Lemon Cays)', es: 'Cayos Limón' },
    category: { en: 'Island Cluster', es: 'Grupo de Islas y Arrecifes' },
    coordinates: { x: 76, y: 36 },
    imageVariant: 'day-trip',
    imageFallback: '/pictures/10 Boat Day Tour.jpg',
    boatTimeFromCarti: { en: '~30 – 45 mins from Cartí Port', es: '~30 – 45 mins desde Puerto Cartí' },
    isVerifiedTime: true,
    description: {
      en: 'A central cluster of picturesque coral islands protected by outer reef barriers, ideal for island hopping and snorkeling.',
      es: 'Grupo central de islas de coral protegidas por barreras de arrecife, ideal para navegar y hacer snorkel.',
    },
    highlights: {
      en: ['Multiple coral island cluster', 'Vibrant reef fish colonies', 'Calm boat navigation'],
      es: ['Conjunto de varias islas', 'Peces de arrecife vistosos', 'Navegación en aguas calmas'],
    },
    type: 'archipelago',
  },
  {
    id: 'cayos-holandeses',
    name: { en: 'Cayos Holandeses (Dutch Cays)', es: 'Cayos Holandeses' },
    category: { en: 'Outer Archipelago Atolls', es: 'Archipiélago Exterior Remoto' },
    coordinates: { x: 88, y: 24 },
    imageVariant: 'cayos-holandeses',
    imageFallback: '/pictures/cayouholandese.jpg',
    boatTimeFromCarti: { en: '[VERIFY - Outer Archipelago]', es: '[POR VERIFICAR - Archipiélago Remoto]' },
    isVerifiedTime: false,
    description: {
      en: 'The outermost pristine coral atolls furthest from the mainland. Crystalline lagoons frequented by sailboats and catamarans.',
      es: 'El conjunto de cayos más lejano en mar abierto. Aguas cristalinas frecuentadas por veleros y catamaranes.',
    },
    highlights: {
      en: ['Remote outer Caribbean cays', 'Ideal for sailboat anchoring', 'Uninhabited coral sandbars'],
      es: ['Cayos remotos en mar abierto', 'Ideal para fondeadero de veleros', 'Bancos de arena deshabitados'],
    },
    type: 'archipelago',
  },
];

export const InteractiveTravelMap: React.FC<InteractiveTravelMapProps> = ({
  currentLang,
  onOpenPlanner,
}) => {
  const isEs = currentLang === 'es';
  const [activeDestination, setActiveDestination] = useState<MapDestination | null>(null);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'sample-route' | 'verified'>(
    'all'
  );

  // Cinematic Island Spotlight state
  const [spotlightIslandId, setSpotlightIslandId] = useState<string | null>(null);

  const sampleRoutePathRef = useRef<SVGPathElement | null>(null);
  const boatGroupRef = useRef<SVGGElement | null>(null);

  const isHoveringMarkerRef = useRef<boolean>(false);
  const isHoveringPopupRef = useRef<boolean>(false);
  const isTouchRef = useRef<boolean>(false);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  };

  const handleOpenDestination = (dest: MapDestination) => {
    clearTimers();
    setIsClosing(false);
    setActiveDestination(dest);
  };

  const scheduleClose = (delay = 200) => {
    clearTimers();
    closeTimerRef.current = setTimeout(() => {
      if (!isHoveringMarkerRef.current && !isHoveringPopupRef.current && !isTouchRef.current) {
        setIsClosing(true);
        fadeTimerRef.current = setTimeout(() => {
          setActiveDestination(null);
          setIsClosing(false);
        }, 200);
      }
    }, delay);
  };

  const handleCloseImmediately = () => {
    clearTimers();
    isHoveringMarkerRef.current = false;
    isHoveringPopupRef.current = false;
    isTouchRef.current = false;
    setIsClosing(true);
    fadeTimerRef.current = setTimeout(() => {
      setActiveDestination(null);
      setIsClosing(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  // Smooth 60fps Boat Journey & Island Spotlight Animation Loop
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Show boat only when filter includes sample route
    const showBoat = selectedFilter === 'all' || selectedFilter === 'sample-route';
    if (!showBoat) {
      setSpotlightIslandId(null);
      return;
    }

    const path = sampleRoutePathRef.current;
    if (!path) return;

    let animFrameId: number;
    let distance = 0;
    let dwellCounter = 0;
    const speed = 0.65; // Path units per frame (~60fps)

    const totalLen = path.getTotalLength();
    if (totalLen <= 0) return;

    // The 4 island stops along the sample route (in 1000x600 SVG space)
    const STOPS = [
      { id: 'carti-port', coord: { x: 280, y: 384 } },
      { id: 'perro-chico', coord: { x: 480, y: 264 } },
      { id: 'natural-pool', coord: { x: 620, y: 228 } },
      { id: 'isla-franklin', coord: { x: 550, y: 348 } },
    ];

    // Map each stop to nearest path distance
    const stopDistances = STOPS.map((stop) => {
      let minDist = 0;
      let minDelta = Infinity;
      const step = totalLen / 300;
      for (let d = 0; d <= totalLen; d += step) {
        const pt = path.getPointAtLength(d);
        const distSq = (pt.x - stop.coord.x) ** 2 + (pt.y - stop.coord.y) ** 2;
        if (distSq < minDelta) {
          minDelta = distSq;
          minDist = d;
        }
      }
      return { id: stop.id, dist: minDist };
    });

    let lastSpotlightId: string | null = null;

    const animate = () => {
      if (!boatGroupRef.current || !sampleRoutePathRef.current) return;

      // Identify if boat is near a stop
      let activeStopId: string | null = null;
      for (const s of stopDistances) {
        const diff = Math.abs(distance - s.dist);
        if (diff < 14 || (s.dist === 0 && (distance < 14 || distance > totalLen - 14))) {
          activeStopId = s.id;
          break;
        }
      }

      if (activeStopId !== lastSpotlightId) {
        lastSpotlightId = activeStopId;
        setSpotlightIslandId(activeStopId);
      }

      if (activeStopId && dwellCounter < 100) {
        // Dwell pause at island stop (~1.6 seconds)
        dwellCounter++;
      } else {
        if (dwellCounter >= 100) {
          dwellCounter = 0;
          distance += speed * 3.5; // Smooth departure boost
        } else {
          distance += speed;
        }

        if (distance >= totalLen) {
          distance = 0;
        }
      }

      // Compute point and angle heading
      const pt = path.getPointAtLength(distance);
      const ptNext = path.getPointAtLength((distance + 1) % totalLen);
      const dx = ptNext.x - pt.x;
      const dy = ptNext.y - pt.y;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

      // Natural ocean floating wave heave (tiny subtle 0.5px vertical shimmer)
      const floatY = Math.sin(distance * 0.12) * 0.5;

      // Direct DOM update for 60fps performance without React component re-renders
      boatGroupRef.current.setAttribute(
        'transform',
        `translate(${pt.x.toFixed(2)}, ${(pt.y + floatY).toFixed(2)}) rotate(${angle.toFixed(1)})`
      );

      animFrameId = requestAnimationFrame(animate);
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      setSpotlightIslandId(null);
    };
  }, [selectedFilter]);

  const filteredDestinations = DESTINATIONS.filter((dest) => {
    if (selectedFilter === 'sample-route') return dest.isSampleRouteStop;
    if (selectedFilter === 'verified') return dest.isVerifiedTime;
    return true;
  });

  return (
    <section
      id="map"
      className="py-20 md:py-28 bg-[#06121e] text-white relative overflow-hidden border-t border-[#1e3a5f]/60 scroll-mt-16 selection:bg-[#0e7490] selection:text-white"
    >
      {/* Dynamic Background Waves & Shimmer Gradients */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(14,116,144,0.12),transparent_70%)] pointer-events-none blur-3xl animate-pulse duration-10000" />
      <div className="absolute bottom-0 right-10 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(2,132,199,0.08),transparent_70%)] pointer-events-none blur-2xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="max-w-3xl mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1 rounded-full bg-[#092b3e] border border-[#0e7490]/40 text-[#38bdf8] text-[11px] font-mono uppercase tracking-[0.25em] mb-4 shadow-sm">
            <Compass className="w-3.5 h-3.5 text-[#38bdf8] animate-spin-slow" />
            <span>{isEs ? 'Mapa Interactivo de Navegación' : 'Interactive Archipelago Map'}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-light text-white tracking-tight leading-tight text-balance">
            {isEs ? 'Descubre las Islas de Guna Yala' : 'Explore the Islands of Guna Yala'}
          </h2>

          <p className="text-base sm:text-lg text-[#94a3b8] font-light mt-4 leading-relaxed max-w-2xl">
            {isEs
              ? 'Estas islas no son solo puntos en un mapa: es una travesía caribeña a través de 365 cayos de coral, cuidados con respeto por la comunidad Guna.'
              : 'These islands are not just points on a map — this is a Caribbean journey across 365 coral cays, protected with care by the Guna community.'}
          </p>
        </div>

        {/* Main 2-Column Luxury Composition */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ========================================================
              LEFT COLUMN: "THE JOURNEY" TRANSLUCENT GLASS PANEL
             ======================================================== */}
          <div className="lg:col-span-4 bg-[#091b2e]/85 backdrop-blur-md rounded-3xl border border-[#1e3a5f]/80 p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.08),transparent_70%)] pointer-events-none" />

            {/* Panel Header */}
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#d4af37] font-semibold mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                <span>{isEs ? 'Ruta y Logística' : 'Route & Logistics'}</span>
              </div>
              <h3 className="text-2xl font-display font-light text-white tracking-wide">
                {isEs ? 'EL VIAJE' : 'THE JOURNEY'}
              </h3>
              <p className="text-xs text-[#94a3b8] font-light mt-1 leading-relaxed">
                {isEs
                  ? 'Desde Ciudad de Panamá por tierra hasta Puerto Cartí, luego navegando entre cayos de coral.'
                  : 'From Panama City overland to Cartí Port, then navigating crystal water routes.'}
              </p>
            </div>

            {/* Stage Progress Box */}
            <div className="space-y-3 pt-1">
              <div className="p-3.5 bg-[#06121e]/90 rounded-2xl border border-[#1e3a5f] flex items-start gap-3 relative overflow-hidden">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#38bdf8]/40 shrink-0 mt-0.5">
                  <img
                    src="/pictures/Panama City Skyline at Sunset.png"
                    alt="Panama City Skyline at Sunset"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#38bdf8]">
                    {isEs ? 'Etapa 1: Traslado Terrestre' : 'Stage 1: Overland Transfer'}
                  </div>
                  <div className="text-xs font-semibold text-white mt-0.5">
                    {isEs ? 'Ciudad de Panamá → Puerto Cartí' : 'Panama City → Cartí Port'}
                  </div>
                  <div className="text-[11px] text-[#94a3b8] font-light mt-0.5">
                    {isEs
                      ? 'Salida desde Ciudad de Panamá en 4x4 SUV (~2.5 hrs por la montaña)'
                      : 'Departure from Panama City in 4x4 SUV (~2.5 hrs through mountains)'}
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-[#06121e]/90 rounded-2xl border border-[#1e3a5f] flex items-start gap-3 relative overflow-hidden">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#d4af37]/40 shrink-0 mt-0.5">
                  <img
                    src="/pictures/carti-port.jpg"
                    alt="Cartí Port (Puerto Cartí)"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#d4af37]">
                    {isEs ? 'Etapa 2: Navegación Marítima' : 'Stage 2: Boat Navigation'}
                  </div>
                  <div className="text-xs font-semibold text-[#f8fafc] mt-0.5">
                    {isEs ? 'Puerto Cartí → Islas de San Blas' : 'Cartí Port → San Blas Islands'}
                  </div>
                  <div className="text-[11px] text-[#94a3b8] font-light mt-0.5">
                    {isEs
                      ? 'Embarque en Puerto Cartí en lancha rápida con capitán guna local'
                      : 'Boarding at Cartí Port on Guna motorboat with local captain'}
                  </div>
                </div>
              </div>
            </div>

            {/* Approximate Boat Times List */}
            <div className="space-y-3 pt-2 border-t border-[#1e3a5f]/80">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono uppercase tracking-[0.18em] text-[#d4af37] font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{isEs ? 'TIEMPOS APROXIMADOS DE NAVEGACIÓN' : 'APPROXIMATE BOAT TIMES'}</span>
                </h4>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-[#06121e]/80 p-1 rounded-xl border border-[#1e3a5f] text-[10px] font-mono">
                <button
                  onClick={() => setSelectedFilter('all')}
                  className={`flex-1 py-1 px-2 rounded-lg transition-all text-center ${
                    selectedFilter === 'all'
                      ? 'bg-[#0e7490] text-white font-bold shadow-xs'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  {isEs ? 'Todas' : 'All'}
                </button>
                <button
                  onClick={() => setSelectedFilter('sample-route')}
                  className={`flex-1 py-1 px-2 rounded-lg transition-all text-center ${
                    selectedFilter === 'sample-route'
                      ? 'bg-[#d4af37] text-[#06121e] font-bold shadow-xs'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  {isEs ? 'Ejemplo Día' : 'Sample Route'}
                </button>
                <button
                  onClick={() => setSelectedFilter('verified')}
                  className={`flex-1 py-1 px-2 rounded-lg transition-all text-center ${
                    selectedFilter === 'verified'
                      ? 'bg-emerald-700 text-white font-bold shadow-xs'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  {isEs ? 'Verificados' : 'Verified'}
                </button>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 text-xs">
                {filteredDestinations
                  .filter((d) => d.type !== 'departure')
                  .map((dest) => {
                    const isActive = activeDestination?.id === dest.id;
                    const isSpotlighted = spotlightIslandId === dest.id;
                    return (
                      <button
                        key={dest.id}
                        onClick={() => {
                          isTouchRef.current = false;
                          handleOpenDestination(dest);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 group ${
                          isActive
                            ? 'bg-[#0e7490]/25 border-[#38bdf8] text-white shadow-md'
                            : isSpotlighted
                            ? 'bg-[#c8ac75]/20 border-[#c8ac75] text-white shadow-md'
                            : 'bg-[#06121e]/60 border-[#1e3a5f]/60 text-[#cbd5e1] hover:bg-[#0e7490]/15 hover:border-[#0e7490]/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isSpotlighted
                                ? 'bg-[#c8ac75] animate-ping'
                                : dest.isVerifiedTime
                                ? 'bg-emerald-400'
                                : 'bg-amber-400'
                            }`}
                          />
                          <span className="font-medium truncate text-xs">
                            {dest.name[currentLang]}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 text-[11px] font-mono">
                          <span
                            className={
                              isSpotlighted
                                ? 'text-[#c8ac75] font-bold'
                                : dest.isVerifiedTime
                                ? 'text-[#38bdf8] font-semibold'
                                : 'text-[#f59e0b] italic font-mono'
                            }
                          >
                            {dest.boatTimeFromCarti[currentLang]}
                          </span>
                          <ChevronRight
                            className={`w-3.5 h-3.5 text-[#64748b] group-hover:text-white transition-transform ${
                              isActive || isSpotlighted ? 'translate-x-0.5 text-[#38bdf8]' : ''
                            }`}
                          />
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Sample Day Trip Route Explanatory Panel */}
            <div className="p-4 bg-[#06121e]/90 rounded-2xl border border-[#d4af37]/40 space-y-2">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#d4af37] font-semibold flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5" />
                <span>{isEs ? 'RUTA ILUSTRATIVA DE EJEMPLO' : 'SAMPLE DAY-TRIP ROUTE'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#cbd5e1] overflow-x-auto py-1">
                <span
                  className={`px-2 py-0.5 rounded-md border text-[10px] transition-all shrink-0 ${
                    spotlightIslandId === 'carti-port'
                      ? 'bg-[#c8ac75] text-[#06121e] font-bold border-[#c8ac75]'
                      : 'bg-[#d4af37]/20 text-[#d4af37] border-[#d4af37]/30'
                  }`}
                >
                  Cartí Port
                </span>
                <span>→</span>
                <span
                  className={`px-2 py-0.5 rounded-md border text-[10px] transition-all shrink-0 ${
                    spotlightIslandId === 'perro-chico'
                      ? 'bg-[#c8ac75] text-[#06121e] font-bold border-[#c8ac75]'
                      : 'bg-[#0e7490]/30 text-[#38bdf8] border-[#0e7490]/40'
                  }`}
                >
                  Perro Chico
                </span>
                <span>→</span>
                <span
                  className={`px-2 py-0.5 rounded-md border text-[10px] transition-all shrink-0 ${
                    spotlightIslandId === 'natural-pool'
                      ? 'bg-[#c8ac75] text-[#06121e] font-bold border-[#c8ac75]'
                      : 'bg-[#0e7490]/30 text-[#38bdf8] border-[#0e7490]/40'
                  }`}
                >
                  Piscina Natural
                </span>
                <span>→</span>
                <span
                  className={`px-2 py-0.5 rounded-md border text-[10px] transition-all shrink-0 ${
                    spotlightIslandId === 'isla-franklin'
                      ? 'bg-[#c8ac75] text-[#06121e] font-bold border-[#c8ac75]'
                      : 'bg-[#0e7490]/30 text-[#38bdf8] border-[#0e7490]/40'
                  }`}
                >
                  Isla Franklin
                </span>
              </div>
              <p className="text-[11px] text-[#94a3b8] font-light leading-relaxed pt-1">
                {isEs
                  ? 'Ejemplo ilustrativo de recorrido diario. Las rutas e islas a visitar varían según la experiencia seleccionada, el clima, las condiciones del mar y la logística local.'
                  : 'Sample sequence demonstrating island hopping. Routes and island stops vary according to the selected experience, weather, sea conditions and local logistics.'}
              </p>
            </div>

            {/* Required Disclaimer */}
            <p className="text-[10px] text-[#64748b] font-light italic text-center pt-2 leading-relaxed border-t border-[#1e3a5f]/60">
              {isEs
                ? 'Los tiempos de navegación son aproximados y pueden variar según el clima, el estado del mar y la logística local.'
                : 'Boat times are approximate and may vary depending on weather, sea conditions and local logistics.'}
            </p>
          </div>

          {/* ========================================================
              RIGHT COLUMN: IMMERSIVE PANORAMIC INTERACTIVE MAP CANVAS
             ======================================================== */}
          <div className="lg:col-span-8 bg-[#071626] rounded-3xl border border-[#1e3a5f] shadow-2xl relative overflow-hidden flex flex-col">
            {/* Map Action / Controls Bar */}
            <div className="p-4 bg-[#091b2e]/90 border-b border-[#1e3a5f] flex flex-wrap items-center justify-between gap-3 text-xs z-20">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-mono text-[11px] text-[#38bdf8] uppercase tracking-wider">
                  {isEs ? 'Mapa Activo: Guna Yala / San Blas' : 'Active Region: Guna Yala / San Blas'}
                </span>
              </div>

              {onOpenPlanner && (
                <button
                  onClick={() => onOpenPlanner()}
                  className="py-1.5 px-3.5 rounded-xl bg-[#0e7490] hover:bg-[#0284c7] text-white font-mono text-[11px] uppercase tracking-wider font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isEs ? 'Planear Mi Ruta' : 'Plan My Route'}</span>
                </button>
              )}
            </div>

            {/* The SVG & Overlays Canvas */}
            <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] md:aspect-[16/9] min-h-[420px] sm:min-h-[500px] bg-[#051424] overflow-hidden select-none">
              {/* Ocean Texture Grid & Depth Gradient */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 1000 600"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0a2540" />
                    <stop offset="40%" stopColor="#071b30" />
                    <stop offset="100%" stopColor="#040f20" />
                  </linearGradient>

                  <linearGradient id="routeGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="50%" stopColor="#d4af37" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>

                  <pattern id="seaGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path
                      d="M 40 0 L 0 0 0 40"
                      fill="none"
                      stroke="#0e7490"
                      strokeWidth="0.5"
                      strokeOpacity="0.12"
                    />
                  </pattern>
                </defs>

                {/* Ocean Background */}
                <rect width="100%" height="100%" fill="url(#oceanGrad)" />
                <rect width="100%" height="100%" fill="url(#seaGrid)" />

                {/* Mainland Panama Coastline (Serranía del Darién Mountains) */}
                <path
                  d="M 0,380 Q 80,360 160,340 T 280,310 Q 360,290 420,295 T 520,320 Q 600,340 700,370 T 800,420 L 800,600 L 0,600 Z"
                  fill="#0b2438"
                  stroke="#1e3a5f"
                  strokeWidth="2"
                  className="opacity-90"
                />
                <path
                  d="M 0,420 Q 100,400 180,380 T 300,350 Q 380,330 450,340 T 550,370 L 800,460 L 800,600 L 0,600 Z"
                  fill="#081b2c"
                  className="opacity-70"
                />

                {/* Cartí Bay Indentation */}
                <path
                  d="M 230,325 Q 260,340 280,320 T 310,310"
                  fill="none"
                  stroke="#0e7490"
                  strokeWidth="3"
                  strokeDasharray="3,3"
                  className="opacity-50"
                />

                {/* Overland 4x4 Road Route (Panama City -> Cartí Port) */}
                <path
                  d="M 120,468 Q 180,410 280,384"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeDasharray="4,4"
                  className="opacity-75"
                />

                {/* Sample Day Trip Boat Route (Cartí -> Perro Chico -> Natural Pool -> Franklin -> Cartí) */}
                {(selectedFilter === 'all' || selectedFilter === 'sample-route') && (
                  <path
                    ref={sampleRoutePathRef}
                    d="M 280,384 Q 380,300 480,264 Q 550,240 620,228 Q 585,290 550,348 Q 415,360 280,384"
                    fill="none"
                    stroke="url(#routeGold)"
                    strokeWidth="3"
                    strokeDasharray="6,6"
                    className="animate-route-flow opacity-90"
                  />
                )}

                {/* Outer Archipelago Route Lines */}
                <path
                  d="M 620,228 Q 690,210 760,216 T 880,144"
                  fill="none"
                  stroke="#0e7490"
                  strokeWidth="1.5"
                  strokeDasharray="3,3"
                  className="opacity-40"
                />

                {/* CINEMATIC ANIMATED LUXURY CATAMARAN & DUAL-HULL WAKE */}
                {(selectedFilter === 'all' || selectedFilter === 'sample-route') && (
                  <g
                    ref={boatGroupRef}
                    className="transition-opacity duration-500 pointer-events-none"
                  >
                    {/* DUAL-HULL WATER WAKE (Foam Spray behind Port & Starboard Hulls) */}
                    <g className="opacity-85">
                      {/* Port Hull Wake (Top) */}
                      <path
                        d="M -22,-12 L -44,-22 M -22,-12 L -44,-6"
                        stroke="#38bdf8"
                        strokeWidth="2"
                        strokeOpacity="0.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M -20,-12 L -36,-17 M -20,-12 L -36,-8"
                        stroke="#ffffff"
                        strokeWidth="1.4"
                        strokeOpacity="0.75"
                        strokeLinecap="round"
                      />
                      <circle cx="-30" cy="-12" r="2" fill="#38bdf8" fillOpacity="0.5" />

                      {/* Starboard Hull Wake (Bottom) */}
                      <path
                        d="M -22,12 L -44,6 M -22,12 L -44,22"
                        stroke="#38bdf8"
                        strokeWidth="2"
                        strokeOpacity="0.5"
                        strokeLinecap="round"
                      />
                      <path
                        d="M -20,12 L -36,8 M -20,12 L -36,17"
                        stroke="#ffffff"
                        strokeWidth="1.4"
                        strokeOpacity="0.75"
                        strokeLinecap="round"
                      />
                      <circle cx="-30" cy="12" r="2" fill="#38bdf8" fillOpacity="0.5" />

                      {/* Center Transom Water Churn & Foam Bubble Trail */}
                      <ellipse cx="-28" cy="0" rx="10" ry="5" fill="#38bdf8" fillOpacity="0.3" />
                      <ellipse cx="-34" cy="0" rx="7" ry="3.5" fill="#ffffff" fillOpacity="0.4" />
                      <circle cx="-42" cy="0" r="2" fill="#ffffff" fillOpacity="0.45" />
                      <circle cx="-50" cy="0" r="1.2" fill="#38bdf8" fillOpacity="0.35" />
                    </g>

                    {/* TOP-DOWN LUXURY CATAMARAN ILLUSTRATION */}
                    <g transform="scale(1.22)">
                      {/* Soft Vessel Drop Shadow */}
                      <g fill="#020617" fillOpacity="0.38" transform="translate(2, 3)">
                        {/* Port Hull Shadow */}
                        <path d="M 26,-11 Q 12,-16 -20,-14 L -20,-8 Q 12,-6 26,-11 Z" />
                        {/* Starboard Hull Shadow */}
                        <path d="M 26,11 Q 12,6 -20,8 L -20,14 Q 12,16 26,11 Z" />
                        {/* Bridge Deck Shadow */}
                        <rect x="-15" y="-10" width="30" height="20" rx="3" />
                      </g>

                      {/* PORT HULL (Top) - Sleek White Composite */}
                      <path
                        d="M 26,-11 Q 12,-16 -20,-14 L -20,-8 Q 12,-6 26,-11 Z"
                        fill="#ffffff"
                        stroke="#cbd5e1"
                        strokeWidth="0.8"
                      />
                      {/* Port Hull Waterline / Deep Ocean Stripe */}
                      <path
                        d="M 23,-11 Q 12,-14 -18,-13"
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="0.8"
                      />

                      {/* STARBOARD HULL (Bottom) - Sleek White Composite */}
                      <path
                        d="M 26,11 Q 12,6 -20,8 L -20,14 Q 12,16 26,11 Z"
                        fill="#ffffff"
                        stroke="#cbd5e1"
                        strokeWidth="0.8"
                      />
                      {/* Starboard Hull Waterline / Deep Ocean Stripe */}
                      <path
                        d="M 23,11 Q 12,6 -18,8"
                        fill="none"
                        stroke="#0284c7"
                        strokeWidth="0.8"
                      />

                      {/* TRAMPOLINE NETTING (Forward White/Ivory Mesh between Hulls) */}
                      <rect
                        x="9"
                        y="-8"
                        width="15"
                        height="16"
                        rx="1"
                        fill="#f8fafc"
                        stroke="#cbd5e1"
                        strokeWidth="0.6"
                      />
                      {/* Trampoline Crosshatch Mesh Pattern */}
                      <path
                        d="M 13,-8 L 13,8 M 17,-8 L 17,8 M 21,-8 L 21,8 M 9,-4 L 24,-4 M 9,0 L 24,0 M 9,4 L 24,4"
                        stroke="#94a3b8"
                        strokeWidth="0.4"
                        strokeDasharray="1,1"
                      />

                      {/* WARM TEAK WOODEN DECK (Main Deck Floor) */}
                      <rect
                        x="-15"
                        y="-9"
                        width="24"
                        height="18"
                        rx="2"
                        fill="#d97706"
                        stroke="#b45309"
                        strokeWidth="0.6"
                      />
                      {/* Teak Decking Planks Effect */}
                      <path
                        d="M -15,-6 L 9,-6 M -15,-3 L 9,-3 M -15,0 L 9,0 M -15,3 L 9,3 M -15,6 L 9,6"
                        stroke="#b45309"
                        strokeWidth="0.3"
                        strokeOpacity="0.75"
                      />

                      {/* MAIN SALON / CABIN TOP STRUCTURE */}
                      <path
                        d="M 7,-7 L 9,0 L 7,7 L -9,8 L -11,0 L -9,-8 Z"
                        fill="#ffffff"
                        stroke="#94a3b8"
                        strokeWidth="0.7"
                      />

                      {/* PANORAMIC CABIN TINTED GLASS WINDOWS */}
                      <path
                        d="M 6,-6 L 8,0 L 6,6 L -3,6 L -4,0 L -3,-6 Z"
                        fill="#0f172a"
                        stroke="#38bdf8"
                        strokeWidth="0.6"
                        fillOpacity="0.9"
                      />
                      {/* Glass Reflection Sheen */}
                      <path
                        d="M 4,-5 L 6,0 L 4,5"
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="0.9"
                        strokeOpacity="0.8"
                      />

                      {/* CHAMPAGNE GOLD ACCENT TRIM LINES */}
                      <path
                        d="M 8,-7 L -10,-8 M 8,7 L -10,8"
                        stroke="#c8ac75"
                        strokeWidth="0.9"
                        strokeLinecap="round"
                      />

                      {/* AFT COCKPIT & HARDTOP SHADE */}
                      <rect
                        x="-16"
                        y="-8"
                        width="7"
                        height="16"
                        rx="1"
                        fill="#f8fafc"
                        stroke="#cbd5e1"
                        strokeWidth="0.6"
                      />

                      {/* DUAL HELM WHEELS / CAPTAIN STATIONS */}
                      <circle cx="-12" cy="-5" r="1.3" fill="#0f172a" stroke="#c8ac75" strokeWidth="0.5" />
                      <circle cx="-12" cy="5" r="1.3" fill="#0f172a" stroke="#c8ac75" strokeWidth="0.5" />

                      {/* SUNLIGHT REFLECTION SHEEN ON DECK */}
                      <path
                        d="M 22,-10 L 3,0 L -13,8"
                        stroke="#ffffff"
                        strokeWidth="1.3"
                        strokeOpacity="0.65"
                        strokeLinecap="round"
                      />
                    </g>
                  </g>
                )}
              </svg>

              {/* Elegant Nautical Compass Rose */}
              <div className="absolute top-4 right-4 z-10 pointer-events-none opacity-80 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-[#06121e]/80 border border-[#d4af37]/40 flex items-center justify-center p-2 shadow-lg backdrop-blur-xs">
                  <Compass className="w-full h-full text-[#d4af37] animate-spin-slow" />
                </div>
                <span className="text-[9px] font-mono tracking-widest text-[#d4af37] uppercase mt-1">
                  N · GUNA YALA
                </span>
              </div>

              {/* Coordinates & Scale Indicator */}
              <div className="absolute bottom-4 left-4 z-10 pointer-events-none text-[10px] font-mono text-[#64748b] bg-[#06121e]/80 border border-[#1e3a5f] px-3 py-1.5 rounded-xl backdrop-blur-xs flex items-center gap-3">
                <div>
                  <span className="text-[#38bdf8] font-bold">N 9°30' W 78°50'</span>
                  <span className="block text-[9px] text-[#94a3b8]">Comarca Guna Yala</span>
                </div>
                <div className="h-4 w-px bg-[#1e3a5f]" />
                <div className="flex items-center gap-1">
                  <div className="w-8 h-1 bg-[#d4af37] rounded-full" />
                  <span className="text-[9px] text-[#d4af37]">~10 km</span>
                </div>
              </div>

              {/* Destination Markers Overlays */}
              {DESTINATIONS.map((dest) => {
                const isActive = activeDestination?.id === dest.id;
                const isSpotlighted = spotlightIslandId === dest.id && !activeDestination;
                const isDeparture = dest.type === 'departure';

                return (
                  <div
                    key={dest.id}
                    style={{ left: `${dest.coordinates.x}%`, top: `${dest.coordinates.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group"
                  >
                    {/* Interactive Clickable Area */}
                    <button
                      onClick={() => handleOpenDestination(dest)}
                      onMouseEnter={(e) => {
                        if ((e.nativeEvent as PointerEvent).pointerType === 'touch') {
                          isTouchRef.current = true;
                        } else {
                          isTouchRef.current = false;
                        }
                        isHoveringMarkerRef.current = true;
                        handleOpenDestination(dest);
                      }}
                      onMouseLeave={() => {
                        if (isTouchRef.current) return;
                        isHoveringMarkerRef.current = false;
                        scheduleClose(200);
                      }}
                      onTouchStart={() => {
                        isTouchRef.current = true;
                      }}
                      className="relative focus:outline-none flex flex-col items-center"
                      aria-label={`View ${dest.name[currentLang]}`}
                    >
                      {/* Pulsing Outer Halo */}
                      <span
                        className={`absolute inset-0 rounded-full transition-all duration-300 ${
                          isActive
                            ? 'bg-[#d4af37]/40 animate-ping ring-4 ring-[#d4af37]/50 scale-125'
                            : isSpotlighted
                            ? 'bg-[#c8ac75]/30 animate-pulse ring-2 ring-[#c8ac75]/60 scale-110'
                            : 'bg-[#0e7490]/20 group-hover:bg-[#0e7490]/40'
                        }`}
                      />

                      {/* Photo Circular Marker */}
                      <div
                        className={`relative rounded-full overflow-hidden transition-all duration-500 shadow-xl flex items-center justify-center ${
                          isActive
                            ? 'w-12 h-12 border-2 border-[#d4af37] scale-110 shadow-[#d4af37]/30 ring-2 ring-white z-30'
                            : isSpotlighted
                            ? 'w-11 h-11 border-2 border-[#c8ac75] scale-108 shadow-[0_0_15px_rgba(200,172,117,0.5)] ring-2 ring-[#c8ac75]/50 z-25'
                            : isDeparture
                            ? 'w-9 h-9 border border-[#38bdf8] bg-[#06121e]'
                            : 'w-10 h-10 border border-white/60 hover:scale-105'
                        }`}
                      >
                        <VisualAsset
                          variant={dest.imageVariant}
                          alt={dest.name[currentLang]}
                          className="w-full h-full object-cover"
                        />

                        {/* Order badge for sample route */}
                        {dest.isSampleRouteStop && (
                          <div
                            className={`absolute top-0 right-0 ${
                              isSpotlighted ? 'bg-[#c8ac75] text-[#06121e]' : 'bg-[#d4af37] text-[#06121e]'
                            } text-[9px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center border border-[#06121e]`}
                          >
                            {dest.sampleRouteOrder}
                          </div>
                        )}
                      </div>

                      {/* Destination Label Tag */}
                      <div
                        className={`mt-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono whitespace-nowrap transition-all shadow-md flex items-center gap-1 ${
                          isActive
                            ? 'bg-[#d4af37] text-[#06121e] font-bold tracking-wider scale-105'
                            : isSpotlighted
                            ? 'bg-[#c8ac75] text-[#06121e] font-bold tracking-wide scale-105 shadow-[0_0_10px_rgba(200,172,117,0.4)]'
                            : 'bg-[#06121e]/85 text-white border border-[#1e3a5f] group-hover:bg-[#0e7490] group-hover:text-white'
                        }`}
                      >
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        <span>{dest.name[currentLang]}</span>
                      </div>
                    </button>
                  </div>
                );
              })}

              {/* Floating Location Detail Card (Active Selection Popover) */}
              {activeDestination && (
                <div
                  onMouseEnter={(e) => {
                    if ((e.nativeEvent as PointerEvent).pointerType === 'touch') {
                      isTouchRef.current = true;
                    } else {
                      isTouchRef.current = false;
                    }
                    isHoveringPopupRef.current = true;
                    clearTimers();
                    setIsClosing(false);
                  }}
                  onMouseLeave={() => {
                    if (isTouchRef.current) return;
                    isHoveringPopupRef.current = false;
                    scheduleClose(200);
                  }}
                  onTouchStart={() => {
                    isTouchRef.current = true;
                  }}
                  className={`absolute top-4 left-4 right-4 sm:right-auto sm:max-w-xs z-30 bg-[#06121e]/95 backdrop-blur-xl border border-[#d4af37]/60 rounded-2xl p-4 shadow-2xl transition-all duration-200 ${
                    isClosing
                      ? 'opacity-0 scale-95 pointer-events-none'
                      : 'opacity-100 scale-100 animate-in fade-in zoom-in-95'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#d4af37] font-semibold block">
                        {activeDestination.category[currentLang]}
                      </span>
                      <h4 className="text-base font-display font-medium text-white">
                        {activeDestination.name[currentLang]}
                      </h4>
                    </div>

                    <button
                      onClick={handleCloseImmediately}
                      className="p-1 rounded-full text-[#94a3b8] hover:text-white hover:bg-white/10 transition-colors"
                      aria-label="Close details"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Thumbnail Image */}
                  <div className="relative aspect-[16/9] rounded-xl overflow-hidden border border-[#1e3a5f] my-2">
                    <VisualAsset
                      variant={activeDestination.imageVariant}
                      alt={activeDestination.name[currentLang]}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-2 left-2 bg-[#06121e]/85 text-[#38bdf8] text-[10px] font-mono px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{activeDestination.boatTimeFromCarti[currentLang]}</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#cbd5e1] font-light leading-relaxed my-2">
                    {activeDestination.description[currentLang]}
                  </p>

                  {/* Highlights Bullet Tags */}
                  <div className="space-y-1 my-2">
                    {activeDestination.highlights[currentLang].map((hl, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-[10px] text-[#94a3b8]">
                        <CheckCircle2 className="w-3 h-3 text-[#d4af37] shrink-0" />
                        <span className="truncate">{hl}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Action */}
                  {onOpenPlanner && (
                    <button
                      onClick={() => onOpenPlanner()}
                      className="w-full mt-2 py-2 px-3 rounded-xl bg-[#d4af37] hover:bg-[#f59e0b] text-[#06121e] font-mono text-[11px] uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <span>{isEs ? 'Planear Visita a esta Isla' : 'Plan Visit to this Island'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Footer Note */}
            <div className="p-4 bg-[#091b2e]/90 border-t border-[#1e3a5f] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#94a3b8] font-light">
              <div className="flex items-center gap-2">
                <Anchor className="w-4 h-4 text-[#38bdf8]" />
                <span>
                  {isEs
                    ? '365 islas bajo la jurisdicción autónoma de la Comarca Guna Yala.'
                    : '365 islands under autonomous Guna Yala Comarca jurisdiction.'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#d4af37]">
                {isEs ? 'Rutas coordinadas con capitanes locales' : 'Coordinated local captain routes'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
