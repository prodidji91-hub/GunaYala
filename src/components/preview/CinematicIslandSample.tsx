import React, { useState } from 'react';
import { Compass, Sparkles, ChevronDown, CheckCircle2, ShieldCheck, MapPin, Anchor, Waves } from 'lucide-react';
import { Language } from '../../types';

interface CinematicIslandSampleProps {
  currentLang: Language;
  onRequestExperience: (islandName: string, price: string) => void;
}

export const CinematicIslandSample: React.FC<CinematicIslandSampleProps> = ({
  currentLang,
  onRequestExperience,
}) => {
  const isEs = currentLang === 'es';

  return (
    <div className="w-full text-[#f6f2e9]">
      {/* ========================================================
          1. CINEMATIC FULL-BLEED HERO (75 - 85% Viewport Height)
         ======================================================== */}
      <section className="relative w-full min-h-[78vh] md:min-h-[85vh] flex flex-col justify-end overflow-hidden bg-[#06121e]">
        {/* Cinematic Background Media with Slow Motion Zoom */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="/pictures/10 Boat Day Tour.jpg"
            alt="Chichime Island Cinematic View"
            className="w-full h-full object-cover scale-105 transition-transform duration-[10000ms] ease-out hover:scale-110"
            onError={(e) => {
              // Fallback if image fails
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          {/* Multi-layered Dark Gradient Overlay for Supreme Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#06121e] via-[#06121e]/55 to-black/60" />
          <div className="absolute inset-0 bg-radial-[at_center_top] from-transparent via-[#06121e]/30 to-[#06121e]/80" />
        </div>

        {/* Media Preview Badge Label */}
        <div className="absolute top-6 right-6 z-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-[#c8ac75]/40 text-[#c8ac75] text-[10px] font-mono tracking-widest uppercase">
            <Sparkles className="w-3 h-3 text-[#c8ac75]" />
            <span>{isEs ? 'Muestra 01: Isla Chichime Grande' : 'Sample 01: Chichime Grande'}</span>
          </div>
        </div>

        {/* Hero Headline & Emotional Typography Layer */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 pb-16 md:pb-24 w-full text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#c8ac75]/20 border border-[#c8ac75]/50 text-[#c8ac75] text-xs font-mono uppercase tracking-[0.25em] backdrop-blur-sm">
            <Compass className="w-3.5 h-3.5 text-[#c8ac75]" />
            <span>{isEs ? 'Experiencia Cinematográfica' : 'Cinematic Island Experience'}</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-serif font-light tracking-tight text-[#f6f2e9] leading-none drop-shadow-2xl">
              CHICHIME ISLAND
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl font-serif italic text-[#c8ac75] tracking-wide">
              {isEs ? 'Desconecta. Explora. Recarga.' : 'Unwind. Explore. Recharge.'}
            </p>
          </div>

          {/* Thin Champagne-Gold Line Animation */}
          <div className="flex justify-center my-4">
            <div className="h-0.5 w-28 md:w-36 bg-[#c8ac75] shadow-[0_0_12px_rgba(200,172,117,0.8)] rounded-full" />
          </div>

          <p className="max-w-2xl mx-auto text-sm sm:text-base md:text-lg text-[#e2e8f0] font-light leading-relaxed drop-shadow-md">
            {isEs
              ? 'Descubre un pacífico refugio caribeño con playas de arena blanca, aguas cristalinas y espacio para reconectarte con la naturaleza.'
              : 'Discover a peaceful Caribbean escape with white sand beaches, crystal-clear waters, and room to reconnect with nature.'}
          </p>

          {/* Elegant Scrolling Indicator */}
          <div className="pt-8 flex flex-col items-center justify-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#c8ac75]">
              {isEs ? 'Desplaza para Explorar Detalle' : 'Scroll for Details'}
            </span>
            <ChevronDown className="w-5 h-5 text-[#c8ac75] animate-bounce" />
          </div>
        </div>
      </section>

      {/* ========================================================
          2. CINEMATIC INFORMATION & ACCOMMODATION SECTION
         ======================================================== */}
      <section className="bg-[#06121e] py-16 md:py-24 px-6 relative border-t border-[#1e3a5f]/60">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Overview Kicker */}
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#c8ac75] block">
              {isEs ? 'Detalles de la Cabaña y Estadía' : 'Cabin & Stay Specifications'}
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif text-[#f6f2e9]">
              {isEs ? 'Tu Refugio Privado en Chichime' : 'Your Private Sanctuary on Chichime'}
            </h2>
            <p className="text-sm text-[#94a3b8] font-light leading-relaxed">
              {isEs
                ? 'Información auténtica sobre instalaciones, excursiones incluidas y tarifas oficiales.'
                : 'Authentic information regarding island facilities, included excursions, and official rates.'}
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-[#0b2438]/80 border border-[#1e3a5f] space-y-3 shadow-xl">
              <div className="w-10 h-10 rounded-2xl bg-[#c8ac75]/10 border border-[#c8ac75]/30 flex items-center justify-center text-[#c8ac75]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif text-white">
                {isEs ? 'Cabaña Privada' : 'Private Beach Cabin'}
              </h3>
              <p className="text-xs text-[#cbd5e1] leading-relaxed">
                {isEs
                  ? 'Cabaña de playa con baño privado, camas cómodas y brisa natural frente al mar.'
                  : 'Private beach cabin featuring a private bathroom, comfortable bedding, and ocean breeze.'}
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#0b2438]/80 border border-[#1e3a5f] space-y-3 shadow-xl">
              <div className="w-10 h-10 rounded-2xl bg-[#38bdf8]/10 border border-[#38bdf8]/30 flex items-center justify-center text-[#38bdf8]">
                <Waves className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif text-white">
                {isEs ? 'Playas & Snorkel' : 'White Sand & Snorkeling'}
              </h3>
              <p className="text-xs text-[#cbd5e1] leading-relaxed">
                {isEs
                  ? 'Acceso directo a playas de arena blanca, natación en aguas cristalinas y arrecifes.'
                  : 'Direct access to powder white beaches, swimming in turquoise lagoon, and reef snorkeling.'}
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#0b2438]/80 border border-[#1e3a5f] space-y-3 shadow-xl">
              <div className="w-10 h-10 rounded-2xl bg-[#c8ac75]/10 border border-[#c8ac75]/30 flex items-center justify-center text-[#c8ac75]">
                <Anchor className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-serif text-white">
                {isEs ? 'Excursión Incluida' : 'Included Boat Trip'}
              </h3>
              <p className="text-xs text-[#cbd5e1] leading-relaxed">
                {isEs
                  ? 'Excursión en lancha compartida a una isla vecina y la famosa Piscina Natural.'
                  : 'Shared boat excursion to a nearby coral cay and the natural ocean sandbar pool.'}
              </p>
            </div>
          </div>

          {/* Pricing & CTA Card */}
          <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-r from-[#081f33] via-[#0b2438] to-[#081f33] border border-[#c8ac75]/40 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 text-center md:text-left max-w-xl">
              <div className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#c8ac75]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isEs ? 'Tarifa Oficial Petra — Guna Yala' : 'Official Petra Rate — Guna Yala'}</span>
              </div>
              <div className="space-y-1">
                <div className="text-3xl sm:text-4xl font-serif text-white font-light">
                  {isEs ? 'Desde USD 259' : 'From USD 259'} <span className="text-xs font-sans text-[#94a3b8]">{isEs ? '/ persona (1a noche)' : '/ person (1st night)'}</span>
                </div>
                <div className="text-xs font-mono text-[#c8ac75]">
                  {isEs ? 'Noches adicionales desde USD 119 por persona' : 'Additional nights from USD 119 per person'}
                </div>
              </div>
              <p className="text-xs text-[#cbd5e1] font-light">
                {isEs
                  ? 'Incluye comidas tradicionales diarias, transporte en bote a la isla y excursión a la Piscina Natural.'
                  : 'Includes daily traditional meals, island boat transfer, and Natural Pool boat excursion.'}
              </p>
            </div>

            <div className="shrink-0 w-full md:w-auto">
              <button
                onClick={() => onRequestExperience('Chichime Grande', 'USD 259')}
                className="w-full md:w-auto py-4 px-8 rounded-full bg-[#c8ac75] hover:bg-[#d4af37] text-[#06121e] font-serif font-semibold text-sm tracking-wider uppercase transition-all transform hover:-translate-y-0.5 shadow-xl hover:shadow-[#c8ac75]/30 flex items-center justify-center gap-2"
              >
                <span>{isEs ? 'SOLICITAR ESTA EXPERIENCIA' : 'REQUEST THIS EXPERIENCE'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
