import React from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { Sparkles, ShieldCheck, Leaf } from 'lucide-react';

import gunaMolaImg from '../pictures/Gunamola.jpg';
import molaCraftImg from '../pictures/molacraft.jpg';
import gunaCommunityImg from '../pictures/04 Learn about the Guna Community in San Blas.jpg';

interface GunaStoryProps {
  currentLang: Language;
}

export const GunaStory: React.FC<GunaStoryProps> = ({ currentLang }) => {
  const t = TRANSLATIONS[currentLang];

  return (
    <section id="heritage" className="py-24 sm:py-32 bg-[#F6F2E9] border-b border-[#C8AC75]/25 scroll-mt-20 text-[#0B2924]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          
          {/* Visual column: Traditional Mola art & Cayuco Boat */}
          <div className="lg:col-span-6 grid grid-cols-2 gap-4">
            {/* TOP LEFT: Gunamola.jpg */}
            <div className="rounded-2xl overflow-hidden aspect-square border border-[#C8AC75]/35 shadow-md bg-[#0B2924] group relative">
              <img
                src={gunaMolaImg}
                alt="Traditional Guna hand-sewn mola textile geometric design"
                loading="lazy"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.triedFallback) {
                    target.dataset.triedFallback = 'true';
                    target.src = '/pictures/Gunamola.jpg';
                  }
                }}
                className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-700 ease-out block"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* TOP RIGHT: molacraft.jpg */}
            <div className="rounded-2xl overflow-hidden aspect-square border border-[#C8AC75]/35 shadow-md bg-[#0B2924] group relative">
              <img
                src={molaCraftImg}
                alt="Traditional Guna mola craft and artisan work"
                loading="lazy"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.triedFallback) {
                    target.dataset.triedFallback = 'true';
                    target.src = '/pictures/molacraft.jpg';
                  }
                }}
                className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-700 ease-out block"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* BOTTOM: 04 Learn about the Guna Community in San Blas.jpg */}
            <div className="col-span-2 rounded-2xl overflow-hidden aspect-[16/8] border border-[#C8AC75]/35 shadow-md bg-[#0B2924] group relative">
              <img
                src={gunaCommunityImg}
                alt="Guna community village island with traditional palm thatched architecture"
                loading="lazy"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.triedFallback) {
                    target.dataset.triedFallback = 'true';
                    target.src = '/pictures/04 Learn about the Guna Community in San Blas.jpg';
                  }
                }}
                className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-700 ease-out block"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Text column: Respectful cultural & comarca context */}
          <div className="lg:col-span-6 space-y-6">
            <div className="flex items-center gap-2 text-xs font-sans uppercase tracking-[0.25em] text-[#C8AC75] font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-[#C8AC75]" />
              <span>{t.story.kicker}</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#0B2924] leading-tight text-balance">
              {t.story.headline}
            </h2>

            <p className="text-sm sm:text-base text-[#153B49] leading-relaxed font-sans font-light">
              {t.story.p1}
            </p>

            <p className="text-sm sm:text-base text-[#153B49] leading-relaxed font-sans font-light">
              {t.story.p2}
            </p>

            {/* Respectful quote block (Clean hairline luxury styling) */}
            <div className="p-6 bg-white border border-[#C8AC75]/30 rounded-2xl text-sm italic font-serif text-[#0B2924] leading-relaxed shadow-sm">
              <p className="text-[#C8AC75] font-serif text-lg mb-1">“</p>
              <p className="text-[#0B2924]/90">{t.story.localQuote.replace(/^[“”"]|[“”"]$/g, '')}</p>
            </div>

            {/* Factual comarca points */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#153B49]">
              <div className="p-4 bg-white border border-[#C8AC75]/30 rounded-xl shadow-xs">
                <div className="flex items-center gap-1.5 font-sans uppercase tracking-wider font-semibold text-[#0B2924] mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#C8AC75]" />
                  <span>{currentLang === 'es' ? 'Gobernanza Autónoma' : 'Autonomous Governance'}</span>
                </div>
                <p className="font-sans font-light">
                  {currentLang === 'es'
                    ? 'Regulado por las normas ancestrales del Congreso General Guna.'
                    : 'Regulated under Congreso General Guna guidelines.'}
                </p>
              </div>
              <div className="p-4 bg-white border border-[#C8AC75]/30 rounded-xl shadow-xs">
                <div className="flex items-center gap-1.5 font-sans uppercase tracking-wider font-semibold text-[#0B2924] mb-1">
                  <Leaf className="w-3.5 h-3.5 text-[#C8AC75]" />
                  <span>{currentLang === 'es' ? 'Protección Ambiental' : 'Environmental Preservation'}</span>
                </div>
                <p className="font-sans font-light">
                  {currentLang === 'es'
                    ? 'Arrecifes de coral protegidos sin cadenas hoteleras comerciales.'
                    : 'Protected coral reefs and cays without commercial mega-resorts.'}
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
