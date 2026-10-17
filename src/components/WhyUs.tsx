import React from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { Shield, Compass, HeartHandshake, TreePalm } from 'lucide-react';

interface WhyUsProps {
  currentLang: Language;
}

export const WhyUs: React.FC<WhyUsProps> = ({ currentLang }) => {
  const t = TRANSLATIONS[currentLang];

  const icons = [
    <Shield className="w-5 h-5 text-[#C6A15B]" key="1" />,
    <Compass className="w-5 h-5 text-[#C6A15B]" key="2" />,
    <HeartHandshake className="w-5 h-5 text-[#C6A15B]" key="3" />,
    <TreePalm className="w-5 h-5 text-[#C6A15B]" key="4" />,
  ];

  return (
    <section id="discover" className="py-24 md:py-36 bg-[#F7F3EC] border-t border-[#C6A15B]/20 relative overflow-hidden scroll-mt-20">
      {/* Subtle organic light */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(ellipse_at_top_right,rgba(198,161,91,0.06),transparent_70%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-16">
          <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#C6A15B] font-semibold mb-3 flex items-center gap-2.5">
            <span className="w-6 h-px bg-[#C6A15B]" />
            <span>{currentLang === 'es' ? 'DISCUBRE GUNA YALA' : 'DISCOVER GUNA YALA'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#06121E] tracking-tight text-balance leading-tight">
            {t.whyUs.title}
          </h2>
          <p className="text-base sm:text-lg text-[#6D7478] mt-4 leading-relaxed font-light">
            {t.whyUs.subtitle}
          </p>
        </div>

        {/* 4 Pillars Grid: Refined Editorial Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {t.whyUs.pillars.map((pillar, idx) => (
            <div
              key={idx}
              className="bg-white/90 border border-[#C6A15B]/25 rounded-2xl p-8 flex flex-col justify-between shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
            >
              <div>
                <div className="w-11 h-11 rounded-xl bg-[#F7F3EC] border border-[#C6A15B]/30 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                  {icons[idx]}
                </div>
                <h3 className="text-lg sm:text-xl font-serif font-medium text-[#06121E] mb-3 group-hover:text-[#0E7490] transition-colors">
                  {pillar.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#6D7478] leading-relaxed font-light">
                  {pillar.description}
                </p>
              </div>

              {/* Number index */}
              <div className="pt-6 mt-6 border-t border-[#C6A15B]/20 text-[11px] font-mono tracking-wider font-semibold text-[#94a3b8] flex items-center justify-between">
                <span className="text-[#C6A15B]">0{idx + 1}</span>
                <span className="text-[10px] uppercase tracking-widest text-[#6D7478] font-sans">
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
