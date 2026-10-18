import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, Sparkles, Compass, Play, Pause, Volume2, VolumeX, Shield, Anchor, MapPin } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface HeroProps {
  currentLang: Language;
  onExploreClick: () => void;
  onPlanClick?: () => void;
  onBookClick?: () => void;
}

export const Hero: React.FC<HeroProps> = ({ currentLang, onExploreClick, onPlanClick, onBookClick }) => {
  const language = currentLang;
  const t = TRANSLATIONS[language].hero;
  const panels = t.panels || {
    islands: {
      number: '01',
      tag: 'THE ISLANDS',
      headline: 'Island Escapes',
      description: 'Discover pristine beaches, turquoise waters and unforgettable island experiences.',
      cta: 'Explore Islands',
    },
    sailing: {
      number: '02',
      tag: 'SAILING',
      headline: 'Sailing Adventures',
      description: 'Experience the Caribbean through extraordinary sailing journeys.',
      cta: 'Explore Sailing',
    },
    culture: {
      number: '03',
      tag: 'GUNA CULTURE',
      headline: 'Authentic Guna Culture',
      description: 'Discover the traditions, stories and hospitality of the Guna people.',
      cta: 'Explore Culture',
    },
  };

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const handlePrimaryClick = onBookClick || onPlanClick || onExploreClick;

  // Handle video play/pause
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => setVideoError(true));
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handleNavScroll = (targetId: string) => {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      onExploreClick();
    }
  };

  return (
    <div id="hero" className="relative min-h-[92vh] lg:min-h-screen flex flex-col justify-between bg-[#0B2924] text-[#F6F2E9] overflow-hidden pt-[72px] sm:pt-[72px] lg:pt-[72px] select-none">
      
      {/* ========================================================
          THREE SIDE-BY-SIDE CINEMATIC PANELS (DESKTOP HORIZONTAL)
         ======================================================== */}
      <div className="flex-1 w-full flex flex-col lg:flex-row items-stretch border-t border-[#C8AC75]/25 overflow-hidden">
        
        {/* PANEL 01 — THE ISLANDS */}
        <div className="relative flex-1 group transition-all duration-700 ease-out hover:lg:flex-[1.35] border-b-2 lg:border-b-0 lg:border-r-2 border-[#C8AC75] overflow-hidden flex flex-col justify-between min-h-[380px] sm:min-h-[440px] lg:min-h-0">
          {/* Background Video / Photo Backdrop */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B2924]/98 via-[#0B2924]/50 to-black/30 z-10 pointer-events-none" />
            
            {!videoError ? (
              <video
                ref={videoRef}
                autoPlay
                muted={isMuted}
                loop
                playsInline
                preload="metadata"
                poster="/pictures/hero/guna-yala-hero.jpg"
                onError={() => setVideoError(true)}
                className="w-full h-full object-cover object-center scale-105 group-hover:scale-110 transition-transform duration-1000 ease-out"
              >
                <source src="/videos/Islands.mp4" type="video/mp4" />
                Your browser does not support video.
              </video>
            ) : (
              <div 
                className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-1000 ease-out brightness-[0.92] contrast-[1.05]"
                style={{ backgroundImage: `url("/pictures/hero/guna-yala-hero.jpg")` }}
              />
            )}
          </div>

          {/* Panel Content Overlay */}
          <div className="relative z-20 h-full p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            {/* Top Tag & Video Controls */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center space-x-2 bg-black/45 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#C8AC75]/40 text-xs font-sans uppercase tracking-[0.2em] text-[#C8AC75] shadow-lg">
                <span className="font-mono font-bold text-[#C8AC75]">{panels.islands.number}</span>
                <span className="text-[#C8AC75]/40">&bull;</span>
                <span>{panels.islands.tag}</span>
              </div>

              {/* Minimal Audio/Playback Pill for Panel 01 Video */}
              <div className="flex items-center space-x-2 bg-black/45 backdrop-blur-md px-2.5 py-1 rounded-full border border-[#C8AC75]/30">
                <button 
                  onClick={() => setIsMuted(!isMuted)} 
                  className="text-[#F6F2E9]/80 hover:text-[#C8AC75] p-1 transition-colors"
                  aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                  title={isMuted ? "Unmute audio" : "Mute audio"}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#C8AC75]" />}
                </button>
                <div className="w-px h-3 bg-[#C8AC75]/30" />
                <button 
                  onClick={() => setIsPlaying(!isPlaying)} 
                  className="text-[#F6F2E9]/80 hover:text-[#C8AC75] p-1 transition-colors"
                  aria-label={isPlaying ? "Pause video" : "Play video"}
                  title={isPlaying ? "Pause video" : "Play video"}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-[#C8AC75]" />}
                </button>
              </div>
            </div>

            {/* Bottom Content Area */}
            <div className="pt-12 sm:pt-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-serif font-light tracking-tight text-[#F6F2E9] leading-tight mb-3 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
                {panels.islands.headline}
              </h2>
              <p className="text-xs sm:text-sm lg:text-base text-[#F6F2E9]/90 font-sans font-light leading-relaxed mb-6 max-w-md drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]">
                {panels.islands.description}
              </p>
              <button
                onClick={() => handleNavScroll('islands')}
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-full bg-[#C8AC75] hover:bg-[#d8be89] text-[#0B2924] font-semibold text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.03] active:scale-95 group/btn border border-[#C8AC75] w-full sm:w-auto"
              >
                <span>{panels.islands.cta}</span>
                <ChevronRight className="w-4 h-4 ml-2 text-[#0B2924] group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        {/* PANEL 02 — SAILING */}
        <div className="relative flex-1 group transition-all duration-700 ease-out hover:lg:flex-[1.35] border-b-2 lg:border-b-0 lg:border-r-2 border-[#C8AC75] overflow-hidden flex flex-col justify-between min-h-[380px] sm:min-h-[440px] lg:min-h-0">
          {/* Background Image */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B2924]/98 via-[#0B2924]/50 to-black/30 z-10 pointer-events-none" />
            <div 
              className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-1000 ease-out brightness-[0.92] contrast-[1.05]"
              style={{ backgroundImage: `url("/pictures/catamaran.jpg")` }}
            />
          </div>

          {/* Panel Content Overlay */}
          <div className="relative z-20 h-full p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            {/* Top Tag */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center space-x-2 bg-black/45 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#C8AC75]/40 text-xs font-sans uppercase tracking-[0.2em] text-[#C8AC75] shadow-lg">
                <span className="font-mono font-bold text-[#C8AC75]">{panels.sailing.number}</span>
                <span className="text-[#C8AC75]/40">&bull;</span>
                <span>{panels.sailing.tag}</span>
              </div>
            </div>

            {/* Bottom Content Area */}
            <div className="pt-12 sm:pt-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-serif font-light tracking-tight text-[#F6F2E9] leading-tight mb-3 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
                {panels.sailing.headline}
              </h2>
              <p className="text-xs sm:text-sm lg:text-base text-[#F6F2E9]/90 font-sans font-light leading-relaxed mb-6 max-w-md drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]">
                {panels.sailing.description}
              </p>
              <button
                onClick={() => handleNavScroll('experiences')}
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-full bg-[#C8AC75] hover:bg-[#d8be89] text-[#0B2924] font-semibold text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.03] active:scale-95 group/btn border border-[#C8AC75] w-full sm:w-auto"
              >
                <Compass className="w-4 h-4 mr-2 text-[#0B2924] group-hover/btn:rotate-45 transition-transform duration-500" />
                <span>{panels.sailing.cta}</span>
              </button>
            </div>
          </div>
        </div>

        {/* PANEL 03 — GUNA CULTURE */}
        <div className="relative flex-1 group transition-all duration-700 ease-out hover:lg:flex-[1.35] overflow-hidden flex flex-col justify-between min-h-[380px] sm:min-h-[440px] lg:min-h-0">
          {/* Background Image */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B2924]/98 via-[#0B2924]/50 to-black/30 z-10 pointer-events-none" />
            <div 
              className="w-full h-full bg-cover bg-center group-hover:scale-105 transition-transform duration-1000 ease-out brightness-[0.92] contrast-[1.05]"
              style={{ backgroundImage: `url("/pictures/04 Learn about the Guna Community in San Blas.jpg")` }}
            />
          </div>

          {/* Panel Content Overlay */}
          <div className="relative z-20 h-full p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            {/* Top Tag */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center space-x-2 bg-black/45 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#C8AC75]/40 text-xs font-sans uppercase tracking-[0.2em] text-[#C8AC75] shadow-lg">
                <span className="font-mono font-bold text-[#C8AC75]">{panels.culture.number}</span>
                <span className="text-[#C8AC75]/40">&bull;</span>
                <span>{panels.culture.tag}</span>
              </div>
            </div>

            {/* Bottom Content Area */}
            <div className="pt-12 sm:pt-16">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-serif font-light tracking-tight text-[#F6F2E9] leading-tight mb-3 drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
                {panels.culture.headline}
              </h2>
              <p className="text-xs sm:text-sm lg:text-base text-[#F6F2E9]/90 font-sans font-light leading-relaxed mb-6 max-w-md drop-shadow-[0_1px_8px_rgba(0,0,0,0.8)]">
                {panels.culture.description}
              </p>
              <button
                onClick={() => handleNavScroll('heritage')}
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-full bg-[#C8AC75] hover:bg-[#d8be89] text-[#0B2924] font-semibold text-xs uppercase tracking-[0.2em] shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.03] active:scale-95 group/btn border border-[#C8AC75] w-full sm:w-auto"
              >
                <Sparkles className="w-4 h-4 mr-2 text-[#0B2924]" />
                <span>{panels.culture.cta}</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Trust Indicators Bar */}
      <div className="relative z-20 border-t border-[#C8AC75]/20 bg-[#0B2924]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center md:text-left">
          <div className="flex items-center space-x-3 justify-center md:justify-start">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-[#C8AC75] shrink-0" />
            <div>
              <div className="text-[11px] sm:text-xs text-[#C8AC75] uppercase tracking-wider font-semibold">
                {language === 'en' ? 'Guna Owned' : 'Propiedad Guna'}
              </div>
              <div className="text-[10px] sm:text-xs text-[#F6F2E9]/80 font-light">
                {language === 'en' ? 'Authentic Local Heritage' : 'Herencia Local Auténtica'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 justify-center md:justify-start">
            <Anchor className="w-4 h-4 sm:w-5 sm:h-5 text-[#C8AC75] shrink-0" />
            <div>
              <div className="text-[11px] sm:text-xs text-[#C8AC75] uppercase tracking-wider font-semibold">
                {language === 'en' ? '365 Islands' : '365 Islas'}
              </div>
              <div className="text-[10px] sm:text-xs text-[#F6F2E9]/80 font-light">
                {language === 'en' ? 'Pristine Caribbean Waters' : 'Aguas Caribeñas Vírgenes'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 justify-center md:justify-start">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-[#C8AC75] shrink-0" />
            <div>
              <div className="text-[11px] sm:text-xs text-[#C8AC75] uppercase tracking-wider font-semibold">
                {language === 'en' ? 'Private Transfers' : 'Traslados Privados'}
              </div>
              <div className="text-[10px] sm:text-xs text-[#F6F2E9]/80 font-light">
                {language === 'en' ? '4x4 & Speedboat Included' : '4x4 y Lancha Incluidos'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 justify-center md:justify-start">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#C8AC75] shrink-0" />
            <div>
              <div className="text-[11px] sm:text-xs text-[#C8AC75] uppercase tracking-wider font-semibold">
                {language === 'en' ? 'Tailored Itineraries' : 'Itinerarios a Medida'}
              </div>
              <div className="text-[10px] sm:text-xs text-[#F6F2E9]/80 font-light">
                {language === 'en' ? 'Day Trips & Overnight Stays' : 'Excursiones y Estadías'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
