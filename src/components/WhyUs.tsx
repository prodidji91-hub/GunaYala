import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { Sparkles } from 'lucide-react';

interface WhyUsProps {
  currentLang: Language;
}

// 1. GUNA-OWNED ENTERPRISE EMBLEM (Traditional Island Hut)
const EmblemGunaOwned: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12 sm:w-14 sm:h-14 transition-transform duration-500 group-hover:scale-105">
    {/* Solar Background Rings - Sunshine Yellow & Caribbean Turquoise */}
    <circle cx="50" cy="38" r="22" fill="none" stroke="#F5C542" strokeWidth="1.2" opacity="0.6" strokeDasharray="3 2" />
    <circle cx="50" cy="38" r="16" fill="none" stroke="#19B8C5" strokeWidth="1" opacity="0.7" />
    <circle cx="50" cy="12" r="2.5" fill="#E94F4F" />

    {/* Thatched Roof Pitch - Tropical Orange & Coral Red */}
    <polygon points="50,16 84,42 16,42" fill="#F28C45" opacity="0.25" stroke="#E94F4F" strokeWidth="2.2" strokeLinejoin="round" />
    
    {/* Thatched Texture Layer Lines - Sunshine Yellow & Coral Red */}
    <path d="M 26 36 L 74 36 M 32 30 L 68 30 M 38 24 L 62 24" stroke="#F5C542" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M 22 42 L 20 46 M 30 42 L 28 46 M 40 42 L 38 46 M 50 42 L 50 46 M 60 42 L 62 46 M 70 42 L 72 46 M 78 42 L 80 46" stroke="#E94F4F" strokeWidth="1.5" strokeLinecap="round" />

    {/* Ridge Peak - Coral Red */}
    <line x1="50" y1="10" x2="50" y2="16" stroke="#E94F4F" strokeWidth="2" />

    {/* Hut Platform & Pillars - Tropical Orange & Warm Ivory */}
    <line x1="22" y1="70" x2="78" y2="70" stroke="#F28C45" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="26" y1="42" x2="26" y2="70" stroke="#FAF8F2" strokeWidth="1.8" />
    <line x1="74" y1="42" x2="74" y2="70" stroke="#FAF8F2" strokeWidth="1.8" />
    <line x1="38" y1="42" x2="38" y2="70" stroke="#F5C542" strokeWidth="1.4" opacity="0.85" />
    <line x1="62" y1="42" x2="62" y2="70" stroke="#F5C542" strokeWidth="1.4" opacity="0.85" />

    {/* Doorway Frame - Turquoise & Coral Red */}
    <rect x="42" y="48" width="16" height="22" rx="2" fill="#174E80" stroke="#19B8C5" strokeWidth="1.8" />
    <line x1="50" y1="48" x2="50" y2="70" stroke="#E94F4F" strokeWidth="1.2" />

    {/* Shoreline Beach & Caribbean Waves - Sunshine Yellow & Turquoise */}
    <path d="M 12 76 Q 50 72 88 76" stroke="#F5C542" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    <path d="M 18 82 Q 50 78 82 82" stroke="#19B8C5" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
);

