import React, { useState, useEffect } from 'react';
import { Quotation } from '../../types/quotation';
import { quotationStorageService } from '../../services/quotationStorageService';
import { AdminHeader } from './AdminHeader';
import { QuotationList } from './QuotationList';
import { QuotationEditor } from './QuotationEditor';
import { CustomerQuotationPreview } from './CustomerQuotationPreview';
import { Loader2 } from 'lucide-react';

interface AdminDashboardProps {
  onBackToWebsite: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToWebsite }) => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<'list' | 'editor' | 'preview'>('list');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

  // Load quotations on mount
  useEffect(() => {
    loadQuotations();
  }, []);

  const loadQuotations = async () => {
    setIsLoading(true);
    try {
      const data = await quotationStorageService.getQuotations();
      setQuotations(data);
    } catch (err) {
      console.error('Error loading quotations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    const nextRef = quotationStorageService.generateNewReference(quotations.length);
    const newQuote = quotationStorageService.createBlankQuotation(nextRef);
    setSelectedQuotation(newQuote);
    setActiveView('editor');
  };

  const handleEdit = (quote: Quotation) => {
    setSelectedQuotation(quote);
    setActiveView('editor');
  };

  const handleDuplicate = async (id: string) => {
    try {
      const copy = await quotationStorageService.duplicateQuotation(id);
      await loadQuotations();
      setSelectedQuotation(copy);
      setActiveView('editor');
    } catch (err) {
      console.error('Error duplicating quotation:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await quotationStorageService.deleteQuotation(id);
      await loadQuotations();
      if (selectedQuotation?.id === id) {
        setSelectedQuotation(null);
        setActiveView('list');
      }
    } catch (err) {
      console.error('Error deleting quotation:', err);
    }
  };

  const handleSaveQuotation = async (updated: Quotation): Promise<Quotation> => {
    try {
      const saved = await quotationStorageService.saveQuotation(updated);
      setSelectedQuotation(saved);
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
    } catch (err) {
      console.error('Error saving quotation:', err);
      throw err;
    }
  };

  const handlePreview = (quote: Quotation) => {
    setSelectedQuotation(quote);
    setActiveView('preview');
  };

  const handleResetData = async () => {
    const resetList = await quotationStorageService.resetToDemoData();
    setQuotations(resetList);
    setSelectedQuotation(null);
    setActiveView('list');
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#1c242c] flex flex-col font-sans">
      {/* Top Header & Notice Banner */}
      <AdminHeader
        onBackToWebsite={onBackToWebsite}
        onResetData={handleResetData}
        activeView={activeView}
        quotationRef={selectedQuotation?.reference}
        onNavigateList={() => setActiveView('list')}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
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
                onDelete={handleDelete}
                onPreview={handlePreview}
              />
            )}

            {activeView === 'editor' && selectedQuotation && (
              <QuotationEditor
                initialQuotation={selectedQuotation}
                onSave={handleSaveQuotation}
                onPreview={handlePreview}
                onCancel={() => setActiveView('list')}
              />
            )}

            {activeView === 'preview' && selectedQuotation && (
              <CustomerQuotationPreview
                quotation={selectedQuotation}
                onBackToEdit={() => setActiveView('editor')}
                onBackToList={() => setActiveView('list')}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};
