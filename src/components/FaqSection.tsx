import React, { useState } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { FAQ_DATA } from '../data/faq';
import { ChevronDown, MessageCircle, Sparkles } from 'lucide-react';

interface FaqSectionProps {
  currentLang: Language;
}

export const FaqSection: React.FC<FaqSectionProps> = ({ currentLang }) => {
  const t = TRANSLATIONS[currentLang];
  const [activeTab, setActiveTab] = useState<'all' | 'logistics' | 'islands' | 'packing' | 'booking'>('all');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    'transportation-how': true,
    'passport-requirement': true,
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredFaq =
    activeTab === 'all'
      ? FAQ_DATA
      : FAQ_DATA.filter((item) => item.category === activeTab);

  const tabs: { id: 'all' | 'logistics' | 'islands' | 'packing' | 'booking'; label: string }[] = [
    { id: 'all', label: t.faq.allTab },
    { id: 'logistics', label: t.faq.logisticsTab },
    { id: 'islands', label: t.faq.islandsTab },
    { id: 'packing', label: t.faq.packingTab },
    { id: 'booking', label: t.faq.bookingTab },
  ];

  return (
    <section id="faq" className="py-24 sm:py-32 bg-[#FAF8F2] border-b border-[#E2D2BB] text-[#173D36] scroll-mt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="flex items-center justify-center gap-2 text-xs font-sans font-semibold uppercase tracking-[0.25em] text-[#C5A46B] mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#55B8B3]" />
            <span>{t.faq.kicker}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#173D36] tracking-tight">
            {t.faq.title}
          </h2>
          <p className="text-sm sm:text-base text-[#53645E] mt-3 leading-relaxed font-sans font-light">
            {t.faq.subtitle}
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-10 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-sans uppercase tracking-[0.12em] font-medium rounded-full whitespace-nowrap transition-all duration-300 focus:outline-none cursor-pointer ${
                  isActive
                    ? 'bg-[#173D36] text-white border border-[#173D36] shadow-sm'
                    : 'bg-white/80 border border-[#E2D2BB] text-[#173D36] hover:bg-white hover:border-[#55B8B3]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-3.5">
          {filteredFaq.map((item) => {
            const isOpen = !!openItems[item.id];
            return (
              <div
                key={item.id}
                className="bg-white border border-[#E2D2BB] rounded-2xl overflow-hidden transition-all shadow-xs"
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 font-serif text-base sm:text-lg font-light text-[#173D36] hover:text-[#55B8B3] transition-colors focus:outline-none cursor-pointer"
                >
                  <span>{item.question[currentLang]}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#55B8B3] shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-2 text-xs sm:text-sm text-[#53645E] leading-relaxed font-sans font-light border-t border-[#E2D2BB]/50">
                    {item.answer[currentLang]}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still have questions block */}
        <div className="mt-12 p-6 sm:p-7 bg-[#173D36] text-white rounded-2xl border border-[#55B8B3]/40 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-lg">
          <div className="text-left">
            <h3 className="font-serif font-light text-white text-base sm:text-lg">
              {t.faq.stillHaveQuestions}
            </h3>
            <p className="text-xs text-white/80 font-sans font-light mt-1">
              {currentLang === 'es'
                ? 'Petra está a su disposición para asesorarlo en tiempo real según su itinerario.'
                : 'Petra is ready to provide exact advice tailored to your itinerary.'}
            </p>
          </div>
          <a
            href="https://wa.me/50764443649"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 py-3 px-5 text-xs font-sans font-semibold tracking-wider uppercase text-[#173D36] bg-[#C5A46B] hover:bg-[#dfc38d] rounded-full shadow-md transition-all whitespace-nowrap cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-[#173D36]" />
            <span>{t.faq.askPetraBtn}</span>
          </a>
        </div>

      </div>
    </section>
  );
};
