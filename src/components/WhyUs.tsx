import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { Sparkles } from 'lucide-react';

interface WhyUsProps {
  currentLang: Language;
}

// Global SVG Gradients & Filters Definitions for Metallic Champagne-Gold Emblems
const GoldGradients: React.FC = () => (
  <defs>
    <linearGradient id="goldMetallic" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#F3DEAD" />
      <stop offset="25%" stopColor="#D6BA80" />
      <stop offset="50%" stopColor="#FFF2D4" />
      <stop offset="75%" stopColor="#C8AC75" />
      <stop offset="100%" stopColor="#9E824A" />
    </linearGradient>
    <radialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#FFF2D4" stopOpacity="0.8" />
      <stop offset="50%" stopColor="#D6BA80" stopOpacity="0.3" />
      <stop offset="100%" stopColor="#C8AC75" stopOpacity="0" />
    </radialGradient>
    <filter id="emblemGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
);

// 1. GUNA-OWNED ENTERPRISE EMBLEM
const EmblemGunaOwned: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-14 h-14 sm:w-16 sm:h-16 transition-transform duration-500 group-hover:scale-105">
    <GoldGradients />
    {/* Outer Ring & Compass Ticks */}
    <circle cx="50" cy="50" r="45" fill="none" stroke="url(#goldMetallic)" strokeWidth="1.5" strokeDasharray="2.5 1.5" />
    <circle cx="50" cy="50" r="41" fill="none" stroke="url(#goldMetallic)" strokeWidth="0.75" opacity="0.8" />
    {/* Solar Rays radiating behind palms */}
    <g stroke="url(#goldMetallic)" strokeWidth="0.75" opacity="0.6">
      <line x1="50" y1="12" x2="50" y2="18" />
      <line x1="77" y1="23" x2="73" y2="27" />
      <line x1="23" y1="23" x2="27" y2="27" />
      <line x1="88" y1="50" x2="82" y2="50" />
      <line x1="12" y1="50" x2="18" y2="50" />
    </g>
    {/* Island Mound Silhouette */}
    <path d="M 18 68 Q 50 56 82 68 Q 50 63 18 68 Z" fill="url(#goldMetallic)" />
    {/* Primary Palm Tree */}
    <path d="M 46 64 Q 48 42 54 28" stroke="url(#goldMetallic)" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    <path d="M 54 28 Q 66 22 72 30 M 54 28 Q 63 18 66 10 M 54 28 Q 44 18 38 12 M 54 28 Q 42 22 36 30 M 54 28 Q 52 16 54 10" stroke="url(#goldMetallic)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    {/* Secondary Palm Tree */}
    <path d="M 38 66 Q 36 50 30 38" stroke="url(#goldMetallic)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    <path d="M 30 38 Q 20 34 16 40 M 30 38 Q 24 28 20 22 M 30 38 Q 38 28 42 32" stroke="url(#goldMetallic)" strokeWidth="1" fill="none" strokeLinecap="round" />
    {/* Gentle Ocean Waves */}
    <path d="M 14 74 Q 30 70 50 74 T 86 74 M 20 80 Q 40 77 60 80 T 80 80" stroke="url(#goldMetallic)" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.85" />
  </svg>
);

