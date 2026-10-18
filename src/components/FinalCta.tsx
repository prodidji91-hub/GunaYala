import React from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { Calendar, MessageCircle, Sparkles } from 'lucide-react';

interface FinalCtaProps {
  currentLang: Language;
  onPlanClick: () => void;
}

export const FinalCta: React.FC<FinalCtaProps> = ({ currentLang, onPlanClick }) => {
  const t = TRANSLATIONS[currentLang];

  return (
    <section className="py-24 sm:py-32 bg-[#0B2924] text-[#F6F2E9] relative overflow-hidden border-t border-[#C8AC75]/25">
      {/* Background ambient light */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[#153B49]/40 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-7">
        <div className="inline-flex items-center gap-2 text-xs font-sans font-semibold uppercase tracking-[0.25em] text-[#C8AC75]">
          <Sparkles className="w-3.5 h-3.5 text-[#C8AC75]" />
          <span>Direct Guna Hospitality · San Blas Islands</span>
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-light text-white tracking-tight leading-[1.14] text-balance">
          {t.finalCta.headline}
        </h2>

        <p className="text-sm sm:text-base md:text-lg text-[#F6F2E9]/85 max-w-2xl mx-auto leading-relaxed font-sans font-light">
          {t.finalCta.subtitle}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={onPlanClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 py-4 px-8 text-xs font-sans font-semibold tracking-[0.16em] uppercase text-[#0B2924] bg-[#C8AC75] hover:bg-[#dfc38d] rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none"
          >
            <Calendar className="w-4 h-4 text-[#0B2924]" />
            <span>{t.finalCta.planTripBtn}</span>
          </button>

          <a
            href="https://wa.me/50764443649"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 py-4 px-7 text-xs font-sans font-medium tracking-[0.16em] uppercase text-[#F6F2E9] hover:text-[#C8AC75] bg-white/10 hover:bg-white/15 border border-[#C8AC75]/40 rounded-full backdrop-blur-md transition-all duration-300 hover:scale-102 active:scale-95 focus:outline-none"
          >
            <MessageCircle className="w-4 h-4 text-[#C8AC75]" />
            <span>{t.finalCta.whatsappDirectBtn}</span>
          </a>
        </div>
      </div>
    </section>
  );
};
