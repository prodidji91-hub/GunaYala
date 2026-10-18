import React from 'react';
import { Compass, Sparkles, Check, ArrowUpRight, BedDouble, Utensils, Waves } from 'lucide-react';
import { Language } from '../../types';

interface EditorialIslandSampleProps {
  currentLang: Language;
  onRequestExperience: (islandName: string, price: string) => void;
}

export const EditorialIslandSample: React.FC<EditorialIslandSampleProps> = ({
  currentLang,
  onRequestExperience,
}) => {
  const isEs = currentLang === 'es';

  return (
    <div className="w-full bg-[#faf8f5] text-[#1c242c] py-12 md:py-20 px-6 sm:px-8">
      <div className="max-w-6xl mx-auto space-y-16 md:space-y-24">
        {/* ========================================================
            1. EDITORIAL TWO-COLUMN LUXURY PRESENTATION LAYOUT
           ======================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-14 items-center">
          {/* LEFT COLUMN: Large Portrait Photography with Curtain Reveal Effect */}
          <div className="lg:col-span-6 relative group">
            <div className="relative aspect-[3/4] sm:aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl border border-[#e2d9cd] bg-[#f0eadd]">
              <img
                src="/pictures/04 Catamaran San Blas Island .jpg"
                alt="Guasirdub Island Overwater Cabanas"
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              {/* Subtle Warm Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

              {/* Editorial Caption Badge */}
              <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl bg-[#06121e]/80 backdrop-blur-md border border-[#c8ac75]/30 text-white">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#c8ac75]">
                  {isEs ? 'Fotografía de la Colección' : 'Collection Photography'}
                </div>
                <div className="text-xs font-serif text-[#f6f2e9] mt-0.5">
                  {isEs ? 'Cabaña sobre el agua — Guasirdub' : 'Overwater Cabanas — Guasirdub'}
                </div>
              </div>
            </div>

            {/* Decorative Offset Golden Border Frame */}
            <div className="absolute -inset-2 rounded-3xl border border-[#c8ac75]/30 -z-10 pointer-events-none hidden sm:block" />
          </div>

          {/* RIGHT COLUMN: Editorial Typography & Information */}
          <div className="lg:col-span-6 space-y-8">
            {/* Header Badge */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.25em] text-[#8c7343] font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-[#8c7343]" />
                <span>THE ISLAND COLLECTION / 02</span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-light text-[#0e3b2f] tracking-tight leading-none">
                GUASIRDUB
              </h1>
              <p className="text-lg font-serif italic text-[#8c7343]">
                {isEs ? 'Paz. Confort. Tranquilidad.' : 'Peace. Comfort. Tranquility.'}
              </p>
            </div>

            {/* Delicate Expanding Divider */}
            <div className="h-px w-24 bg-[#c8ac75]" />

            {/* Main Editorial Description */}
            <p className="text-base sm:text-lg text-[#334155] font-light leading-relaxed">
              {isEs
                ? '"Descubre un refugio insular íntimo con solo tres espaciosas cabañas sobre el agua, rodeadas por las aguas turquesas de Guna Yala."'
                : '"Discover an intimate island retreat with just three spacious overwater cabins, surrounded by the turquoise waters of Guna Yala."'}
            </p>

            {/* Key Information Bullets */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 text-sm text-[#1e293b]">
                <div className="w-5 h-5 rounded-full bg-[#d8e6dd] flex items-center justify-center text-[#0e3b2f] shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <span>{isEs ? 'Solo tres espaciosas cabañas sobre el agua' : 'Three spacious overwater cabins'}</span>
              </div>

              <div className="flex items-start gap-3 text-sm text-[#1e293b]">
                <div className="w-5 h-5 rounded-full bg-[#d8e6dd] flex items-center justify-center text-[#0e3b2f] shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <span>{isEs ? 'Cabaña privada sobre el agua con baño compartido' : 'Private overwater cabin with shared bathroom facilities'}</span>
              </div>

              <div className="flex items-start gap-3 text-sm text-[#1e293b]">
                <div className="w-5 h-5 rounded-full bg-[#d8e6dd] flex items-center justify-center text-[#0e3b2f] shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <span>{isEs ? 'Excursión compartida en lancha a isla cercana y Piscina Natural' : 'Shared boat excursion to a nearby island and the Natural Pool'}</span>
              </div>

              <div className="flex items-start gap-3 text-sm text-[#1e293b]">
                <div className="w-5 h-5 rounded-full bg-[#d8e6dd] flex items-center justify-center text-[#0e3b2f] shrink-0 mt-0.5">
                  <Check className="w-3 h-3" />
                </div>
                <span>{isEs ? 'Comidas tradicionales de la isla incluidas' : 'Traditional island meals included'}</span>
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="p-6 rounded-2xl bg-[#f2ede4] border border-[#e2d9cd] space-y-1">
              <div className="text-xs font-mono uppercase tracking-wider text-[#8c7343]">
                {isEs ? 'Tarifa Especial de Colección' : 'Collection Starting Price'}
              </div>
              <div className="text-2xl font-serif text-[#0e3b2f] font-light">
                {isEs ? 'Desde USD 249' : 'From USD 249'} <span className="text-xs font-sans text-[#64748b]">{isEs ? '/ persona (1a noche)' : '/ person (1st night)'}</span>
              </div>
              <div className="text-xs font-mono text-[#64748b]">
                {isEs ? 'Noches adicionales desde USD 119 por persona' : 'Additional nights from USD 119 per person'}
              </div>
            </div>

            {/* Outline CTA Button */}
            <div>
              <button
                onClick={() => onRequestExperience('Guasirdub', 'USD 249')}
                className="w-full sm:w-auto py-4 px-8 rounded-full border-2 border-[#8c7343] text-[#8c7343] hover:bg-[#8c7343] hover:text-white font-serif font-medium text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 group"
              >
                <span>{isEs ? 'SOLICITAR ESTA EXPERIENCIA' : 'REQUEST THIS EXPERIENCE'}</span>
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ==========================================================
            2. REFINED EDITORIAL GALLERY (Non-floating static row)
           ========================================================== */}
        <div className="pt-12 border-t border-[#e2d9cd] space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif text-[#0e3b2f]">
              {isEs ? 'Galería Editorial de Guasirdub' : 'Guasirdub Editorial Gallery'}
            </h3>
            <span className="text-xs font-mono text-[#8c7343]">
              {isEs ? '3 Vistas Seleccionadas' : '3 Selected Views'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="aspect-[4/3] rounded-xl overflow-hidden border border-[#e2d9cd] bg-[#f0eadd]">
                <img
                  src="/pictures/04 Catamaran San Blas Island .jpg"
                  alt="Overwater detail"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
              <p className="text-xs text-[#64748b] font-light italic">
                {isEs ? 'Cabaña sobre aguas turquesas' : 'Overwater cabanas in lagoon'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="aspect-[4/3] rounded-xl overflow-hidden border border-[#e2d9cd] bg-[#f0eadd]">
                <img
                  src="/pictures/01 Boat Day Tour .jpg"
                  alt="Lagoon view"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
              <p className="text-xs text-[#64748b] font-light italic">
                {isEs ? 'Laguna cristalina de Guna Yala' : 'Crystalline Guna Yala lagoon'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="aspect-[4/3] rounded-xl overflow-hidden border border-[#e2d9cd] bg-[#f0eadd]">
                <img
                  src="/pictures/piscinanat.jpg"
                  alt="Excursion destination"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
              <p className="text-xs text-[#64748b] font-light italic">
                {isEs ? 'Piscina Natural cercana' : 'Nearby Natural Pool excursion'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
