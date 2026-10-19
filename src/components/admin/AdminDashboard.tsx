import React, { useState, useEffect } from 'react';
import { Quotation } from '../../types/quotation';
import { CrmInquiry, CrmCustomer } from '../../types/crm';
import { quotationStorageService } from '../../services/quotationStorageService';
import { AdminHeader } from './AdminHeader';
import { QuotationList } from './QuotationList';
import { QuotationEditor } from './QuotationEditor';
import { CustomerQuotationPreview } from './CustomerQuotationPreview';
import { ManagePackageDescriptions } from './ManagePackageDescriptions';
import { CrmDashboard } from './CrmDashboard';
import { Loader2 } from 'lucide-react';

interface AdminDashboardProps {
  onBackToWebsite: () => void;
}

const DRAFT_KEY = 'guna_yala_active_quotation_draft';
const VIEW_KEY = 'guna_yala_admin_active_view';
const SELECTED_ID_KEY = 'guna_yala_admin_selected_id';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToWebsite }) => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Initialize view and selected quotation from persistent draft / storage state if available
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview' | 'descriptions' | 'crm'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const hasDraft = !!localStorage.getItem(DRAFT_KEY);
        const savedView = sessionStorage.getItem(VIEW_KEY) || localStorage.getItem(VIEW_KEY);
        if (hasDraft || savedView === 'editor' || savedView === 'preview' || savedView === 'descriptions' || savedView === 'crm') {
          return (savedView as any) || 'editor';
        }
      }
    } catch (e) {}
    return 'list';
  });

  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const rawDraft = localStorage.getItem(DRAFT_KEY);
        if (rawDraft) {
          const parsed = JSON.parse(rawDraft);
          if (parsed && (parsed.id || parsed.reference)) {
            return parsed;
          }
        }
      }
    } catch (e) {}
    return null;
  });

  const setViewState = (view: 'list' | 'editor' | 'preview' | 'descriptions' | 'crm', quote?: Quotation | null) => {
    setActiveView(view);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(VIEW_KEY, view);
        localStorage.setItem(VIEW_KEY, view);
        if (quote) {
          const qId = quote.id || quote.reference;
          if (qId) {
            sessionStorage.setItem(SELECTED_ID_KEY, qId);
            localStorage.setItem(SELECTED_ID_KEY, qId);
          }
        } else if (view === 'list') {
          sessionStorage.removeItem(SELECTED_ID_KEY);
          localStorage.removeItem(SELECTED_ID_KEY);
        }
      }
    } catch (e) {}
  };

  const handleCreateQuotationForInquiry = async (inquiry: CrmInquiry, customer: CrmCustomer) => {
    clearDraftState();
    const nextRef = quotationStorageService.generateNewReference(quotations.length);
    const newQuote = await quotationStorageService.createBlankQuotation(nextRef);
    const prefilled: Quotation = {
      ...newQuote,
      customerName: customer.full_name,
      customerEmail: customer.email || '',
      customerPhone: customer.whatsapp || '',
      inquiry_id: inquiry.id,
      experience: inquiry.experience_interest,
      packageTitle: inquiry.experience_interest,
      travelers: inquiry.travelers_count || 2,
    };
    setSelectedQuotation(prefilled);
    setViewState('editor', prefilled);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(prefilled));
    } catch (e) {}
  };

  const clearDraftState = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(DRAFT_KEY);
        sessionStorage.removeItem(VIEW_KEY);
        sessionStorage.removeItem(SELECTED_ID_KEY);
        localStorage.removeItem(VIEW_KEY);
        localStorage.removeItem(SELECTED_ID_KEY);
      }
    } catch (e) {}
  };

  // Load quotations on mount
  useEffect(() => {
    loadQuotations();
  }, []);

  const loadQuotations = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const data = await quotationStorageService.getQuotations();
      setQuotations(data);

      // Check if there's an active unsaved draft or previously selected quotation
      if (typeof window !== 'undefined') {
        const savedView = sessionStorage.getItem(VIEW_KEY) || localStorage.getItem(VIEW_KEY);
        const savedSelectedId = sessionStorage.getItem(SELECTED_ID_KEY) || localStorage.getItem(SELECTED_ID_KEY);
        const rawDraft = localStorage.getItem(DRAFT_KEY);

        let draftObj: Quotation | null = null;
        if (rawDraft) {
          try {
            draftObj = JSON.parse(rawDraft);
          } catch (e) {}
        }

        let targetQuote = selectedQuotation || draftObj;

        if (savedSelectedId && data.length > 0) {
          const found = data.find((q) => q.id === savedSelectedId || q.reference === savedSelectedId);
          if (found) {
            if (draftObj && (draftObj.id === found.id || draftObj.reference === found.reference)) {
              targetQuote = draftObj;
            } else if (!draftObj) {
              targetQuote = found;
            }
          }
        }

        if (targetQuote) {
          setSelectedQuotation(targetQuote);
          if (savedView === 'preview') {
            setActiveView('preview');
          } else if (savedView === 'editor' || rawDraft) {
            setActiveView('editor');
          } else if (savedView === 'list') {
            setActiveView('list');
          }
        } else if (savedView) {
          setActiveView(savedView as any);
        }
      }
    } catch (err: any) {
      console.error('Error loading quotations:', err);
      setApiError(err?.message || 'Failed to load quotations from database.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = async () => {
    clearDraftState();
    const nextRef = quotationStorageService.generateNewReference(quotations.length);
    const newQuote = await quotationStorageService.createBlankQuotation(nextRef);
    setSelectedQuotation(newQuote);
    setViewState('editor', newQuote);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(newQuote));
    } catch (e) {}
  };

  const handleEdit = (quote: Quotation) => {
    let quoteToEdit = quote;
    try {
      const rawDraft = localStorage.getItem(DRAFT_KEY);
      if (rawDraft) {
        const parsed = JSON.parse(rawDraft);
        if (parsed && (parsed.id === quote.id || parsed.reference === quote.reference)) {
          quoteToEdit = parsed;
        }
      }
    } catch (e) {}

    setSelectedQuotation(quoteToEdit);
    setViewState('editor', quoteToEdit);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(quoteToEdit));
    } catch (e) {}
  };

  const handleDuplicate = async (id: string) => {
    setApiError(null);
    try {
      const copy = await quotationStorageService.duplicateQuotation(id);
      await loadQuotations();
      setSelectedQuotation(copy);
      setViewState('editor', copy);
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(copy));
      } catch (e) {}
    } catch (err: any) {
      console.error('Error duplicating quotation:', err);
      setApiError(err?.message || 'Failed to duplicate quotation in database.');
    }
  };

  const handleCreateRevision = async (quoteOrId: Quotation | string, revisionNote?: string) => {
    setApiError(null);
    try {
      const id = typeof quoteOrId === 'string' ? quoteOrId : quoteOrId.id;
      const revision = await quotationStorageService.createRevision(id, revisionNote);
      await loadQuotations();
      setSelectedQuotation(revision);
      setViewState('editor', revision);
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(revision));
      } catch (e) {}
    } catch (err: any) {
      console.error('Error creating revision:', err);
      setApiError(err?.message || 'Failed to create revision in database.');
    }
  };

  const handleDelete = async (id: string) => {
    setApiError(null);
    try {
      await quotationStorageService.deleteQuotation(id);
      await loadQuotations();
      if (selectedQuotation?.id === id) {
        clearDraftState();
        setSelectedQuotation(null);
        setViewState('list', null);
      }
    } catch (err: any) {
      console.error('Error deleting quotation:', err);
      setApiError(err?.message || 'Failed to delete quotation from database.');
    }
  };

  const handleSaveQuotation = async (updated: Quotation): Promise<Quotation> => {
    setApiError(null);
    try {
      const saved = await quotationStorageService.saveQuotation(updated);
      setSelectedQuotation(saved);
      clearDraftState(); // Draft successfully persisted to database!
      setQuotations((prev) => {
        const index = prev.findIndex((q) => q.id === saved.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = saved;
          return next;
        }
        return [saved, ...prev];
      });
      return saved;
    } catch (err: any) {
      console.error('Error saving quotation:', err);
      throw err;
    }
  };

  const handlePreview = (quote: Quotation) => {
    setSelectedQuotation(quote);
    setViewState('preview', quote);
  };

  const handleResetData = async () => {
    setApiError(null);
    try {
      const resetList = await quotationStorageService.resetToDemoData();
      clearDraftState();
      setQuotations(resetList);
      setSelectedQuotation(null);
      setViewState('list', null);
    } catch (err: any) {
      console.warn('Reset error:', err);
      setApiError(err?.message || 'Resetting demo data is disabled when Supabase is active.');
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#1c242c] flex flex-col font-sans">
      {/* Top Header & Notice Banner */}
      <AdminHeader
        onBackToWebsite={onBackToWebsite}
        onResetData={handleResetData}
        activeView={activeView}
        quotationRef={selectedQuotation?.reference}
        onNavigateList={() => {
          clearDraftState();
          setApiError(null);
          setSelectedQuotation(null);
          setViewState('list', null);
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {apiError && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-600 rounded text-xs text-red-900 flex items-center justify-between gap-4 shadow-sm">
            <div>
              <strong className="font-semibold block mb-0.5">Database Error:</strong>
              <span>{apiError}</span>
            </div>
            <button
              onClick={loadQuotations}
              className="px-3 py-1.5 bg-red-800 hover:bg-red-900 text-white font-medium rounded transition-colors shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-[#0e3b2f]">
            <Loader2 className="w-8 h-8 animate-spin text-[#c9a96e] mb-3" />
            <span className="text-xs font-mono font-medium">Loading quotation administration desk...</span>
          </div>
        ) : (
          <>
            {activeView === 'list' && (
              <QuotationList
                quotations={quotations}
                onCreateNew={handleCreateNew}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onCreateRevision={handleCreateRevision}
                onDelete={handleDelete}
                onPreview={handlePreview}
                onManageDescriptions={() => setViewState('descriptions', null)}
                onManageCrm={() => setViewState('crm', null)}
              />
            )}

            {activeView === 'descriptions' && (
              <ManagePackageDescriptions
                onBackToList={() => setViewState('list', null)}
              />
            )}

            {activeView === 'crm' && (
              <CrmDashboard
                onBackToList={() => setViewState('list', null)}
                onCreateQuotationForInquiry={handleCreateQuotationForInquiry}
                onEditQuotation={(quote) => {
                  setSelectedQuotation(quote);
                  setViewState('editor', quote);
                }}
                onPreviewQuotation={(quote) => {
                  setSelectedQuotation(quote);
                  setViewState('preview', quote);
                }}
              />
            )}

            {activeView === 'editor' && selectedQuotation && (
              <QuotationEditor
                initialQuotation={selectedQuotation}
                allQuotations={quotations}
                onSave={handleSaveQuotation}
                onPreview={handlePreview}
                onCreateRevision={handleCreateRevision}
                onSelectQuotation={(quote) => {
                  setSelectedQuotation(quote);
                  setViewState('editor', quote);
                }}
                onCancel={() => {
                  clearDraftState();
                  setApiError(null);
                  setSelectedQuotation(null);
                  setViewState('list', null);
                }}
              />
            )}

            {activeView === 'preview' && selectedQuotation && (
              <CustomerQuotationPreview
                quotation={selectedQuotation}
                allQuotations={quotations}
                onCreateRevision={handleCreateRevision}
                onSelectQuotation={(quote) => {
                  setSelectedQuotation(quote);
                  setViewState('preview', quote);
                }}
                onBackToEdit={() => {
                  setViewState('editor', selectedQuotation);
                }}
                onBackToList={() => {
                  clearDraftState();
                  setApiError(null);
                  setSelectedQuotation(null);
                  setViewState('list', null);
                }}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};
