import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../types';
import { Sparkles, Maximize2, X, ChevronLeft, ChevronRight, Compass, Pause, Play } from 'lucide-react';

// Local photograph imports
import catamaranImg from '../pictures/catamaran.jpg';
import dayTripImg from '../pictures/10 Boat Day Tour.jpg';
import cayosHolandesesImg from '../pictures/cayouholandese.jpg';
import molaImg from '../pictures/Gunamola.jpg';
import piscinaNatImg from '../pictures/piscinanat.jpg';
import perroChicoImg from '../pictures/perrochico.jpg';
import franklinImg from '../pictures/04 Franklin.jpg';
import veleroImg from '../pictures/09 Velero .jpg';
import communityImg from '../pictures/04 Learn about the Guna Community in San Blas.jpg';

interface FloatingGalleryProps {
  currentLang: Language;
  onOpenPlanner?: (category?: string) => void;
}

export interface GalleryItem {
  id: string;
  title: {
    en: string;
    es: string;
  };
  location: {
    en: string;
    es: string;
  };
  category: {
    en: string;
    es: string;
  };
  description: {
    en: string;
    es: string;
  };
  imageSrc: string;
  fallbackSrc: string;
  aspectRatio: string; // Tailwind aspect class
  initialRotation: number; // Subtle tilt offset (-3deg to +3deg)
  depth: number; // Mouse depth factor
  startAngle: number; // Starting orbital phase angle in radians
  orbitSpeed: number; // Orbital speed multiplier (e.g. 0.92 to 1.08)
  orbitRadiusX: {
    desktop: number; // Semi-major axis in pixels (horizontal)
    mobile: number;
  };
  orbitRadiusY: {
    desktop: number; // Semi-minor axis in pixels (vertical)
    mobile: number;
  };
  plannerCategory?: string;
}