// 2. AUTHENTIC LOCAL CONNECTION EMBLEM (Interwoven Geometric Mola Lines)
const EmblemLocalConnection: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12 sm:w-14 sm:h-14 transition-transform duration-500 group-hover:scale-105">
    {/* Outer Framing Rings - Coral Red & Turquoise */}
    <circle cx="50" cy="50" r="44" fill="none" stroke="#E94F4F" strokeWidth="2" strokeDasharray="4 2" />
    <circle cx="50" cy="50" r="38" fill="none" stroke="#19B8C5" strokeWidth="1.2" opacity="0.85" />

    {/* Vertical Threads (Weft) - Coral Red */}
    <rect x="32" y="20" width="6" height="60" rx="3" fill="#E94F4F" />
    <rect x="47" y="20" width="6" height="60" rx="3" fill="#E94F4F" />
    <rect x="62" y="20" width="6" height="60" rx="3" fill="#E94F4F" />

    {/* Horizontal Threads (Warp) - Sunshine Yellow */}
    <rect x="20" y="32" width="60" height="6" rx="3" fill="#F5C542" />
    <rect x="20" y="47" width="60" height="6" rx="3" fill="#F5C542" />
    <rect x="20" y="62" width="60" height="6" rx="3" fill="#F5C542" />

    {/* Interwoven Over-Under Pads - Caribbean Turquoise & Tropical Orange */}
    <rect x="32" y="31" width="6" height="8" rx="1" fill="#19B8C5" stroke="#F28C45" strokeWidth="1" />
    <rect x="62" y="31" width="6" height="8" rx="1" fill="#19B8C5" stroke="#F28C45" strokeWidth="1" />
    <rect x="47" y="46" width="6" height="8" rx="1" fill="#19B8C5" stroke="#F28C45" strokeWidth="1" />
    <rect x="32" y="61" width="6" height="8" rx="1" fill="#19B8C5" stroke="#F28C45" strokeWidth="1" />
    <rect x="62" y="61" width="6" height="8" rx="1" fill="#19B8C5" stroke="#F28C45" strokeWidth="1" />

    {/* Corner & Center Decorative Accents - Warm Ivory, Tropical Orange & Turquoise */}
    <circle cx="35" cy="35" r="2.5" fill="#F28C45" />
    <circle cx="50" cy="50" r="3.5" fill="#FAF8F2" stroke="#E94F4F" strokeWidth="1" />
    <circle cx="65" cy="65" r="2.5" fill="#F28C45" />
    <circle cx="65" cy="35" r="2.5" fill="#19B8C5" />
    <circle cx="35" cy="65" r="2.5" fill="#19B8C5" />
  </svg>
);

// 3. DIRECT PERSONAL PREPARATION EMBLEM (Traditional Canoe / Cayuco & Waves)
const EmblemPersonalPreparation: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12 sm:w-14 sm:h-14 transition-transform duration-500 group-hover:scale-105">
    {/* Sun Arc & Sun Disk - Coral Red & Sunshine Yellow */}
    <path d="M 28 36 A 24 24 0 0 1 72 36" fill="none" stroke="#E94F4F" strokeWidth="1.5" strokeDasharray="3 2" />
    <circle cx="50" cy="22" r="5.5" fill="#F5C542" />

    {/* Traditional Cayuco Dugout Hull - Tropical Orange & Warm Ivory Inner Rim */}
    <path
      d="M 14 48 C 22 64, 78 64, 86 48 C 76 56, 24 56, 14 48 Z"
      fill="#F28C45"
      stroke="#F5C542"
      strokeWidth="1.4"
    />
    <path
      d="M 20 49 C 28 55, 72 55, 80 49 C 72 53, 28 53, 20 49 Z"
      fill="#174E80"
    />
    {/* Prow & Stern Curved Tips - Coral Red */}
    <path d="M 14 48 Q 10 42 16 44" stroke="#E94F4F" strokeWidth="2.2" strokeLinecap="round" fill="none" />
    <path d="M 86 48 Q 90 42 84 44" stroke="#E94F4F" strokeWidth="2.2" strokeLinecap="round" fill="none" />

    {/* Canoe Seats - Warm Ivory */}
    <line x1="36" y1="51" x2="36" y2="54" stroke="#FAF8F2" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="64" y1="51" x2="64" y2="54" stroke="#FAF8F2" strokeWidth="2.2" strokeLinecap="round" />

    {/* Traditional Wooden Paddle - Sunshine Yellow & Coral Red Blade */}
    <path d="M 28 38 L 68 56" stroke="#F5C542" strokeWidth="2" strokeLinecap="round" />
    <polygon points="28,38 21,31 25,40" fill="#E94F4F" />

    {/* Layered Caribbean Waves - Turquoise, Coral Red & Sunshine Yellow */}
    <path d="M 10 68 Q 28 62 50 68 T 90 68" stroke="#19B8C5" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <path d="M 16 76 Q 34 71 50 76 T 84 76" stroke="#E94F4F" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    <path d="M 24 83 Q 38 79 50 83 T 76 83" stroke="#F5C542" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </svg>
);

