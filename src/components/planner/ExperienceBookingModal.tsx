import React, { useEffect, useState } from 'react';
import { Language, Experience, ExperienceCategory } from '../../types';
import { ExperienceSelector } from './ExperienceSelector';
import { DayTripBookingFlow } from './DayTripBookingFlow';
import { OvernightFlow } from './OvernightFlow';
import { PrivateCustomFlow } from './PrivateCustomFlow';
import { HelpMeChooseFlow } from './HelpMeChooseFlow';
import { FlagUS, FlagPanama } from '../FlagIcons';
import { X, ArrowLeft } from 'lucide-react';

export type PlannerFlowPath =
  | 'selector'
  | 'day-trip'
  | 'overnight'
  | 'multi-day'
  | 'private-custom'
  | 'sailing'
  | 'catamaran'
  | 'help-me-choose';

interface ExperienceBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  initialPath?: PlannerFlowPath;
  initialCategory?: ExperienceCategory;
  onOpenExperienceDetails?: (exp: Experience) => void;
}

export const ExperienceBookingModal: React.FC<ExperienceBookingModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  onLanguageChange,
  initialPath = 'selector',
  initialCategory,
  onOpenExperienceDetails,
}) => {
  const isEs = currentLang === 'es';

  // Determine initial path based on incoming props
  const getInitialPathFromCategory = (): PlannerFlowPath => {
    if (initialCategory === 'day-trip') return 'day-trip';
    if (initialCategory === 'overnight') return 'overnight';
    if (initialCategory === 'multi-day') return 'multi-day';
    if (initialCategory === 'sailing') return 'sailing';
    if (initialCategory === 'catamaran') return 'catamaran';
    if (initialCategory === 'private-custom') return 'private-custom';
    return initialPath || 'selector';
  };

  const [activePath, setActivePath] = useState<PlannerFlowPath>(getInitialPathFromCategory());

  useEffect(() => {
    if (isOpen) {
      setActivePath(getInitialPathFromCategory());
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialPath, initialCategory]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-[#06121e]/85 backdrop-blur-md flex flex-col justify-start animate-fadeIn"
    >
      {/* Top Floating App Bar */}
      <header className="sticky top-0 z-20 w-full bg-[#faf7f2]/95 backdrop-blur-md border-b border-[#e5dccb] px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          {activePath !== 'selector' && (
            <button
              onClick={() => setActivePath('selector')}
              className="p-1.5 -ml-1 text-[#475569] hover:text-[#06121e] rounded-lg hover:bg-[#ede5d6] transition-colors"
              title={isEs ? 'Volver a Selección' : 'Back to Selection'}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div>
            <span className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#0e7490] block">
              GUNA YALA PANAMA TRAVEL
            </span>
            <span className="text-sm font-display font-medium text-[#06121e]">
              {isEs ? 'Planificador de Viaje' : 'Trip Planning & Booking'}
            </span>
          </div>
        </div>

        {/* Right Actions: Lang Switcher & Close */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1 bg-[#ede5d6]/70 border border-[#dcd2be] rounded-full p-0.5 text-xs font-mono tracking-wider">
            <button
              onClick={() => onLanguageChange('en')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all ${
                currentLang === 'en'
                  ? 'font-bold text-[#06121e] bg-white border border-[#dcd2be] shadow-xs'
                  : 'text-[#64748b] hover:text-[#06121e]'
              }`}
              title="English (US)"
            >
              <FlagUS className="w-3.5 h-2.5" />
              <span>EN</span>
            </button>
            <span className="text-[#cbd5e1] text-[10px]">|</span>
            <button
              onClick={() => onLanguageChange('es')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all ${
                currentLang === 'es'
                  ? 'font-bold text-[#06121e] bg-white border border-[#dcd2be] shadow-xs'
                  : 'text-[#64748b] hover:text-[#06121e]'
              }`}
              title="Español (Panamá)"
            >
              <FlagPanama className="w-3.5 h-2.5" />
              <span>ES</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#475569] hover:text-[#06121e] hover:bg-[#ede5d6] transition-colors"
            aria-label="Close booking planner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Flow Body */}
      <main className="flex-1 w-full bg-[#faf7f2] py-4 sm:py-8">
        {activePath === 'selector' && (
          <ExperienceSelector
            currentLang={currentLang}
            onSelectPath={(path) => setActivePath(path)}
          />
        )}

        {activePath === 'day-trip' && (
          <DayTripBookingFlow
            currentLang={currentLang}
            onBackToSelector={() => setActivePath('selector')}
          />
        )}

        {(activePath === 'overnight' || activePath === 'multi-day') && (
          <OvernightFlow
            currentLang={currentLang}
            onBackToSelector={() => setActivePath('selector')}
            onOpenDetailsModal={onOpenExperienceDetails}
          />
        )}

        {(activePath === 'private-custom' || activePath === 'sailing' || activePath === 'catamaran') && (
          <PrivateCustomFlow
            currentLang={currentLang}
            onBackToSelector={() => setActivePath('selector')}
          />
        )}

        {activePath === 'help-me-choose' && (
          <HelpMeChooseFlow
            currentLang={currentLang}
            onBackToSelector={() => setActivePath('selector')}
            onNavigateToPath={(path) => setActivePath(path)}
          />
        )}
      </main>
    </div>
  );
};
