import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import { BrandWordmark } from './BrandWordmark';
import { Menu, X, MessageCircle, Sparkles } from 'lucide-react';
import { FlagUS, FlagPanama } from './FlagIcons';
import logoPng from '../pictures/logo.png';
import logoWebp from '../pictures/logo.webp';

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
      setIsScrolled(window.scrollY > 30);
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
    <header className="fixed top-0 left-0 w-full z-50 pointer-events-none transition-all duration-500">
      {/* Background glass layer that transitions on scroll */}
      <div
        className={`absolute inset-0 transition-all duration-500 pointer-events-none ${
          isScrolled
            ? 'h-24 sm:h-28 bg-[#06121e]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl opacity-100'
            : 'h-32 sm:h-38 bg-gradient-to-b from-black/85 via-black/45 to-transparent opacity-100'
        }`}
      />

      {/* ========================================================
          1. MATHEMATICALLY CENTERED GUNA YALA + SUB-NAVIGATION + BRAND EMBLEM
          Anchored to 50% viewport width via left-1/2 -translate-x-1/2.
          Completely decoupled from left and right elements.
          Changing language or text will never shift this element by even 1px.
         ======================================================== */}
      <div
        style={{ left: '50%', transform: 'translateX(-50%)' }}
        className="absolute top-2.5 sm:top-3.5 lg:top-4 pointer-events-auto flex flex-col items-center justify-center select-none text-center z-30 w-max max-w-[90vw]"
      >
        {/* Visual Brand Wordmark: GUNA YALA with water floating, sunlight shimmer & subtle reflection */}
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
            size="lg"
            withWaterEffect={true}
            withWaterReflection={true}
          />
        </a>

        {/* Refined Navigation Line directly underneath GUNA YALA (Desktop) */}
        {/* Format: Experiences · Discover · Islands · Our Story · Reviews */}
        <nav
          className="hidden md:flex items-center justify-center gap-2 sm:gap-3 lg:gap-4 mt-2 sm:mt-2.5 text-[11px] lg:text-[12px] uppercase font-sans font-medium tracking-[0.22em] text-white/80 whitespace-nowrap"
          style={{ letterSpacing: '0.22em' }}
        >
          <a
            href="#experiences"
            onClick={(e) => handleNavClick(e, 'experiences')}
            className="hover:text-white text-white/80 hover:text-cyan-300 transition-colors duration-200"
          >
            {t.nav.experiences}
          </a>
          <span className="text-white/35 text-[9px] select-none" aria-hidden="true">
            ·
          </span>

          <a
            href="#discover"
            onClick={(e) => handleNavClick(e, 'discover')}
            className="hover:text-white text-white/80 hover:text-cyan-300 transition-colors duration-200"
          >
            {t.nav.discover}
          </a>
          <span className="text-white/35 text-[9px] select-none" aria-hidden="true">
            ·
          </span>

          <a
            href="#map"
            onClick={(e) => handleNavClick(e, 'map')}
            className="hover:text-white text-white/80 hover:text-cyan-300 transition-colors duration-200"
          >
            {t.nav.islands}
          </a>
          <span className="text-white/35 text-[9px] select-none" aria-hidden="true">
            ·
          </span>

          <a
            href="#heritage"
            onClick={(e) => handleNavClick(e, 'heritage')}
            className="hover:text-white text-white/80 hover:text-cyan-300 transition-colors duration-200"
          >
            {t.nav.ourStory}
          </a>
          <span className="text-white/35 text-[9px] select-none" aria-hidden="true">
            ·
          </span>

          <a
            href="#reviews"
            onClick={(e) => handleNavClick(e, 'reviews')}
            className="hover:text-white text-white/80 hover:text-cyan-300 transition-colors duration-200"
          >
            {t.nav.reviews}
          </a>
        </nav>
      </div>

      {/* ========================================================
          2. TOP-LEFT BRAND ELEMENT: Authentic Guna Yala Brand Sticker / Logo
          Replaces the former numbers/coordinates with the genuine brand logo.
          Independent absolute position: zero layout influence on the centered wordmark.
         ======================================================== */}
      <div className="absolute left-3.5 sm:left-6 lg:left-10 top-2.5 sm:top-3.5 lg:top-4 pointer-events-auto flex items-center gap-2.5 sm:gap-3.5 z-30">
        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-full text-white bg-black/40 hover:bg-black/60 border border-white/20 backdrop-blur-md transition-colors focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>

        {/* Authentic Guna Yala Brand Sticker / Logo */}
        <a
          href="#hero"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="group block focus:outline-none transition-all duration-300"
          aria-label="Guna Yala Official Brand Mark"
        >
          <picture className="block">
            <source srcSet={logoWebp} type="image/webp" />
            <img
              src={logoPng}
              alt="Guna Yala Official Logo"
              width={104}
              height={104}
              className={`aspect-square object-contain drop-shadow-[0_4px_20px_rgba(0,0,0,0.65)] transition-all duration-300 group-hover:scale-105 active:scale-95 ${
                isScrolled
                  ? 'w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 opacity-95'
                  : 'w-11 h-11 sm:w-14 sm:h-14 md:w-20 md:h-20 lg:w-[104px] lg:h-[104px] opacity-100'
              }`}
            />
          </picture>
        </a>
      </div>

      {/* ========================================================
          3. RIGHT ZONE (Language Switcher & Understated CTA)
          Independent absolute position, zero effect on center logo
         ======================================================== */}
      <div className="absolute right-4 sm:right-8 lg:right-12 top-4 sm:top-5 lg:top-6 pointer-events-auto flex items-center gap-2.5 sm:gap-4 z-30">
        {/* Language Switcher: EN (US Flag) | ES (Panama Flag) */}
        <div className="flex items-center text-[11px] sm:text-xs font-medium tracking-wider text-white/90 bg-black/45 backdrop-blur-md border border-white/20 rounded-full p-1 shadow-sm">
          <button
            onClick={() => onLanguageChange('en')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-200 ${
              currentLang === 'en'
                ? 'bg-white/25 text-white font-semibold shadow-xs'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            aria-label="Switch to English"
            title="English (US)"
          >
            <FlagUS className="w-3.5 h-2.5 sm:w-4 sm:h-3" />
            <span>EN</span>
          </button>
          <span className="w-px h-3.5 bg-white/20 mx-0.5 select-none" aria-hidden="true" />
          <button
            onClick={() => onLanguageChange('es')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-200 ${
              currentLang === 'es'
                ? 'bg-white/25 text-white font-semibold shadow-xs'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            aria-label="Cambiar a Español"
            title="Español (Panamá)"
          >
            <FlagPanama className="w-3.5 h-2.5 sm:w-4 sm:h-3" />
            <span>ES</span>
          </button>
        </div>

        {/* Understated Luxury "Plan Your Trip" Action */}
        <button
          onClick={onOpenPlanner}
          className="inline-flex items-center gap-1.5 px-3.5 sm:px-5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-medium tracking-[0.16em] uppercase text-white bg-white/10 hover:bg-white/20 border border-white/30 hover:border-white/60 rounded-full backdrop-blur-md transition-all duration-200 active:scale-95 shadow-md shadow-black/20"
        >
          <Sparkles className="w-3 h-3 text-cyan-300" />
          <span>{t.nav.planBtn}</span>
        </button>
      </div>

      {/* ========================================================
          4. MOBILE DRAWER OVERLAY
         ======================================================== */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-0 pt-20 pb-10 bg-[#06121e]/98 backdrop-blur-2xl border-b border-white/10 px-6 space-y-6 shadow-2xl z-20 pointer-events-auto animate-in slide-in-from-top-4 duration-200">
          <div className="text-center pb-4 border-b border-white/10">
            <h2 className="font-brand text-xl text-white tracking-[0.3em]">GUNA YALA</h2>
            <p className="text-[10px] tracking-[0.25em] text-cyan-300/70 uppercase mt-1">
              San Blas · Panama
            </p>
          </div>

          <nav className="flex flex-col space-y-3.5 text-center text-sm font-medium tracking-[0.2em] uppercase text-white/90">
            <a
              href="#experiences"
              onClick={(e) => handleNavClick(e, 'experiences')}
              className="py-1 hover:text-cyan-300 transition-colors"
            >
              {t.nav.experiences}
            </a>
            <a
              href="#discover"
              onClick={(e) => handleNavClick(e, 'discover')}
              className="py-1 hover:text-cyan-300 transition-colors"
            >
              {t.nav.discover}
            </a>
            <a
              href="#finder"
              onClick={(e) => handleNavClick(e, 'finder')}
              className="py-1 hover:text-cyan-300 transition-colors"
            >
              {currentLang === 'es' ? 'Ayúdame a Elegir' : 'Help Me Choose'}
            </a>
            <a
              href="#islands"
              onClick={(e) => handleNavClick(e, 'islands')}
              className="py-1 hover:text-cyan-300 transition-colors"
            >
              {t.nav.islands}
            </a>
            <a
              href="#heritage"
              onClick={(e) => handleNavClick(e, 'heritage')}
              className="py-1 hover:text-cyan-300 transition-colors"
            >
              {t.nav.ourStory}
            </a>
            <a
              href="#team"
              onClick={(e) => handleNavClick(e, 'team')}
              className="py-1 hover:text-cyan-300 transition-colors"
            >
              {t.nav.about}
            </a>
            <a
              href="#reviews"
              onClick={(e) => handleNavClick(e, 'reviews')}
              className="py-1 hover:text-cyan-300 transition-colors"
            >
              {t.nav.reviews} (5.0 ★)
            </a>
            <a
              href="#faq"
              onClick={(e) => handleNavClick(e, 'faq')}
              className="py-1 hover:text-cyan-300 transition-colors"
            >
              {t.nav.faq}
            </a>
          </nav>

          <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
            {/* Language Switcher in Mobile Drawer */}
            <div className="flex items-center justify-center gap-2 p-1 bg-white/10 border border-white/15 rounded-full">
              <button
                onClick={() => {
                  onLanguageChange('en');
                  setMobileMenuOpen(false);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-xs uppercase tracking-wider font-semibold transition-all ${
                  currentLang === 'en'
                    ? 'bg-white text-[#06121e] shadow-sm'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <FlagUS className="w-4 h-3" />
                <span>English (US)</span>
              </button>
              <button
                onClick={() => {
                  onLanguageChange('es');
                  setMobileMenuOpen(false);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-xs uppercase tracking-wider font-semibold transition-all ${
                  currentLang === 'es'
                    ? 'bg-white text-[#06121e] shadow-sm'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <FlagPanama className="w-4 h-3" />
                <span>Español (PA)</span>
              </button>
            </div>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenPlanner();
              }}
              className="w-full py-3 text-center text-xs uppercase tracking-[0.2em] font-semibold text-[#06121e] bg-white rounded-full shadow-lg"
            >
              {t.nav.planBtn}
            </button>
            <a
              href="https://wa.me/50764443649"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 text-center text-xs tracking-wider font-medium text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 rounded-full flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>WhatsApp (+507 6444-3649)</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