// 4. RESPECTFUL COMMUNITY TRAVEL EMBLEM (Coastal Village & Huts)
const EmblemCommunityTravel: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-12 h-12 sm:w-14 sm:h-14 transition-transform duration-500 group-hover:scale-105">
    {/* Radiant Sun Disk - Coral Red & Sunshine Yellow */}
    <circle cx="50" cy="26" r="10" fill="none" stroke="#E94F4F" strokeWidth="1.2" strokeDasharray="2.5 1.5" />
    <circle cx="50" cy="26" r="4.5" fill="#F5C542" />

    {/* Hut 1 (Main Central Village Hut) - Coral Red Roof & Warm Ivory Body */}
    <polygon points="50,32 68,46 32,46" fill="#E94F4F" stroke="#F5C542" strokeWidth="1" />
    <rect x="36" y="46" width="28" height="20" fill="#FAF8F2" stroke="#174E80" strokeWidth="1.5" />
    <rect x="46" y="54" width="8" height="12" fill="#F28C45" />

    {/* Hut 2 (Left Hut) - Tropical Orange Roof */}
    <polygon points="26,40 40,50 12,50" fill="#F28C45" />
    <rect x="16" y="50" width="20" height="16" fill="#FAF8F2" stroke="#174E80" strokeWidth="1.2" />

    {/* Hut 3 (Right Hut) - Tropical Orange Roof */}
    <polygon points="74,42 88,52 60,52" fill="#F28C45" />
    <rect x="64" y="52" width="20" height="14" fill="#FAF8F2" stroke="#174E80" strokeWidth="1.2" />

    {/* Coastal Palm Tree - Turquoise Trunk & Sunshine Yellow Fronds */}
    <path d="M 78 66 Q 82 44 72 30" stroke="#19B8C5" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <path d="M 72 30 Q 84 24 90 30 M 72 30 Q 80 18 82 10 M 72 30 Q 62 20 58 16 M 72 30 Q 60 26 54 34" stroke="#F5C542" strokeWidth="1.6" fill="none" strokeLinecap="round" />

    {/* Beach Shoreline Base & Caribbean Waves - Sunshine Yellow & Turquoise */}
    <path d="M 8 66 Q 50 61 92 66" stroke="#F5C542" strokeWidth="2" fill="none" strokeLinecap="round" />
    <path d="M 14 74 Q 50 69 86 74" stroke="#19B8C5" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <path d="M 22 81 Q 50 77 78 81" stroke="#E94F4F" strokeWidth="1.5" fill="none" strokeLinecap="round" />
  </svg>
);

// Array of 3D Dimensional Emblems
const EMBLEMS = [
  <EmblemGunaOwned key="guna-owned" />,
  <EmblemLocalConnection key="local-connection" />,
  <EmblemPersonalPreparation key="personal-prep" />,
  <EmblemCommunityTravel key="community-travel" />,
];

// Interactive Card Component with 3D Tilt Microinteraction
interface StoryCardProps {
  pillar: { title: string; description: string };
  idx: number;
  isEs: boolean;
  isVisible: boolean;
}

