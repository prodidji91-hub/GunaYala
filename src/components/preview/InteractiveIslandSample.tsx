import React, { useState } from 'react';
import { Compass, Sparkles, Anchor, Waves, Sun, CheckCircle2, ArrowRight } from 'lucide-react';
import { Language } from '../../types';

interface InteractiveIslandSampleProps {
  currentLang: Language;
  onRequestExperience: (islandName: string, price: string) => void;
}

export const InteractiveIslandSample: React.FC<InteractiveIslandSampleProps> = ({
  currentLang,
  onRequestExperience,
}) => {
  const isEs = currentLang === 'es';
  const [activeHighlight, setActiveHighlight] = useState<number>(0);

  const highlights = [
    {
      id: 0,
      title: isEs ? '01 — Aventura de Snorkel' : '01 — Snorkeling Adventure',
      heading: isEs ? 'El Barco Hundido de Perro Chico' : 'Famous Offshore Shipwreck',
      description: isEs
        ? 'A pocos metros de la orilla se encuentra un icónico barco de carga hundido cubierto de corales vivos y rodeado de peces tropicales multicolor en aguas cristalinas poco profundas.'
        : 'Just offshore lies a world-famous sunken cargo ship encrusted in vibrant coral reefs and teeming with colorful tropical fish in crystal-clear shallow lagoon.',
      image: '/pictures/perrochico.jpg',
      icon: Anchor,
    },
    {
      id: 1,
      title: isEs ? '02 — Alojamiento en la Isla' : '02 — Island Accommodation',
      heading: isEs ? 'Cabañas Frente al Mar con Baño Privado' : 'Renovated Beachfront Cabins',
      description: isEs
        ? 'Cabañas recientemente renovadas frente a la playa con baño privado, brisa caribeña y terraza sobre la arena fina de coral.'
        : 'Recently renovated beachfront cabins featuring private bathrooms, fresh Caribbean breezes, and stepping directly onto powder-white coral sand.',
      image: '/pictures/04 Franklin.jpg',
      icon: Waves,
    },
    {
      id: 2,
      title: isEs ? '03 — Ambiente e Instalaciones' : '03 — Island Atmosphere',
      heading: isEs ? 'Vistas al Atardecer y Bar Playeros' : 'Rooftop Sunsets & Outdoor Bar',
      description: isEs
        ? 'Disfruta de vistas espectaculares del atardecer desde el área alta, relajación en la playa de arena fina y refrescos en el bar rústico de la isla.'
        : 'Enjoy panoramic rooftop sunset vistas, relax under coconut palms on white sand shores, and enjoy cool beverages at the rustic beachfront bar.',
      image: '/pictures/10 Boat Day Tour.jpg',
      icon: Sun,
    },
  ];

  const currentHighlight = highlights[activeHighlight];

  return (
    <div className="w-full bg-[#06121e] text-[#f6f2e9] py-12 md:py-20 px-6 sm:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* ========================================================
            1. INTERACTIVE HEADER & ISLAND HERO CARD
           ======================================================== */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#38bdf8]/15 border border-[#38bdf8]/40 text-[#38bdf8] text-xs font-mono uppercase tracking-[0.25em]">
            <Compass className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>{isEs ? 'Descubrimiento Interactivo de Isla' : 'Interactive Island Discovery'}</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-serif text-[#f6f2e9] tracking-tight">
            PERRO CHICO
          </h1>

          <p className="text-lg font-serif italic text-[#c8ac75]">
            {isEs ? 'Relájate. Snorkel. Explora.' : 'Relax. Snorkel. Explore.'}
          </p>

          <p className="text-sm sm:text-base text-[#cbd5e1] font-light leading-relaxed">
            {isEs
              ? 'Descubre playas de arena blanca, aguas cristalinas del Caribe y el famoso barco hundido a pocos metros de la orilla.'
              : 'Discover white sand beaches, crystal-clear Caribbean waters, and the famous sunken shipwreck just offshore.'}
          </p>
        </div>

        {/* ========================================================
            2. THREE CLICKABLE HIGHLIGHT CONTROLS (TABS)
           ======================================================== */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 bg-[#091b2e] p-2 rounded-2xl border border-[#1e3a5f]">
          {highlights.map((hl) => {
            const isActive = activeHighlight === hl.id;
            return (
              <button
                key={hl.id}
                onClick={() => setActiveHighlight(hl.id)}
                className={`w-full sm:flex-1 py-3 px-4 rounded-xl text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 ${
                  isActive
                    ? 'bg-[#c8ac75] text-[#06121e] font-bold shadow-lg scale-102'
                    : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                }`}
              >
                <hl.icon className={`w-4 h-4 ${isActive ? 'text-[#06121e]' : 'text-[#c8ac75]'}`} />
                <span className="truncate">{hl.title}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================
            3. DYNAMIC INTERACTIVE DISPLAY PANEL
           ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-[#091b2e]/80 border border-[#1e3a5f] p-6 sm:p-8 rounded-3xl shadow-2xl items-center">
          {/* Active Highlight Image */}
          <div className="lg:col-span-7 relative aspect-[16/10] rounded-2xl overflow-hidden border border-[#c8ac75]/30 bg-[#06121e]">
            <img
              src={currentHighlight.image}
              alt={currentHighlight.heading}
              className="w-full h-full object-cover transition-all duration-700 animate-in fade-in zoom-in-95"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs font-mono text-[#c8ac75] bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10">
              <span className="truncate">{currentHighlight.title}</span>
              <span className="text-white font-semibold">Perro Chico Island</span>
            </div>
          </div>

          {/* Active Highlight Description Text & Details */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-widest text-[#c8ac75] block">
                {isEs ? 'Atracción Seleccionada' : 'Selected Highlight'}
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif text-white">
                {currentHighlight.heading}
              </h2>
            </div>

            <p className="text-sm text-[#cbd5e1] font-light leading-relaxed">
              {currentHighlight.description}
            </p>

            <div className="space-y-2 pt-2 border-t border-[#1e3a5f]">
              <div className="flex items-center gap-2 text-xs text-[#e2e8f0]">
                <CheckCircle2 className="w-4 h-4 text-[#c8ac75] shrink-0" />
                <span>{isEs ? 'Excursión en lancha a la Piscina Natural' : 'Shared boat trip to Natural Pool'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#e2e8f0]">
                <CheckCircle2 className="w-4 h-4 text-[#c8ac75] shrink-0" />
                <span>{isEs ? 'Comidas tradicionales caribeñas incluidas' : 'Traditional Caribbean meals included'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#e2e8f0]">
                <CheckCircle2 className="w-4 h-4 text-[#c8ac75] shrink-0" />
                <span>{isEs ? 'Guía guna local durante el recorrido' : 'Local Guna guide during excursion'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            4. PACKAGE INFORMATION & INTERACTIVE CTA
           ======================================================== */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-[#0b2438] via-[#091b2e] to-[#0b2438] border border-[#c8ac75]/40 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <div className="text-xs font-mono uppercase tracking-widest text-[#c8ac75]">
              {isEs ? 'Tarifa Oficial Perro Chico' : 'Perro Chico Official Package Rate'}
            </div>
            <div className="text-3xl font-serif text-white">
              {isEs ? 'Desde USD 249' : 'From USD 249'} <span className="text-xs font-sans text-[#94a3b8]">{isEs ? '/ persona (1a noche)' : '/ person (1st night)'}</span>
            </div>
            <div className="text-xs font-mono text-[#c8ac75]">
              {isEs ? 'Noches adicionales desde USD 109 por persona' : 'Additional nights from USD 109 per person'}
            </div>
          </div>

          <button
            onClick={() => onRequestExperience('Perro Chico', 'USD 249')}
            className="w-full md:w-auto py-4 px-8 rounded-2xl bg-[#c8ac75] hover:bg-[#d4af37] text-[#06121e] font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <span>{isEs ? 'EXPLORAR ESTA EXPERIENCIA' : 'EXPLORE THIS EXPERIENCE'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