const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'cayos-holandeses',
    title: {
      en: 'Cayos Holandeses Outer Atolls',
      es: 'Atolones Exteriores Cayos Holandeses',
    },
    location: {
      en: 'Outer Barrier Reef, San Blas',
      es: 'Barrera Coralina Exterior, San Blas',
    },
    category: {
      en: 'Remote Atoll',
      es: 'Atolón Remoto',
    },
    description: {
      en: 'Uninhabited outer islands featuring crystal turquoise lagoons, untouched coral reefs, and total seclusion from daily boat tours.',
      es: 'Islas exteriores deshabitadas con lagunas turquesa cristalinas, arrecifes vírgenes y aislamiento total de las excursiones diarias.',
    },
    imageSrc: cayosHolandesesImg,
    fallbackSrc: '/pictures/cayouholandese.jpg',
    aspectRatio: 'aspect-[4/3]',
    initialRotation: -2,
    depth: 0.9,
    startAngle: 0.0, // 0 degrees (Right)
    orbitSpeed: 0.98,
    orbitRadiusX: { desktop: 360, mobile: 140 },
    orbitRadiusY: { desktop: 230, mobile: 170 },
    plannerCategory: 'sailing',
  },
  {
    id: 'catamaran-charter',
    title: {
      en: 'Private Catamaran Sanctuary',
      es: 'Santuario en Catamarán Privado',
    },
    location: {
      en: 'Coco Bandero Cays',
      es: 'Cayos Coco Bandero',
    },
    category: {
      en: 'Luxury Charter',
      es: 'Chárter de Lujo',
    },
    description: {
      en: 'Ultimate comfort and stability with chef-prepared meals, private ensuite cabins, and direct island anchorage.',
      es: 'Máximo confort y estabilidad con comidas preparadas por chef, camarotes privados y fondeo directo en islas.',
    },
    imageSrc: catamaranImg,
    fallbackSrc: '/pictures/catamaran.jpg',
    aspectRatio: 'aspect-[16/10]',
    initialRotation: 2,
    depth: 1.1,
    startAngle: 1.57, // 90 degrees (Bottom)
    orbitSpeed: 1.02,
    orbitRadiusX: { desktop: 370, mobile: 145 },
    orbitRadiusY: { desktop: 240, mobile: 180 },
    plannerCategory: 'catamaran',
  },
  {
    id: 'perro-chico',
    title: {
      en: 'Isla Perro Chico Sunken Shipwreck',
      es: 'Isla Perro Chico y Barco Hundido',
    },
    location: {
      en: 'Limon Cays Archipelago',
      es: 'Archipiélago Cayos Limones',
    },
    category: {
      en: 'Snorkeling Haven',
      es: 'Paraíso de Snorkel',
    },
    description: {
      en: 'World-famous coral-encrusted shipwreck resting just meters from the shore, teeming with vibrant tropical marine life.',
      es: 'Famoso barco hundido cubierto de coral a pocos metros de la orilla, repleto de vida marina tropical.',
    },
    imageSrc: perroChicoImg,
    fallbackSrc: '/pictures/perrochico.jpg',
    aspectRatio: 'aspect-[3/4]',
    initialRotation: 1,
    depth: 0.85,
    startAngle: 3.14, // 180 degrees (Left)
    orbitSpeed: 0.96,
    orbitRadiusX: { desktop: 350, mobile: 135 },
    orbitRadiusY: { desktop: 220, mobile: 165 },
    plannerCategory: 'day-trip',
  },
  {
    id: 'piscina-natural',
    title: {
      en: 'Natural Pool Sunken Sandbar',
      es: 'Piscina Natural en Mar Abierto',
    },
    location: {
      en: 'Central San Blas Waters',
      es: 'Aguas Centrales de San Blas',
    },
    category: {
      en: 'Natural Wonder',
      es: 'Maravilla Natural',
    },
    description: {
      en: 'Waist-deep crystal water sandbar situated in the open sea, surrounded by giant cushion starfish and calm clear ripples.',
      es: 'Banco de arena con agua cristalina a la cintura en medio del mar, rodeado de estrellas de mar gigantes y calma absoluta.',
    },
    imageSrc: piscinaNatImg,
    fallbackSrc: '/pictures/piscinanat.jpg',
    aspectRatio: 'aspect-[16/9]',
    initialRotation: -1,
    depth: 1.0,
    startAngle: 4.71, // 270 degrees (Top)
    orbitSpeed: 1.04,
    orbitRadiusX: { desktop: 380, mobile: 150 },
    orbitRadiusY: { desktop: 250, mobile: 185 },
    plannerCategory: 'day-trip',
  },
  {
    id: 'guna-mola-art',
    title: {
      en: 'Hand-Sewn Guna Mola Artistry',
      es: 'Arte Textil Mola Hecho a Mano',
    },
    location: {
      en: 'Autonomous Comarca Communities',
      es: 'Comunidad Autónoma Guna',
    },
    category: {
      en: 'Living Culture',
      es: 'Cultura Viva',
    },
    description: {
      en: 'Intricate multi-layered textile artwork handcrafted by Guna female artisans depicting ancestral cosmology and island nature.',
      es: 'Obra textil de múltiples capas confeccionada por artesanas guna que representa la cosmología ancestral y la naturaleza.',
    },
    imageSrc: molaImg,
    fallbackSrc: '/pictures/Gunamola.jpg',
    aspectRatio: 'aspect-[1/1]',
    initialRotation: -2,
    depth: 1.15,
    startAngle: 0.7, // ~40 degrees (Outer top-right)
    orbitSpeed: 0.97,
    orbitRadiusX: { desktop: 520, mobile: 170 },
    orbitRadiusY: { desktop: 320, mobile: 240 },
    plannerCategory: 'overnight',
  },
  {
    id: 'sailing-yacht',
    title: {
      en: 'Monohull Sailing Expedition',
      es: 'Expedición en Velero Monocasco',
    },
    location: {
      en: 'Cayos Chichime & Wissidup',
      es: 'Cayos Chichime y Wissidup',
    },
    category: {
      en: 'Wind-Driven Travel',
      es: 'Navegación a Vela',
    },
    description: {
      en: 'Authentic ocean sailing experience connecting island to island under the gentle trade winds of the Caribbean.',
      es: 'Experiencia auténtica de navegación a vela conectando isla por isla bajo los suaves vientos alisios del Caribe.',
    },
    imageSrc: veleroImg,
    fallbackSrc: '/pictures/09 Velero .jpg',
    aspectRatio: 'aspect-[4/3]',
    initialRotation: -2,
    depth: 0.75,
    startAngle: 1.95, // ~112 degrees (Outer bottom-right)
    orbitSpeed: 1.01,
    orbitRadiusX: { desktop: 540, mobile: 175 },
    orbitRadiusY: { desktop: 330, mobile: 250 },
    plannerCategory: 'sailing',
  },
  {
    id: 'isla-franklin',
    title: {
      en: 'Traditional Island Beach Hut Stay',
      es: 'Hospedaje Tradicional en Cabaña',
    },
    location: {
      en: 'Isla Franklin (Gardi Sugdub Cluster)',
      es: 'Isla Franklin (Sector Gardi)',
    },
    category: {
      en: 'Overnight Escape',
      es: 'Estadía Nocturna',
    },
    description: {
      en: 'Rustic beachfront cabanas constructed from natural bamboo and palm thatch, directly over fine white sand.',
      es: 'Cabañas rústicas frente al mar construidas con bambú y penca de palma, directamente sobre la arena blanca.',
    },
    imageSrc: franklinImg,
    fallbackSrc: '/pictures/04 Franklin.jpg',
    aspectRatio: 'aspect-[3/4]',
    initialRotation: 2,
    depth: 0.95,
    startAngle: 3.2, // ~183 degrees (Outer bottom-left)
    orbitSpeed: 0.99,
    orbitRadiusX: { desktop: 510, mobile: 165 },
    orbitRadiusY: { desktop: 310, mobile: 235 },
    plannerCategory: 'overnight',
  },
  {
    id: 'guna-community-village',
    title: {
      en: 'Guna Indigenous Village Stewardship',
      es: 'Comunidad e Identidad Guna',
    },
    location: {
      en: 'Carti Sugdub & Nalunega Villages',
      es: 'Poblados Carti Sugdub y Nalunega',
    },
    category: {
      en: 'Cultural Immersion',
      es: 'Inmersión Cultural',
    },
    description: {
      en: 'Respectful engagement with local Guna leaders, witnessing ancestral governance, oral storytelling, and island life.',
      es: 'Encuentro respetuoso con líderes guna, conociendo la gobernanza ancestral, la tradición oral y la vida en la comarca.',
    },
    imageSrc: communityImg,
    fallbackSrc: '/pictures/04 Learn about the Guna Community in San Blas.jpg',
    aspectRatio: 'aspect-[16/10]',
    initialRotation: 1,
    depth: 0.65,
    startAngle: 4.45, // ~255 degrees (Outer top-left)
    orbitSpeed: 1.03,
    orbitRadiusX: { desktop: 530, mobile: 180 },
    orbitRadiusY: { desktop: 330, mobile: 255 },
    plannerCategory: 'multi-day',
  },
  {
    id: 'island-hopping-boat',
    title: {
      en: 'San Blas Custom Boat Explorer',
      es: 'Exploración Diaria en Lancha Rápida',
    },
    location: {
      en: 'Narguana & Corazon de Jesus Sector',
      es: 'Sector Narguana y Corazón de Jesús',
    },
    category: {
      en: 'Day Excursion',
      es: 'Excursión de Día',
    },
    description: {
      en: 'Fast covered water transportation transferring guests smoothly from Carti Port across multiple island stops.',
      es: 'Transporte marítimo rápido con toldo protector para traslados fluidos entre múltiples islas desde Puerto Cartí.',
    },
    imageSrc: dayTripImg,
    fallbackSrc: '/pictures/10 Boat Day Tour.jpg',
    aspectRatio: 'aspect-[4/3]',
    initialRotation: -1,
    depth: 1.1,
    startAngle: 5.7, // ~326 degrees (Outer mid-top-right)
    orbitSpeed: 0.95,
    orbitRadiusX: { desktop: 500, mobile: 160 },
    orbitRadiusY: { desktop: 310, mobile: 230 },
    plannerCategory: 'day-trip',
  },
];

