import React from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { VisualAsset } from '../pictures';
import { MessageCircle, Phone } from 'lucide-react';

interface MeetTeamProps {
  currentLang: Language;
}

export const MeetTeam: React.FC<MeetTeamProps> = ({ currentLang }) => {
  const t = TRANSLATIONS[currentLang];

  return (
    <section id="team" className="py-24 md:py-36 bg-[#F7F3EC] border-t border-[#C6A15B]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.25em] text-[#C6A15B] mb-3">
            {t.team.kicker}
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#06121E] tracking-tight">
            {t.team.headline}
          </h2>
          <p className="text-sm sm:text-base text-[#6D7478] mt-3 leading-relaxed font-light">
            {t.team.subtitle}
          </p>
        </div>

        {/* 2 Host Profiles Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 max-w-4xl mx-auto">
          
          {/* Host 1: Petra */}
          <div className="bg-white border border-[#C6A15B]/30 rounded-2xl overflow-hidden p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-xl transition-all duration-300">
            <div>
              {/* Profile Image Slot */}
              <div className="aspect-[4/3] rounded-xl overflow-hidden border border-[#C6A15B]/20 mb-6 bg-[#EFE9DE] group">
                <VisualAsset
                  variant="petra"
                  alt="Petra"
                  className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-700 ease-out"
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-serif font-light text-[#06121E]">
                  Petra
                </h3>
                <p className="text-xs font-mono font-semibold uppercase tracking-[0.18em] text-[#C6A15B]">
                  {t.team.petraRole}
                </p>
                <p className="text-xs sm:text-sm text-[#6D7478] leading-relaxed font-light pt-2">
                  {t.team.petraBio}
                </p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-[#C6A15B]/20">
              <a
                href="https://wa.me/50764443649"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-mono font-semibold text-[#06121E] hover:text-[#C6A15B] transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-[#C6A15B]" />
                <span>{currentLang === 'es' ? 'Contactar a Petra por WhatsApp' : 'Contact Petra on WhatsApp'}</span>
              </a>
            </div>
          </div>

          {/* Host 2: Abisua */}
          <div className="bg-white border border-[#C6A15B]/30 rounded-2xl overflow-hidden p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-xl transition-all duration-300">
            <div>
              {/* Profile Image Slot */}
              <div className="aspect-[4/3] rounded-xl overflow-hidden border border-[#C6A15B]/20 mb-6 bg-[#EFE9DE] group">
                <VisualAsset
                  variant="abisua"
                  alt="Abisua"
                  className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-700 ease-out"
                />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-serif font-light text-[#06121E]">
                  Abisua
                </h3>
                <p className="text-xs font-mono font-semibold uppercase tracking-[0.18em] text-[#C6A15B]">
                  {t.team.abisuaRole}
                </p>
                <p className="text-xs sm:text-sm text-[#6D7478] leading-relaxed font-light pt-2">
                  {t.team.abisuaBio}
                </p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-[#C6A15B]/20">
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-mono font-semibold text-[#6D7478]">
                <Phone className="w-4 h-4 text-[#C6A15B]" />
                <span>{currentLang === 'es' ? 'Coordinación directa en la isla (+507 6444-3649)' : 'Direct on-island coordination (+507 6444-3649)'}</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
