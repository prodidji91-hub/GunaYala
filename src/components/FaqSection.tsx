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
    <section id="faq" className="py-24 sm:py-32 bg-[#F6F2E9] border-b border-[#C8AC75]/25 text-[#0B2924] scroll-mt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="flex items-center justify-center gap-2 text-xs font-sans font-semibold uppercase tracking-[0.25em] text-[#C8AC75] mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#C8AC75]" />
            <span>{t.faq.kicker}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#0B2924] tracking-tight">
            {t.faq.title}
          </h2>
          <p className="text-sm sm:text-base text-[#153B49] mt-3 leading-relaxed font-sans font-light">
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
                className={`px-4 py-2 text-xs font-sans uppercase tracking-[0.12em] font-medium rounded-full whitespace-nowrap transition-all duration-300 focus:outline-none ${
                  isActive
                    ? 'bg-[#0B2924] text-[#C8AC75] border border-[#C8AC75] shadow-md'
                    : 'bg-white/70 border border-[#C8AC75]/30 text-[#153B49] hover:bg-white hover:text-[#0B2924]'
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
                className="bg-white border border-[#C8AC75]/25 rounded-2xl overflow-hidden transition-all shadow-xs"
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 font-serif text-base sm:text-lg font-light text-[#0B2924] hover:text-[#153B49] transition-colors focus:outline-none"
                >
                  <span>{item.question[currentLang]}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#C8AC75] shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-2 text-xs sm:text-sm text-[#153B49]/85 leading-relaxed font-sans font-light border-t border-[#C8AC75]/15">
                    {item.answer[currentLang]}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still have questions block */}
        <div className="mt-12 p-6 sm:p-7 bg-[#0B2924] text-[#F6F2E9] rounded-2xl border border-[#C8AC75]/35 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-xl">
          <div className="text-left">
            <h3 className="font-serif font-light text-white text-base sm:text-lg">
              {t.faq.stillHaveQuestions}
            </h3>
            <p className="text-xs text-[#F6F2E9]/75 font-sans font-light mt-1">
              {currentLang === 'es'
                ? 'Petra está a su disposición para asesorarlo en tiempo real según su itinerario.'
                : 'Petra is ready to provide exact advice tailored to your itinerary.'}
            </p>
          </div>
          <a
            href="https://wa.me/50764443649"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 py-3 px-5 text-xs font-sans font-semibold tracking-wider uppercase text-[#0B2924] bg-[#C8AC75] hover:bg-[#dfc38d] rounded-full shadow-lg transition-all whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{t.faq.askPetraBtn}</span>
          </a>
        </div>

      </div>
    </section>
  );
};