export const FloatingGallery: React.FC<FloatingGalleryProps> = ({ currentLang, onOpenPlanner }) => {
  const isEs = currentLang === 'es';
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [isMotionPaused, setIsMotionPaused] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [isIntersecting, setIsIntersecting] = useState<boolean>(true);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

  // Screen size check
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // IntersectionObserver to pause when offscreen
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Animation physics refs
  const mouseTargetRef = useRef({ x: 0, y: 0 });
  const mouseCurrentRef = useRef({ x: 0, y: 0 });
  const requestRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  // Check reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsReducedMotion(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Handle mouse movement relative to gallery container
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || isMotionPaused || isReducedMotion || !isIntersecting) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Normalized mouse delta (-1 to 1)
    const normX = (e.clientX - centerX) / (rect.width / 2);
    const normY = (e.clientY - centerY) / (rect.height / 2);

    mouseTargetRef.current = {
      x: Math.max(-1, Math.min(1, normX)),
      y: Math.max(-1, Math.min(1, normY)),
    };
  };

  const handleMouseLeave = () => {
    mouseTargetRef.current = { x: 0, y: 0 };
  };

  // Main Slow Orbital Motion Loop using requestAnimationFrame
  useEffect(() => {
    if (isMotionPaused || isReducedMotion || !isIntersecting) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    // Base angular speed: 2*PI / 36s = ~0.1745 rad/s
    // At 60fps (~0.016s delta per frame), dt ~ 0.016
    const animate = () => {
      timeRef.current += 0.012; // Time increment
      const t = timeRef.current;

      // Smooth mouse lerp
      mouseCurrentRef.current.x += (mouseTargetRef.current.x - mouseCurrentRef.current.x) * 0.05;
      mouseCurrentRef.current.y += (mouseTargetRef.current.y - mouseCurrentRef.current.y) * 0.05;

      const mouseX = mouseCurrentRef.current.x;
      const mouseY = mouseCurrentRef.current.y;

      // Base orbital speed: complete loop in ~36 seconds
      const baseOrbitalSpeed = (2 * Math.PI) / 36;

      GALLERY_ITEMS.forEach((item) => {
        const el = document.getElementById(`floating-card-${item.id}`);
        if (!el) return;

        // Current orbital angle theta(t)
        const angle = item.startAngle + t * baseOrbitalSpeed * item.orbitSpeed;

        const rx = isMobile ? item.orbitRadiusX.mobile : item.orbitRadiusX.desktop;
        const ry = isMobile ? item.orbitRadiusY.mobile : item.orbitRadiusY.desktop;

        // Elliptical trajectory coordinates around center (0, 0)
        const orbitX = Math.cos(angle) * rx;
        const orbitY = Math.sin(angle) * ry;

        // Mouse displacement
        const mouseDisplaceX = mouseX * (22 * item.depth);
        const mouseDisplaceY = mouseY * (18 * item.depth);

        const totalX = orbitX + mouseDisplaceX;
        const totalY = orbitY + mouseDisplaceY;

        // Keep photo upright with a gentle wobble (±2 deg)
        const wobble = Math.sin(angle * 2) * 1.8;
        const rot = item.initialRotation + wobble;

        // Apply smooth 3D transform centering on relative ellipse coordinate
        el.style.transform = `translate3d(calc(-50% + ${totalX.toFixed(1)}px), calc(-50% + ${totalY.toFixed(1)}px), 0px) rotate(${rot.toFixed(2)}deg)`;
      });

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isMotionPaused, isReducedMotion, isIntersecting, isMobile]);

  // Keyboard navigation for lightbox modal
  useEffect(() => {
    if (!selectedItem) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedItem(null);
      } else if (e.key === 'ArrowRight') {
        const currentIndex = GALLERY_ITEMS.findIndex((i) => i.id === selectedItem.id);
        const nextIndex = (currentIndex + 1) % GALLERY_ITEMS.length;
        setSelectedItem(GALLERY_ITEMS[nextIndex]);
      } else if (e.key === 'ArrowLeft') {
        const currentIndex = GALLERY_ITEMS.findIndex((i) => i.id === selectedItem.id);
        const prevIndex = (currentIndex - 1 + GALLERY_ITEMS.length) % GALLERY_ITEMS.length;
        setSelectedItem(GALLERY_ITEMS[prevIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem]);

  const handleImageLoad = (id: string) => {
    setLoadedImages((prev) => ({ ...prev, [id]: true }));
  };

  const handleImageError = (id: string, fallbackSrc: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!img.dataset.triedFallback) {
      img.dataset.triedFallback = 'true';
      img.src = fallbackSrc;
    }
  };

  return (
    <section
      id="floating-gallery"
      role="region"
      aria-label={isEs ? 'Galería Visual Flotante de San Blas' : 'San Blas Floating Visual Gallery'}
      className="py-20 md:py-32 bg-[#FAF8F5] border-t border-[#C6A15B]/20 relative overflow-hidden select-none scroll-mt-20"
    >
      {/* Editorial Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 mb-10 md:mb-14">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#C6A15B] font-semibold mb-3 flex items-center gap-2.5">
              <span className="w-6 h-px bg-[#C6A15B]" />
              <Sparkles className="w-3.5 h-3.5 text-[#C6A15B]" />
              <span>{isEs ? 'MOMENTOS VISUALES' : 'FLOATING SANCTUARY GALLERY'}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#06121E] tracking-tight leading-tight text-balance">
              {isEs ? 'Momentos en el Archipiélago' : 'San Blas Visual Moments'}
            </h2>

            <p className="text-sm sm:text-base text-[#6D7478] mt-3 font-light leading-relaxed">
              {isEs
                ? 'Fotografías reales en rotación orbital suave a lo largo de atolones exteriores, cayos vírgenes y comunidades tradicionales de Guna Yala.'
                : 'Explore real moments smoothly orbiting across pristine outer atolls, secluded palm cays, and authentic Guna communities.'}
            </p>
          </div>

          {/* Controls: Motion toggle & counter */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMotionPaused((prev) => !prev)}
              aria-label={isMotionPaused ? 'Resume orbital animation' : 'Pause orbital animation'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 border border-[#C6A15B]/30 text-xs font-mono uppercase tracking-wider text-[#06121E] hover:bg-[#F7F3EC] hover:border-[#C6A15B] transition-all duration-300 shadow-xs cursor-pointer"
            >
              {isMotionPaused ? (
                <>
                  <Play className="w-3.5 h-3.5 text-[#0E7490]" />
                  <span>{isEs ? 'Reanudar Órbita' : 'Resume Orbit'}</span>
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-[#C6A15B]" />
                  <span>{isEs ? 'Pausar Órbita' : 'Pause Orbit'}</span>
                </>
              )}
            </button>

            <span className="hidden sm:inline-block px-3 py-1.5 rounded-full bg-[#EFE9DE] text-[#06121E] text-xs font-mono font-medium border border-[#C6A15B]/20">
              9 {isEs ? 'Capturas' : 'Moments'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Interactive Floating Canvas Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full min-h-[720px] sm:min-h-[820px] md:min-h-[900px] lg:min-h-[980px] max-w-[1440px] mx-auto px-4 overflow-hidden"
      >
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(198,161,91,0.07),transparent_70%)] pointer-events-none rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(14,116,144,0.05),transparent_70%)] pointer-events-none rounded-full blur-2xl" />

        {/* CENTER LUXURY FOCAL CARD (Fixed Center Orbit Anchor) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none w-full max-w-xs sm:max-w-sm md:max-w-md px-4">
          <div className="backdrop-blur-xl bg-white/85 border border-[#C6A15B]/35 shadow-2xl p-6 sm:p-8 rounded-3xl text-center pointer-events-auto transition-transform duration-500 hover:scale-[1.02] group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(ellipse_at_top_right,rgba(198,161,91,0.15),transparent_70%)] pointer-events-none" />

            <div className="w-11 h-11 sm:w-12 sm:h-12 mx-auto rounded-2xl bg-[#F7F3EC] border border-[#C6A15B]/40 flex items-center justify-center mb-3 sm:mb-4 text-[#C6A15B] shadow-xs group-hover:scale-110 transition-transform duration-300">
              <Compass className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#C6A15B] font-semibold mb-2">
              {isEs ? '365 ISLAS • CARIBE AUTÉNTICO' : '365 ISLANDS • PURE CARIBBEAN'}
            </div>

            <h3 className="text-xl sm:text-2xl font-serif font-light text-[#06121E] mb-3 leading-snug">
              {isEs ? 'Santuario del Archipiélago Guna' : 'Guna Yala Floating Sanctuary'}
            </h3>

            <p className="text-xs sm:text-sm text-[#6D7478] font-light leading-relaxed mb-5 sm:mb-6">
              {isEs
                ? 'Navega flotando a través de las aguas cristalinas y la rica herencia de San Blas.'
                : 'Smooth editorial perspective across pristine outer barrier reefs, palm cays, and cultural living heritage.'}
            </p>

            <button
              onClick={() => onOpenPlanner && onOpenPlanner()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#06121E] text-white text-xs font-mono uppercase tracking-wider hover:bg-[#0E7490] transition-colors duration-300 shadow-md cursor-pointer"
            >
              <span>{isEs ? 'Diseñar Mi Viaje' : 'Plan Your Expedition'}</span>
              <Sparkles className="w-3.5 h-3.5 text-[#C6A15B]" />
            </button>
          </div>
        </div>

        {/* SLOW ORBITAL PHOTO CARDS CANVAS */}
        <div className="relative w-full h-full min-h-[720px] sm:min-h-[820px] md:min-h-[900px] lg:min-h-[980px]">
          {GALLERY_ITEMS.map((item) => {
            const isLoaded = loadedImages[item.id];

            return (
              <div
                key={item.id}
                id={`floating-card-${item.id}`}
                onClick={() => setSelectedItem(item)}
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `translate3d(-50%, -50%, 0px) rotate(${item.initialRotation}deg)`,
                  willChange: 'transform',
                }}
                className={`absolute cursor-pointer transition-all duration-300 hover:z-40 hover:scale-105 group focus:outline-none ${
                  isReducedMotion ? 'static-fallback' : ''
                }`}
              >
                {/* Photo Card Shell */}
                <div className="relative rounded-2xl md:rounded-3xl overflow-hidden border border-[#C6A15B]/30 shadow-xl bg-white p-2 sm:p-2.5 transition-all duration-300 group-hover:border-[#C6A15B] group-hover:shadow-2xl">
                  {/* Aspect Ratio Box */}
                  <div className={`relative overflow-hidden rounded-xl md:rounded-2xl ${item.aspectRatio} w-32 sm:w-44 md:w-56 lg:w-64 bg-[#EFE9DE]`}>
                    {/* Shimmer skeleton before image loads */}
                    {!isLoaded && (
                      <div className="absolute inset-0 bg-gradient-to-r from-[#EFE9DE] via-[#F7F3EC] to-[#EFE9DE] animate-pulse" />
                    )}

                    <img
                      src={item.imageSrc}
                      alt={item.title[currentLang]}
                      loading="lazy"
                      onLoad={() => handleImageLoad(item.id)}
                      onError={(e) => handleImageError(item.id, item.fallbackSrc, e)}
                      className={`w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-108 ${
                        isLoaded ? 'opacity-100' : 'opacity-0'
                      }`}
                    />

                    {/* Hover Overlay Sheen & Quick Tag */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#06121E]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 sm:p-4 text-white">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[#C6A15B] font-semibold">
                        {item.category[currentLang]}
                      </div>
                      <div className="text-xs sm:text-sm font-serif font-medium line-clamp-1">
                        {item.title[currentLang]}
                      </div>
                    </div>

                    {/* Expand icon pill */}
                    <div className="absolute top-2.5 right-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/80 backdrop-blur-md border border-[#C6A15B]/30 flex items-center justify-center text-[#06121E] opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-sm">
                      <Maximize2 className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Caption Tag (Attached Directly To Photo) */}
                  <div className="pt-2 px-1 flex items-center justify-between text-[11px] font-mono text-[#6D7478]">
                    <span className="truncate max-w-[110px] sm:max-w-[150px] font-medium text-[#06121E]">
                      {item.title[currentLang]}
                    </span>
                    <span className="text-[#C6A15B] font-semibold text-[10px] uppercase">
                      {item.category[currentLang]}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* LIGHTBOX MODAL (Full high-res focus view) */}
      {selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedItem.title[currentLang]}
          className="fixed inset-0 z-50 bg-[#06121E]/95 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 lg:p-10 animate-fade-in select-text"
        >
          {/* Backdrop Close Click */}
          <div
            onClick={() => setSelectedItem(null)}
            className="absolute inset-0 cursor-pointer"
            aria-hidden="true"
          />

          {/* Modal Card */}
          <div className="relative z-10 bg-white rounded-3xl overflow-hidden border border-[#C6A15B]/40 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col lg:flex-row">
            {/* Close Button */}
            <button
              onClick={() => setSelectedItem(null)}
              aria-label="Close lightbox modal"
              className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/50 text-white hover:bg-black/80 flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Image Viewport */}
            <div className="lg:w-3/5 bg-[#06121E] relative flex items-center justify-center min-h-[300px] sm:min-h-[400px] p-4">
              <img
                src={selectedItem.imageSrc}
                alt={selectedItem.title[currentLang]}
                onError={(e) => handleImageError(selectedItem.id, selectedItem.fallbackSrc, e)}
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl shadow-lg"
              />

              {/* Prev / Next Nav Buttons */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = GALLERY_ITEMS.findIndex((i) => i.id === selectedItem.id);
                  const prevIndex = (currentIndex - 1 + GALLERY_ITEMS.length) % GALLERY_ITEMS.length;
                  setSelectedItem(GALLERY_ITEMS[prevIndex]);
                }}
                aria-label="Previous photo"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const currentIndex = GALLERY_ITEMS.findIndex((i) => i.id === selectedItem.id);
                  const nextIndex = (currentIndex + 1) % GALLERY_ITEMS.length;
                  setSelectedItem(GALLERY_ITEMS[nextIndex]);
                }}
                aria-label="Next photo"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Details Panel */}
            <div className="lg:w-2/5 p-6 sm:p-8 flex flex-col justify-between bg-[#FAF8F5]">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#C6A15B] font-semibold mb-2 flex items-center gap-2">
                  <span className="w-4 h-px bg-[#C6A15B]" />
                  <span>{selectedItem.category[currentLang]}</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-serif font-light text-[#06121E] mb-2 leading-snug">
                  {selectedItem.title[currentLang]}
                </h3>

                <p className="text-xs font-mono text-[#0E7490] mb-4">
                  {selectedItem.location[currentLang]}
                </p>

                <p className="text-sm text-[#6D7478] font-light leading-relaxed mb-6">
                  {selectedItem.description[currentLang]}
                </p>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-[#C6A15B]/20 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    const cat = selectedItem.plannerCategory;
                    setSelectedItem(null);
                    if (onOpenPlanner) onOpenPlanner(cat);
                  }}
                  className="flex-1 px-5 py-3 rounded-xl bg-[#06121E] text-white text-xs font-mono uppercase tracking-wider hover:bg-[#0E7490] transition-colors shadow-md text-center cursor-pointer"
                >
                  {isEs ? 'Planificar Esta Experiencia' : 'Plan This Experience'}
                </button>

                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-5 py-3 rounded-xl border border-[#C6A15B]/40 text-[#06121E] text-xs font-mono uppercase tracking-wider hover:bg-[#EFE9DE] transition-colors text-center cursor-pointer"
                >
                  {isEs ? 'Cerrar' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
