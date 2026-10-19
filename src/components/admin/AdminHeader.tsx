import React, { useState } from 'react';
import { Database, AlertTriangle, ArrowLeft, Info, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';

interface AdminHeaderProps {
  onBackToWebsite: () => void;
  onResetData: () => void;
  activeView: 'list' | 'editor' | 'preview' | 'descriptions' | 'crm';
  quotationRef?: string;
  onNavigateList?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onBackToWebsite,
  onResetData,
  activeView,
  quotationRef,
  onNavigateList,
}) => {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleReset = () => {
    if (isSupabaseConfigured) {
      alert('Resetting demo data is disabled when connected to live Supabase database.');
      return;
    }
    if (window.confirm('Reset prototype quotations back to original sample data? Any newly created quotes will be cleared.')) {
      onResetData();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    }
  };

  return (
    <header className="bg-[#0e2720] text-white border-b border-[#224438] sticky top-0 z-40 print:hidden">
      {/* Top Banner Notice */}
      <div className="bg-[#173a30] px-4 py-2 text-xs border-b border-[#254d40] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-emerald-200 font-medium">
          {isSupabaseConfigured ? (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Supabase Connected — Quotation database and administrator authentication active.
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Standalone Preview — Local storage active. Supabase keys not configured.
              </span>
            </>
          )}
        </div>
        <button
          onClick={() => setShowInfoModal(true)}
          className="inline-flex items-center gap-1.5 text-xs text-[#a3c9bd] hover:text-white transition-colors underline underline-offset-2"
        >
          <Info className="w-3.5 h-3.5" />
          <span>How data is saved</span>
        </button>
      </div>

      {/* Main Admin Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToWebsite}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded bg-[#183a30] hover:bg-[#20493c] text-[#cbe3db] transition-colors border border-[#2b5648]"
            title="Return to public Guna Yala Travel website"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">View Public Website</span>
            <span className="sm:hidden">Website</span>
          </button>

          <div className="h-4 w-[1px] bg-[#224438]" />

          <div className="flex items-center gap-2.5">
            <span className="font-serif text-lg tracking-wider text-[#e8dbbf] font-semibold">
              GUNA YALA
            </span>
            <span className="text-xs bg-[#244b3e] text-[#a3d8c8] px-2 py-0.5 rounded font-mono uppercase tracking-wide">
              Quotation Desk
            </span>
          </div>
        </div>

        {/* Center Breadcrumb */}
        {activeView !== 'list' && onNavigateList && (
          <div className="hidden md:flex items-center gap-2 text-xs text-[#8eb5a8]">
            <button
              onClick={onNavigateList}
              className="hover:text-white transition-colors underline underline-offset-2"
            >
              Quotations List
            </button>
            <span>/</span>
            <span className="text-[#e8dbbf] font-medium font-mono">
              {activeView === 'editor'
                ? `Editing ${quotationRef || ''}`
                : activeView === 'preview'
                ? `Customer Preview ${quotationRef || ''}`
                : activeView === 'crm'
                ? 'Customer Management'
                : 'Manage Package Descriptions'}
            </span>
          </div>
        )}

        {/* Right Action Controls */}
        <div className="flex items-center gap-3">
          {!isSupabaseConfigured && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#8cbab0] hover:text-white hover:bg-[#1a3d33] rounded transition-colors"
              title="Reset to sample demo quotations"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resetSuccess ? 'animate-spin' : ''}`} />
              <span className="hidden lg:inline">Reset Demo Data</span>
            </button>
          )}

          {resetSuccess && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Reset complete
            </span>
          )}
        </div>
      </div>

      {/* Info Modal Explanation */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#122c24] border border-[#265345] rounded-lg max-w-md w-full p-6 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#22483d] mb-4">
              <div className="flex items-center gap-2 text-[#e8dbbf] font-semibold font-serif text-lg">
                <Database className="w-5 h-5 text-amber-400" />
                <span>Quotation Data Storage Info</span>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-[#7ea89d] hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-[#b8d6cc] leading-relaxed">
              {isSupabaseConfigured ? (
                <>
                  <p>
                    <strong className="text-white">Supabase Cloud Database:</strong> Quotations are stored live in your PostgreSQL database table (<code className="bg-[#1c3e34] px-1.5 py-0.5 rounded text-amber-200">public.quotations</code>).
                  </p>
                  <p>
                    All creating, editing, updating, and deleting of quotes is synchronized instantly between authorized administrators (Petra and Developer).
                  </p>
                  <p>
                    <strong className="text-white">Data Safety:</strong> Local demo quotations are never uploaded automatically. Supabase is the single source of truth.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong className="text-white">Local Storage Mode:</strong> Quotations are stored in your current browser's <code className="bg-[#1c3e34] px-1.5 py-0.5 rounded text-amber-200">localStorage</code>.
                  </p>
                  <p>
                    Changes survive page refreshes and tab closures in this browser.
                  </p>
                </>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-4 py-2 text-xs font-medium bg-[#c9a96e] hover:bg-[#d6b77c] text-[#0e2720] rounded font-semibold transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
