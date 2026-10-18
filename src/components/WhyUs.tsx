import React from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { Shield, Compass, HeartHandshake, TreePalm, Sparkles } from 'lucide-react';

interface WhyUsProps {
  currentLang: Language;
}

export const WhyUs: React.FC<WhyUsProps> = ({ currentLang }) => {
  const t = TRANSLATIONS[currentLang];

  const icons = [
    <Shield className="w-5 h-5 text-[#C8AC75]" key="1" />,
    <Compass className="w-5 h-5 text-[#C8AC75]" key="2" />,
    <HeartHandshake className="w-5 h-5 text-[#C8AC75]" key="3" />,
    <TreePalm className="w-5 h-5 text-[#C8AC75]" key="4" />,
  ];

  return (
    <section
      id="discover"
      className="py-24 sm:py-32 bg-[#F6F2E9] border-b border-[#C8AC75]/25 relative overflow-hidden scroll-mt-20 text-[#0B2924]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="text-xs font-sans uppercase tracking-[0.25em] text-[#C8AC75] font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#C8AC75]" />
            <span>{currentLang === 'es' ? 'POR QUÉ VIAJAR CON NOSOTROS' : 'WHY TRAVEL WITH US'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#0B2924] tracking-tight text-balance leading-tight">
            {t.whyUs.title}
          </h2>
          <p className="text-base sm:text-lg text-[#153B49] mt-4 leading-relaxed font-sans font-light">
            {t.whyUs.subtitle}
          </p>
        </div>

        {/* 4 Pillars Grid: Editorial Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {t.whyUs.pillars.map((pillar, idx) => (
            <div
              key={idx}
              className="bg-white border border-[#C8AC75]/25 rounded-2xl p-7 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-[#0B2924] border border-[#C8AC75]/40 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  {icons[idx]}
                </div>
                <h3 className="text-lg sm:text-xl font-serif font-medium text-[#0B2924] mb-3 group-hover:text-[#153B49] transition-colors">
                  {pillar.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#153B49]/80 leading-relaxed font-sans font-light">
                  {pillar.description}
                </p>
              </div>

              {/* Number index */}
              <div className="pt-6 mt-6 border-t border-[#C8AC75]/20 text-[11px] font-sans tracking-wider font-semibold flex items-center justify-between">
                <span className="text-[#C8AC75] font-mono">0{idx + 1}</span>
                <span className="text-[10px] uppercase tracking-widest text-[#153B49]/70 font-sans">
                  {currentLang === 'es' ? 'PILAR GUNA' : 'GUNA STANDARD'}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
