import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { HERO_VIDEO_CONFIG } from '../videos';
import { VisualAsset } from '../pictures';
import { REVIEWS_METRIC } from '../data/reviews';
import { Calendar, ChevronDown, Volume2, VolumeX, Play, Pause } from 'lucide-react';

interface HeroProps {
  currentLang: Language;
  onExploreClick?: () => void;
  onPlanClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ currentLang, onExploreClick, onPlanClick }) => {
  const t = TRANSLATIONS[currentLang];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Background photo (src/pictures/images (1).jpg) is primary on header page load
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
    }
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        } else {
          setIsPlaying(true);
        }
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleScrollToNext = () => {
    const discoverSection = document.getElementById('discover');
    if (discoverSection) {
      discoverSection.scrollIntoView({ behavior: 'smooth' });
    } else if (onExploreClick) {
      onExploreClick();
    }
  };

  return (
    <section
      id="hero"
      className="relative w-full h-screen min-h-[640px] flex flex-col justify-between overflow-hidden bg-[#06121e] text-white select-none"
    >
      {/* ========================================================
          BACKGROUND LAYER: Header Page Hero Photo (header1.jpg)
          With optional smooth cinematic video toggle
         ======================================================== */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none w-full h-full max-w-full">
        
        {/* Header Page Background Image (src/pictures/header1.jpg) */}
        <img
          src="/pictures/header1.jpg"
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.includes('guna-yala-hero.jpg')) {
              target.src = '/pictures/hero/guna-yala-hero.jpg';
            }
          }}
          alt="Guna Yala San Blas Caribbean Ocean"
          width={2508}
          height={1664}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none filter brightness-95 contrast-105"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          loading="eager"
        />

        {/* Local Cinematic Destination Video (Overlay when user clicks play) */}
        <video
          ref={videoRef}
          autoPlay={false}
          muted
          loop
          playsInline
          preload="metadata"
          poster="/pictures/header1.jpg"
          onLoadedData={() => setVideoLoaded(true)}
          onCanPlay={() => setVideoLoaded(true)}
          onError={() => setVideoError(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 filter brightness-90 contrast-[1.04] pointer-events-none ${
            isPlaying && videoLoaded && !videoError ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        >
          <source src="/videos/guna-yala-hero.mp4" type="video/mp4" />
        </video>

        {/* Luxury Vignettes: preserves visual dominance while ensuring crisp typography */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-[#06121e]/90 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(6,18,30,0.6)_100%)] pointer-events-none" />
      </div>

      {/* ========================================================
          TOP BUFFER: Keeps center area clear for the GUNA YALA header composition
         ======================================================== */}
      <div className="h-28 sm:h-36 lg:h-40 pointer-events-none" />

      {/* ========================================================
          CENTER CONTENT: Minimal, Restrained Hero Copy
          "GUNA YALA - The islands. The culture. The experience."
         ======================================================== */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center my-auto">
        
        {/* Minimal Kicker Tag */}
        <div className="inline-flex items-center gap-2 mb-4 text-[10px] sm:text-xs font-mono uppercase tracking-[0.3em] text-cyan-200/90 drop-shadow-md">
          <span>{currentLang === 'es' ? 'Archipiélago de San Blas' : 'San Blas Archipelago'}</span>
          <span className="w-1 h-1 rounded-full bg-cyan-400 opacity-60" />
          <span>{currentLang === 'es' ? 'Comarca Indígena' : 'Autonomous Comarca'}</span>
        </div>

        {/* Minimal Hero Tagline in high-fashion editorial serif */}
        <h2 className="text-3xl sm:text-5xl md:text-6xl font-display italic font-light tracking-tight text-white leading-[1.15] drop-shadow-[0_4px_30px_rgba(0,0,0,0.8)] text-balance">
          {t.hero.tagline}
        </h2>

        {/* Restrained Luxury Call to Action */}
        <div className="mt-8 sm:mt-10 flex items-center justify-center">
          {/* Plan Your Trip */}
          <button
            onClick={onPlanClick}
            className="w-full sm:w-auto max-w-xs inline-flex items-center justify-center gap-2 px-8 py-3.5 text-xs sm:text-sm font-medium tracking-[0.18em] uppercase text-white bg-black/30 hover:bg-white/15 border border-white/30 hover:border-white/60 rounded-full backdrop-blur-md shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-95"
          >
            <Calendar className="w-3.5 h-3.5 text-cyan-300" />
            <span>{t.hero.secondaryCta}</span>
          </button>
        </div>

      </div>

      {/* ========================================================
          BOTTOM ZONE: Social Proof & Ambient Video Controls
         ======================================================== */}
      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-8 pb-6 sm:pb-8 pt-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 pt-4 sm:pt-5">
          
          {/* Left: Quantitative Proof (Subtle, unboxed, authentic) */}
          <div className="flex items-center gap-3 text-xs text-white/80">
            <div className="flex items-center gap-1 text-amber-300">
              <span className="font-bold text-white text-xs">5.0</span>
              <span className="text-[11px] tracking-tighter">★★★★★</span>
            </div>
            <span className="text-white/30">·</span>
            <span className="font-medium text-white/90">
              {REVIEWS_METRIC.reviewCount} {currentLang === 'es' ? 'Reseñas Verificadas' : 'Verified Google Reviews'}
            </span>
            <span className="hidden md:inline text-white/30">·</span>
            <span className="hidden md:inline text-cyan-300/90 font-mono text-[11px] uppercase tracking-wider">
              {t.hero.gunaOwned}
            </span>
          </div>

          {/* Center: Scroll down invitation */}
          <button
            onClick={handleScrollToNext}
            className="group inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-white/70 hover:text-white transition-colors"
          >
            <span>{t.hero.scrollInvite}</span>
            <ChevronDown className="w-3.5 h-3.5 animate-bounce text-cyan-300 group-hover:translate-y-0.5 transition-transform" />
          </button>

          {/* Right: Ambient Video Controls (Play/Pause & Mute) */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              disabled={videoError}
              className={`p-1.5 sm:p-2 rounded-full bg-black/40 hover:bg-black/60 border border-white/15 text-white/80 hover:text-white transition-colors backdrop-blur-sm ${
                videoError ? 'opacity-40 cursor-not-allowed' : ''
              }`}
              aria-label={isPlaying ? 'Pause background video' : 'Play background video'}
              title={isPlaying ? 'Pause Video' : 'Play Video'}
            >
              {isPlaying && !videoError ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </button>
            <button
              onClick={toggleMute}
              disabled={videoError}
              className={`p-1.5 sm:p-2 rounded-full bg-black/40 hover:bg-black/60 border border-white/15 text-white/80 hover:text-white transition-colors backdrop-blur-sm ${
                videoError ? 'opacity-40 cursor-not-allowed' : ''
              }`}
              aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>
          </div>

        </div>
      </div>
    </section>
  );
};
