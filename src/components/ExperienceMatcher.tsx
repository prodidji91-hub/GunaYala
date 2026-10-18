import React, { useState } from 'react';
import { Language, ExperienceCategory } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { EXPERIENCES_DATA } from '../data/experiences';
import { Sparkles, ArrowRight, RotateCcw, Check, Compass } from 'lucide-react';

interface ExperienceMatcherProps {
  currentLang: Language;
  onSelectExperience: (categoryId: ExperienceCategory) => void;
  onViewExperienceDetails: (experienceId: string) => void;
}

export const ExperienceMatcher: React.FC<ExperienceMatcherProps> = ({
  currentLang,
  onSelectExperience,
  onViewExperienceDetails,
}) => {
  const t = TRANSLATIONS[currentLang];

  // Questionnaire state
  const [timeChoice, setTimeChoice] = useState<'1day' | 'overnight' | 'multiday' | null>(null);
  const [vibeChoice, setVibeChoice] = useState<'relax' | 'culture' | 'snorkel' | 'sail' | 'private' | null>(null);
  const [partyChoice, setPartyChoice] = useState<'solo' | 'couple' | 'family' | 'friends' | null>(null);

  // Logic to determine best matching experience
  const getRecommendation = (): { id: string; category: ExperienceCategory; reason: { en: string; es: string } } | null => {
    if (!timeChoice || !vibeChoice || !partyChoice) return null;

    if (vibeChoice === 'sail') {
      if (partyChoice === 'family' || partyChoice === 'friends') {
        return {
          id: 'luxury-catamaran-charter',
          category: 'catamaran',
          reason: {
            en: 'A catamaran offers wide sun decks, private en-suite cabins, and maximum stability on the water, ideal for families and friends.',
            es: 'Un catamarán ofrece amplias terrazas, camarotes en suite privados y máxima estabilidad en el agua, ideal para familias y grupos.',
          },
        };
      }
      return {
        id: 'sailing-adventure',
        category: 'sailing',
        reason: {
          en: 'An authentic monohull sailing experience navigating remote outer atolls under wind power, perfect for couples and ocean lovers.',
          es: 'Una auténtica experiencia a vela navegando por atolones exteriores a fuerza de viento, perfecta para parejas y amantes del mar.',
        },
      };
    }

    if (vibeChoice === 'private' || partyChoice === 'family') {
      if (timeChoice === '1day') {
        return {
          id: 'private-custom-experience',
          category: 'private-custom',
          reason: {
            en: 'A private boat and dedicated 4x4 allows you to set your own timing, avoid crowded spots, and travel comfortably with your family.',
            es: 'Un bote privado y 4x4 dedicado le permite fijar sus horarios, evitar aglomeraciones y viajar cómodamente con su familia.',
          },
        };
      }
      return {
        id: 'luxury-catamaran-charter',
        category: 'catamaran',
        reason: {
          en: 'A private multi-day yacht or catamaran provides an exclusive, tranquil retreat across the secluded outer cays.',
          es: 'Un catamarán o yate privado multidía ofrece un retiro exclusivo y sereno a través de los cayos exteriores más aislados.',
        },
      };
    }

    if (vibeChoice === 'culture') {
      return {
        id: 'multi-day-exploration',
        category: 'multi-day',
        reason: {
          en: 'Our multi-day journeys include dedicated visits to traditional Guna island communities and mola artisan villages with local guides.',
          es: 'Nuestras travesías multidía incluyen visitas guiadas a comunidades tradicionales guna y pueblos de artesanas de la mola.',
        },
      };
    }

    if (timeChoice === '1day') {
      return {
        id: 'day-trip-classic',
        category: 'day-trip',
        reason: {
          en: 'Our classic day trip delivers the iconic San Blas experience: 2 to 3 coral cays, the Natural Pool sandbar, and fresh seafood lunch.',
          es: 'Nuestra clásica excursión de un día ofrece lo esencial de San Blas: 2 a 3 islas de coral, la Piscina Natural y almuerzo fresco.',
        },
      };
    }

    if (timeChoice === 'overnight') {
      return {
        id: 'overnight-island-stay',
        category: 'overnight',
        reason: {
          en: 'An overnight stay lets you experience the quiet magic of the islands after day-trippers depart, sleeping in beachfront cabanas under unpolluted stars.',
          es: 'Una noche en la isla le permite vivir la serenidad absoluta tras la partida de los pasadías, durmiendo en cabañas frente al mar.',
        },
      };
    }

    return {
      id: 'multi-day-exploration',
      category: 'multi-day',
      reason: {
        en: 'A multi-day expedition allows you to reach the remote outer coral barrier of Cayos Holandeses and Lemon Cays beyond the standard tourist trail.',
        es: 'Una expedición multidía le permite alcanzar la remota barrera exterior de Cayos Holandeses y Cayos Limón fuera de las rutas habituales.',
      },
    };
  };

  const recommendation = getRecommendation();
  const matchedExperience = recommendation
    ? EXPERIENCES_DATA.find((e) => e.id === recommendation.id)
    : null;

  const handleReset = () => {
    setTimeChoice(null);
    setVibeChoice(null);
    setPartyChoice(null);
  };

  const parseOptionWithSubtext = (fullLabel: string): { title: string; subtitle: string | null } => {
    const match = fullLabel.match(/^([^(]+)\s*\(([^)]+)\)$/);
    if (match) {
      return { title: match[1].trim(), subtitle: `(${match[2].trim()})` };
    }
    return { title: fullLabel, subtitle: null };
  };

  const sectionLabels = {
    en: {
      q1Tag: 'YOUR TIME',
      q2Tag: 'YOUR EXPERIENCE',
      q3Tag: 'YOUR TRAVEL STYLE',
    },
    es: {
      q1Tag: 'SU TIEMPO',
      q2Tag: 'SU EXPERIENCIA',
      q3Tag: 'SU ESTILO DE VIAJE',
    },
  }[currentLang];

  return (
    <section id="finder" className="py-12 sm:py-16 bg-[#F6F2E9] border-b border-[#C8AC75]/25 scroll-mt-20 text-[#0B2924]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Luxury Travel Concierge Panel */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#C8AC75]/35 shadow-xl transition-all">
          
          {/* Header */}
          <div className="mb-6 pb-4 border-b border-[#C8AC75]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-sans uppercase tracking-[0.2em] text-[#C8AC75] font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5 text-[#C8AC75]" />
                <span>{currentLang === 'es' ? 'CONSERJERÍA DE VIAJE' : 'TRAVEL CONCIERGE'}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-serif font-light text-[#0B2924] leading-snug">
                {t.quickFinder.title}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-[#153B49]/80 font-sans font-light max-w-sm">
              {t.quickFinder.subtitle}
            </p>
          </div>

          {/* 3-Column Questionnaire Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">

            {/* Column 1: Time */}
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono font-bold text-[#C8AC75]">01</span>
                <span className="text-xs font-sans uppercase tracking-[0.16em] font-semibold text-[#0B2924]">
                  {sectionLabels.q1Tag}
                </span>
              </div>

              <h4 className="text-sm font-serif font-medium text-[#0B2924] mb-3 lg:h-9 flex items-center">
                {t.quickFinder.questionTime}
              </h4>

              <div className="flex flex-col gap-2">
                {[
                  { id: '1day', fullLabel: t.quickFinder.opt1Day },
                  { id: 'overnight', fullLabel: t.quickFinder.opt1or2Nights },
                  { id: 'multiday', fullLabel: t.quickFinder.opt3PlusNights },
                ].map((opt) => {
                  const parsed = parseOptionWithSubtext(opt.fullLabel);
                  const isSelected = timeChoice === opt.id;

                  return (
                    <button
                      key={opt.id}
                      onClick={() => setTimeChoice(opt.id as any)}
                      className={`px-3.5 py-2.5 text-left rounded-xl border transition-all duration-200 flex items-center justify-between cursor-pointer focus:outline-none ${
                        isSelected
                          ? 'bg-[#0B2924] text-[#F6F2E9] border-[#C8AC75] shadow-sm'
                          : 'bg-[#F6F2E9]/70 text-[#0B2924] border-[#C8AC75]/25 hover:bg-white hover:border-[#C8AC75]/60'
                      }`}
                    >
                      <div className="pr-2">
                        <div className={`text-xs sm:text-sm font-sans font-medium leading-tight ${isSelected ? 'text-white' : 'text-[#0B2924]'}`}>
                          {parsed.title}
                        </div>
                        {parsed.subtitle && (
                          <div className={`text-[11px] mt-0.5 leading-tight ${isSelected ? 'text-[#C8AC75]' : 'text-[#153B49]/70'}`}>
                            {parsed.subtitle}
                          </div>
                        )}
                      </div>

                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? 'bg-[#C8AC75] text-[#0B2924]' : 'border border-[#C8AC75]/30 opacity-0'
                      }`}>
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column 2: Vibe */}
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono font-bold text-[#C8AC75]">02</span>
                <span className="text-xs font-sans uppercase tracking-[0.16em] font-semibold text-[#0B2924]">
                  {sectionLabels.q2Tag}
                </span>
              </div>

              <h4 className="text-sm font-serif font-medium text-[#0B2924] mb-3 lg:h-9 flex items-center">
                {t.quickFinder.questionVibe}
              </h4>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'relax', label: t.quickFinder.optRelax },
                  { id: 'snorkel', label: t.quickFinder.optSnorkel },
                  { id: 'culture', label: t.quickFinder.optCulture },
                  { id: 'sail', label: t.quickFinder.optSail },
                  { id: 'private', label: t.quickFinder.optPrivate },
                ].map((opt, idx) => {
                  const isSelected = vibeChoice === opt.id;
                  const isFullWidth = idx === 4;

                  return (
                    <button
                      key={opt.id}
                      onClick={() => setVibeChoice(opt.id as any)}
                      className={`px-3 py-2 text-left rounded-xl border transition-all duration-200 flex items-center justify-between cursor-pointer min-h-[44px] focus:outline-none ${
                        isFullWidth ? 'col-span-2' : ''
                      } ${
                        isSelected
                          ? 'bg-[#0B2924] text-[#F6F2E9] border-[#C8AC75] shadow-sm'
                          : 'bg-[#F6F2E9]/70 text-[#0B2924] border-[#C8AC75]/25 hover:bg-white hover:border-[#C8AC75]/60'
                      }`}
                    >
                      <span className={`text-xs font-sans font-medium leading-snug pr-1 ${isSelected ? 'text-white' : 'text-[#0B2924]'}`}>
                        {opt.label}
                      </span>

                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-1 transition-all ${
                        isSelected ? 'bg-[#C8AC75] text-[#0B2924]' : 'border border-[#C8AC75]/30 opacity-0'
                      }`}>
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column 3: Party */}
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-mono font-bold text-[#C8AC75]">03</span>
                <span className="text-xs font-sans uppercase tracking-[0.16em] font-semibold text-[#0B2924]">
                  {sectionLabels.q3Tag}
                </span>
              </div>

              <h4 className="text-sm font-serif font-medium text-[#0B2924] mb-3 lg:h-9 flex items-center">
                {t.quickFinder.questionParty}
              </h4>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'solo', label: t.quickFinder.optSolo },
                  { id: 'couple', label: t.quickFinder.optCouple },
                  { id: 'family', label: t.quickFinder.optFamily },
                  { id: 'friends', label: t.quickFinder.optFriends },
                ].map((opt) => {
                  const isSelected = partyChoice === opt.id;

                  return (
                    <button
                      key={opt.id}
                      onClick={() => setPartyChoice(opt.id as any)}
                      className={`px-3 py-2 text-left rounded-xl border transition-all duration-200 flex items-center justify-between cursor-pointer min-h-[44px] focus:outline-none ${
                        isSelected
                          ? 'bg-[#0B2924] text-[#F6F2E9] border-[#C8AC75] shadow-sm'
                          : 'bg-[#F6F2E9]/70 text-[#0B2924] border-[#C8AC75]/25 hover:bg-white hover:border-[#C8AC75]/60'
                      }`}
                    >
                      <span className={`text-xs font-sans font-medium leading-snug pr-1 ${isSelected ? 'text-white' : 'text-[#0B2924]'}`}>
                        {opt.label}
                      </span>

                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-1 transition-all ${
                        isSelected ? 'bg-[#C8AC75] text-[#0B2924]' : 'border border-[#C8AC75]/30 opacity-0'
                      }`}>
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Recommendation Result */}
          {matchedExperience && recommendation && (
            <div className="mt-6 pt-5 border-t border-[#C8AC75]/30 animate-fadeIn">
              <div className="bg-[#0B2924] text-[#F6F2E9] border border-[#C8AC75]/40 rounded-2xl p-5 sm:p-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#C8AC75]" />
                    <span className="text-xs font-sans font-semibold uppercase tracking-[0.2em] text-[#C8AC75]">
                      {t.quickFinder.recommendedTitle}
                    </span>
                  </div>
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 text-xs font-sans text-[#F6F2E9]/70 hover:text-[#C8AC75] transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 text-[#C8AC75]" />
                    <span>{t.quickFinder.reset}</span>
                  </button>
                </div>

                <h3 className="text-xl sm:text-2xl font-serif font-light text-white mb-2">
                  {matchedExperience.title[currentLang]}
                </h3>

                <p className="text-xs sm:text-sm text-[#F6F2E9]/85 font-sans font-light leading-relaxed mb-5">
                  {recommendation.reason[currentLang]}
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => onViewExperienceDetails(matchedExperience.id)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-sans uppercase tracking-wider font-medium text-[#F6F2E9] bg-white/10 border border-white/25 rounded-xl hover:bg-white/20 transition-all cursor-pointer"
                  >
                    <span>{t.quickFinder.viewDetails}</span>
                  </button>

                  <button
                    onClick={() => onSelectExperience(recommendation.category)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-sans uppercase tracking-wider font-semibold text-[#0B2924] bg-[#C8AC75] hover:bg-[#dfc38d] rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    <span>{t.quickFinder.planThis}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </section>
  );
};
