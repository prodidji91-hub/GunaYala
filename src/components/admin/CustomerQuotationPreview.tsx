import React, { useState } from 'react';
import { Quotation } from '../../types/quotation';
import { pdf } from '@react-pdf/renderer';
import { QuotationPdfDocument } from './QuotationPdfDocument';
import {
  Download,
  ArrowLeft,
  Calendar,
  MapPin,
  Check,
  AlertCircle,
  FileText,
  Mail,
  Phone,
  Globe,
  Sparkles,
  ShieldCheck,
  Anchor,
  Compass,
  Loader2,
  Printer,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { quotationStorageService, getOutdatedFieldsInfo } from '../../services/quotationStorageService';
import { getPhotoBadgeInfo } from '../../data/samplePhotos';

interface CustomerQuotationPreviewProps {
  quotation: Quotation;
  onBackToEdit: () => void;
  onBackToList: () => void;
}

const PENDING_TEXT = 'Pending Petra’s confirmation.';

// Convert image URL to Base64 Data URL so @react-pdf/renderer renders images without CORS or missing asset failures
async function urlToBase64DataUrl(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 400;
        canvas.height = img.naturalHeight || img.height || 300;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
          resolve(dataUrl);
          return;
        }
      } catch (err) {
        console.warn('Canvas base64 conversion failed for image:', url, err);
      }
      resolve(url);
    };
    img.onerror = (err) => {
      console.warn('Failed to load image for base64 conversion:', url, err);
      resolve(url);
    };
    img.src = url;
  });
}

