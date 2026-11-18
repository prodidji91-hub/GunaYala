import React, { useState } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../data/translations';
import {
  Compass,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Clock,
  Car,
  Ship,
  Utensils,
  Sun,
  ShieldAlert,
  ArrowRight,
  Info,
  Layers,
  MapPin,
  Waves,
  Anchor,
} from 'lucide-react';

interface TheIslandsProps {
  currentLang: Language;
  onOpenPlanner?: (category?: string, islandName?: string, dayTourPackageId?: 'day-tour-panama-city' | 'day-tour-port') => void;
}

import { IslandPackageDetail, ISLAND_PACKAGES } from '../data/islandPackages';
export type { IslandPackageDetail };
export { ISLAND_PACKAGES };

export const TheIslands: React.FC<TheIslandsProps> = ({ currentLang, onOpenPlanner }) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [activeHighlightTab, setActiveHighlightTab] = useState<number>(0);
  const [isPackageExpanded, setIsPackageExpanded] = useState<boolean>(false);

  const isEs = currentLang === 'es';
  const currentIsland = ISLAND_PACKAGES[selectedIndex];

  const handleSelectIsland = (idx: number) => {
    setSelectedIndex(idx);
    setActiveHighlightTab(0);
    setIsPackageExpanded(false);
  };

  return (
    <section id="islands" className="bg-[#F0E7D8] text-[#173D36] py-12 sm:py-16 md:py-20 px-4 sm:px-6 md:px-8 relative overflow-hidden border-t border-[#E2D2BB]">
      <div className="max-w-7xl mx-auto space-y-5 sm:space-y-6 md:space-y-7">
        {/* ========================================================
            1. SECTION HEADER
           ======================================================== */}
        <div className="text-center space-y-2 sm:space-y-2.5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#FAF8F2] border border-[#E2D2BB] text-[#173D36] text-[11px] font-mono uppercase tracking-[0.25em] shadow-xs">
            <Compass className="w-3.5 h-3.5 text-[#55B8B3]" />
            <span>{isEs ? 'Colección de Islas Oficial' : 'Official Island Collection'}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#173D36] tracking-tight">
            DISCOVER THE ISLANDS OF GUNA YALA
          </h2>

          <p className="text-sm sm:text-base text-[#53645E] font-light leading-relaxed max-w-2xl mx-auto">
            {isEs
              ? 'Siete experiencias insulares extraordinarias, cada una con su propio carácter, belleza natural y hospitalidad local.'
              : 'Seven extraordinary island experiences, each with its own character, natural beauty, and local hospitality.'}
          </p>
        </div>

        {/* ========================================================
            2. INTERACTIVE 7-ISLAND SELECTOR BAR
           ======================================================== */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none justify-start md:justify-center">
          {ISLAND_PACKAGES.map((isl, idx) => {
            const isSelected = selectedIndex === idx;
            return (
              <button
                key={isl.id}
                onClick={() => handleSelectIsland(idx)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all shrink-0 border cursor-pointer ${
                  isSelected
                    ? 'bg-[#173D36] text-white border-[#173D36] font-bold shadow-md scale-102 ring-2 ring-[#55B8B3]/40'
                    : 'bg-white/80 text-[#173D36] border-[#E2D2BB] hover:bg-white hover:border-[#55B8B3]'
                }`}
              >
                <div className="w-5 h-5 rounded-md overflow-hidden border border-black/10 shrink-0">
                  <img src={isl.image} alt={isl.name} className="w-full h-full object-cover" />
                </div>
                <span>{isl.name}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================
            3. MAIN INTERACTIVE ISLAND DISPLAY PANEL
           ======================================================== */}
        <div className="bg-white rounded-3xl border border-[#E2D2BB] p-5 sm:p-7 md:p-8 shadow-md space-y-6 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
            {/* LEFT: Cinematic Destination Photograph */}
            <div className="lg:col-span-7 space-y-4">
              <div className="relative aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden border border-[#E2D2BB] bg-[#FAF8F2] shadow-md group">
                <img
                  key={currentIsland.id}
                  src={currentIsland.image}
                  alt={currentIsland.title}
                  className="w-full h-full object-cover transition-all duration-700 animate-in fade-in zoom-in-95 group-hover:scale-105"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                {/* Verification Status Badge */}
                <div className="absolute top-4 left-4 z-10">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest backdrop-blur-md border ${
                    currentIsland.isVerifiedImage
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-950/80 text-amber-200 border-amber-500/40'
                  }`}>
                    <Sparkles className="w-3 h-3" />
                    <span>{currentIsland.isVerifiedImage ? (isEs ? 'Fotografía Verificada' : 'Verified Photo') : (isEs ? 'Muestra Preliminar' : 'Preview Media')}</span>
                  </span>
                </div>

                {/* Island Overlay Title */}
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs font-mono text-[#C5A46B] bg-black/65 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20">
                  <span className="font-serif text-sm font-semibold text-white">{currentIsland.title}</span>
                  <span>Guna Yala · San Blas</span>
                </div>
              </div>

              {/* Documented Starting Rate Strip */}
              <div className="p-4 rounded-2xl bg-[#FAF8F2] border border-[#E2D2BB] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-[#C5A46B]">
                  <Sparkles className="w-4 h-4 text-[#55B8B3]" />
                  <span className="text-[#173D36] font-semibold">{isEs ? 'Tarifa Documentada:' : 'Documented Rate:'}</span>
                  <span className="text-[#173D36] font-bold text-sm">{currentIsland.firstNightRate[currentLang]}</span>
                </div>
                <div className="text-[#53645E] text-[11px]">
                  {currentIsland.additionalNightRate[currentLang]}
                </div>
              </div>
            </div>

            {/* RIGHT: Detailed Information Panel */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-2">
                <div className="text-xs font-mono uppercase tracking-widest text-[#C5A46B] font-semibold">
                  {currentIsland.name} (Guna Yala)
                </div>
                <h3 className="text-3xl sm:text-4xl font-serif text-[#173D36] tracking-tight">
                  {currentIsland.title}
                </h3>
                <p className="text-base font-serif italic text-[#C5A46B]">
                  {currentIsland.subtitle[currentLang]}
                </p>
              </div>

              <div className="h-px w-20 bg-[#C5A46B]" />

              <p className="text-sm text-[#53645E] font-light leading-relaxed">
                {currentIsland.description[currentLang]}
              </p>

              <div className="p-4 rounded-2xl bg-[#FAF8F2] border border-[#E2D2BB] space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#C5A46B] block font-semibold">
                  {isEs ? 'Alojamiento Incluido:' : 'Included Accommodation:'}
                </span>
                <p className="text-xs text-[#173D36] font-medium">
                  {currentIsland.accommodation[currentLang]}
                </p>
              </div>

              {/* Interactive Highlights List */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-mono uppercase tracking-widest text-[#C5A46B] block font-semibold">
                  {isEs ? 'Aspectos Destacados de la Isla:' : 'Key Island Highlights:'}
                </span>
                <div className="space-y-1.5">
                  {currentIsland.highlights[currentLang].map((hl, hIdx) => (
                    <div key={hIdx} className="flex items-start gap-2 text-xs text-[#53645E]">
                      <Check className="w-4 h-4 text-[#55B8B3] shrink-0 mt-0.5" />
                      <span>{hl}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Optional Cultural Activity Note if Present */}
              {currentIsland.optionalActivity && (
                <div className="p-3 rounded-xl bg-[#FAF8F2] border border-[#E2D2BB] text-xs text-[#173D36]">
                  {currentIsland.optionalActivity[currentLang]}
                </div>
              )}

              {/* Inquiry CTA */}
              <div className="pt-2">
                <button
                  onClick={() => onOpenPlanner?.('overnight', currentIsland.id)}
                  className="w-full py-4 px-6 rounded-2xl bg-[#173D36] hover:bg-[#1f5047] text-white font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] cursor-pointer"
                >
                  <span>{isEs ? 'SOLICITAR ESTA EXPERIENCIA' : 'REQUEST THIS EXPERIENCE'}</span>
                  <ArrowRight className="w-4 h-4 text-[#C5A46B]" />
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================
              4. EXPANDABLE PACKAGE DETAILS ACCORDION
             ======================================================== */}
          <div className="border-t border-[#E2D2BB] pt-6">
            <button
              onClick={() => setIsPackageExpanded(!isPackageExpanded)}
              className="w-full py-3 px-4 rounded-2xl bg-[#FAF8F2] border border-[#E2D2BB] hover:border-[#55B8B3] flex items-center justify-between text-xs font-mono text-[#173D36] uppercase tracking-wider transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#55B8B3]" />
                <span>
                  {isEs
                    ? `Ver Detalles del Paquete y Logística para ${currentIsland.name}`
                    : `View Package Details & Logistics for ${currentIsland.name}`}
                </span>
              </div>
              {isPackageExpanded ? <ChevronUp className="w-4 h-4 text-[#173D36]" /> : <ChevronDown className="w-4 h-4 text-[#173D36]" />}
            </button>

            {isPackageExpanded && (
              <div className="mt-4 p-6 rounded-2xl bg-[#FAF8F2] border border-[#E2D2BB] space-y-6 text-xs text-[#53645E] font-light animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Included Services */}
                  <div className="space-y-2">
                    <h4 className="font-mono text-xs text-[#173D36] uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>{isEs ? 'Lo Que Incluye El Paquete' : 'What is Included'}</span>
                    </h4>
                    <ul className="space-y-1.5 pl-2">
                      {currentIsland.packageInclusions.included[currentLang].map((inc, iIdx) => (
                        <li key={iIdx} className="flex items-start gap-2">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span>{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Excluded Services & Cash Notes */}
                  <div className="space-y-2">
                    <h4 className="font-mono text-xs text-[#173D36] uppercase tracking-wider font-semibold flex items-center gap-1.5">
                      <X className="w-4 h-4 text-amber-600" />
                      <span>{isEs ? 'Lo Que NO Incluye / Gastos en Efectivo' : 'What is Not Included / Cash Fees'}</span>
                    </h4>
                    <ul className="space-y-1.5 pl-2">
                      {currentIsland.packageInclusions.excluded[currentLang].map((exc, eIdx) => (
                        <li key={eIdx} className="flex items-start gap-2">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{exc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Transportation & Meals Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#E2D2BB] pt-4">
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-[#C5A46B] uppercase tracking-wider block font-semibold flex items-center gap-1">
                      <Car className="w-3.5 h-3.5 text-[#55B8B3]" />
                      <span>{isEs ? 'Transporte' : 'Transportation'}</span>
                    </span>
                    <p className="text-[11px] leading-relaxed">{currentIsland.packageInclusions.transportation[currentLang]}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-[#C5A46B] uppercase tracking-wider block font-semibold flex items-center gap-1">
                      <Utensils className="w-3.5 h-3.5 text-[#55B8B3]" />
                      <span>{isEs ? 'Alimentación' : 'Meals'}</span>
                    </span>
                    <p className="text-[11px] leading-relaxed">{currentIsland.packageInclusions.meals[currentLang]}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-[#C5A46B] uppercase tracking-wider block font-semibold flex items-center gap-1">
                      <Ship className="w-3.5 h-3.5 text-[#55B8B3]" />
                      <span>{isEs ? 'Excursiones' : 'Excursions'}</span>
                    </span>
                    <p className="text-[11px] leading-relaxed">{currentIsland.packageInclusions.excursions[currentLang]}</p>
                  </div>
                </div>

                {/* Required Confirmation Notice */}
                <div className="p-3.5 rounded-xl bg-white border border-[#E2D2BB] flex items-start gap-2.5 text-[11px] text-[#53645E]">
                  <ShieldAlert className="w-4 h-4 text-[#C5A46B] shrink-0 mt-0.5" />
                  <p>
                    {isEs
                      ? 'Entrada al territorio de Guna Yala: USD $22 por visitante extranjero de 10 años o más, o USD $7 para ciudadanos y residentes panameños. Se paga en efectivo en el puesto de control. Esta tarifa no está incluida en el precio del paquete.'
                      : 'Guna Yala territory entrance fee: USD $22 per foreign visitor aged 10 or older, or USD $7 for Panamanian citizens and residents. Payable in cash at the checkpoint. This fee is not included in the package price.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================
            5. DAY TOURS INTEGRATION STRIP
           ======================================================== */}
        <div className="p-8 rounded-3xl bg-white border border-[#E2D2BB] shadow-md space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#C5A46B] font-semibold">
                <Sun className="w-4 h-4 text-[#55B8B3]" />
                <span>{isEs ? 'Opciones de Pasadías (Day Tours)' : 'Official Day Tour Packages'}</span>
              </div>
              <h3 className="text-2xl font-serif text-[#173D36] mt-1">
                {isEs ? '¿Prefieres Visitar San Blas en Pasadía de Un Día?' : 'Prefer a Single Day Caribbean Excursion?'}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Day Tour Panama City */}
            <div className="p-6 rounded-2xl bg-[#FAF8F2] border border-[#E2D2BB] space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#55B8B3] font-semibold">
                    {isEs ? 'Pasadía Completo con Traslado' : 'Full Day Tour with Transport'}
                  </span>
                  <h4 className="text-lg font-serif text-[#173D36] font-medium">
                    {isEs ? 'Pasadía desde Ciudad de Panamá' : 'Day Tour from Panama City'}
                  </h4>
                </div>
                <div className="text-right font-mono">
                  <div className="text-lg font-bold text-[#173D36]">USD 142</div>
                  <div className="text-[10px] text-[#53645E]">{isEs ? '/ persona' : '/ person'}</div>
                </div>
              </div>

              <p className="text-xs text-[#53645E] leading-relaxed">
                {isEs
                  ? 'Incluye transporte 4x4 ida y vuelta desde Ciudad de Panamá, recorrido en lancha, visita a 2 islas, Piscina Natural, almuerzo con 1 bebida, equipo de snorkel y guía guna.'
                  : 'Includes round-trip 4x4 transport from Panama City, boat excursion, 2 islands, Natural Pool, lunch with 1 drink, snorkeling equipment, and Guna guide.'}
              </p>

              <button
                onClick={() => onOpenPlanner?.('day-trip', 'Day Tour Panama City', 'day-tour-panama-city')}
                className="w-full py-2.5 rounded-xl bg-[#173D36] hover:bg-[#1f5047] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer shadow-xs"
              >
                {isEs ? 'SOLICITAR PASADÍA COMPLETO' : 'REQUEST FULL DAY TOUR'}
              </button>
            </div>

            {/* Day Tour Port */}
            <div className="p-6 rounded-2xl bg-[#FAF8F2] border border-[#E2D2BB] space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#55B8B3] font-semibold">
                    {isEs ? 'Pasadía Marítimo Desde Puerto' : 'Maritime Day Tour from Port'}
                  </span>
                  <h4 className="text-lg font-serif text-[#173D36] font-medium">
                    {isEs ? 'Pasadía desde Puerto Cartí' : 'Day Tour from Guna Yala Port'}
                  </h4>
                </div>
                <div className="text-right font-mono">
                  <div className="text-lg font-bold text-[#173D36]">USD 69</div>
                  <div className="text-[10px] text-[#53645E]">{isEs ? '/ persona' : '/ person'}</div>
                </div>
              </div>

              <p className="text-xs text-[#53645E] leading-relaxed">
                {isEs
                  ? 'Incluye excursión en lancha compartida desde Puerto Cartí, visita a 2 islas, Piscina Natural, almuerzo con 1 bebida, equipo de snorkel y guía guna. (No incluye traslado terrestre).'
                  : 'Includes shared boat excursion from Cartí Port, 2 islands, Natural Pool, lunch with 1 drink, snorkeling gear, and Guna guide. (Ground transfer excluded).'}
              </p>

              <button
                onClick={() => onOpenPlanner?.('day-trip', 'Day Tour Guna Yala Port', 'day-tour-port')}
                className="w-full py-2.5 rounded-xl bg-[#173D36] hover:bg-[#1f5047] text-white font-mono text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer shadow-xs"
              >
                {isEs ? 'SOLICITAR PASADÍA DESDE PUERTO' : 'REQUEST PORT DAY TOUR'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
