import React from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { ShieldCheck, Compass, Users, Sparkles, ArrowRight } from 'lucide-react';

interface WelcomeSectionProps {
  currentLang: Language;
  onExploreIslands: () => void;
  onPlanTrip: () => void;
}

export const WelcomeSection: React.FC<WelcomeSectionProps> = ({
  currentLang,
  onExploreIslands,
  onPlanTrip,
}) => {
  const t = TRANSLATIONS[currentLang];

  return (
    <section
      id="welcome"
      className="py-24 sm:py-32 bg-[#F0E7D8] text-[#173D36] relative overflow-hidden border-b border-[#E2D2BB]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Editorial 2-Column Luxury Presentation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column: Authentic Photography Composition */}
          <div className="lg:col-span-5 relative">
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-[#E2D2BB] shadow-xl bg-[#FAF8F2]">
              <img
                src="/pictures/images (1).jpg"
                alt="Guna Yala Caribbean Sanctuary"
                className="w-full h-full object-cover filter brightness-[0.98] contrast-[1.03] hover:scale-103 transition-transform duration-1000 ease-out"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#173D36]/60 via-transparent to-transparent pointer-events-none" />

              {/* Floating Quote Badge */}
              <div className="absolute bottom-6 left-6 right-6 p-5 bg-white/95 backdrop-blur-md rounded-xl border border-[#E2D2BB] text-[#173D36] shadow-lg">
                <p className="text-xs font-serif italic text-[#C5A46B] mb-1">
                  {currentLang === 'es' ? 'Gobernanza Comarcal Autónoma' : 'Autonomous Indigenous Sanctuary'}
                </p>
                <p className="text-[11px] font-sans font-light text-[#53645E] leading-relaxed">
                  {currentLang === 'es'
                    ? '365 islas protegidas por la ley del Congreso General Guna, sin megaproyectos hoteleros.'
                    : '365 coral cays preserved under Congreso General Guna law, completely free of resort chains.'}
                </p>
              </div>
            </div>

            {/* Subtle decorative offset border */}
            <div className="absolute -bottom-4 -right-4 w-32 h-32 border border-[#C5A46B]/40 rounded-2xl -z-10 pointer-events-none hidden sm:block" />
          </div>

          {/* Right Column: Editorial Copy & Approved Positioning */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Minimal Kicker Tag */}
            <div className="flex items-center gap-2 text-xs font-sans uppercase tracking-[0.25em] text-[#C5A46B] font-semibold mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[#55B8B3]" />
              <span>{t.welcome.tag}</span>
            </div>

            {/* Editorial Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#173D36] tracking-tight leading-[1.18] mb-6 text-balance">
              {t.welcome.headline}
            </h2>

            {/* Prominent Approved Positioning Statement */}
            <div className="p-5 sm:p-6 bg-white rounded-xl border border-[#E2D2BB] border-l-4 border-l-[#C5A46B] text-[#173D36] shadow-sm mb-6">
              <p className="text-sm sm:text-base font-serif italic text-[#173D36] leading-relaxed">
                “{t.welcome.positioning}”
              </p>
            </div>

            {/* Editorial Paragraphs */}
            <div className="space-y-4 text-sm sm:text-base text-[#53645E] font-sans font-light leading-relaxed mb-8">
              <p>{t.welcome.p1}</p>
              <p>{t.welcome.p2}</p>
            </div>

            {/* Quality Pillars (Zero-pill clean metadata layout) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-[#E2D2BB]/70 mb-8">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-[#55B8B3] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs font-semibold text-[#173D36] uppercase tracking-wider font-sans">
                    {t.welcome.badge1}
                  </span>
                  <span className="text-[11px] text-[#53645E] font-light">
                    {currentLang === 'es' ? 'Guiado por normas comarcales' : 'Protected under local laws'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-[#55B8B3] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs font-semibold text-[#173D36] uppercase tracking-wider font-sans">
                    {t.welcome.badge2}
                  </span>
                  <span className="text-[11px] text-[#53645E] font-light">
                    {currentLang === 'es' ? '100% Coordinación local' : '100% Guna-owned and led'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Compass className="w-4 h-4 text-[#55B8B3] shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs font-semibold text-[#173D36] uppercase tracking-wider font-sans">
                    {t.welcome.badge3}
                  </span>
                  <span className="text-[11px] text-[#53645E] font-light">
                    {currentLang === 'es' ? 'Atención directa de Petra' : 'Personal trip coordination'}
                  </span>
                </div>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                onClick={onExploreIslands}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#173D36] hover:bg-[#1f5047] text-white text-xs font-semibold tracking-[0.16em] uppercase rounded-full shadow-md transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer"
              >
                <span>{t.welcome.exploreBtn}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#C5A46B]" />
              </button>

              <button
                onClick={onPlanTrip}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white hover:bg-[#FAF8F2] text-[#173D36] border border-[#E2D2BB] hover:border-[#173D36] text-xs font-semibold tracking-[0.16em] uppercase rounded-full transition-all duration-300 shadow-xs cursor-pointer"
              >
                <span>{t.welcome.planBtn}</span>
              </button>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
