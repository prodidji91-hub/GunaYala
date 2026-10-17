import React, { useState } from 'react';
import { Language, Experience, ExperienceCategory } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { EXPERIENCES_DATA } from '../data/experiences';
import { VisualAsset } from '../pictures';
import { Clock, Users, ArrowUpRight, Sparkles } from 'lucide-react';

interface ExperienceCatalogProps {
  currentLang: Language;
  onOpenDetails: (experience: Experience) => void;
  onInquireExperience: (category: ExperienceCategory) => void;
}

export const ExperienceCatalog: React.FC<ExperienceCatalogProps> = ({
  currentLang,
  onOpenDetails,
  onInquireExperience,
}) => {
  const t = TRANSLATIONS[currentLang];
  const [activeFilter, setActiveFilter] = useState<'all' | ExperienceCategory>('all');

  const filteredExperiences =
    activeFilter === 'all'
      ? EXPERIENCES_DATA
      : EXPERIENCES_DATA.filter((e) => e.category === activeFilter);

  const filterTabs: { id: 'all' | ExperienceCategory; label: string }[] = [
    { id: 'all', label: t.catalog.filterAll },
    { id: 'day-trip', label: t.catalog.filterDay },
    { id: 'overnight', label: t.catalog.filterOvernight },
    { id: 'multi-day', label: t.catalog.filterMultiDay },
    { id: 'private-custom', label: t.catalog.filterPrivate },
    { id: 'sailing', label: t.catalog.filterSailing },
    { id: 'catamaran', label: t.catalog.filterCatamaran },
  ];

  return (
    <section id="experiences" className="py-24 md:py-36 bg-[#F7F3EC] relative scroll-mt-20 border-t border-[#C6A15B]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Editorial Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-[#C6A15B]/20 pb-8">
          <div>
            <div className="flex items-center gap-2.5 text-[11px] font-mono uppercase tracking-[0.25em] text-[#C6A15B] font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#C6A15B]" />
              <span>{currentLang === 'es' ? 'COLECCIÓN DE VIAJES' : 'CURATED JOURNEYS'}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#06121E] tracking-tight text-balance">
              {t.catalog.title}
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#6D7478] max-w-lg leading-relaxed font-light">
            {t.catalog.subtitle}
          </p>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-12 scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-5 py-2.5 text-xs font-mono uppercase tracking-[0.16em] font-semibold rounded-xl whitespace-nowrap transition-all duration-300 ${
                activeFilter === tab.id
                  ? 'bg-[#06121E] text-[#C6A15B] border border-[#C6A15B] shadow-md'
                  : 'bg-white/80 border border-[#C6A15B]/20 text-[#6D7478] hover:bg-white hover:text-[#06121E] hover:border-[#C6A15B]/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Image-Led Experience Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
          {filteredExperiences.map((exp) => (
            <article
              key={exp.id}
              className="group bg-white border border-[#C6A15B]/25 rounded-2xl overflow-hidden shadow-xs hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Large Heroic Image */}
                <div className="relative aspect-[16/11] overflow-hidden bg-[#EFE9DE]">
                  <VisualAsset
                    variant={exp.imageType}
                    alt={exp.title[currentLang]}
                    className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-700 ease-out"
                  />
                  {/* Subtle category tag */}
                  <div className="absolute top-4 left-4 bg-[#06121E]/90 backdrop-blur-md text-[#C6A15B] text-[10px] font-mono tracking-[0.2em] uppercase px-3 py-1 rounded-full border border-[#C6A15B]/40">
                    {exp.category.replace('-', ' ')}
                  </div>
                  {/* Bottom gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#06121E]/40 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Card Body */}
                <div className="p-6 sm:p-8">
                  {/* Meta: Duration & Suitable For */}
                  <div className="flex items-center gap-2 text-xs text-[#6D7478] mb-3 font-mono">
                    <span className="inline-flex items-center gap-1.5 text-[#06121E] font-medium">
                      <Clock className="w-3.5 h-3.5 text-[#C6A15B]" />
                      <span>{exp.duration[currentLang].split('(')[0].trim()}</span>
                    </span>
                    <span aria-hidden="true" className="text-[#C6A15B]">·</span>
                    <span className="inline-flex items-center gap-1.5 truncate max-w-[180px]">
                      <Users className="w-3.5 h-3.5 text-[#C6A15B]" />
                      <span>{exp.suitableFor[currentLang].split(',')[0]}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl sm:text-2xl font-serif font-light text-[#06121E] leading-snug mb-2.5 group-hover:text-[#0E7490] transition-colors">
                    {exp.title[currentLang]}
                  </h3>

                  {/* Editorial Subtitle */}
                  <p className="text-xs sm:text-sm text-[#6D7478] leading-relaxed line-clamp-3 font-light mb-5">
                    {exp.subtitle[currentLang]}
                  </p>

                  {/* Curated Highlights */}
                  <div className="space-y-1.5 pt-4 border-t border-[#C6A15B]/20 text-xs text-[#17212B] font-light">
                    {exp.highlights[currentLang].slice(0, 2).map((hl, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-[#C6A15B] text-[10px] mt-0.5">✦</span>
                        <span className="line-clamp-1">{hl}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-6 sm:p-8 pt-0">
                <div className="flex items-center gap-3 pt-5 border-t border-[#C6A15B]/20">
                  <button
                    onClick={() => onOpenDetails(exp)}
                    className="flex-1 py-3 px-4 text-xs font-mono uppercase tracking-[0.14em] font-semibold text-[#06121E] bg-[#F7F3EC] hover:bg-white border border-[#C6A15B]/30 rounded-xl transition-all text-center"
                  >
                    {t.catalog.viewDetailsBtn}
                  </button>

                  <button
                    onClick={() => onInquireExperience(exp.category)}
                    className="py-3 px-5 text-xs font-mono uppercase tracking-[0.14em] font-bold text-white bg-[#06121E] hover:bg-[#0B2733] border border-[#C6A15B]/40 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md"
                    title={t.catalog.inquireBtn}
                  >
                    <span>{currentLang === 'es' ? 'Planear' : 'Plan'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#C6A15B]" />
                  </button>
                </div>

                <p className="text-[10px] text-[#94a3b8] mt-3 text-center font-light">
                  {t.catalog.priceConfirmedNote}
                </p>
              </div>

            </article>
          ))}
        </div>

      </div>
    </section>
  );
};
