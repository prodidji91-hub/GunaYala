import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, Sparkles, Compass, Play, Pause, Volume2, VolumeX, Shield, Anchor, MapPin, Music } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';

interface HeroProps {
  currentLang: Language;
  onExploreClick: () => void;
  onPlanClick?: () => void;
  onBookClick?: () => void;
}

type SoundPanel = 'islands' | 'sailing' | 'culture' | null;

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
  const [videoError, setVideoError] = useState(false);
  const [sailingVideoError, setSailingVideoError] = useState(false);

  // Ambient audio states
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [activeSoundPanel, setActiveSoundPanel] = useState<SoundPanel>('islands');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const sailingVideoRef = useRef<HTMLVideoElement>(null);

  // Ambient audio refs
  const islandsAudioRef = useRef<HTMLAudioElement | null>(null);
  const sailingAudioRef = useRef<HTMLAudioElement | null>(null);
  const cultureAudioRef = useRef<HTMLAudioElement | null>(null);

  const fadeIntervalRef = useRef<number | null>(null);

  // Initialize ambient audio elements
  useEffect(() => {
    const a1 = new Audio('/audio/track1.mp3');
    a1.loop = true;
    a1.preload = 'auto';
    a1.volume = 0;
    islandsAudioRef.current = a1;

    const a2 = new Audio('/audio/track2.mp3');
    a2.loop = true;
    a2.preload = 'auto';
    a2.volume = 0;
    sailingAudioRef.current = a2;

    const a3 = new Audio('/audio/guna-culture-ambient.mp3');
    a3.loop = true;
    a3.preload = 'auto';
    a3.volume = 0;
    cultureAudioRef.current = a3;

    return () => {
      a1.pause();
      a2.pause();
      a3.pause();
    };
  }, []);

  // Smooth crossfade management for audio soundscapes
  useEffect(() => {
    if (fadeIntervalRef.current) {
      window.clearInterval(fadeIntervalRef.current);
    }

    const audioMap: Record<NonNullable<SoundPanel>, HTMLAudioElement | null> = {
      islands: islandsAudioRef.current,
      sailing: sailingAudioRef.current,
      culture: cultureAudioRef.current,
    };

    const targetVolumes: Record<NonNullable<SoundPanel>, number> = {
      islands: isSoundEnabled && activeSoundPanel === 'islands' ? 0.3 : 0,
      sailing: isSoundEnabled && activeSoundPanel === 'sailing' ? 0.3 : 0,
      culture: isSoundEnabled && activeSoundPanel === 'culture' ? 0.3 : 0,
    };

    // Attempt playback if audio enabled
    if (isSoundEnabled) {
      Object.entries(audioMap).forEach(([key, audio]) => {
        if (audio) {
          const target = targetVolumes[key as NonNullable<SoundPanel>];
          if (target > 0 && audio.paused) {
            audio.play().catch((err) => {
              console.warn('Audio playback prevented by browser policy:', err);
            });
          }
        }
      });
    }

    // Step-by-step smooth volume transition
    fadeIntervalRef.current = window.setInterval(() => {
      let allSettled = true;

      (Object.keys(audioMap) as Array<NonNullable<SoundPanel>>).forEach((key) => {
        const audio = audioMap[key];
        if (!audio) return;

        const target = targetVolumes[key];
        const current = audio.volume;
        const step = 0.08;

        if (Math.abs(current - target) > step) {
          allSettled = false;
          if (current < target) {
            audio.volume = Math.min(target, current + step);
          } else {
            audio.volume = Math.max(target, current - step);
          }
        } else {
          audio.volume = target;
          if (target === 0 && !audio.paused) {
            audio.pause();
          }
        }
      });

      if (allSettled && fadeIntervalRef.current) {
        window.clearInterval(fadeIntervalRef.current);
      }
    }, 40);

    return () => {
      if (fadeIntervalRef.current) {
        window.clearInterval(fadeIntervalRef.current);
      }
    };
  }, [isSoundEnabled, activeSoundPanel]);

  // Handle video playback
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => setVideoError(true));
      } else {
        videoRef.current.pause();
      }
    }
    if (sailingVideoRef.current) {
      if (isPlaying) {
        sailingVideoRef.current.play().catch(() => setSailingVideoError(true));
      } else {
        sailingVideoRef.current.pause();
      }
    }
  }, [isPlaying]);

  const togglePanelAudio = (panel: SoundPanel) => {
    if (!isSoundEnabled) {
      setIsSoundEnabled(true);
      setActiveSoundPanel(panel);
    } else if (activeSoundPanel === panel) {
      setIsSoundEnabled(false);
    } else {
      setActiveSoundPanel(panel);
    }
  };

  const handlePanelHover = (panel: SoundPanel) => {
    if (isSoundEnabled) {
      setActiveSoundPanel(panel);
    }
  };

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
        <div 
          onMouseEnter={() => handlePanelHover('islands')}
          className="relative flex-1 group transition-all duration-700 ease-out hover:lg:flex-[1.35] border-b-2 lg:border-b-0 lg:border-r-2 border-[#C8AC75] overflow-hidden flex flex-col justify-between min-h-[380px] sm:min-h-[440px] lg:min-h-0"
        >
          {/* Background Video / Photo Backdrop */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-[#040E15]/70 via-[#071722]/20 to-black/10 z-10 pointer-events-none" />
            
            {!videoError ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                poster="/pictures/hero/guna-yala-hero.jpg"
                onError={() => setVideoError(true)}
                className="w-full h-full object-cover object-center scale-100 group-hover:scale-[1.03] transform-gpu backface-hidden transition-transform duration-1000 ease-out brightness-[1.05] saturate-[1.05]"
              >
                <source src="/videos/Islands.mp4" type="video/mp4" />
                Your browser does not support video.
              </video>
            ) : (
              <div 
                className="w-full h-full bg-cover bg-center group-hover:scale-[1.03] transform-gpu transition-transform duration-1000 ease-out brightness-[1.05] saturate-[1.05] contrast-[1.02]"
                style={{ backgroundImage: `url("/pictures/hero/guna-yala-hero.jpg")` }}
              />
            )}
          </div>

          {/* Panel Content Overlay */}
          <div className="relative z-20 h-full p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            {/* Top Tag & Video/Audio Controls */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center space-x-2 bg-black/45 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#C8AC75]/40 text-xs font-sans uppercase tracking-[0.2em] text-[#C8AC75] shadow-lg">
                <span className="font-mono font-bold text-[#C8AC75]">{panels.islands.number}</span>
                <span className="text-[#C8AC75]/40">&bull;</span>
                <span>{panels.islands.tag}</span>
              </div>

              {/* Minimal Audio & Video Control Pill for Panel 01 */}
              <div className="flex items-center space-x-2 bg-black/45 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#C8AC75]/30">
                <button 
                  onClick={() => togglePanelAudio('islands')} 
                  className={`flex items-center space-x-1.5 text-xs transition-colors ${
                    isSoundEnabled && activeSoundPanel === 'islands' ? 'text-[#C8AC75] font-semibold' : 'text-[#F6F2E9]/80 hover:text-[#C8AC75]'
                  }`}
                  aria-label={isSoundEnabled && activeSoundPanel === 'islands' ? "Mute audio" : "Play Islands soundscape"}
                  title={isSoundEnabled && activeSoundPanel === 'islands' ? "Mute audio" : "Play Islands soundscape (ocean waves & tropical birds)"}
                >
                  {isSoundEnabled && activeSoundPanel === 'islands' ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-[#C8AC75] animate-pulse" />
                      <div className="flex items-end space-x-[2px] h-3">
                        <span className="w-[2px] bg-[#C8AC75] animate-[bounce_0.8s_infinite_100ms] h-full" />
                        <span className="w-[2px] bg-[#C8AC75] animate-[bounce_0.8s_infinite_300ms] h-2" />
                        <span className="w-[2px] bg-[#C8AC75] animate-[bounce_0.8s_infinite_200ms] h-2.5" />
                      </div>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5" />
                      <span className="text-[10px] tracking-wider uppercase hidden sm:inline">{language === 'en' ? 'Sound' : 'Audio'}</span>
                    </>
                  )}
                </button>
                <div className="w-px h-3 bg-[#C8AC75]/30" />
                <button 
                  onClick={() => setIsPlaying(!isPlaying)} 
                  className="text-[#F6F2E9]/80 hover:text-[#C8AC75] p-0.5 transition-colors"
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
        <div 
          onMouseEnter={() => handlePanelHover('sailing')}
          className="relative flex-1 group transition-all duration-700 ease-out hover:lg:flex-[1.35] border-b-2 lg:border-b-0 lg:border-r-2 border-[#C8AC75] overflow-hidden flex flex-col justify-between min-h-[380px] sm:min-h-[440px] lg:min-h-0"
        >
          {/* Background Video / Photo Backdrop */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-[#040E15]/70 via-[#071722]/20 to-black/10 z-10 pointer-events-none" />
            
            {!sailingVideoError ? (
              <video
                ref={sailingVideoRef}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                poster="/pictures/catamaran.jpg"
                onError={() => setSailingVideoError(true)}
                className="w-full h-full object-cover object-center scale-100 group-hover:scale-[1.03] transform-gpu backface-hidden transition-transform duration-1000 ease-out brightness-[1.05] saturate-[1.05]"
              >
                <source src="/videos/sailinggmp4.mp4" type="video/mp4" />
                Your browser does not support video.
              </video>
            ) : (
              <div 
                className="w-full h-full bg-cover bg-center group-hover:scale-[1.03] transform-gpu transition-transform duration-1000 ease-out brightness-[1.05] saturate-[1.05] contrast-[1.02]"
                style={{ backgroundImage: `url("/pictures/catamaran.jpg")` }}
              />
            )}
          </div>

          {/* Panel Content Overlay */}
          <div className="relative z-20 h-full p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            {/* Top Tag & Controls */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center space-x-2 bg-black/45 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#C8AC75]/40 text-xs font-sans uppercase tracking-[0.2em] text-[#C8AC75] shadow-lg">
                <span className="font-mono font-bold text-[#C8AC75]">{panels.sailing.number}</span>
                <span className="text-[#C8AC75]/40">&bull;</span>
                <span>{panels.sailing.tag}</span>
              </div>

              {/* Minimal Audio & Video Control Pill for Panel 02 */}
              <div className="flex items-center space-x-2 bg-black/45 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#C8AC75]/30">
                <button 
                  onClick={() => togglePanelAudio('sailing')} 
                  className={`flex items-center space-x-1.5 text-xs transition-colors ${
                    isSoundEnabled && activeSoundPanel === 'sailing' ? 'text-[#C8AC75] font-semibold' : 'text-[#F6F2E9]/80 hover:text-[#C8AC75]'
                  }`}
                  aria-label={isSoundEnabled && activeSoundPanel === 'sailing' ? "Mute audio" : "Play Sailing soundscape"}
                  title={isSoundEnabled && activeSoundPanel === 'sailing' ? "Mute audio" : "Play Sailing soundscape (ocean breeze & water splashes)"}
                >
                  {isSoundEnabled && activeSoundPanel === 'sailing' ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-[#C8AC75] animate-pulse" />
                      <div className="flex items-end space-x-[2px] h-3">
                        <span className="w-[2px] bg-[#C8AC75] animate-[bounce_0.8s_infinite_100ms] h-full" />
                        <span className="w-[2px] bg-[#C8AC75] animate-[bounce_0.8s_infinite_300ms] h-2" />
                        <span className="w-[2px] bg-[#C8AC75] animate-[bounce_0.8s_infinite_200ms] h-2.5" />
                      </div>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5" />
                      <span className="text-[10px] tracking-wider uppercase hidden sm:inline">{language === 'en' ? 'Sound' : 'Audio'}</span>
                    </>
                  )}
                </button>
                <div className="w-px h-3 bg-[#C8AC75]/30" />
                <button 
                  onClick={() => setIsPlaying(!isPlaying)} 
                  className="text-[#F6F2E9]/80 hover:text-[#C8AC75] p-0.5 transition-colors"
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
        <div 
          onMouseEnter={() => handlePanelHover('culture')}
          className="relative flex-1 group transition-all duration-700 ease-out hover:lg:flex-[1.35] overflow-hidden flex flex-col justify-between min-h-[380px] sm:min-h-[440px] lg:min-h-0"
        >
          {/* Background Image */}
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-[#040E15]/70 via-[#071722]/20 to-black/10 z-10 pointer-events-none" />
            <div 
              className="w-full h-full bg-cover bg-center group-hover:scale-[1.03] transform-gpu transition-transform duration-1000 ease-out brightness-[1.05] saturate-[1.05] contrast-[1.02]"
              style={{ backgroundImage: `url("/pictures/04 Learn about the Guna Community in San Blas.jpg")` }}
            />
          </div>

          {/* Panel Content Overlay */}
          <div className="relative z-20 h-full p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            {/* Top Tag & Control */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center space-x-2 bg-black/45 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#C8AC75]/40 text-xs font-sans uppercase tracking-[0.2em] text-[#C8AC75] shadow-lg">
                <span className="font-mono font-bold text-[#C8AC75]">{panels.culture.number}</span>
                <span className="text-[#C8AC75]/40">&bull;</span>
                <span>{panels.culture.tag}</span>
              </div>

              {/* Minimal Audio Control Pill for Panel 03 */}
              <div className="flex items-center space-x-2 bg-black/45 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#C8AC75]/30">
                <button 
                  onClick={() => togglePanelAudio('culture')} 
                  className={`flex items-center space-x-1.5 text-xs transition-colors ${
                    isSoundEnabled && activeSoundPanel === 'culture' ? 'text-[#C8AC75] font-semibold' : 'text-[#F6F2E9]/80 hover:text-[#C8AC75]'
                  }`}
                  aria-label={isSoundEnabled && activeSoundPanel === 'culture' ? "Mute audio" : "Play Guna Culture soundscape"}
                  title={isSoundEnabled && activeSoundPanel === 'culture' ? "Mute audio" : "Play Guna Culture soundscape (coastal village & breeze)"}
                >
                  {isSoundEnabled && activeSoundPanel === 'culture' ? (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-[#C8AC75] animate-pulse" />
                      <div className="flex items-end space-x-[2px] h-3">
                        <span className="w-[2px] bg-[#C8AC75] animate-[bounce_0.8s_infinite_100ms] h-full" />
                        <span className="w-[2px] bg-[#C8AC75] animate-[bounce_0.8s_infinite_300ms] h-2" />
                        <span className="w-[2px] bg-[#C8AC75] animate-[bounce_0.8s_infinite_200ms] h-2.5" />
                      </div>
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-3.5 h-3.5" />
                      <span className="text-[10px] tracking-wider uppercase hidden sm:inline">{language === 'en' ? 'Sound' : 'Audio'}</span>
                    </>
                  )}
                </button>
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

      {/* Bottom Trust Indicators Bar with Soundscape Status */}
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
            <Music className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${isSoundEnabled ? 'text-[#C8AC75] animate-pulse' : 'text-[#C8AC75]/60'}`} />
            <div>
              <div className="text-[11px] sm:text-xs text-[#C8AC75] uppercase tracking-wider font-semibold">
                {isSoundEnabled 
                  ? (language === 'en' ? `Audio: ${activeSoundPanel === 'islands' ? 'Islands' : activeSoundPanel === 'sailing' ? 'Sailing' : 'Culture'}` : `Audio: ${activeSoundPanel === 'islands' ? 'Islas' : activeSoundPanel === 'sailing' ? 'Navegación' : 'Cultura'}`)
                  : (language === 'en' ? 'Ambient Soundscapes' : 'Sonidos Ambientales')}
              </div>
              <div className="text-[10px] sm:text-xs text-[#F6F2E9]/80 font-light">
                {isSoundEnabled
                  ? (language === 'en' ? 'Hover panels to switch soundscapes' : 'Pasa el cursor para cambiar sonido')
                  : (language === 'en' ? 'Click sound button to enable audio' : 'Haz clic en el botón de audio para activar')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