// 2. AUTHENTIC LOCAL CONNECTION EMBLEM (Refined Compass Rose)
const EmblemLocalConnection: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-14 h-14 sm:w-16 sm:h-16 transition-transform duration-500 group-hover:scale-105">
    <GoldGradients />
    {/* Outer Compass Ring */}
    <circle cx="50" cy="50" r="45" fill="none" stroke="url(#goldMetallic)" strokeWidth="1.5" />
    <circle cx="50" cy="50" r="40" fill="none" stroke="url(#goldMetallic)" strokeWidth="0.75" />
    {/* Compass Degree Ticks */}
    {Array.from({ length: 12 }).map((_, i) => {
      const angle = (i * 30 * Math.PI) / 180;
      const x1 = 50 + 40 * Math.cos(angle);
      const y1 = 50 + 40 * Math.sin(angle);
      const x2 = 50 + 43 * Math.cos(angle);
      const y2 = 50 + 43 * Math.sin(angle);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="url(#goldMetallic)" strokeWidth="1" />;
    })}
    {/* Cardinal Direction Indicators */}
    <text x="50" y="18" textAnchor="middle" fill="url(#goldMetallic)" fontSize="6.5" fontWeight="bold" fontFamily="serif">N</text>
    <text x="50" y="88" textAnchor="middle" fill="url(#goldMetallic)" fontSize="6.5" fontWeight="bold" fontFamily="serif">S</text>
    <text x="86" y="52" textAnchor="middle" fill="url(#goldMetallic)" fontSize="6.5" fontWeight="bold" fontFamily="serif">E</text>
    <text x="14" y="52" textAnchor="middle" fill="url(#goldMetallic)" fontSize="6.5" fontWeight="bold" fontFamily="serif">W</text>
    {/* Primary 3D Faceted Compass Star */}
    {/* North Point */}
    <polygon points="50,22 54,50 50,47" fill="url(#goldMetallic)" />
    <polygon points="50,22 46,50 50,47" fill="#8C733B" />
    {/* South Point */}
    <polygon points="50,78 54,50 50,53" fill="#8C733B" />
    <polygon points="50,78 46,50 50,53" fill="url(#goldMetallic)" />
    {/* East Point */}
    <polygon points="78,50 50,54 53,50" fill="url(#goldMetallic)" />
    <polygon points="78,50 50,46 53,50" fill="#8C733B" />
    {/* West Point */}
    <polygon points="22,50 50,54 47,50" fill="#8C733B" />
    <polygon points="22,50 50,46 47,50" fill="url(#goldMetallic)" />
    {/* Diagonal Minor Points */}
    <polygon points="68,32 50,47 52,48" fill="url(#goldMetallic)" opacity="0.8" />
    <polygon points="32,68 50,53 48,52" fill="url(#goldMetallic)" opacity="0.8" />
    <polygon points="68,68 50,53 52,52" fill="url(#goldMetallic)" opacity="0.8" />
    <polygon points="32,32 50,47 48,48" fill="url(#goldMetallic)" opacity="0.8" />
    {/* Center Pivot Ring */}
    <circle cx="50" cy="50" r="5" fill="url(#goldMetallic)" />
    <circle cx="50" cy="50" r="2.5" fill="#061815" />
  </svg>
);

// 3. DIRECT PERSONAL PREPARATION EMBLEM (Passport & Flight Route Sweep)
const EmblemPersonalPreparation: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-14 h-14 sm:w-16 sm:h-16 transition-transform duration-500 group-hover:scale-105">
    <GoldGradients />
    {/* Outer Dimensional Frame */}
    <rect x="12" y="12" width="76" height="76" rx="16" fill="none" stroke="url(#goldMetallic)" strokeWidth="1.2" strokeDasharray="3 1.5" />
    {/* Document / Passport Slab */}
    <rect x="25" y="22" width="38" height="52" rx="5" fill="#0A2621" stroke="url(#goldMetallic)" strokeWidth="1.5" />
    <rect x="29" y="26" width="30" height="44" rx="3" fill="none" stroke="url(#goldMetallic)" strokeWidth="0.75" opacity="0.6" />
    {/* Embossed Compass Seal on Document */}
    <circle cx="44" cy="42" r="9" fill="none" stroke="url(#goldMetallic)" strokeWidth="1" />
    <polygon points="44,35 46,42 44,40.5 42,42" fill="url(#goldMetallic)" />
    <polygon points="44,49 46,42 44,43.5 42,42" fill="#8C733B" />
    {/* Text Lines */}
    <line x1="33" y1="57" x2="55" y2="57" stroke="url(#goldMetallic)" strokeWidth="1" strokeLinecap="round" />
    <line x1="33" y1="62" x2="47" y2="62" stroke="url(#goldMetallic)" strokeWidth="1" strokeLinecap="round" />
    {/* Sweeping Route Arc / Feather */}
    <path d="M 20 70 C 25 25, 75 15, 78 45 C 80 62, 60 82, 42 78" fill="none" stroke="url(#goldMetallic)" strokeWidth="1.5" strokeDasharray="4 2" strokeLinecap="round" />
    {/* Compass Badge Marker */}
    <circle cx="78" cy="45" r="4.5" fill="url(#goldMetallic)" />
    <circle cx="78" cy="45" r="2" fill="#061815" />
  </svg>
);

