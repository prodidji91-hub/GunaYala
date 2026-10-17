import React from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { BrandWordmark } from './BrandWordmark';
import { MessageCircle, Phone } from 'lucide-react';
import { FlagUS, FlagPanama } from './FlagIcons';
import logoPng from '../pictures/logo.png';
import logoWebp from '../pictures/logo.webp';

interface FooterProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenPlanner: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  currentLang,
  onLanguageChange,
  onOpenPlanner,
}) => {
  const t = TRANSLATIONS[currentLang];

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#142634] text-white/80 border-t border-[#1e3445] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-white/10">
          
          {/* Brand and identity */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-3.5">
              <picture className="block shrink-0">
                <source srcSet={logoWebp} type="image/webp" />
                <img
                  src={logoPng}
                  alt="Guna Yala Seal"
                  width={48}
                  height={48}
                  className="w-11 h-11 sm:w-12 sm:h-12 aspect-square object-contain drop-shadow-[0_2px_10px_rgba(0,0,0,0.4)]"
                />
              </picture>
              <div className="flex flex-col items-start">
                <BrandWordmark
                  variant="light"
                  size="sm"
                  showSubtitle={true}
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                />
                <span className="text-[10px] uppercase tracking-widest text-cyan-300/80 font-medium mt-1">
                  Guna Yala Panama Travel
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-white/70 leading-relaxed max-w-sm">
              {t.footer.brandDesc}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs font-semibold text-[#82d1c2]">
                Google Business 5.0 ★ (54 Reviews)
              </span>
            </div>
          </div>

          {/* Quick Nav Links */}
          <div className="lg:col-span-2 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-white">
              {t.footer.quickLinks}
            </div>
            <ul className="space-y-2 text-xs sm:text-sm text-white/70">
              <li>
                <a
                  href="#experiences"
                  onClick={(e) => handleScrollTo(e, 'experiences')}
                  className="hover:text-white transition-colors"
                >
                  {t.catalog.filterDay}
                </a>
              </li>
              <li>
                <a
                  href="#experiences"
                  onClick={(e) => handleScrollTo(e, 'experiences')}
                  className="hover:text-white transition-colors"
                >
                  {t.catalog.filterOvernight}
                </a>
              </li>
              <li>
                <a
                  href="#experiences"
                  onClick={(e) => handleScrollTo(e, 'experiences')}
                  className="hover:text-white transition-colors"
                >
                  {t.catalog.filterMultiDay}
                </a>
              </li>
              <li>
                <a
                  href="#experiences"
                  onClick={(e) => handleScrollTo(e, 'experiences')}
                  className="hover:text-white transition-colors"
                >
                  {t.catalog.filterCatamaran}
                </a>
              </li>
            </ul>
          </div>

          {/* Planning & Advice */}
          <div className="lg:col-span-3 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-white">
              {t.footer.planningTitle}
            </div>
            <ul className="space-y-2 text-xs sm:text-sm text-white/70">
              <li>
                <button
                  onClick={onOpenPlanner}
                  className="hover:text-white text-left transition-colors"
                >
                  {t.nav.planner}
                </button>
              </li>
              <li>
                <a
                  href="#faq"
                  onClick={(e) => handleScrollTo(e, 'faq')}
                  className="hover:text-white transition-colors"
                >
                  {t.nav.faq}
                </a>
              </li>
              <li>
                <a
                  href="#why-us"
                  onClick={(e) => handleScrollTo(e, 'why-us')}
                  className="hover:text-white transition-colors"
                >
                  {t.nav.whyUs}
                </a>
              </li>
              <li>
                <a
                  href="#team"
                  onClick={(e) => handleScrollTo(e, 'team')}
                  className="hover:text-white transition-colors"
                >
                  {t.nav.about}
                </a>
              </li>
            </ul>
          </div>

          {/* Comarca Governance & Contact */}
          <div className="lg:col-span-3 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-white">
              {t.footer.contactTitle}
            </div>
            <div className="space-y-2 text-xs sm:text-sm">
              <a
                href="https://wa.me/50764443649"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#82d1c2] hover:underline"
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp: {t.footer.phone}</span>
              </a>
              <a
                href="tel:+50764443649"
                className="flex items-center gap-2 text-white/80 hover:underline"
              >
                <Phone className="w-4 h-4 text-white/60" />
                <span>{t.footer.phone}</span>
              </a>
              <p className="text-xs text-white/60 pt-1">
                {t.footer.hours}
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 text-[11px] text-white/60 leading-relaxed">
              <span className="font-semibold text-white/80 block mb-0.5">
                {t.footer.comarcaNoticeTitle}
              </span>
              {t.footer.comarcaNoticeText}
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <div className="flex items-center gap-3 flex-wrap">
            <span>© {new Date().getFullYear()} {t.footer.rights}</span>
            <span className="text-white/20">|</span>
            <button
              onClick={() => {
                window.history.pushState({}, '', '/admin');
                window.dispatchEvent(new Event('popstate'));
                window.scrollTo(0, 0);
              }}
              className="text-white/40 hover:text-white/80 transition-colors flex items-center gap-1 hover:underline"
              title="Quotation Administration Dashboard"
            >
              <span>Admin Portal</span>
            </button>
          </div>

          {/* Language selector with flags */}
          <div className="flex items-center gap-2">
            <span className="text-white/50">{currentLang === 'es' ? 'Idioma:' : 'Language:'}</span>
            <div className="inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-0.5">
              <button
                onClick={() => onLanguageChange('en')}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs transition-colors ${
                  currentLang === 'en'
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-white/60 hover:text-white'
                }`}
                title="English (US)"
              >
                <FlagUS className="w-3.5 h-2.5" />
                <span>EN</span>
              </button>
              <span className="text-white/20 text-[10px]">|</span>
              <button
                onClick={() => onLanguageChange('es')}
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs transition-colors ${
                  currentLang === 'es'
                    ? 'bg-white/20 text-white font-semibold'
                    : 'text-white/60 hover:text-white'
                }`}
                title="Español (Panamá)"
              >
                <FlagPanama className="w-3.5 h-2.5" />
                <span>ES</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};
