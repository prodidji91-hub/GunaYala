import React from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { Calendar, MessageCircle } from 'lucide-react';

interface FinalCtaProps {
  currentLang: Language;
  onPlanClick: () => void;
}

export const FinalCta: React.FC<FinalCtaProps> = ({ currentLang, onPlanClick }) => {
  const t = TRANSLATIONS[currentLang];

  return (
    <section className="py-16 md:py-20 bg-[#0e3a47] text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#7dd3c5]">
          Direct Local Hospitality · San Blas Islands
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white tracking-tight leading-tight text-balance">
          {t.finalCta.headline}
        </h2>

        <p className="text-sm sm:text-base text-white/80 max-w-2xl mx-auto leading-relaxed">
          {t.finalCta.subtitle}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <button
            onClick={onPlanClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3.5 px-7 text-sm font-semibold text-[#0e3a47] bg-[#faf8f5] hover:bg-white rounded-xl shadow-lg transition-all active:scale-[0.98]"
          >
            <Calendar className="w-4 h-4 text-[#0e3a47]" />
            <span>{t.finalCta.planTripBtn}</span>
          </button>

          <a
            href="https://wa.me/50764443649"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3.5 px-6 text-sm font-semibold text-white bg-[#15803d] hover:bg-[#166534] rounded-xl shadow-md transition-all active:scale-[0.98]"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{t.finalCta.whatsappDirectBtn}</span>
          </a>
        </div>
      </div>
    </section>
  );
};
