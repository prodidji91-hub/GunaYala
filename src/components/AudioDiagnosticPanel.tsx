import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Play, Square, AlertCircle, CheckCircle2, ShieldAlert, Music } from 'lucide-react';

interface CandidateTrack {
  filename: string;
  path: string;
  duration: string;
  description: string;
}

const CANDIDATE_TRACKS: CandidateTrack[] = [
  {
    filename: 'Island_Escape_Tropical_Birds_Waves_Music_Balanced_V2.mp3',
    path: '/audio/Island_Escape_Tropical_Birds_Waves_Music_Balanced_V2.mp3',
    duration: '0:40',
    description: 'Approved Island Escape soundtrack: Gentle Caribbean waves, tropical birds & relaxing music (160kbps MP3)',
  },
  {
    filename: 'escapesound.mp3',
    path: '/audio/escapesound.mp3',
    duration: '1:01',
    description: 'Approved Sailing Adventures soundtrack: Tropical birds & island ocean ambience (192kbps MP3)',
  },
  {
    filename: 'sailing-caribbean-v2.mp3',
    path: '/audio/sailing-caribbean-v2.mp3',
    duration: '0:32',
    description: 'Caribbean ocean breeze soundscape (163kbps MP3)',
  },
  {
    filename: 'track2.mp3',
    path: '/audio/track2.mp3',
    duration: '1:32',
    description: 'Cinematic Caribbean ocean soundscape track 2 (192kbps MP3)',
  },
  {
    filename: 'san-blas-beach.wav',
    path: '/audio/san-blas-beach.wav',
    duration: '0:30',
    description: 'Uncompressed beach waves recording (1411kbps WAV)',
  },
  {
    filename: 'islands-ambient.mp3',
    path: '/audio/islands-ambient.mp3',
    duration: '0:10',
    description: 'Short island ambient loop (22kHz PCM)',
  },
  {
    filename: 'sailing-ambient.mp3',
    path: '/audio/sailing-ambient.mp3',
    duration: '0:10',
    description: 'Short sailing ambient loop (22kHz PCM)',
  },
];

export const AudioDiagnosticPanel: React.FC = () => {
  // Only render in development environment
  if (!import.meta.env.DEV) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [playingPath, setPlayingPath] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<Record<string, string>>({});
  const [actualSrcs, setActualSrcs] = useState<Record<string, string>>({});

  const testAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleTogglePlay = (track: CandidateTrack) => {
    if (playingPath === track.path) {
      if (testAudioRef.current) {
        testAudioRef.current.pause();
        testAudioRef.current.currentTime = 0;
      }
      setPlayingPath(null);
      return;
    }

    // Stop current testing track
    if (testAudioRef.current) {
      testAudioRef.current.pause();
    }

    const audio = new Audio(track.path);
    audio.loop = true;
    audio.volume = 0.7;
    audio.muted = false;

    setActualSrcs((prev) => ({ ...prev, [track.path]: audio.src }));
    setPlaybackError((prev) => ({ ...prev, [track.path]: '' }));

    audio
      .play()
      .then(() => {
        testAudioRef.current = audio;
        setPlayingPath(track.path);
        setActualSrcs((prev) => ({ ...prev, [track.path]: audio.currentSrc || audio.src }));
      })
      .catch((err) => {
        console.error(`[Audio Diagnostic Error] Failed playing ${track.filename}:`, err);
        setPlaybackError((prev) => ({
          ...prev,
          [track.path]: err?.message || 'Playback blocked or decode error',
        }));
        setPlayingPath(null);
      });
  };

  useEffect(() => {
    return () => {
      if (testAudioRef.current) {
        testAudioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2 bg-[#0B2924] hover:bg-[#143B34] text-[#C8AC75] px-4 py-2.5 rounded-full border border-[#C8AC75]/50 shadow-2xl transition-all duration-300 text-xs font-mono font-semibold"
        >
          <Music className="w-4 h-4 animate-pulse" />
          <span>Audio Diagnostics Suite (DEV)</span>
        </button>
      ) : (
        <div className="w-96 max-w-[92vw] bg-[#071722]/95 backdrop-blur-xl border border-[#C8AC75]/50 rounded-2xl shadow-2xl overflow-hidden text-[#F6F2E9] flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="p-4 bg-[#0B2924] border-b border-[#C8AC75]/30 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-[#C8AC75]" />
              <h3 className="text-xs font-mono uppercase tracking-wider font-bold text-[#C8AC75]">
                Audio Diagnostic Suite
              </h3>
            </div>
            <button
              onClick={() => {
                if (testAudioRef.current) testAudioRef.current.pause();
                setPlayingPath(null);
                setIsOpen(false);
              }}
              className="text-[#F6F2E9]/60 hover:text-[#F6F2E9] text-xs px-2 py-1 rounded bg-black/30"
            >
              Close ✕
            </button>
          </div>

          {/* Subtitle / Instructions */}
          <div className="p-3 bg-black/40 border-b border-white/5 text-[11px] text-[#F6F2E9]/80 leading-relaxed">
            Test candidate MP3 files synchronously. Use these test controls to sample approved soundtracks for Sailing Adventures & Island Escape.
          </div>

          {/* Candidate File List */}
          <div className="p-3 overflow-y-auto space-y-2.5 flex-1 divide-y divide-white/5">
            {CANDIDATE_TRACKS.map((track) => {
              const isPlayingThis = playingPath === track.path;
              const error = playbackError[track.path];
              const currentSrc = actualSrcs[track.path];

              return (
                <div key={track.path} className="pt-2.5 first:pt-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-mono font-bold text-[#C8AC75] flex items-center space-x-1.5">
                        <span>{track.filename}</span>
                        <span className="text-[10px] text-white/50 font-normal">({track.duration})</span>
                      </div>
                      <p className="text-[10px] text-white/70 mt-0.5 leading-tight">{track.description}</p>
                    </div>

                    <button
                      onClick={() => handleTogglePlay(track)}
                      className={`shrink-0 flex items-center space-x-1 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                        isPlayingThis
                          ? 'bg-[#E94F4F] text-white shadow-lg animate-pulse'
                          : 'bg-[#C8AC75] hover:bg-[#d8be89] text-[#0B2924]'
                      }`}
                    >
                      {isPlayingThis ? (
                        <>
                          <Square className="w-3 h-3 fill-current" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current" />
                          <span>Play</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Diagnostic Details */}
                  {currentSrc && (
                    <div className="mt-1.5 text-[9px] font-mono text-white/50 truncate">
                      src: {currentSrc}
                    </div>
                  )}

                  {error && (
                    <div className="mt-1 flex items-center space-x-1 text-[10px] text-red-400 bg-red-950/40 p-1.5 rounded border border-red-800/40">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {isPlayingThis && (
                    <div className="mt-1 flex items-center space-x-1 text-[10px] text-emerald-400 bg-emerald-950/40 p-1 rounded border border-emerald-800/40">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>Playing live audio output</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-2.5 bg-[#0B2924]/80 border-t border-[#C8AC75]/20 text-[10px] text-[#C8AC75]/80 text-center font-mono">
            Development Only &bull; Excluded from Production
          </div>
        </div>
      )}
    </div>
  );
};
