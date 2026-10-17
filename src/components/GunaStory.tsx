import React from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';

import gunaMolaImg from '../pictures/Gunamola.jpg';
import molaCraftImg from '../pictures/molacraft.jpg';
import gunaCommunityImg from '../pictures/04 Learn about the Guna Community in San Blas.jpg';

interface GunaStoryProps {
  currentLang: Language;
}

export const GunaStory: React.FC<GunaStoryProps> = ({ currentLang }) => {
  const t = TRANSLATIONS[currentLang];

  return (
    <section id="heritage" className="py-24 md:py-36 bg-[#EFE9DE] border-t border-[#C6A15B]/20 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          
          {/* Visual column: Traditional Mola art & Cayuco Boat */}
          <div className="lg:col-span-6 grid grid-cols-2 gap-4">
            {/* TOP LEFT: Gunamola.jpg */}
            <div className="rounded-2xl overflow-hidden aspect-square border border-[#C6A15B]/30 shadow-xs bg-[#e8e2d5] group relative">
              <img
                src={gunaMolaImg}
                alt="Traditional Guna hand-sewn mola textile geometric design"
                loading="eager"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.triedFallback) {
                    target.dataset.triedFallback = 'true';
                    target.src = '/pictures/Gunamola.jpg';
                  }
                }}
                className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-700 ease-out block"
              />
            </div>

            {/* TOP RIGHT: molacraft.jpg */}
            <div className="rounded-2xl overflow-hidden aspect-square border border-[#C6A15B]/30 shadow-xs bg-[#e8e2d5] group relative">
              <img
                src={molaCraftImg}
                alt="Traditional Guna mola craft and artisan work"
                loading="eager"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.triedFallback) {
                    target.dataset.triedFallback = 'true';
                    target.src = '/pictures/molacraft.jpg';
                  }
                }}
                className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-700 ease-out block"
              />
            </div>

            {/* BOTTOM: 04 Learn about the Guna Community in San Blas.jpg */}
            <div className="col-span-2 rounded-2xl overflow-hidden aspect-[16/8] border border-[#C6A15B]/30 shadow-xs bg-[#e8e2d5] group relative">
              <img
                src={gunaCommunityImg}
                alt="Guna community village island with traditional palm thatched architecture"
                loading="eager"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.triedFallback) {
                    target.dataset.triedFallback = 'true';
                    target.src = '/pictures/04 Learn about the Guna Community in San Blas.jpg';
                  }
                }}
                className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-700 ease-out block"
              />
            </div>
          </div>

          {/* Text column: Respectful cultural & comarca context */}
          <div className="lg:col-span-6 space-y-6">
            <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#C6A15B] font-semibold">
              {t.story.kicker}
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#06121E] leading-tight text-balance">
              {t.story.headline}
            </h2>

            <p className="text-sm sm:text-base text-[#6D7478] leading-relaxed font-light">
              {t.story.p1}
            </p>

            <p className="text-sm sm:text-base text-[#6D7478] leading-relaxed font-light">
              {t.story.p2}
            </p>

            {/* Respectful quote block */}
            <blockquote className="p-6 bg-[#F7F3EC] border-l-4 border-[#C6A15B] rounded-r-2xl text-sm italic font-serif text-[#06121E] leading-relaxed shadow-xs">
              {t.story.localQuote}
            </blockquote>

            {/* Factual comarca points */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#6D7478]">
              <div className="p-4 bg-[#F7F3EC] border border-[#C6A15B]/30 rounded-xl shadow-xs">
                <span className="font-mono uppercase tracking-wider font-semibold text-[#06121E] block mb-1">
                  {currentLang === 'es' ? 'Gobernanza Autónoma' : 'Autonomous Governance'}
                </span>
                {currentLang === 'es'
                  ? 'Regulado por las normas del Congreso General Guna.'
                  : 'Regulated under Congreso General Guna guidelines.'}
              </div>
              <div className="p-4 bg-[#F7F3EC] border border-[#C6A15B]/30 rounded-xl shadow-xs">
                <span className="font-mono uppercase tracking-wider font-semibold text-[#06121E] block mb-1">
                  {currentLang === 'es' ? 'Protección Ambiental' : 'Environmental Preservation'}
                </span>
                {currentLang === 'es'
                  ? 'Arrecifes de coral protegidos sin cadenas hoteleras comerciales.'
                  : 'Protected coral reefs and cays without commercial mega-resorts.'}
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
