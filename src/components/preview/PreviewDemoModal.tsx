import React from 'react';
import { X, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { Language } from '../../types';

interface PreviewDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  islandName: string;
  sampleType: 'cinematic' | 'editorial' | 'interactive';
  price: string;
  currentLang: Language;
}

export const PreviewDemoModal: React.FC<PreviewDemoModalProps> = ({
  isOpen,
  onClose,
  islandName,
  sampleType,
  price,
  currentLang,
}) => {
  if (!isOpen) return null;

  const isEs = currentLang === 'es';

  const sampleTitles = {
    cinematic: isEs ? 'Muestra 01 — Experiencia Cinematográfica' : 'Sample 01 — Cinematic Experience',
    editorial: isEs ? 'Muestra 02 — Colección Editorial de Lujo' : 'Sample 02 — Luxury Editorial Collection',
    interactive: isEs ? 'Muestra 03 — Descubrimiento Interactivo' : 'Sample 03 — Interactive Discovery',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#06121e] border border-[#c8ac75]/50 rounded-3xl p-6 sm:p-8 shadow-2xl text-[#f6f2e9] space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#c8ac75]/15 border border-[#c8ac75]/40 text-[#c8ac75] text-[10px] font-mono uppercase tracking-widest">
              <Sparkles className="w-3 h-3 text-[#c8ac75]" />
              <span>{isEs ? 'Modo de Demostración' : 'Demonstration Prototype'}</span>
            </div>
            <h3 className="text-2xl font-serif text-[#f6f2e9] tracking-tight">
              {islandName}
            </h3>
            <p className="text-xs text-[#c8ac75] font-mono">
              {sampleTitles[sampleType]}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#94a3b8] hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description body */}
        <div className="space-y-4 text-sm text-[#cbd5e1] font-light leading-relaxed border-t border-[#1e3a5f] pt-4">
          <div className="p-4 rounded-2xl bg-[#0b2438] border border-[#1e3a5f] flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#c8ac75] shrink-0 mt-0.5" />
            <p className="text-xs text-[#e2e8f0]">
              {isEs
                ? 'Esta es una vista previa de diseño para la aprobación de Petra. En el sitio web en producción, este botón iniciará el planificador personalizado de viajes a Guna Yala.'
                : 'This is a design preview created for Petra’s review and approval. On the live production site, this action will open the official Guna Yala trip planner.'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-[#94a3b8]">
              <span>{isEs ? 'Precio estimado en prototipo:' : 'Sample Starting Price:'}</span>
              <span className="text-[#c8ac75] font-bold text-sm">{price}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-[#94a3b8]">
              <span>{isEs ? 'Destino presentado:' : 'Featured Destination:'}</span>
              <span className="text-white font-semibold">{islandName} (Guna Yala)</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onClose}
            className="w-full py-3 px-6 rounded-2xl bg-[#c8ac75] hover:bg-[#d4af37] text-[#06121e] font-semibold text-xs tracking-wider uppercase transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <span>{isEs ? 'Entendido (Continuar Vista Previa)' : 'Understood (Continue Preview)'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
