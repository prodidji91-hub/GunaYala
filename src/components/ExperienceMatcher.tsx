import React, { useState } from 'react';
import { Language, ExperienceCategory } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { EXPERIENCES_DATA } from '../data/experiences';
import { Sparkles, ArrowRight, RotateCcw, Check } from 'lucide-react';

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
        id: 'private-custom-experience',
        category: 'private-custom',
        reason: {
          en: 'Customized private itinerary tailored to your group rhythm, with private island transfers and flexible daily stops.',
          es: 'Itinerario privado a la medida de su grupo, con traslados marítimos privados y paradas diarias flexibles.',
        },
      };
    }

    if (timeChoice === '1day') {
      return {
        id: 'day-trip-classic',
        category: 'day-trip',
        reason: {
          en: 'The classic day trip maximizes your time with roundtrip 4x4 pickup, visiting top coral islands, and snorkeling the natural starfish pool.',
          es: 'La excursión clásica de un día aprovecha su tiempo con transporte 4x4, visitando islas destacadas y la piscina natural de estrellas marinas.',
        },
      };
    }

    if (timeChoice === 'multiday' || vibeChoice === 'culture') {
      return {
        id: 'multi-day-exploration',
        category: 'multi-day',
        reason: {
          en: 'With 3+ days, you can reach the pristine outer cays of Cayos Holandeses and visit an authentic Guna indigenous community.',
          es: 'Con 3+ días podrá llegar a los cayos exteriores de Cayos Holandeses y visitar una comunidad indígena tradicional guna.',
        },
      };
    }

    // Default overnight
    return {
      id: 'overnight-island-stay',
      category: 'overnight',
      reason: {
        en: 'Spending the night in a beach cabana lets you witness San Blas at its most peaceful: sunset, starlit Caribbean skies, and calm morning water.',
        es: 'Dormir en una cabaña de playa le permite disfrutar de San Blas en su momento más sereno: atardeceres, cielos estrellados y mar calmo al amanecer.',
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

  // Helper to split parenthetical option labels
  const parseOptionWithSubtext = (fullLabel: string) => {
    const match = fullLabel.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
      return { title: match[1].trim(), subtitle: match[2].trim() };
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
    <section id="finder" className="py-6 lg:py-8 bg-[#FAF8F5] border-y border-[#C6A15B]/20 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* SINGLE LUXURY TRAVEL CONCIERGE PANEL */}
        <div className="bg-[#F7F3EC] rounded-2xl p-4 sm:p-6 border border-[#C6A15B]/30 shadow-sm transition-all">
          
          {/* TOP PANEL HEADER */}
          <div className="mb-4 pb-3 border-b border-[#C6A15B]/20">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.2em] mb-0.5">
              <Sparkles className="w-3.5 h-3.5 text-[#9b7938]" />
              <span style={{ borderColor: '#b8841c', fontSize: '14px', lineHeight: '18px', fontWeight: 'bold', fontStyle: 'italic', color: '#9b7938' }}>
                {t.quickFinder.title}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-serif text-[#06121E] font-light leading-snug">
              {t.quickFinder.subtitle}
            </p>
          </div>

          {/* 3-COLUMN QUESTIONNAIRE GRID ON DESKTOP */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6 items-start">

            {/* COLUMN 1: 01 YOUR TIME */}
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px] font-mono font-bold tracking-wider" style={{ fontSize: '23px', color: '#af7008' }}>01</span>
                <span className="text-[11px] font-mono uppercase tracking-[0.15em]" style={{ fontSize: '15px', fontWeight: 'bold', color: '#855d0b' }}>
                  {sectionLabels.q1Tag}
                </span>
              </div>

              <h3 className="text-sm sm:text-base font-serif font-medium text-[#06121E] mb-2.5 lg:h-9 flex items-center" style={{ fontFamily: 'Fraunces, serif' }}>
                {t.quickFinder.questionTime}
              </h3>

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
                      className={`px-3 py-2 text-left rounded-lg border transition-all duration-200 flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-[#06121E] text-[#F7F3EC] border-[#C6A15B] shadow-sm ring-1 ring-[#C6A15B]/40'
                          : 'bg-[#F8EDE5] text-[#06121E] border-[#E5CFC2] hover:bg-[#F2E3D8] hover:border-[#C6A15B]'
                      }`}
                    >
                      <div className="pr-2">
                        <div className={`text-xs sm:text-sm font-sans font-semibold leading-tight ${isSelected ? 'text-[#F7F3EC]' : 'text-[#06121E]'}`}>
                          {parsed.title}
                        </div>
                        {parsed.subtitle && (
                          <div className={`text-[11px] mt-0.5 leading-tight ${isSelected ? 'text-[#C6A15B]' : 'text-[#7A6354]'}`}>
                            {parsed.subtitle}
                          </div>
                        )}
                      </div>

                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? 'bg-[#C6A15B] text-[#06121E]' : 'border border-[#C6A15B]/30 opacity-0'
                      }`}>
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* COLUMN 2: 02 YOUR EXPERIENCE */}
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px] font-mono font-bold tracking-wider" style={{ fontSize: '19px', color: '#9a690c' }}>02</span>
                <span className="text-[11px] font-mono uppercase tracking-[0.15em]" style={{ fontSize: '15px', fontWeight: 'bold', color: '#7d590c' }}>
                  {sectionLabels.q2Tag}
                </span>
              </div>

              <h3 className="text-sm sm:text-base font-serif font-medium text-[#06121E] mb-2.5 lg:h-9 flex items-center">
                {t.quickFinder.questionVibe}
              </h3>

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
                      className={`px-2.5 py-2 text-left rounded-lg border transition-all duration-200 flex items-center justify-between cursor-pointer min-h-[42px] ${
                        isFullWidth ? 'col-span-2' : ''
                      } ${
                        isSelected
                          ? 'bg-[#06121E] text-[#F7F3EC] border-[#C6A15B] shadow-sm ring-1 ring-[#C6A15B]/40'
                          : 'bg-[#F8EDE5] text-[#06121E] border-[#E5CFC2] hover:bg-[#F2E3D8] hover:border-[#C6A15B]'
                      }`}
                    >
                      <span className={`text-xs font-sans font-medium leading-snug pr-1 ${isSelected ? 'text-[#F7F3EC]' : 'text-[#06121E]'}`}>
                        {opt.label}
                      </span>

                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-1 transition-all ${
                        isSelected ? 'bg-[#C6A15B] text-[#06121E]' : 'border border-[#C6A15B]/30 opacity-0'
                      }`}>
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* COLUMN 3: 03 YOUR TRAVEL STYLE */}
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[11px] font-mono font-bold tracking-wider" style={{ fontSize: '18px', color: '#7e5509' }}>03</span>
                <span className="text-[11px] font-mono uppercase tracking-[0.15em]" style={{ fontSize: '15px', fontWeight: 'bold', color: '#8a610a' }}>
                  {sectionLabels.q3Tag}
                </span>
              </div>

              <h3 className="text-sm sm:text-base font-serif font-medium text-[#06121E] mb-2.5 lg:h-9 flex items-center">
                {t.quickFinder.questionParty}
              </h3>

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
                      className={`px-2.5 py-2 text-left rounded-lg border transition-all duration-200 flex items-center justify-between cursor-pointer min-h-[42px] ${
                        isSelected
                          ? 'bg-[#06121E] text-[#F7F3EC] border-[#C6A15B] shadow-sm ring-1 ring-[#C6A15B]/40'
                          : 'bg-[#F8EDE5] text-[#06121E] border-[#E5CFC2] hover:bg-[#F2E3D8] hover:border-[#C6A15B]'
                      }`}
                    >
                      <span className={`text-xs font-sans font-medium leading-snug pr-1 ${isSelected ? 'text-[#F7F3EC]' : 'text-[#06121E]'}`}>
                        {opt.label}
                      </span>

                      <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-1 transition-all ${
                        isSelected ? 'bg-[#C6A15B] text-[#06121E]' : 'border border-[#C6A15B]/30 opacity-0'
                      }`}>
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* RECOMMENDATION RESULT INSIDE CONTAINER */}
          {matchedExperience && recommendation && (
            <div className="mt-4 pt-3 border-t border-[#C6A15B]/30 animate-in fade-in duration-300">
              <div className="bg-[#06121E] text-white border border-[#C6A15B]/40 rounded-xl p-4 sm:p-5 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#C6A15B]" />
                    <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-[#C6A15B]">
                      {t.quickFinder.recommendedTitle}
                    </span>
                  </div>
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-[#94a3b8] hover:text-white transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 text-[#C6A15B]" />
                    <span>{t.quickFinder.reset}</span>
                  </button>
                </div>

                <h3 className="text-lg sm:text-xl font-serif font-light text-white mb-1">
                  {matchedExperience.title[currentLang]}
                </h3>

                <p className="text-xs text-[#cbd5e1] font-light leading-relaxed mb-4">
                  {recommendation.reason[currentLang]}
                </p>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => onViewExperienceDetails(matchedExperience.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono uppercase tracking-wider font-semibold text-white bg-white/10 border border-white/25 rounded-lg hover:bg-white/20 transition-all cursor-pointer"
                  >
                    <span>{t.quickFinder.viewDetails}</span>
                  </button>

                  <button
                    onClick={() => onSelectExperience(recommendation.category)}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-mono uppercase tracking-wider font-bold text-[#06121E] bg-[#C6A15B] hover:bg-[#d4af37] rounded-lg transition-all shadow-md cursor-pointer"
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