const StoryCard: React.FC<StoryCardProps> = ({ pillar, idx, isEs, isVisible }) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only apply 3D tilt on desktop (screens >= 768px)
    if (window.innerWidth < 768) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12; // -6 to 6 deg
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -12;
    setTilt({ x: y, y: x });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <div
      style={{
        transitionDelay: `${idx * 120}ms`,
        transform: isHovered
          ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-6px)`
          : undefined,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`bg-white/90 backdrop-blur-xl border border-[#E2D2BB] hover:border-[#55B8B3] rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-6 flex flex-col justify-between shadow-sm hover:shadow-[0_20px_40px_rgba(85,184,179,0.18)] transition-all duration-500 group relative overflow-hidden transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}
    >
      {/* Subtle top shimmer line on hover */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#55B8B3] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div>
        {/* Emblem Container with Deep Ocean Blue / Coastal Green Circular Medallion */}
        <div className="relative mb-4 sm:mb-5 inline-block">
          {/* Ambient Multi-colour Glow on Hover */}
          <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-[#19B8C5]/30 via-[#E94F4F]/30 to-[#F5C542]/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

          {/* Deep Ocean Blue Circular Medallion */}
          <div className="relative z-10 w-[80px] h-[80px] sm:w-[84px] sm:h-[84px] rounded-full bg-[#174E80] border border-[#19B8C5]/40 group-hover:border-[#F5C542] shadow-[0_8px_20px_rgba(23,78,128,0.25)] group-hover:shadow-[0_12px_28px_rgba(25,184,197,0.35)] flex items-center justify-center transform group-hover:-translate-y-1 transition-all duration-500">
            {EMBLEMS[idx]}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-serif font-medium text-[#173D36] mb-2 sm:mb-2.5 group-hover:text-[#55B8B3] transition-colors leading-snug">
          {pillar.title}
        </h3>

        {/* Description */}
        <p className="text-xs sm:text-xs md:text-sm text-[#53645E] leading-relaxed font-sans font-light">
          {pillar.description}
        </p>
      </div>

      {/* Card Footer / Index */}
      <div className="pt-3 mt-4 sm:mt-5 border-t border-[#E2D2BB]/60 flex items-center justify-between">
        <span className="text-[#C5A46B] font-mono text-xs sm:text-sm font-semibold">0{idx + 1}</span>
      </div>
    </div>
  );
};

export const WhyUs: React.FC<WhyUsProps> = ({ currentLang }) => {
  const t = TRANSLATIONS[currentLang];
  const isEs = currentLang === 'es';

  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="discover"
      className="py-16 sm:py-20 lg:py-22 bg-[#FAF8F2] text-[#173D36] relative overflow-hidden scroll-mt-20 selection:bg-[#E2D2BB] selection:text-[#173D36]"
    >
      {/* Luminous Background Layer with Parallax & Tropical Sunlight Vignette */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-15 scale-105 transform-gpu transition-transform duration-1000 ease-out mix-blend-multiply"
          style={{ backgroundImage: `url("/pictures/hero/guna-yala-hero.jpg")` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#FAF8F2]/95 via-[#F0E7D8]/80 to-[#FAF8F2]/95 z-1" />
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[#55B8B3]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-[#C5A46B]/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className={`max-w-3xl mb-10 lg:mb-12 transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#F0E7D8] border border-[#E2D2BB] text-xs font-sans uppercase tracking-[0.2em] text-[#173D36] font-semibold mb-3.5 shadow-sm backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#55B8B3]" />
            <span>{isEs ? 'POR QUÉ VIAJAR CON NOSOTROS' : 'WHY TRAVEL WITH US'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-light text-[#173D36] tracking-tight text-balance leading-[1.15]">
            {isEs ? (
              <>Descubre Guna Yala <span className="italic text-[#C5A46B]">desde una perspectiva local</span></>
            ) : (
              <>Discover Guna Yala <span className="italic text-[#C5A46B]">Through Local Eyes</span></>
            )}
          </h2>

          <p className="mt-3 sm:mt-3.5 text-sm sm:text-base lg:text-lg text-[#53645E] font-sans font-light leading-relaxed max-w-2xl">
            {t.whyUs.subtitle}
          </p>
        </div>

        {/* 4 Pillars Grid: Premium Interactive Storytelling Panels with Custom Emblems */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-5">
          {t.whyUs.pillars.map((pillar, idx) => (
            <StoryCard
              key={idx}
              pillar={pillar}
              idx={idx}
              isEs={isEs}
              isVisible={isVisible}
            />
          ))}
        </div>

      </div>
    </section>
  );
};
