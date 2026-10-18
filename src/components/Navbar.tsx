import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { BrandWordmark } from './BrandWordmark';
import { Menu, X, MessageCircle, Calendar } from 'lucide-react';
import { FlagUS, FlagPanama } from './FlagIcons';

interface NavbarProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenPlanner: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang,
  onLanguageChange,
  onOpenPlanner,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = TRANSLATIONS[currentLang];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full h-[84px] sm:h-[92px] z-50 pointer-events-none transition-all duration-300">
      {/* Midnight Navy (#071722) Sophisticated Header Backdrop with Subtle Dark Navy Gradient */}
      <div
        className={`absolute inset-0 h-[84px] sm:h-[92px] transition-all duration-300 pointer-events-none ${
          isScrolled
            ? 'bg-gradient-to-r from-[#071722]/98 via-[#0b1f2e]/98 to-[#071722]/98 backdrop-blur-xl border-b border-[#D6BA80]/30 shadow-2xl'
            : 'bg-gradient-to-r from-[#071722]/92 via-[#0a1c2a]/92 to-[#071722]/92 backdrop-blur-md border-b border-[#D6BA80]/20 shadow-lg'
        }`}
      />

      {/* ========================================================
          1. CENTERED GUNA YALA BRAND WORDMARK + SUB-NAVIGATION
         ======================================================== */}
      <div
        style={{ left: '50%', transform: 'translate(-50%, -50%)' }}
        className="absolute top-1/2 pointer-events-auto flex flex-col items-center justify-center select-none text-center z-30 w-max max-w-[42vw] sm:max-w-[55vw] lg:max-w-[70vw]"
      >
        {/* Compact GUNA YALA Editorial Wordmark */}
        <a
          href="#hero"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="group block focus:outline-none transition-transform duration-300 active:scale-98"
          aria-label="Guna Yala Home"
        >
          <BrandWordmark
            variant="water-hero"
            size="md"
            withWaterEffect={true}
            withWaterReflection={true}
          />
        </a>

        {/* Sub-Navigation Directly Beneath Brand Wordmark (Desktop) */}
        {/* EXPERIENCES · DISCOVER · ISLANDS · OUR STORY · REVIEWS */}
        <nav
          className="hidden md:flex items-center justify-center gap-2.5 sm:gap-3 lg:gap-3.5 mt-0.5 text-[10px] lg:text-[10.5px] uppercase font-sans font-medium tracking-[0.20em] text-[#F6F2E9]/85 whitespace-nowrap leading-none"
          style={{ letterSpacing: '0.20em' }}
        >
          <a
            href="#experiences"
            onClick={(e) => handleNavClick(e, 'experiences')}
            className="hover:text-white text-[#F6F2E9]/85 hover:text-[#D6BA80] transition-colors duration-200"
          >
            {t.nav.experiences}
          </a>
          <span className="text-[#D6BA80]/40 text-[8px] select-none" aria-hidden="true">
            ·
          </span>

          <a
            href="#welcome"
            onClick={(e) => handleNavClick(e, 'welcome')}
            className="hover:text-white text-[#F6F2E9]/85 hover:text-[#D6BA80] transition-colors duration-200"
          >
            {t.nav.discover}
          </a>
          <span className="text-[#D6BA80]/40 text-[8px] select-none" aria-hidden="true">
            ·
          </span>

          <a
            href="#islands"
            onClick={(e) => handleNavClick(e, 'islands')}
            className="hover:text-white text-[#F6F2E9]/85 hover:text-[#D6BA80] transition-colors duration-200"
          >
            {t.nav.islands}
          </a>
          <span className="text-[#D6BA80]/40 text-[8px] select-none" aria-hidden="true">
            ·
          </span>

          <a
            href="#heritage"
            onClick={(e) => handleNavClick(e, 'heritage')}
            className="hover:text-white text-[#F6F2E9]/85 hover:text-[#D6BA80] transition-colors duration-200"
          >
            {t.nav.ourStory}
          </a>
          <span className="text-[#D6BA80]/40 text-[8px] select-none" aria-hidden="true">
            ·
          </span>

          <a
            href="#reviews"
            onClick={(e) => handleNavClick(e, 'reviews')}
            className="hover:text-white text-[#F6F2E9]/85 hover:text-[#D6BA80] transition-colors duration-200"
          >
            {t.nav.reviews}
          </a>
        </nav>
      </div>

      {/* ========================================================
          2. FAR-LEFT BRAND LOGO (Enlarged Gold-Lettering Logo with Floating Animation)
         ======================================================== */}
      <div className="absolute left-2.5 sm:left-4 lg:left-8 top-1/2 -translate-y-1/2 pointer-events-auto flex items-center gap-2 sm:gap-3 z-30">
        {/* Mobile menu toggle button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-1.5 rounded-full text-white bg-black/40 hover:bg-black/60 border border-[#D6BA80]/30 backdrop-blur-md transition-colors focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-4 h-4 text-[#D6BA80]" /> : <Menu className="w-4 h-4 text-[#D6BA80]" />}
        </button>

        {/* Authentic Guna Yala Golden Brand Logo (logo1-transparent.png, Clean Transparent Sticker) */}
        <a
          href="#hero"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="group block focus:outline-none transition-all duration-300"
          aria-label="Guna Yala Official Brand Mark"
        >
          <img
            src="/pictures/logo1-transparent.png"
            alt="Guna Yala Panama Travel Official Logo"
            className="h-[52px] sm:h-[64px] lg:h-[88px] w-auto object-contain bg-transparent border-none animate-logo-float transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_12px_rgba(214,186,128,0.4)] active:scale-95"
          />
        </a>
      </div>

      {/* ========================================================
          3. FAR-RIGHT ZONE: EN/ES Switcher & PLAN YOUR TRIP Button (Vertically Centered)
         ======================================================== */}
      <div className="absolute right-2.5 sm:right-4 lg:right-8 top-1/2 -translate-y-1/2 pointer-events-auto flex items-center gap-1.5 sm:gap-2.5 z-30">
        {/* Language Switcher */}
        <div className="flex items-center text-[9px] sm:text-[10px] font-medium tracking-wider text-[#F6F2E9]/90 bg-black/45 backdrop-blur-md border border-[#C8AC75]/35 rounded-full p-0.5 shadow-xs">
          <button
            onClick={() => onLanguageChange('en')}
            className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full transition-all duration-200 ${
              currentLang === 'en'
                ? 'bg-[#C8AC75] text-[#071722] font-semibold shadow-xs'
                : 'text-[#F6F2E9]/70 hover:text-white hover:bg-white/10'
            }`}
            aria-label="Switch to English"
            title="English (US)"
          >
            <FlagUS className="w-3 h-2 sm:w-3.5 sm:h-2.5" />
            <span>EN</span>
          </button>
          <span className="w-px h-3 bg-[#C8AC75]/30 mx-0.5 select-none" aria-hidden="true" />
          <button
            onClick={() => onLanguageChange('es')}
            className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full transition-all duration-200 ${
              currentLang === 'es'
                ? 'bg-[#C8AC75] text-[#071722] font-semibold shadow-xs'
                : 'text-[#F6F2E9]/70 hover:text-white hover:bg-white/10'
            }`}
            aria-label="Cambiar a Español"
            title="Español (Panamá)"
          >
            <FlagPanama className="w-3.5 h-2.5" />
            <span>ES</span>
          </button>
        </div>

        {/* Champagne-Gold PLAN YOUR TRIP Action Button */}
        <button
          onClick={onOpenPlanner}
          className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-[9px] sm:text-[10px] font-semibold tracking-[0.10em] sm:tracking-[0.14em] uppercase text-[#071722] bg-[#C8AC75] hover:bg-[#dfc38d] rounded-full shadow-sm transition-all duration-200 active:scale-95 font-sans whitespace-nowrap"
        >
          <Calendar className="w-3 h-3 text-[#071722]" />
          <span>{t.nav.planBtn}</span>
        </button>
      </div>

      {/* ========================================================
          4. MOBILE DRAWER OVERLAY
         ======================================================== */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-0 pt-20 pb-8 bg-[#071722]/98 backdrop-blur-2xl border-b border-[#C8AC75]/30 px-6 space-y-4 shadow-2xl z-20 pointer-events-auto animate-in slide-in-from-top-4 duration-200">
          <div className="text-center pb-2.5 border-b border-[#C8AC75]/20">
            <h2 className="font-serif text-lg text-white tracking-[0.2em]">GUNA YALA</h2>
            <p className="text-[9px] tracking-[0.22em] text-[#C8AC75] uppercase mt-0.5 font-sans">
              The Island Collection · Panama
            </p>
          </div>

          <nav className="flex flex-col space-y-2.5 text-center text-xs font-medium tracking-[0.2em] uppercase text-[#F6F2E9]/90 font-sans">
            <a
              href="#experiences"
              onClick={(e) => handleNavClick(e, 'experiences')}
              className="py-1 hover:text-[#C8AC75] transition-colors"
            >
              {t.nav.experiences}
            </a>
            <a
              href="#welcome"
              onClick={(e) => handleNavClick(e, 'welcome')}
              className="py-1 hover:text-[#C8AC75] transition-colors"
            >
              {t.nav.discover}
            </a>
            <a
              href="#islands"
              onClick={(e) => handleNavClick(e, 'islands')}
              className="py-1 hover:text-[#C8AC75] transition-colors"
            >
              {t.nav.islands}
            </a>
            <a
              href="#finder"
              onClick={(e) => handleNavClick(e, 'finder')}
              className="py-1 hover:text-[#C8AC75] transition-colors"
            >
              {currentLang === 'es' ? 'Ayúdame a Elegir' : 'Help Me Choose'}
            </a>
            <a
              href="#heritage"
              onClick={(e) => handleNavClick(e, 'heritage')}
              className="py-1 hover:text-[#C8AC75] transition-colors"
            >
              {t.nav.ourStory}
            </a>
            <a
              href="#reviews"
              onClick={(e) => handleNavClick(e, 'reviews')}
              className="py-1 hover:text-[#C8AC75] transition-colors"
            >
              {t.nav.reviews} (5.0 ★)
            </a>
          </nav>

          <div className="pt-2.5 border-t border-[#C8AC75]/20 flex flex-col gap-2">
            {/* Mobile Language Switcher */}
            <div className="flex items-center justify-center gap-2 p-1 bg-white/10 border border-[#C8AC75]/30 rounded-full">
              <button
                onClick={() => {
                  onLanguageChange('en');
                  setMobileMenuOpen(false);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs uppercase tracking-wider font-semibold transition-all ${
                  currentLang === 'en'
                    ? 'bg-[#C8AC75] text-[#071722] shadow-xs'
                    : 'text-[#F6F2E9]/70 hover:text-white'
                }`}
              >
                <FlagUS className="w-3.5 h-2.5" />
                <span>English (US)</span>
              </button>
              <button
                onClick={() => {
                  onLanguageChange('es');
                  setMobileMenuOpen(false);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs uppercase tracking-wider font-semibold transition-all ${
                  currentLang === 'es'
                    ? 'bg-[#C8AC75] text-[#071722] shadow-xs'
                    : 'text-[#F6F2E9]/70 hover:text-white'
                }`}
              >
                <FlagPanama className="w-3.5 h-2.5" />
                <span>Español (PA)</span>
              </button>
            </div>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenPlanner();
              }}
              className="w-full py-2 text-center text-xs uppercase tracking-[0.18em] font-semibold text-[#071722] bg-[#C8AC75] rounded-full shadow-md"
            >
              {t.nav.planBtn}
            </button>
            <a
              href="https://wa.me/50764443649"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 text-center text-xs tracking-wider font-medium text-[#C8AC75] bg-[#040E15] border border-[#C8AC75]/40 rounded-full flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#C8AC75]" />
              <span>WhatsApp (+507 6444-3649)</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