export const CustomerQuotationPreview: React.FC<CustomerQuotationPreviewProps> = ({
  quotation: initialQuotation,
  onBackToEdit,
  onBackToList,
}) => {
  const [quotation, setQuotation] = useState<Quotation>(initialQuotation);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);

  const renderCondition = (text?: string): string => {
    if (!text || text.trim() === '') return PENDING_TEXT;
    return text.trim();
  };

  const getCombinedPayAndDeposit = (pay?: string, dep?: string): string => {
    const payStr = renderCondition(pay);
    const depStr = renderCondition(dep);

    if (payStr === PENDING_TEXT && depStr === PENDING_TEXT) {
      return PENDING_TEXT;
    }
    if (payStr === depStr) {
      return payStr;
    }
    return `${payStr} ${depStr}`.trim();
  };

  const handleResetConditionsToPending = () => {
    setIsResetModalOpen(true);
  };

  const handleConfirmResetConditions = async () => {
    try {
      const updated: Quotation = {
        ...quotation,
        paymentSchedule: PENDING_TEXT,
        depositRequirement: PENDING_TEXT,
        cancellationTerms: PENDING_TEXT,
        weatherLogisticsNote: PENDING_TEXT,
        seasonalConditions: PENDING_TEXT,
        termsStatus: 'Draft',
        status: 'Draft',
      };

      const outdatedInfo = getOutdatedFieldsInfo(updated);
      updated.hasOutdatedSampleTextFlag = outdatedInfo.hasOutdatedText;
      updated.outdatedFieldsList = outdatedInfo.outdatedFields;

      const saved = await quotationStorageService.saveQuotation(updated);
      setQuotation(saved);
      setIsResetModalOpen(false);
      setResetSuccessMsg('Conditions reset to Pending and status set to Draft.');
      setTimeout(() => setResetSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error('Failed to reset conditions:', err);
      setPdfError(err?.message || 'Failed to save reset conditions.');
      setIsResetModalOpen(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setPdfError(null);

    try {
      console.log('Building PDF document using @react-pdf/renderer for:', quotation.reference);

      // 1. Prepare Base64 images for reliable rendering inside @react-pdf/renderer
      const selectedPhotos = quotation.selectedPhotos || [];
      const preparedPhotos = await Promise.all(
        selectedPhotos.map(async (photo) => {
          if (!photo.url) return photo;
          try {
            const base64 = await urlToBase64DataUrl(photo.url);
            return { ...photo, url: base64 };
          } catch (e) {
            console.warn('Image pre-conversion error:', photo.url, e);
            return photo;
          }
        })
      );

      // 2. Generate PDF blob using @react-pdf/renderer
      const doc = <QuotationPdfDocument quotation={quotation} preparedPhotos={preparedPhotos} />;
      const asPdf = pdf(doc);
      const blob = await asPdf.toBlob();

      if (!blob || blob.size === 0) {
        throw new Error('Generated PDF blob is empty.');
      }

      // 3. Trigger native file download
      const filename = `quotation-${quotation.reference || 'DEMO-001'}.pdf`;
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

      console.log('PDF download initiated successfully:', filename, `(${blob.size} bytes)`);
    } catch (err: any) {
      console.error('PDF Generation Exception:', err);
      if (err && err.stack) {
        console.error('Stack trace:', err.stack);
      }
      const errorMessage =
        err?.message || (typeof err === 'string' ? err : JSON.stringify(err)) || 'Unknown PDF generation error';
      setPdfError(`Failed to generate PDF: ${errorMessage}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrintBrowser = () => {
    window.print();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const snapshot = quotation.packageSnapshot || {
    overview: 'Experience island life in Guna Yala.',
    accommodationDetails: `${quotation.cabinCategory} (${quotation.bathroomType} Bathroom)`,
    mealsByDay: 'Daily meal plan included as per island schedule.',
    groundTransportationDetails: `Ground transport: ${quotation.groundTransportation}`,
    boatTransferDetails: `Boat transfers: ${quotation.boatTransfers}`,
    toursAndActivities: 'Island hopping and reef activities.',
    otherInclusions: quotation.inclusions.join('; '),
    optionalExtras: 'Custom requests upon inquiry.',
    exclusions: quotation.exclusions.join('; '),
    islandSchedule: 'Morning Panama City departures.',
    importantInstructions: 'Original passport required at Guna Yala border.',
  };

  const conditionsTitle =
    quotation.termsStatus === 'Approved by Petra'
      ? 'Booking Conditions & Seasonal Travel Terms'
      : 'Draft conditions — pending Petra’s approval';

  return (
    <div className="space-y-6 pb-16">
      {/* Top Action Toolbar - Hidden during print */}
      <div className="bg-white border border-[#e5dec9] p-4 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#f0eae0] hover:bg-[#e6dece] text-[#1c242c] rounded transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Editor</span>
          </button>
          <button
            onClick={onBackToList}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#52606d] hover:text-[#0e3b2f] hover:bg-[#faf7f0] rounded transition-colors"
          >
            <span>Quotations List</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {resetSuccessMsg && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {resetSuccessMsg}
            </span>
          )}

          <button
            onClick={handleResetConditionsToPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded transition-colors"
            title="Clear unconfirmed conditions and reset wording to 'Pending Petra's confirmation.'"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
            <span>Reset Conditions to Pending</span>
          </button>

          <button
            onClick={handlePrintBrowser}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#f0eae0] hover:bg-[#e6dece] text-[#0e3b2f] rounded transition-colors"
            title="Print view"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print View</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-[#0e3b2f] hover:bg-[#155243] text-white rounded shadow-sm transition-colors disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 text-[#c9a96e] animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-[#c9a96e]" />
                <span>Download PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* PDF Generation Error Banner */}
      {pdfError && (
        <div className="bg-amber-50 border-l-4 border-amber-600 p-4 rounded text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block text-amber-950">PDF Export Diagnostics Error:</strong>
              <span className="font-mono text-[11px] leading-relaxed break-all">{pdfError}</span>
            </div>
          </div>
          <button
            onClick={handleDownloadPdf}
            className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded font-semibold text-[11px] shrink-0 self-start sm:self-auto"
          >
            Retry Download
          </button>
        </div>
      )}

      {/* Main Document On-Screen HTML View */}
      <div className="bg-white border border-[#e5dec9] rounded-lg shadow-lg max-w-4xl mx-auto overflow-hidden text-[#1c242c] print:shadow-none print:border-none print:max-w-none print:m-0 print:p-0">
        {/* Prototype Watermark Notice Ribbon */}
        <div className="bg-[#112d24] text-amber-200 px-6 py-2.5 text-center text-xs font-mono font-medium tracking-wide border-b border-[#22483d] flex items-center justify-center gap-2 print:bg-gray-100 print:text-gray-800 print:border-gray-300">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 print:hidden" />
          <span>
            PROTOTYPE DEMO QUOTATION — SAMPLE PRESENTATION (REF: {quotation.reference})
          </span>
        </div>

        {/* Document Header */}
        <div className="p-8 sm:p-10 border-b border-[#ebdcb8] bg-[#FAF8F5] flex flex-col sm:flex-row justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0e3b2f] text-[#e8dbbf] flex items-center justify-center font-serif font-bold text-xl shadow-sm border border-[#c9a96e]">
                GY
              </div>
              <div>
                <h1 className="font-serif text-xl sm:text-2xl font-bold tracking-wider text-[#0e3b2f] uppercase">
                  Guna Yala Panama Travel
                </h1>
                <p className="text-xs text-[#c9a96e] font-serif italic">
                  A Guna-owned local company offering authentic, personalised San Blas experiences.
                </p>
              </div>
            </div>

            {/* Official Supplied Business Contact Details */}
            <div className="pt-3 text-xs text-[#52606d] space-y-1">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#0e3b2f]" />
                <span>hello@gunayalapanamatravel.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#0e3b2f]" />
                <span>WhatsApp: +507 6444 3649</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[#0e3b2f]" />
                <span>RUC: 10-710-599 DV 16</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-[#0e3b2f]" />
                <span>www.gunayalapanamatravel.com</span>
              </div>
            </div>
          </div>

          {/* Quotation Metadata Box */}
          <div className="bg-white p-5 rounded-lg border border-[#e5dec9] shadow-sm space-y-2 text-right self-start sm:w-64 font-mono text-xs shrink-0">
            <div className="text-xs uppercase font-semibold text-[#0e3b2f] tracking-wider pb-1 border-b border-[#f0eae0]">
              Official Quotation
            </div>
            <div className="pt-1">
              <span className="text-[#687785] text-[11px] block">Reference Code:</span>
              <span className="text-sm font-bold text-[#0e3b2f]">{quotation.reference}</span>
            </div>
            <div>
              <span className="text-[#687785] text-[11px] block">Quotation Date:</span>
              <span className="text-[#1c242c]">{formatDate(quotation.quotationDate)}</span>
            </div>
            <div>
              <span className="text-[#687785] text-[11px] block">Valid Through:</span>
              <span className="text-[#802424] font-medium">{formatDate(quotation.expiryDate)}</span>
            </div>
            <div className="text-[10px] text-[#802424] font-medium pt-1 border-t border-[#f0eae0]">
              Availability is subject to confirmation.
            </div>
          </div>
        </div>

        {/* Customer & Trip Overview Grid (YOUR BOOKING DETAILS) */}
        <div className="p-8 sm:p-10 space-y-8">
          <div className="bg-[#f7f4ed] border border-[#e0d6c1] rounded-lg p-6 space-y-4">
            <h2 className="text-sm font-serif font-bold text-[#0e3b2f] uppercase tracking-wider border-b border-[#e0d6c1] pb-2">
              YOUR BOOKING DETAILS
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs">
              <div>
                <span className="text-[#687785] block text-[11px] uppercase tracking-wider font-mono">Lead Booker</span>
                <span className="text-sm font-semibold text-[#1c242c]">{quotation.customerName || 'Valued Guest'}</span>
                {quotation.customerEmail && (
                  <span className="block text-[11px] text-[#52606d] mt-0.5">Email: {quotation.customerEmail}</span>
                )}
                {quotation.customerPhone && (
                  <span className="block text-[11px] text-[#52606d]">WhatsApp: {quotation.customerPhone}</span>
                )}
              </div>

              <div>
                <span className="text-[#687785] block text-[11px] uppercase tracking-wider font-mono">Destination / Island & Experience</span>
                <span className="text-sm font-semibold text-[#0e3b2f] flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#c9a96e]" />
                  {quotation.island}
                </span>
                <span className="block text-[11px] text-[#52606d] mt-1">
                  Experience: {quotation.experience || 'Island Overnight Experience'}
                </span>
                <span className="block text-[11px] text-[#52606d]">
                  Number of Travellers: {quotation.travelers}
                </span>
              </div>

              <div>
                <span className="text-[#687785] block text-[11px] uppercase tracking-wider font-mono">Travel Dates</span>
                <span className="text-xs font-semibold text-[#1c242c] flex items-center gap-1 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-[#0e3b2f]" />
                  {formatDate(quotation.arrivalDate)} – {formatDate(quotation.departureDate)}
                </span>
                <span className="block text-[11px] text-[#0e3b2f] font-medium mt-1">
                  Duration: {quotation.nights} Night{quotation.nights !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Pricing Breakdown Table (QUOTATION DETAILS) */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-serif font-bold text-[#0e3b2f] uppercase tracking-wider border-b border-[#e5dec9] pb-2">
              QUOTATION DETAILS
            </h3>

            <div className="border border-[#e5dec9] rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f5f1e8] text-[#52606d] font-mono text-[11px] uppercase border-b border-[#e5dec9]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Service Description</th>
                    <th className="py-3 px-4 font-semibold text-center w-20">Qty / Pax</th>
                    <th className="py-3 px-4 font-semibold text-right w-32">Rate (USD)</th>
                    <th className="py-3 px-4 font-semibold text-right w-36">Total (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee7d8]">
                  {quotation.pricingMode === 'first_night_additional' ? (
                    <>
                      <tr className="hover:bg-[#faf8f5]">
                        <td className="py-3.5 px-4 font-medium text-[#1c242c]">
                          Island Cabaña Accommodation & Meals (First Night)
                        </td>
                        <td className="py-3.5 px-4 text-center text-[#52606d] font-mono">
                          {quotation.travelers} traveler{quotation.travelers !== 1 ? 's' : ''}
                        </td>
                        <td className="py-3.5 px-4 text-right text-[#52606d] font-mono tabular-nums">
                          ${(quotation.firstNightRate || 0).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#0e3b2f] tabular-nums">
                          ${(quotation.travelers * (quotation.firstNightRate || 0)).toFixed(2)}
                        </td>
                      </tr>
                      {Math.max(quotation.nights - 1, 0) > 0 && (
                        <tr className="hover:bg-[#faf8f5]">
                          <td className="py-3.5 px-4 font-medium text-[#1c242c]">
                            Island Cabaña Accommodation & Meals ({Math.max(quotation.nights - 1, 0)} Additional Night{Math.max(quotation.nights - 1, 0) !== 1 ? 's' : ''})
                          </td>
                          <td className="py-3.5 px-4 text-center text-[#52606d] font-mono">
                            {quotation.travelers} pax × {Math.max(quotation.nights - 1, 0)} nts
                          </td>
                          <td className="py-3.5 px-4 text-right text-[#52606d] font-mono tabular-nums">
                            ${(quotation.additionalNightRate || 0).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#0e3b2f] tabular-nums">
                            ${(quotation.travelers * Math.max(quotation.nights - 1, 0) * (quotation.additionalNightRate || 0)).toFixed(2)}
                          </td>
                        </tr>
                      )}
                    </>
                  ) : quotation.pricingMode === 'single_total' ? (
                    <tr className="hover:bg-[#faf8f5]">
                      <td className="py-3.5 px-4 font-medium text-[#1c242c]">
                        Complete Package Price (Island Stay & All Inclusions)
                      </td>
                      <td className="py-3.5 px-4 text-center text-[#52606d] font-mono">
                        {quotation.travelers} pax, {quotation.nights} nts
                      </td>
                      <td className="py-3.5 px-4 text-right text-[#52606d] font-mono tabular-nums">—</td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#0e3b2f] tabular-nums">
                        ${(quotation.totalPackagePrice || quotation.subtotal).toFixed(2)}
                      </td>
                    </tr>
                  ) : (
                    quotation.lineItems.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-[#faf8f5]">
                        <td className="py-3.5 px-4 font-medium text-[#1c242c]">{item.description}</td>
                        <td className="py-3.5 px-4 text-center text-[#52606d] font-mono">{item.quantity}</td>
                        <td className="py-3.5 px-4 text-right text-[#52606d] font-mono tabular-nums">
                          ${item.unitPrice.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#0e3b2f] tabular-nums">
                          ${item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Subtotal & Grand Total Box */}
            <div className="bg-[#FAF8F5] p-5 rounded-lg border border-[#e5dec9] space-y-2 max-w-sm ml-auto text-xs font-mono">
              <div className="flex justify-between text-[#52606d]">
                <span>Package Subtotal:</span>
                <span>${quotation.subtotal.toFixed(2)} USD</span>
              </div>

              {quotation.enableAdditionalCharge && (
                <div className="flex justify-between text-[#805e24]">
                  <span>{quotation.additionalChargeLabel} ({quotation.additionalChargePercent}%):</span>
                  <span>+${quotation.additionalChargeAmount.toFixed(2)} USD</span>
                </div>
              )}

              <div className="flex justify-between text-base font-bold text-[#0e3b2f] border-t border-[#cfc7b2] pt-2 mt-1">
                <span>Grand Total:</span>
                <span>${quotation.total.toFixed(2)} USD</span>
              </div>
            </div>
          </div>

          {/* Unified WHAT'S INCLUDED Section */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-serif font-bold text-[#0e3b2f] uppercase tracking-wider border-b border-[#e5dec9] pb-2 flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#c9a96e]" />
              <span>WHAT'S INCLUDED</span>
            </h3>

            {/* Included Services List */}
            <div className="bg-[#f4f8f6] p-5 rounded-lg border border-[#c1ded3] space-y-3">
              <h4 className="text-xs font-serif font-bold text-[#0e3b2f] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#c1ded3] pb-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Included Services & Summary</span>
              </h4>
              <ul className="space-y-2 text-xs text-[#283e35]">
                {quotation.inclusions.map((inc, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold shrink-0">✓</span>
                    <span>{inc}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#2d3a45]">
              {snapshot.overview && (
                <div className="bg-[#faf8f5] p-4 rounded border border-[#e5dec9] space-y-1">
                  <strong className="block text-[#0e3b2f] font-semibold">Experience Overview</strong>
                  <p className="leading-relaxed">{snapshot.overview}</p>
                </div>
              )}

              {snapshot.accommodationDetails && (
                <div className="bg-[#faf8f5] p-4 rounded border border-[#e5dec9] space-y-1">
                  <strong className="block text-[#0e3b2f] font-semibold">Accommodation & Bathroom</strong>
                  <p className="leading-relaxed">Category: {quotation.cabinCategory} ({quotation.cabinsCount} unit, {quotation.bathroomType} Bathroom). {snapshot.accommodationDetails}</p>
                </div>
              )}

              {snapshot.mealsByDay && (
                <div className="bg-[#faf8f5] p-4 rounded border border-[#e5dec9] space-y-1">
                  <strong className="block text-[#0e3b2f] font-semibold">Meals by Day</strong>
                  <p className="leading-relaxed">{snapshot.mealsByDay}</p>
                </div>
              )}

              {snapshot.groundTransportationDetails && (
                <div className="bg-[#faf8f5] p-4 rounded border border-[#e5dec9] space-y-1">
                  <strong className="block text-[#0e3b2f] font-semibold">Ground Transportation</strong>
                  <p className="leading-relaxed">Type: {quotation.groundTransportation}. {snapshot.groundTransportationDetails}</p>
                </div>
              )}

              {snapshot.boatTransferDetails && (
                <div className="bg-[#faf8f5] p-4 rounded border border-[#e5dec9] space-y-1">
                  <strong className="block text-[#0e3b2f] font-semibold">Boat Transfers</strong>
                  <p className="leading-relaxed">Type: {quotation.boatTransfers}. {snapshot.boatTransferDetails}</p>
                </div>
              )}

              {snapshot.toursAndActivities && (
                <div className="bg-[#faf8f5] p-4 rounded border border-[#e5dec9] space-y-1">
                  <strong className="block text-[#0e3b2f] font-semibold">Included Tours & Activities</strong>
                  <p className="leading-relaxed">{snapshot.toursAndActivities}</p>
                </div>
              )}

              {snapshot.islandSchedule && (
                <div className="bg-[#faf8f5] p-4 rounded border border-[#e5dec9] space-y-1">
                  <strong className="block text-[#0e3b2f] font-semibold">Island Schedule & Timing</strong>
                  <p className="leading-relaxed">{snapshot.islandSchedule}</p>
                </div>
              )}

              {snapshot.importantInstructions && (
                <div className="bg-[#faf8f5] p-4 rounded border border-[#e5dec9] space-y-1">
                  <strong className="block text-[#0e3b2f] font-semibold">Important Travel Instructions</strong>
                  <p className="leading-relaxed">{snapshot.importantInstructions}</p>
                </div>
              )}
            </div>
          </div>

          {/* What Is Excluded */}
          <div className="bg-[#fff8f8] p-5 rounded-lg border border-[#f0c2c2] space-y-3">
            <h4 className="text-xs font-serif font-bold text-[#802424] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#f0c2c2] pb-2">
              <AlertCircle className="w-4 h-4 text-[#a84444]" />
              <span>What Is Excluded (Cash Required on Site)</span>
            </h4>
            <ul className="space-y-2 text-xs text-[#522b2b]">
              {quotation.exclusions.map((exc, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#a84444] font-bold shrink-0">✕</span>
                  <span>{exc}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Attached Photos Gallery */}
          {quotation.selectedPhotos && quotation.selectedPhotos.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-[#ebdcb8] print:break-inside-avoid">
              <h3 className="text-sm font-serif font-bold text-[#0e3b2f] uppercase tracking-wider flex items-center gap-2">
                <Anchor className="w-4 h-4 text-[#c9a96e]" />
                <span>Destination Visual Showcase</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {quotation.selectedPhotos.map((photo) => {
                  const badgeInfo = getPhotoBadgeInfo(photo);
                  return (
                    <div
                      key={photo.id}
                      className="rounded-lg border border-[#e5dec9] overflow-hidden bg-[#faf8f5] shadow-sm flex flex-col justify-between print:break-inside-avoid"
                    >
                      <div className="h-40 bg-[#e8e2d5] relative">
                        <img
                          src={photo.url}
                          alt={photo.title}
                          crossOrigin="anonymous"
                          className="w-full h-full object-cover"
                          onError={(e: any) => {
                            e.target.onerror = null;
                            e.target.parentNode.innerHTML = '<div class="p-4 text-xs text-center text-red-600 bg-red-50 h-full flex items-center justify-center">Temporary upload unavailable. Please re-upload image.</div>';
                          }}
                        />
                        {badgeInfo.type === 'unverified_upload' && (
                          <span className="absolute bottom-2 left-2 text-[10px] bg-black/80 text-amber-200 px-2 py-0.5 rounded backdrop-blur-sm font-medium">
                            Photo — destination/accommodation unverified.
                          </span>
                        )}
                        {badgeInfo.type === 'demo_illustration' && (
                          <span className="absolute bottom-2 left-2 text-[10px] bg-black/80 text-amber-200 px-2 py-0.5 rounded backdrop-blur-sm font-medium">
                            Demo illustration — not an actual destination or accommodation photo.
                          </span>
                        )}
                        {badgeInfo.type === 'verified' && (
                          <span className="absolute bottom-2 left-2 text-[10px] bg-emerald-900/90 text-emerald-200 px-2 py-0.5 rounded backdrop-blur-sm font-medium">
                            Confirmed photo — verified by Petra
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <h4 className="text-xs font-bold text-[#0e3b2f]">{photo.title}</h4>
                        <p className="text-[11px] text-[#687785] mt-0.5 leading-relaxed">
                          {photo.caption}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Booking Terms & Seasonal Conditions */}
          <div className="bg-[#faf8f5] p-6 rounded-lg border border-[#ebdcb8] space-y-4 text-xs print:break-inside-avoid">
            <h3 className="text-xs font-serif font-bold text-[#0e3b2f] uppercase tracking-wider flex items-center gap-2 border-b border-[#ebdcb8] pb-2">
              <ShieldCheck className="w-4 h-4 text-[#c9a96e]" />
              <span>{conditionsTitle}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[#45525f]">
              <div>
                <strong className="block text-[#0e3b2f] font-semibold mb-1">
                  1. Payment Schedule & Deposit Requirements
                </strong>
                <p>{getCombinedPayAndDeposit(quotation.paymentSchedule, quotation.depositRequirement)}</p>
              </div>

              <div>
                <strong className="block text-[#0e3b2f] font-semibold mb-1">
                  2. Cancellation & Revision Policy
                </strong>
                <p>{renderCondition(quotation.cancellationTerms)}</p>
              </div>

              {renderCondition(quotation.seasonalConditions) !== PENDING_TEXT || quotation.seasonalConditions ? (
                <div>
                  <strong className="block text-[#0e3b2f] font-semibold mb-1">
                    3. Seasonal / Special Travel Conditions
                  </strong>
                  <p>{renderCondition(quotation.seasonalConditions)}</p>
                </div>
              ) : null}

              <div>
                <strong className="block text-[#0e3b2f] font-semibold mb-1">
                  4. Guna Yala Territory Logistics & Weather
                </strong>
                <p className="leading-relaxed">{renderCondition(quotation.weatherLogisticsNote)}</p>
              </div>
            </div>
          </div>

          {/* Sign-off Footer */}
          <div className="pt-6 border-t border-[#e5dec9] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#687785] text-center sm:text-left print:break-inside-avoid">
            <div>
              <p className="font-serif font-semibold text-[#0e3b2f]">Guna Yala Panama Travel</p>
            </div>
            <div className="text-[11px] font-mono">
              Quotation Ref: <span className="font-bold text-[#0e3b2f]">{quotation.reference}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Conditions Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-[#e5dec9] shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-[#f0eae0] pb-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0e3b2f]">Reset quotation conditions?</h3>
                <p className="text-xs text-[#687785]">Confirm reset of customer-facing terms</p>
              </div>
            </div>

            <p className="text-xs text-[#45525f] leading-relaxed">
              Replace customer-facing conditions with ‘Pending Petra’s confirmation’. Other quotation details will remain unchanged.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#f0eae0]">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-[#52606d] bg-[#f0eae0] hover:bg-[#e6dece] rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResetConditions}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 rounded transition-colors shadow-sm"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
