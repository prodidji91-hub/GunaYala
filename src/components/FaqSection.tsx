import React, { useState } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { FAQ_DATA } from '../data/faq';
import { ChevronDown, MessageCircle } from 'lucide-react';

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
    <section id="faq" className="py-24 md:py-36 bg-[#F7F3EC] border-t border-[#C6A15B]/20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.25em] text-[#C6A15B] mb-3">
            {t.faq.kicker}
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#06121E] tracking-tight">
            {t.faq.title}
          </h2>
          <p className="text-sm sm:text-base text-[#6D7478] mt-3 leading-relaxed font-light">
            {t.faq.subtitle}
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-10 scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-mono uppercase tracking-wider font-semibold rounded-xl whitespace-nowrap transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-[#06121E] text-[#C6A15B] border border-[#C6A15B] shadow-sm'
                  : 'bg-white/80 border border-[#C6A15B]/20 text-[#6D7478] hover:bg-white hover:text-[#06121E]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-3">
          {filteredFaq.map((item) => {
            const isOpen = !!openItems[item.id];
            return (
              <div
                key={item.id}
                className="bg-white border border-[#C6A15B]/25 rounded-2xl overflow-hidden transition-all shadow-xs"
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 font-serif text-base sm:text-lg font-medium text-[#06121E] hover:text-[#0E7490] transition-colors"
                >
                  <span>{item.question[currentLang]}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#C6A15B] shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-2 text-xs sm:text-sm text-[#6D7478] leading-relaxed font-light border-t border-[#C6A15B]/15">
                    {item.answer[currentLang]}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Still have questions block */}
        <div className="mt-10 p-6 bg-[#faf8f5] rounded-xl border border-[#ded5c2] text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <h3 className="font-serif font-bold text-[#142634] text-base sm:text-lg">
              {t.faq.stillHaveQuestions}
            </h3>
            <p className="text-xs text-[#52606d] mt-0.5">
              Petra is ready to provide exact advice tailored to your itinerary.
            </p>
          </div>
          <a
            href="https://wa.me/50764443649"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 py-2.5 px-4 text-xs sm:text-sm font-semibold text-white bg-[#15803d] hover:bg-[#166534] rounded-lg shadow-sm whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{t.faq.askPetraBtn}</span>
          </a>
        </div>

      </div>
    </section>
  );
};
