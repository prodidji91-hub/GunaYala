import React, { useState } from 'react';
import { Quotation, QuotationStatus } from '../../types/quotation';
import { Search, Plus, Copy, Trash2, Edit3, Eye, Calendar, MapPin, AlertCircle, FileText } from 'lucide-react';

interface QuotationListProps {
  quotations: Quotation[];
  onCreateNew: () => void;
  onEdit: (quotation: Quotation) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onPreview: (quotation: Quotation) => void;
}

export const QuotationList: React.FC<QuotationListProps> = ({
  quotations,
  onCreateNew,
  onEdit,
  onDuplicate,
  onDelete,
  onPreview,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | QuotationStatus>('All');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter logic
  const filteredQuotations = quotations.filter((q) => {
    const matchesSearch =
      q.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.island.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || q.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDeleteConfirm = () => {
    if (deletingId) {
      onDelete(deletingId);
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#e5dec9]">
        <div>
          <h1 className="text-2xl font-serif text-[#1c242c] font-semibold">
            Quotation Administration
          </h1>
          <p className="text-xs text-[#52606d] mt-1">
            Manage customer quotes, package templates, pricing calculations, and preview PDFs.
          </p>
        </div>

        <button
          onClick={onCreateNew}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0e3b2f] hover:bg-[#155243] text-[#f7f4ed] font-medium text-xs rounded shadow-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4 text-[#c9a96e]" />
          <span>Create New Quotation</span>
        </button>
      </div>

      {/* Controls: Search & Status Filters */}
      <div className="bg-white p-4 rounded-lg border border-[#e5dec9] shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8a98a5] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name or reference (e.g. DEMO-001)..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-[#cfc7b2] rounded focus:outline-none focus:ring-1 focus:ring-[#0e3b2f] focus:border-[#0e3b2f] bg-[#faf8f5]"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-[#f0eae0] p-1 rounded-md shrink-0">
          {(['All', 'Draft', 'Ready for review'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-white text-[#0e3b2f] shadow-sm font-semibold'
                  : 'text-[#52606d] hover:text-[#1c242c]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white border border-[#e5dec9] rounded-lg shadow-sm overflow-hidden">
        {filteredQuotations.length === 0 ? (
          <div className="p-12 text-center text-[#687785]">
            <FileText className="w-10 h-10 text-[#a8b8a0] mx-auto mb-3 stroke-1" />
            <p className="text-sm font-medium text-[#1c242c]">No quotations found</p>
            <p className="text-xs text-[#687785] mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'All'
                ? 'Try clearing your search or filter terms.'
                : 'Get started by creating your first prototype quotation.'}
            </p>
            <button
              onClick={onCreateNew}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#0e3b2f] text-white rounded hover:bg-[#155243] transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-[#c9a96e]" />
              <span>Create First Quote</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#1c242c]">
              <thead className="bg-[#f5f1e8] text-[#52606d] font-mono text-[11px] uppercase tracking-wider border-b border-[#e5dec9]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Reference</th>
                  <th className="py-3 px-4 font-semibold">Customer</th>
                  <th className="py-3 px-4 font-semibold">Island / Accommodation</th>
                  <th className="py-3 px-4 font-semibold">Travel Dates</th>
                  <th className="py-3 px-4 font-semibold text-right">Total (USD)</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Last Updated</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee7d8]">
                {filteredQuotations.map((quote) => (
                  <tr
                    key={quote.id}
                    className="hover:bg-[#faf7f0] transition-colors group"
                  >
                    {/* Reference */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-[#0e3b2f]">
                      <div className="flex flex-col gap-1">
                        <span>{quote.reference}</span>
                        {quote.hasOutdatedSampleTextFlag && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded w-max">
                            <AlertCircle className="w-3 h-3 text-amber-700" />
                            Review text
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#1c242c]">{quote.customerName || 'Unnamed Customer'}</div>
                      <div className="text-[11px] text-[#687785]">{quote.customerEmail || 'No email entered'}</div>
                    </td>

                    {/* Island */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-[#224438] font-medium">
                        <MapPin className="w-3 h-3 text-[#c9a96e] shrink-0" />
                        <span>{quote.island}</span>
                      </div>
                      <div className="text-[11px] text-[#687785] mt-0.5">
                        {quote.cabinCategory} ({quote.nights} night{quote.nights !== 1 ? 's' : ''})
                      </div>
                    </td>

                    {/* Travel Dates */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-[#45525f]">
                        <Calendar className="w-3 h-3 text-[#8a98a5] shrink-0" />
                        <span>
                          {formatDate(quote.arrivalDate)} – {formatDate(quote.departureDate)}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#687785]">
                        {quote.travelers} traveler{quote.travelers !== 1 ? 's' : ''}
                      </div>
                    </td>

                    {/* Total USD */}
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#0e3b2f] text-sm tabular-nums">
                      ${quote.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                          quote.status === 'Ready for review'
                            ? 'bg-[#d8e8e2] text-[#0e3b2f] border border-[#a8cfc0]'
                            : 'bg-[#f3ede0] text-[#705c30] border border-[#d8caac]'
                        }`}
                      >
                        {quote.status}
                      </span>
                    </td>

                    {/* Last Updated */}
                    <td className="py-3.5 px-4 text-[#687785] text-[11px] font-mono">
                      {formatDate(quote.updatedAt)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onPreview(quote)}
                          className="p-1.5 text-[#2b4c40] hover:bg-[#e4ede8] rounded transition-colors"
                          title="Preview Customer Quotation Document"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onEdit(quote)}
                          className="p-1.5 text-[#0e3b2f] hover:bg-[#e4ede8] rounded transition-colors"
                          title="Edit Quotation"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onDuplicate(quote.id)}
                          className="p-1.5 text-[#52606d] hover:text-[#0e3b2f] hover:bg-[#f0eadd] rounded transition-colors"
                          title="Duplicate Quotation"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeletingId(quote.id)}
                          className="p-1.5 text-[#a84444] hover:text-[#802424] hover:bg-[#fcebeb] rounded transition-colors"
                          title="Delete Quotation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-[#e5dec9]">
            <div className="flex items-center gap-3 text-[#a84444] mb-3">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-semibold text-[#1c242c]">Confirm Delete</h3>
            </div>

            <p className="text-xs text-[#52606d] leading-relaxed mb-6">
              Are you sure you want to delete quote{' '}
              <strong className="font-mono text-[#0e3b2f]">
                {quotations.find((q) => q.id === deletingId)?.reference}
              </strong>
              ? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs font-medium text-[#52606d] hover:bg-[#f0eae0] rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-medium bg-[#a84444] hover:bg-[#802424] text-white rounded transition-colors shadow-sm"
              >
                Delete Quotation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
