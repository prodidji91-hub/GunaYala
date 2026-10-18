import React, { useEffect, useRef, useState } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, Sparkles, AlertCircle } from 'lucide-react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { IslandMediaItem } from '../videos';

interface IslandFilmModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  island: {
    id: string;
    name: string;
    gunaName?: string;
  } | null;
  mediaConfig?: IslandMediaItem;
}

export const IslandFilmModal: React.FC<IslandFilmModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  island,
  mediaConfig,
}) => {
  const t = TRANSLATIONS[currentLang];
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [videoLoaded, setVideoLoaded] = useState<boolean>(false);
  const [videoError, setVideoError] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const videoUrl = mediaConfig?.videoUrl;
  const posterUrl = mediaConfig?.posterUrl || '/pictures/hero/guna-yala-hero.jpg';

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Clean stop and reset when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setIsPlaying(false);
      setCurrentTime(0);
      setVideoError(false);
      setVideoLoaded(false);
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      setIsPlaying(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    onClose();
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('Playback prevented:', err);
            setIsPlaying(false);
          });
      }
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setVideoLoaded(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!isOpen || !island) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${island.name} - ${t.islands.modalFilmTitle}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl transition-all duration-300"
      onClick={handleClose}
    >
      <div
        ref={containerRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-[#0B2924] border border-[#C8AC75]/40 rounded-2xl overflow-hidden shadow-2xl flex flex-col text-white"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-[#C8AC75]/20 bg-[#061815]/95">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#C8AC75] animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-serif tracking-wide text-white">
                  {island.name}
                </h3>
                {island.gunaName && (
                  <span className="text-[11px] font-sans text-[#C8AC75]/80 font-light hidden sm:inline">
                    · {island.gunaName}
                  </span>
                )}
              </div>
              <p className="text-[10px] uppercase font-sans tracking-[0.2em] text-[#C8AC75]">
                {t.islands.modalFilmTitle}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-[#C8AC75]"
            aria-label={t.islands.closeFilmBtn}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Canvas Container */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
          {videoUrl && !videoError ? (
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                poster={posterUrl}
                playsInline
                preload="metadata"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onError={() => setVideoError(true)}
                className="w-full h-full object-contain cursor-pointer"
                onClick={togglePlay}
              />

              {/* Big Center Play Button when Paused */}
              {!isPlaying && (
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-[#0B2924]/85 hover:bg-[#0B2924] border border-[#C8AC75] text-[#C8AC75] hover:text-white flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-108 focus:outline-none focus:ring-2 focus:ring-[#C8AC75]"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  <Play className="w-8 h-8 translate-x-0.5 fill-current" />
                </button>
              )}
            </>
          ) : (
            /* Fallback when video is unavailable */
            <div className="relative w-full h-full flex flex-col items-center justify-center p-8 text-center bg-[#071F1B]">
              <img
                src={posterUrl}
                alt={island.name}
                className="absolute inset-0 w-full h-full object-cover opacity-35 filter blur-xs"
              />
              <div className="relative z-10 max-w-md p-6 bg-[#0B2924]/90 backdrop-blur-md rounded-xl border border-[#C8AC75]/30">
                <AlertCircle className="w-8 h-8 text-[#C8AC75] mx-auto mb-3" />
                <h4 className="text-base font-serif text-white mb-2">
                  {currentLang === 'es' ? 'Archivo de Film en Preparación' : 'Island Film in Production'}
                </h4>
                <p className="text-xs text-[#F6F2E9]/80 font-light leading-relaxed mb-4">
                  {currentLang === 'es'
                    ? 'El metraje original de esta isla se encuentra en proceso de edición. Disfrute de nuestra galería de fotografías y detalles verificados.'
                    : 'Original aerial footage for this island is currently being curated. Enjoy our verified photography and comprehensive logistics below.'}
                </p>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-[#C8AC75] text-[#0B2924] text-xs font-semibold tracking-wider uppercase rounded-lg hover:bg-white transition-colors"
                >
                  {currentLang === 'es' ? 'Ver Detalles de la Isla' : 'View Island Information'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Video Controls Bar */}
        {videoUrl && !videoError && (
          <div className="px-4 sm:px-6 py-3 bg-[#061815] border-t border-[#C8AC75]/20 flex flex-col gap-2">
            {/* Timeline slider */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-[#C8AC75] w-10 text-right">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#C8AC75] focus:outline-none"
                aria-label="Video timeline"
              />
              <span className="text-[11px] font-mono text-white/50 w-10">
                {formatTime(duration)}
              </span>
            </div>

            {/* Bottom buttons */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="p-1.5 text-[#C8AC75] hover:text-white transition-colors focus:outline-none"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                <button
                  onClick={toggleMute}
                  className="p-1.5 text-white/70 hover:text-[#C8AC75] transition-colors focus:outline-none"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                <span className="text-xs text-white/60 font-sans hidden sm:inline">
                  {isPlaying ? (currentLang === 'es' ? 'Reproduciendo...' : 'Playing film...') : (currentLang === 'es' ? 'Pausado' : 'Paused')}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 text-white/70 hover:text-[#C8AC75] transition-colors focus:outline-none"
                  aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
