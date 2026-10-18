import React, { useState } from 'react';
import { Sparkles, ArrowLeft, Globe, Eye, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Language } from '../../types';
import { CinematicIslandSample } from './CinematicIslandSample';
import { EditorialIslandSample } from './EditorialIslandSample';
import { InteractiveIslandSample } from './InteractiveIslandSample';
import { PreviewDemoModal } from './PreviewDemoModal';

interface IslandDesignPreviewProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  onBackToWebsite: () => void;
}

export const IslandDesignPreview: React.FC<IslandDesignPreviewProps> = ({
  currentLang,
  onLanguageChange,
  onBackToWebsite,
}) => {
  const [activeSample, setActiveSample] = useState<'cinematic' | 'editorial' | 'interactive'>('cinematic');
  const [demoModalInfo, setDemoModalInfo] = useState<{
    isOpen: boolean;
    islandName: string;
    price: string;
  }>({
    isOpen: false,
    islandName: '',
    price: '',
  });

  const isEs = currentLang === 'es';

  const handleRequestExperience = (islandName: string, price: string) => {
    setDemoModalInfo({
      isOpen: true,
      islandName,
      price,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#06121e] text-[#f6f2e9] selection:bg-[#c8ac75] selection:text-[#06121e]">
      {/* ========================================================
          1. TOP NAVIGATION & PREVIEW CONTROL BAR
         ======================================================== */}
      <header className="sticky top-0 z-40 w-full bg-[#06121e]/95 backdrop-blur-md border-b border-[#1e3a5f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Back to main website link */}
          <button
            onClick={onBackToWebsite}
            className="inline-flex items-center gap-2 text-xs font-mono text-[#cbd5e1] hover:text-[#c8ac75] transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 text-[#c8ac75] transition-transform group-hover:-translate-x-1" />
            <span>{isEs ? 'Volver al Sitio Principal' : 'Return to Main Website'}</span>
          </button>

          {/* Center Title & Discreet Approval Label */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#c8ac75] animate-ping" />
            <span className="text-xs font-mono uppercase tracking-widest text-[#c8ac75] font-semibold">
              {isEs ? 'VISTA PREVIA DE DISEÑO — EN ESPERA DE APROBACIÓN DE PETRA' : 'DESIGN PREVIEW — AWAITING PETRA’S APPROVAL'}
            </span>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center gap-2 bg-[#091b2e] p-1 rounded-xl border border-[#1e3a5f] text-xs font-mono">
            <Globe className="w-3.5 h-3.5 text-[#c8ac75] ml-1.5" />
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                currentLang === 'en' ? 'bg-[#c8ac75] text-[#06121e] font-bold' : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onLanguageChange('es')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                currentLang === 'es' ? 'bg-[#c8ac75] text-[#06121e] font-bold' : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              ES
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================
          2. PAGE INTRODUCTION & DESIGN SELECTOR
         ======================================================== */}
      <section className="bg-gradient-to-b from-[#081b2e] to-[#06121e] py-10 px-6 border-b border-[#1e3a5f]">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#c8ac75]/15 border border-[#c8ac75]/40 text-[#c8ac75] text-[11px] font-mono uppercase tracking-[0.25em]">
            <Sparkles className="w-3.5 h-3.5 text-[#c8ac75]" />
            <span>{isEs ? 'Colección de Prototipos de Islas' : 'Island Experience — Design Collection'}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-serif text-[#f6f2e9] tracking-tight">
            ISLAND EXPERIENCE — DESIGN COLLECTION
          </h1>

          <p className="text-base sm:text-lg text-[#c8ac75] font-serif italic max-w-2xl mx-auto">
            {isEs
              ? 'Tres formas distintivas de descubrir la belleza de Guna Yala.'
              : 'Three distinctive ways to discover the beauty of Guna Yala.'}
          </p>

          <p className="text-xs sm:text-sm text-[#94a3b8] font-light max-w-xl mx-auto leading-relaxed">
            {isEs
              ? 'Seleccione entre las tres propuestas visuales diseñadas para Petra. Cada una presenta una isla real con su propia filosofía estética.'
              : 'Select between three tailored visual concepts created for Petra. Each showcases a real island destination with its own aesthetic philosophy.'}
          </p>

          {/* Premium 3-Option Design Concept Selector */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setActiveSample('cinematic')}
              className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl text-xs font-mono uppercase tracking-wider transition-all border flex items-center justify-center gap-2 shadow-lg ${
                activeSample === 'cinematic'
                  ? 'bg-[#c8ac75] text-[#06121e] border-[#c8ac75] font-bold scale-105 ring-2 ring-[#c8ac75]/50'
                  : 'bg-[#091b2e] text-[#cbd5e1] border-[#1e3a5f] hover:border-[#c8ac75]/50 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>01 — CINEMATIC</span>
            </button>

            <button
              onClick={() => setActiveSample('editorial')}
              className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl text-xs font-mono uppercase tracking-wider transition-all border flex items-center justify-center gap-2 shadow-lg ${
                activeSample === 'editorial'
                  ? 'bg-[#c8ac75] text-[#06121e] border-[#c8ac75] font-bold scale-105 ring-2 ring-[#c8ac75]/50'
                  : 'bg-[#091b2e] text-[#cbd5e1] border-[#1e3a5f] hover:border-[#c8ac75]/50 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>02 — EDITORIAL</span>
            </button>

            <button
              onClick={() => setActiveSample('interactive')}
              className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl text-xs font-mono uppercase tracking-wider transition-all border flex items-center justify-center gap-2 shadow-lg ${
                activeSample === 'interactive'
                  ? 'bg-[#c8ac75] text-[#06121e] border-[#c8ac75] font-bold scale-105 ring-2 ring-[#c8ac75]/50'
                  : 'bg-[#091b2e] text-[#cbd5e1] border-[#1e3a5f] hover:border-[#c8ac75]/50 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>03 — INTERACTIVE</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================
          3. ACTIVE DESIGN CONCEPT DISPLAY AREA
         ======================================================== */}
      <main className="flex-1 w-full">
        {activeSample === 'cinematic' && (
          <CinematicIslandSample
            currentLang={currentLang}
            onRequestExperience={handleRequestExperience}
          />
        )}

        {activeSample === 'editorial' && (
          <EditorialIslandSample
            currentLang={currentLang}
            onRequestExperience={handleRequestExperience}
          />
        )}

        {activeSample === 'interactive' && (
          <InteractiveIslandSample
            currentLang={currentLang}
            onRequestExperience={handleRequestExperience}
          />
        )}
      </main>

      {/* ========================================================
          4. PREVIEW FOOTER & COMPARISON NAVIGATION
         ======================================================== */}
      <footer className="bg-[#040e18] border-t border-[#1e3a5f] py-8 px-6 text-center text-xs text-[#94a3b8] space-y-3">
        <div className="flex items-center justify-center gap-2 text-[#c8ac75]">
          <ShieldAlert className="w-4 h-4" />
          <span className="font-mono text-[11px] uppercase tracking-wider">
            {isEs ? 'Entorno de Demostración y Evaluación' : 'Prototype Evaluation Environment'}
          </span>
        </div>
        <p className="max-w-xl mx-auto font-light leading-relaxed">
          {isEs
            ? 'Estas muestras son prototipos independientes creados para revisión. No alteran el sistema de reservas ni la estructura del sitio web principal.'
            : 'These samples are standalone design prototypes built for review. They do not alter live booking pipelines or the existing website structure.'}
        </p>
      </footer>

      {/* Preview Demonstration CTA Modal */}
      <PreviewDemoModal
        isOpen={demoModalInfo.isOpen}
        onClose={() => setDemoModalInfo({ ...demoModalInfo, isOpen: false })}
        islandName={demoModalInfo.islandName}
        sampleType={activeSample}
        price={demoModalInfo.price}
        currentLang={currentLang}
      />
    </div>
  );
};