// 4. RESPECTFUL COMMUNITY TRAVEL EMBLEM (Tropical Palm & Ocean Shield Wreath)
const EmblemCommunityTravel: React.FC = () => (
  <svg viewBox="0 0 100 100" className="w-14 h-14 sm:w-16 sm:h-16 transition-transform duration-500 group-hover:scale-105">
    <GoldGradients />
    {/* Shield Wreath Crest Frame */}
    <path d="M 50 10 L 82 24 C 82 58, 68 80, 50 90 C 32 80, 18 58, 18 24 Z" fill="none" stroke="url(#goldMetallic)" strokeWidth="1.5" />
    <path d="M 50 15 L 77 27 C 77 55, 65 74, 50 83 C 35 74, 23 55, 23 27 Z" fill="none" stroke="url(#goldMetallic)" strokeWidth="0.75" opacity="0.6" />
    {/* Central Solar Core */}
    <circle cx="50" cy="42" r="11" fill="none" stroke="url(#goldMetallic)" strokeWidth="1" />
    <circle cx="50" cy="42" r="5" fill="url(#goldMetallic)" />
    {/* Protective Palm Branches */}
    <path d="M 28 62 C 26 42, 38 28, 48 24" fill="none" stroke="url(#goldMetallic)" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M 72 62 C 74 42, 62 28, 52 24" fill="none" stroke="url(#goldMetallic)" strokeWidth="1.2" strokeLinecap="round" />
    {/* Leaf Details */}
    <path d="M 32 52 Q 22 48 28 42 M 36 42 Q 26 36 34 32 M 42 32 Q 32 26 40 22" stroke="url(#goldMetallic)" strokeWidth="1" fill="none" strokeLinecap="round" />
    <path d="M 68 52 Q 78 48 72 42 M 64 42 Q 74 36 66 32 M 58 32 Q 68 26 60 22" stroke="url(#goldMetallic)" strokeWidth="1" fill="none" strokeLinecap="round" />
    {/* Ocean Wave Base */}
    <path d="M 30 68 Q 40 64 50 68 T 70 68 M 34 74 Q 42 71 50 74 T 66 74" stroke="url(#goldMetallic)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
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
      className={`bg-[#061815]/85 backdrop-blur-xl border border-[#C8AC75]/30 hover:border-[#C8AC75] rounded-2xl sm:rounded-3xl p-5 sm:p-6 lg:p-6 flex flex-col justify-between shadow-xl hover:shadow-[0_20px_50px_rgba(200,172,117,0.22)] transition-all duration-500 group relative overflow-hidden transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}
    >
      {/* Subtle top shimmer line on hover */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C8AC75] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div>
        {/* Emblem Container with Gold Illumination Halo behind */}
        <div className="relative mb-4 sm:mb-5 inline-block">
          {/* Golden Illumination Backdrop Glow */}
          <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-[#C8AC75]/25 via-[#FAF8F5]/10 to-transparent blur-xl opacity-0 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500 pointer-events-none" />

          {/* Dimensional SVG Emblem */}
          <div className="relative z-10 flex items-center justify-center transform group-hover:-translate-y-1 transition-transform duration-500">
            {EMBLEMS[idx]}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base sm:text-lg font-serif font-medium text-[#FAF8F5] mb-2 sm:mb-2.5 group-hover:text-[#C8AC75] transition-colors leading-snug">
          {pillar.title}
        </h3>

        {/* Description */}
        <p className="text-xs sm:text-xs md:text-sm text-[#E5DEC9]/80 leading-relaxed font-sans font-light">
          {pillar.description}
        </p>
      </div>

      {/* Card Footer / Index */}
      <div className="pt-4 mt-4 sm:mt-5 border-t border-[#C8AC75]/20 flex items-center justify-between text-xs font-sans tracking-wider font-semibold">
        <span className="text-[#C8AC75] font-mono text-xs sm:text-sm">0{idx + 1}</span>
        <span className="text-[10px] uppercase tracking-widest text-[#E5DEC9]/60 font-sans">
          {isEs ? 'ESTÁNDAR GUNA' : 'GUNA STANDARD'}
        </span>
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
      className="py-16 sm:py-20 lg:py-22 bg-[#040E15] text-[#FAF8F5] relative overflow-hidden scroll-mt-20 selection:bg-[#C8AC75]/30 selection:text-white"
    >
      {/* Cinematic Background Layer with Parallax & Tropical Sunlight Vignette */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-35 scale-105 transform-gpu transition-transform duration-1000 ease-out"
          style={{ backgroundImage: `url("/pictures/hero/guna-yala-hero.jpg")` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#061815]/90 via-[#0E3B2F]/85 to-[#040E15]/95 z-1" />
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[#C8AC75]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-[#0E4A43]/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className={`max-w-3xl mb-10 lg:mb-12 transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-[#C8AC75]/40 text-xs font-sans uppercase tracking-[0.2em] text-[#C8AC75] font-semibold mb-3.5 shadow-lg backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#C8AC75] animate-pulse" />
            <span>{isEs ? 'POR QUÉ VIAJAR CON NOSOTROS' : 'WHY TRAVEL WITH US'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-light text-[#FAF8F5] tracking-tight text-balance leading-[1.15]">
            {isEs ? (
              <>Descubre Guna Yala <span className="italic text-[#C8AC75]">desde una perspectiva local</span></>
            ) : (
              <>Discover Guna Yala <span className="italic text-[#C8AC75]">Through Local Eyes</span></>
            )}
          </h2>

          <p className="mt-3 sm:mt-3.5 text-sm sm:text-base lg:text-lg text-[#E5DEC9]/90 font-sans font-light leading-relaxed max-w-2xl">
            {t.whyUs.subtitle}
          </p>
        </div>

        {/* 4 Pillars Grid: Premium Interactive 3D Storytelling Panels with Custom Emblems */}
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
