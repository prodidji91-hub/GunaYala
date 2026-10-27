import React, { useState, useEffect } from 'react';
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
  GitBranch,
  Clock,
  DollarSign,
} from 'lucide-react';
import {
  quotationStorageService,
  getOutdatedFieldsInfo,
  extractRootReference,
  generateNextRevisionReference,
  formatAccommodationSummary,
} from '../../services/quotationStorageService';
import { getPhotoBadgeInfo } from '../../data/samplePhotos';

interface CustomerQuotationPreviewProps {
  quotation: Quotation;
  allQuotations?: Quotation[];
  onSelectQuotation?: (quotation: Quotation) => void;
  onCreateRevision?: (quotation: Quotation, revisionNote?: string) => void;
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
          const isPng = url.toLowerCase().includes('.png') || url.toLowerCase().includes('logo');
          const dataUrl = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', isPng ? undefined : 0.9);
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
  allQuotations,
  onSelectQuotation,
  onCreateRevision,
  onBackToEdit,
  onBackToList,
}) => {
  const [quotation, setQuotation] = useState<Quotation>(initialQuotation);

  useEffect(() => {
    setQuotation(initialQuotation);
  }, [initialQuotation]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState<boolean>(false);
  const [revisionNoteInput, setRevisionNoteInput] = useState<string>('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState<boolean>(false);

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

      // 1. Prepare Base64 images and logo for reliable rendering inside @react-pdf/renderer
      let logoDataUrl = '';
      try {
        logoDataUrl = await urlToBase64DataUrl('/pictures/logo1-transparent.png');
      } catch (e) {
        console.warn('Logo pre-conversion error:', e);
      }

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
      const doc = <QuotationPdfDocument quotation={quotation} preparedPhotos={preparedPhotos} logoDataUrl={logoDataUrl} />;
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

  const lang = quotation.language || 'en';
  const PENDING_TEXT = lang === 'es' ? 'Pendiente de confirmación por Petra.' : 'Pending Petra’s confirmation.';

  const l = {
    officialQuotation: lang === 'es' ? 'Cotización Oficial' : 'Official Quotation',
    referenceCode: lang === 'es' ? 'Código de Referencia' : 'Reference Code',
    quotationDate: lang === 'es' ? 'Fecha de Cotización' : 'Quotation Date',
    validThrough: lang === 'es' ? 'Válida Hasta' : 'Valid Through',
    availabilityNotice: lang === 'es' ? 'La disponibilidad está sujeta a confirmación.' : 'Availability is subject to confirmation.',
    bookingDetails: lang === 'es' ? 'DETALLES DE SU RESERVA' : 'YOUR BOOKING DETAILS',
    leadBooker: lang === 'es' ? 'Titular de Reserva' : 'Lead Booker',
    destinationIslandExp: lang === 'es' ? 'Destino / Isla y Experiencia' : 'Destination / Island & Experience',
    experience: lang === 'es' ? 'Experiencia' : 'Experience',
    numberOfTravellers: lang === 'es' ? 'Número de Viajeros' : 'Number of Travellers',
    travelDates: lang === 'es' ? 'Fechas de Viaje' : 'Travel Dates',
    duration: lang === 'es' ? 'Duración' : 'Duration',
    night: lang === 'es' ? 'Noche' : 'Night',
    nights: lang === 'es' ? 'Noches' : 'Noches',
    quotationDetails: lang === 'es' ? 'DETALLES DE COTIZACIÓN' : 'QUOTATION DETAILS',
    ratesPending: lang === 'es' ? 'Tarifas por Confirmar' : 'Rates Pending Confirmation',
    ratesPendingMsg: lang === 'es'
      ? 'La tarifa oficial para este itinerario personalizado está pendiente de confirmación por parte de los operadores locales de Guna Yala y Petra. Las tarifas finales se confirmarán al validar el itinerario.'
      : 'Official pricing for this custom itinerary is currently pending confirmation from local Guna Yala island operators and Petra. Final rates will be confirmed upon itinerary validation.',
    serviceDescription: lang === 'es' ? 'Descripción del Servicio' : 'Service Description',
    qtyPax: lang === 'es' ? 'Cant. / Pax' : 'Qty / Pax',
    rateUsd: lang === 'es' ? 'Tarifa (USD)' : 'Rate (USD)',
    totalUsd: lang === 'es' ? 'Total (USD)' : 'Total (USD)',
    islandAccommodationFirstNight: lang === 'es' ? 'Alojamiento en Cabaña en Isla y Comidas (Primera Noche)' : 'Island Cabaña Accommodation & Meals (First Night)',
    completePackagePrice: lang === 'es' ? 'Precio de Paquete Completo (Estadía en Isla y Todas las Inclusiones)' : 'Complete Package Price (Island Stay & All Inclusions)',
    optionalExtra: lang === 'es' ? 'Servicio Opcional' : 'Optional Extra',
    packageSubtotal: lang === 'es' ? 'Subtotal del Paquete' : 'Package Subtotal',
    grandTotal: lang === 'es' ? 'Gran Total' : 'Grand Total',
    whatsIncluded: lang === 'es' ? 'QUÉ INCLUYE' : "WHAT'S INCLUDED",
    includedServicesSummary: lang === 'es' ? 'Servicios Incluidos y Resumen' : 'Included Services & Summary',
    experienceOverview: lang === 'es' ? 'Descripción de la Experiencia' : 'Experience Overview',
    accommodationBathroom: lang === 'es' ? 'Alojamiento y Baño' : 'Accommodation & Bathroom',
    mealsByDay: lang === 'es' ? 'Comidas por Día' : 'Meals by Day',
    groundTransportation: lang === 'es' ? 'Transporte Terrestre' : 'Ground Transportation',
    boatTransfers: lang === 'es' ? 'Traslados en Bote' : 'Boat Transfers',
    includedToursActivities: lang === 'es' ? 'Tours y Actividades Incluidas' : 'Included Tours & Activities',
    islandScheduleTiming: lang === 'es' ? 'Horarios e Itinerario en Isla' : 'Island Schedule & Timing',
    importantTravelInstructions: lang === 'es' ? 'Instrucciones Importantes de Viaje' : 'Important Travel Instructions',
    whatIsExcluded: lang === 'es' ? 'Qué Excluye (Efectivo Requerido en Sitio)' : 'What Is Excluded (Cash Required on Site)',
    destinationVisualShowcase: lang === 'es' ? 'Galería Visual del Destino' : 'Destination Visual Showcase',
    bookingConditionsTerms: lang === 'es' ? 'Condiciones de Reserva y Términos Estacionales' : 'Booking Conditions & Seasonal Travel Terms',
    draftConditions: lang === 'es' ? 'Condiciones en borrador — pendiente de aprobación de Petra' : 'Draft conditions — pending Petra’s approval',
    paymentScheduleDeposit: lang === 'es' ? '1. Programa de Pagos y Requisitos de Depósito' : '1. Payment Schedule & Deposit Requirements',
    cancellationRevisionPolicy: lang === 'es' ? '2. Política de Cancelación y Modificación' : '2. Cancellation & Revision Policy',
    seasonalSpecialConditions: lang === 'es' ? '3. Condiciones Estacionales / Especiales de Viaje' : '3. Seasonal / Special Travel Conditions',
    gunaYalaLogisticsWeather: lang === 'es' ? '4. Logística del Territorio Guna Yala y Clima' : '4. Guna Yala Territory Logistics & Weather',
    quotationRef: lang === 'es' ? 'Ref. de Cotización:' : 'Quotation Ref:',
    ratesToBeConfirmed: lang === 'es' ? 'Tarifas por confirmar' : 'Rates to Be Confirmed',
  };

  const snapshot = lang === 'es' ? (quotation.packageSnapshotEs || quotation.packageSnapshot || {
    overview: 'Experimente la vida en las islas de Guna Yala.',
    accommodationDetails: `${quotation.cabinCategoryEs || quotation.cabinCategory} (${quotation.bathroomType} Baño)`,
    mealsByDay: 'Plan de comidas diario incluido según el horario de la isla.',
    groundTransportationDetails: `Transporte terrestre: ${quotation.groundTransportation}`,
    boatTransferDetails: `Traslados en bote: ${quotation.boatTransfers}`,
    toursAndActivities: 'Recorridos por islas y actividades en arrecifes.',
    islandSchedule: 'Salidas matutinas desde Ciudad de Panamá.',
    importantInstructions: 'Se requiere pasaporte original en el puesto fronterizo de Guna Yala.',
  }) : (quotation.packageSnapshot || {
    overview: 'Experience island life in Guna Yala.',
    accommodationDetails: `${quotation.cabinCategory} (${quotation.bathroomType} Bathroom)`,
    mealsByDay: 'Daily meal plan included as per island schedule.',
    groundTransportationDetails: `Ground transport: ${quotation.groundTransportation}`,
    boatTransferDetails: `Boat transfers: ${quotation.boatTransfers}`,
    toursAndActivities: 'Island hopping and reef activities.',
    islandSchedule: 'Morning Panama City departures.',
    importantInstructions: 'Original passport required at Guna Yala border.',
  });

  const inclusions = lang === 'es' && quotation.inclusionsEs && quotation.inclusionsEs.length > 0
    ? quotation.inclusionsEs
    : quotation.inclusions;

  const rawExclusions = lang === 'es' && quotation.exclusionsEs && quotation.exclusionsEs.length > 0
    ? quotation.exclusionsEs
    : quotation.exclusions;

  const isAfternoonSelected =
    quotation.departureOption === 'afternoon_with_lunch' ||
    Boolean(quotation.lineItems && quotation.lineItems.some((it) =>
      it.description?.toLowerCase().includes('afternoon') ||
      it.descriptionEs?.toLowerCase().includes('tarde')
    ));

  // Exclusions: strictly genuine excluded costs and services (never optional upgrade ads)
  const isUpgradeItem = (text: string) => {
    const lower = text.toLowerCase();
    return (
      lower.startsWith('optional') ||
      lower.startsWith('opción') ||
      lower.startsWith('mejora') ||
      lower.includes('afternoon departure') ||
      lower.includes('salida por la tarde') ||
      lower.includes('lobster lunch') ||
      lower.includes('almuerzo de langosta') ||
      lower.includes('pickup/drop-off outside') ||
      lower.includes('recogida o retorno fuera') ||
      lower.includes('private 4×4') ||
      lower.includes('transporte privado') ||
      lower.includes('cultural visit') ||
      lower.includes('visita cultural')
    );
  };

  const filteredExclusions = rawExclusions.filter((exc) => !isUpgradeItem(exc));

  // Available upgrades: optional services that may be requested, without implying purchase
  const islandLower = (quotation.island || '').toLowerCase();
  const availableUpgrades: { en: string; es: string }[] = [];

  if (!islandLower.includes('guasirdub') && !isAfternoonSelected) {
    if (islandLower.includes('franklin')) {
      availableUpgrades.push({
        en: 'Optional afternoon island departure until 3:00 PM w/ lunch: USD $25/pax (cabin checkout 8:00 AM)',
        es: 'Salida opcional por la tarde hasta las 3:00 PM con almuerzo: USD $25/pax (entrega de cabaña 8:00 AM)',
      });
    } else {
      availableUpgrades.push({
        en: 'Optional afternoon island departure until 3:00 PM w/ lunch: USD $35/pax (cabin checkout 8:00 AM)',
        es: 'Salida opcional por la tarde hasta las 3:00 PM con almuerzo: USD $35/pax (entrega de cabaña 8:00 AM)',
      });
    }
  }

  const hasLobster = quotation.lineItems && quotation.lineItems.some(
    (it) => it.description?.toLowerCase().includes('lobster') || it.descriptionEs?.toLowerCase().includes('langosta')
  );
  if (!hasLobster) {
    availableUpgrades.push({
      en: 'Seasonal fresh lobster lunch upgrade: From USD $20/pax (subject to local fisherman catch)',
      es: 'Mejora con almuerzo de langosta fresca de temporada: Desde USD $20/pax (sujeto a pesca del día)',
    });
  }

  const hasSuburban = quotation.lineItems && quotation.lineItems.some(
    (it) => it.description?.toLowerCase().includes('suburban') || it.description?.toLowerCase().includes('playa bonita') || it.descriptionEs?.toLowerCase().includes('suburbano') || it.descriptionEs?.toLowerCase().includes('playa bonita')
  );
  if (!hasSuburban) {
    availableUpgrades.push({
      en: 'Suburban hotel pickup/drop-off (Playa Bonita, Dreams, Gamboa): USD $20/pax',
      es: 'Recogida/retorno fuera del centro (Playa Bonita, Dreams, Gamboa): USD $20/pax',
    });
  }

  if (islandLower.includes('franklin')) {
    const hasCultural = quotation.lineItems && quotation.lineItems.some(
      (it) => it.description?.toLowerCase().includes('cultural') || it.descriptionEs?.toLowerCase().includes('cultural')
    );
    if (!hasCultural) {
      availableUpgrades.push({
        en: 'Guided Guna cultural community visit & Mola workshop: USD $35/pax',
        es: 'Visita cultural guiada a comunidad guna y taller tradicional de molas: USD $35/pax',
      });
    }
  }

  availableUpgrades.push({
    en: 'Private 4×4 SUV transportation upgrade: Price on Request',
    es: 'Transporte terrestre privado en SUV 4×4: Precio a consultar',
  });

  // Dynamic Departure Schedule according to selected option and island
  const getDepartureScheduleText = (): string => {
    if (islandLower.includes('guasirdub')) {
      if (lang === 'es') {
        return '5:00 AM – 5:45 AM recogida en hotel de Ciudad de Panamá hacia Cartí. Salida de Guasirdub: el horario extendido de salida por la tarde con almuerzo de despedida está incluido (entrega de cabaña a las 8:00 AM con equipaje custodiado; salida en lancha ~2:00–3:00 PM). Llegada estimada a Ciudad de Panamá: 7:00–7:30 PM.';
      }
      return '5:00 AM – 5:45 AM hotel pickup in Panama City to Cartí Port. Guasirdub departure: extended afternoon departure with farewell lunch is included (cabin checkout by 8:00 AM with luggage securely stored; boat departure ~2:00–3:00 PM). Estimated arrival in Panama City: 7:00–7:30 PM.';
    }

    if (isAfternoonSelected) {
      const costText = islandLower.includes('franklin') ? '$25/persona' : '$35/persona';
      const costTextEn = islandLower.includes('franklin') ? '$25/person' : '$35/person';
      if (lang === 'es') {
        return `5:00 AM – 5:45 AM recogida en hotel de Ciudad de Panamá. Salida opcional por la tarde (${costText}, almuerzo incluido): entrega de cabaña a las 8:00 AM con equipaje custodiado de forma segura; salida de la isla en lancha aprox. 3:00 PM. Llegada estimada a Ciudad de Panamá: 7:30–8:00 PM.`;
      }
      return `5:00 AM – 5:45 AM hotel pickup in Panama City. Optional afternoon departure (${costTextEn}, lunch included): cabin checkout by 8:00 AM with luggage securely stored; boat departs island ~3:00 PM. Estimated arrival in Panama City: 7:30–8:00 PM.`;
    }

    // Standard morning departure
    if (lang === 'es') {
      return '5:00 AM – 5:45 AM recogida en hotel de Ciudad de Panamá. Retorno matutino estándar: salida de la isla en lancha tras el desayuno (~8:00–8:30 AM). Desayuno del día de salida incluido. Llegada estimada a Ciudad de Panamá: 12:00–1:00 PM.';
    }
    return '5:00 AM – 5:45 AM hotel pickup in Panama City. Standard morning departure: departs the island after breakfast (~8:00–8:30 AM boat departure). Departure-day breakfast included. Estimated arrival in Panama City: 12:00–1:00 PM.';
  };

  const experienceName = lang === 'es' ? (quotation.experienceEs || quotation.experience || 'Experiencia Nocturna en Isla') : (quotation.experience || 'Island Overnight Experience');
  const cabinCategoryName = lang === 'es' ? (quotation.cabinCategoryEs || quotation.cabinCategory || 'Cabaña Estándar') : (quotation.cabinCategory || 'Standard Cabaña');

  // Photography: ONLY verified photographs authenticated by Petra for this destination
  const verifiedPhotos = (quotation.selectedPhotos || []).filter((p) => p.verificationStatus === 'Confirmed by Petra');

  const conditionsTitle =
    quotation.termsStatus === 'Approved by Petra'
      ? l.bookingConditionsTerms
      : (lang === 'es' ? 'Condiciones de Reserva — Borrador Pendiente de Aprobación por Petra' : 'Booking Conditions & Policies — Informational Draft');

  const isRatesPending =
    quotation.pricingStatus === 'Rates to Be Confirmed' ||
    (quotation.pricingMode === 'first_night_additional' && (!quotation.firstNightRate || quotation.firstNightRate <= 0)) ||
    (quotation.pricingMode === 'single_total' && (!quotation.totalPackagePrice || quotation.totalPackagePrice <= 0));

  const rootRef = quotation.rootReference || extractRootReference(quotation.reference);
  const familyQuotes = (allQuotations || []).filter((q) => {
    const qRoot = q.rootReference || extractRootReference(q.reference);
    return qRoot.toUpperCase() === rootRef.toUpperCase();
  }).sort((a, b) => a.reference.localeCompare(b.reference));

  return (
    <div className="space-y-6 pb-16">
      {/* Revision Switcher Bar - Hidden during print */}
      {familyQuotes.length > 0 && (
        <div className="bg-[#f7f4ed] border border-[#e0d6c1] rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs print:hidden shadow-xs">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#c9a96e] shrink-0" />
            <span className="font-semibold text-[#0e3b2f]">
              Viewing Proposal Proposal {quotation.reference}
            </span>
            {quotation.revisionNote && (
              <span className="text-[#687785] italic truncate max-w-sm">
                "{quotation.revisionNote}"
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] text-[#52606d] font-medium">Switch Proposal Revision:</span>
            {familyQuotes.map((q) => {
              const isSelected = q.id === quotation.id || q.reference === quotation.reference;
              const isQRatesPending =
                q.pricingStatus === 'Rates to Be Confirmed' ||
                (q.pricingMode === 'first_night_additional' && (!q.firstNightRate || q.firstNightRate <= 0)) ||
                (q.pricingMode === 'single_total' && (!q.totalPackagePrice || q.totalPackagePrice <= 0));

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    setQuotation(q);
                    if (onSelectQuotation) onSelectQuotation(q);
                  }}
                  className={`px-2.5 py-1 font-mono text-xs rounded transition-colors ${
                    isSelected
                      ? 'bg-[#0e3b2f] text-white font-bold shadow-xs'
                      : 'bg-white hover:bg-[#e6dece] text-[#1c242c] border border-[#cfc7b2]'
                  }`}
                  title={`${q.reference} - ${isQRatesPending ? 'Rates to Be Confirmed' : `$${q.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}`}
                >
                  {q.reference}
                </button>
              );
            })}
          </div>
        </div>
      )}

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

          {onCreateRevision && (
            <button
              type="button"
              onClick={() => {
                setRevisionNoteInput(quotation.revisionNote || '');
                setIsRevisionModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-[#0e3b2f] hover:bg-[#155243] text-white rounded transition-colors shadow-sm cursor-pointer"
            >
              <GitBranch className="w-3.5 h-3.5 text-[#c9a96e]" />
              <span>Create Revision {generateNextRevisionReference(quotation, allQuotations || []).nextReference}</span>
            </button>
          )}

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
              <img
                src="/pictures/logo1-transparent.png"
                alt="Guna Yala Panama Travel Logo"
                className="w-12 h-12 object-contain"
                onError={(e: any) => {
                  e.target.style.display = 'none';
                }}
              />
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
              {quotation.termsStatus === 'Approved by Petra'
                ? (lang === 'es' ? 'Cotización Oficial' : 'Official Quotation')
                : (lang === 'es' ? 'Cotización (Borrador)' : 'Official Quotation (Draft)')}
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

        {/* Draft Safety Notice Banner when terms are not yet approved by Petra */}
        {quotation.termsStatus !== 'Approved by Petra' && (
          <div className="bg-amber-50 border-y border-amber-300 px-6 py-3 text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block text-amber-950 uppercase tracking-wide">
                {lang === 'es'
                  ? 'BORRADOR DE PROPUESTA — TÉRMINOS Y CONDICIONES PENDIENTES DE VALIDACIÓN'
                  : 'PROPOSAL DRAFT — TERMS & CONDITIONS PENDING OPERATOR APPROVAL'}
              </strong>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                {lang === 'es'
                  ? 'Esta propuesta presenta el itinerario y presupuesto estimado. Los términos contractuales definitivos, programa de pagos y políticas de cancelación están pendientes de validación formal por Petra antes de la reserva.'
                  : 'This document presents an estimated itinerary and quotation. Contractual booking terms, payment schedule, and cancellation policies are subject to formal confirmation by Petra prior to booking confirmation.'}
              </p>
            </div>
          </div>
        )}

        {/* Customer & Trip Overview Grid (YOUR BOOKING DETAILS) */}
        <div className="p-8 sm:p-10 space-y-8">
          <div className="bg-[#f7f4ed] border border-[#e0d6c1] rounded-lg p-6 space-y-4">
            <h2 className="text-sm font-serif font-bold text-[#0e3b2f] uppercase tracking-wider border-b border-[#e0d6c1] pb-2">
              {lang === 'es' ? 'DETALLES DE SU RESERVA' : 'YOUR BOOKING DETAILS'}
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
                  {lang === 'es' ? 'Experiencia:' : 'Experience:'} {experienceName}
                </span>
                <span className="block text-[11px] text-[#52606d]">
                  {lang === 'es' ? 'Alojamiento:' : 'Accommodation:'} {formatAccommodationSummary(quotation, lang)}
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

          {/* Experience Overview (Placed directly below Booking Details) */}
          {snapshot.overview && (
            <div className="bg-[#FAF8F5] border border-[#C8AC75]/40 rounded-lg p-6 space-y-3 shadow-2xs">
              <h3 className="text-sm font-serif font-bold text-[#0e3b2f] uppercase tracking-wider border-b border-[#C8AC75]/30 pb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#c9a96e]" />
                <span>{lang === 'es' ? 'RESUMEN DE TU EXPERIENCIA' : 'YOUR EXPERIENCE OVERVIEW'}</span>
              </h3>
              <p className="text-xs sm:text-sm text-[#2d3a45] font-light leading-relaxed">
                {snapshot.overview}
              </p>
            </div>
          )}

          {/* Pricing Breakdown Table (QUOTATION DETAILS) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-[#e5dec9] pb-2">
              <h3 className="text-sm font-serif font-bold text-[#0e3b2f] uppercase tracking-wider flex items-center gap-2">
                <span>QUOTATION DETAILS</span>
              </h3>
              {isRatesPending && (
                <span className="text-[11px] font-sans font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded">
                  Rates Pending Confirmation
                </span>
              )}
            </div>

            {isRatesPending && (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold block text-amber-950">Rates Pending Confirmation:</strong>
                  <span>
                    Official pricing for this custom itinerary is currently pending confirmation from local Guna Yala island operators and Petra. Final rates will be confirmed upon itinerary validation.
                  </span>
                </div>
              </div>
            )}

            <div className="border border-[#e5dec9] rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f5f1e8] text-[#52606d] font-mono text-[11px] uppercase border-b border-[#e5dec9]">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Service Description</th>
                    <th className="py-3 px-4 font-semibold text-center w-20">Qty / Pax</th>
                    <th className="py-3 px-4 font-semibold text-right w-36">Rate (USD)</th>
                    <th className="py-3 px-4 font-semibold text-right w-40">Total (USD)</th>
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
                          {isRatesPending ? (
                            <span className="text-amber-800 font-sans font-medium text-[11px]">Rates to Be Confirmed</span>
                          ) : (
                            `$${(quotation.firstNightRate || 0).toFixed(2)}`
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#0e3b2f] tabular-nums">
                          {isRatesPending ? (
                            <span className="text-amber-800 font-sans font-medium text-[11px]">Rates to Be Confirmed</span>
                          ) : (
                            `$${(quotation.travelers * (quotation.firstNightRate || 0)).toFixed(2)}`
                          )}
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
                            {isRatesPending ? (
                              <span className="text-amber-800 font-sans font-medium text-[11px]">Rates to Be Confirmed</span>
                            ) : (
                              `$${(quotation.additionalNightRate || 0).toFixed(2)}`
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#0e3b2f] tabular-nums">
                            {isRatesPending ? (
                              <span className="text-amber-800 font-sans font-medium text-[11px]">Rates to Be Confirmed</span>
                            ) : (
                              `$${(quotation.travelers * Math.max(quotation.nights - 1, 0) * (quotation.additionalNightRate || 0)).toFixed(2)}`
                            )}
                          </td>
                        </tr>
                      )}
                      {/* Optional Add-on Line Items */}
                      {quotation.lineItems && quotation.lineItems.length > 0 && quotation.lineItems.map((item, index) => (
                        <tr key={item.id || index} className="hover:bg-[#faf8f5] bg-emerald-50/25">
                          <td className="py-3.5 px-4 font-medium text-[#1c242c]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-emerald-700 font-bold">+</span>
                              <span>{lang === 'es' && item.descriptionEs ? item.descriptionEs : item.description}</span>
                              <span className="text-[10px] text-emerald-800 font-mono bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded">{lang === 'es' ? 'Servicio Opcional' : 'Optional Extra'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center text-[#52606d] font-mono">
                            {item.quantity}
                          </td>
                          <td className="py-3.5 px-4 text-right text-[#52606d] font-mono tabular-nums">
                            ${item.unitPrice.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#0e3b2f] tabular-nums">
                            ${item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </>
                  ) : quotation.pricingMode === 'single_total' ? (
                    <>
                      <tr className="hover:bg-[#faf8f5]">
                        <td className="py-3.5 px-4 font-medium text-[#1c242c]">
                          Complete Package Price (Island Stay & All Inclusions)
                        </td>
                        <td className="py-3.5 px-4 text-center text-[#52606d] font-mono">
                          {quotation.travelers} pax, {quotation.nights} nts
                        </td>
                        <td className="py-3.5 px-4 text-right text-[#52606d] font-mono tabular-nums">—</td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#0e3b2f] tabular-nums">
                          {isRatesPending ? (
                            <span className="text-amber-800 font-sans font-medium text-[11px]">Rates to Be Confirmed</span>
                          ) : (
                            `$${(quotation.totalPackagePrice || quotation.subtotal).toFixed(2)}`
                          )}
                        </td>
                      </tr>
                      {/* Optional Add-on Line Items */}
                      {quotation.lineItems && quotation.lineItems.length > 0 && quotation.lineItems.map((item, index) => (
                        <tr key={item.id || index} className="hover:bg-[#faf8f5] bg-emerald-50/25">
                          <td className="py-3.5 px-4 font-medium text-[#1c242c]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-emerald-700 font-bold">+</span>
                              <span>{lang === 'es' && item.descriptionEs ? item.descriptionEs : item.description}</span>
                              <span className="text-[10px] text-emerald-800 font-mono bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded">{lang === 'es' ? 'Servicio Opcional' : 'Optional Extra'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center text-[#52606d] font-mono">
                            {item.quantity}
                          </td>
                          <td className="py-3.5 px-4 text-right text-[#52606d] font-mono tabular-nums">
                            ${item.unitPrice.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#0e3b2f] tabular-nums">
                            ${item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </>
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
                <span>
                  {isRatesPending ? (
                    <span className="font-sans font-semibold text-amber-800">Rates to Be Confirmed</span>
                  ) : (
                    `$${quotation.subtotal.toFixed(2)} USD`
                  )}
                </span>
              </div>

              {!isRatesPending && quotation.enableAdditionalCharge && (
                <div className="flex justify-between text-[#805e24]">
                  <span>{quotation.additionalChargeLabel} ({quotation.additionalChargePercent}%):</span>
                  <span>+${quotation.additionalChargeAmount.toFixed(2)} USD</span>
                </div>
              )}

              <div className="flex justify-between text-base font-bold text-[#0e3b2f] border-t border-[#cfc7b2] pt-2 mt-1">
                <span>Grand Total:</span>
                <span>
                  {isRatesPending ? (
                    <span className="font-sans font-bold text-amber-900">Rates to Be Confirmed</span>
                  ) : (
                    `$${quotation.total.toFixed(2)} USD`
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION A: INCLUDED SERVICES (Midnight Green / Emerald Palette) */}
          <div className="bg-[#f4f8f6] p-6 rounded-lg border border-[#c1ded3] space-y-4">
            <div className="border-b border-[#c1ded3] pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-serif font-bold text-[#0e3b2f] uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{lang === 'es' ? 'A. SERVICIOS INCLUIDOS' : 'A. INCLUDED SERVICES'}</span>
              </h3>
              <span className="text-[11px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 self-start sm:self-auto">
                {lang === 'es' ? 'Paquete Todo Incluido en Isla' : 'All-Inclusive Island Package'}
              </span>
            </div>

            <p className="text-xs text-[#283e35] leading-relaxed">
              {lang === 'es'
                ? 'Todos los servicios esenciales de alojamiento en cabaña, traslados ida y vuelta, comidas diarias según el itinerario y excursiones de arrecife incluidas:'
                : 'All essential island cabaña accommodations, round-trip transportation, daily meals as per itinerary, and reef excursions included:'}
            </p>

            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-[#283e35]">
              {inclusions.map((inc, i) => (
                <li key={i} className="flex items-start gap-2 bg-white/70 p-2.5 rounded border border-[#c1ded3]/60">
                  <span className="text-emerald-600 font-bold shrink-0 mt-0.5">✓</span>
                  <span className="leading-relaxed">{inc}</span>
                </li>
              ))}
            </ul>

            {/* Confirmed service specification cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="bg-white p-3 rounded border border-[#c1ded3] space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#687785] block">
                  {lang === 'es' ? 'Alojamiento Confirmado' : 'Confirmed Accommodation'}
                </span>
                <p className="font-semibold text-[#0e3b2f]">{formatAccommodationSummary(quotation, lang)}</p>
              </div>

              <div className="bg-white p-3 rounded border border-[#c1ded3] space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#687785] block">
                  {lang === 'es' ? 'Transporte Terrestre 4x4' : 'Ground 4x4 Transport'}
                </span>
                <p className="font-semibold text-[#0e3b2f]">
                  {quotation.groundTransportation === 'Private'
                    ? (lang === 'es' ? 'SUV 4x4 Privado Exclusivo' : 'Private Exclusive 4x4 SUV')
                    : (lang === 'es' ? 'Vehículo 4x4 Compartido' : 'Shared 4x4 Vehicle')}
                </p>
              </div>

              <div className="bg-white p-3 rounded border border-[#c1ded3] space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#687785] block">
                  {lang === 'es' ? 'Traslado en Bote' : 'Boat Transfer'}
                </span>
                <p className="font-semibold text-[#0e3b2f]">
                  {quotation.boatTransfers === 'Private'
                    ? (lang === 'es' ? 'Lancha Rápida Privada' : 'Private Speedboat')
                    : (lang === 'es' ? 'Lancha Rápida Compartida' : 'Shared Island Water Taxi')}
                </p>
              </div>

              <div className="bg-white p-3 rounded border border-[#c1ded3] space-y-1">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#687785] block">
                  {lang === 'es' ? 'Plan de Comidas' : 'Daily Meal Plan'}
                </span>
                <p className="font-semibold text-[#0e3b2f]">
                  {isAfternoonSelected
                    ? (lang === 'es' ? 'Desayuno, Almuerzo y Cena + Almuerzo Salida' : 'Breakfast, Lunch, Dinner + Departure Lunch')
                    : (lang === 'es' ? 'Desayuno, Almuerzo y Cena (Salida Desayuno)' : 'Breakfast, Lunch, Dinner (Departure Breakfast)')}
                </p>
              </div>
            </div>
          </div>

          {/* SECTION B: EXCLUSIONS (Muted Red / Rose Palette) */}
          <div className="bg-[#fff8f8] p-6 rounded-lg border border-[#f0c2c2] space-y-4">
            <div className="border-b border-[#f0c2c2] pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-serif font-bold text-[#802424] uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#a84444]" />
                <span>{lang === 'es' ? 'B. SERVICIOS NO INCLUIDOS' : 'B. EXCLUSIONS'}</span>
              </h3>
              <span className="text-[11px] font-mono text-[#802424] bg-red-50 px-2 py-0.5 rounded border border-[#f0c2c2] self-start sm:self-auto">
                {lang === 'es' ? 'Efectivo Requerido en Sitio' : 'Cash Required on Site'}
              </span>
            </div>

            <p className="text-xs text-[#522b2b] leading-relaxed">
              {lang === 'es'
                ? 'Los siguientes conceptos no están cubiertos en el costo de la cotización y deben ser cancelados en efectivo directamente en el destino:'
                : 'The following expenses are not covered by this quotation package and must be paid in cash at the destination:'}
            </p>

            <ul className="space-y-2 text-xs text-[#522b2b]">
              {filteredExclusions.map((exc, i) => (
                <li key={i} className="flex items-start gap-2 bg-white/60 p-2.5 rounded border border-[#f0c2c2]/60">
                  <span className="text-[#a84444] font-bold shrink-0 mt-0.5">✕</span>
                  <span className="leading-relaxed">{exc}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* SECTION C: OPTIONAL EXTRAS & UPGRADES (Blue / Slate-Cyan Palette) */}
          {((quotation.lineItems && quotation.lineItems.length > 0) || availableUpgrades.length > 0) && (
            <div className="bg-[#f0f7ff] p-6 rounded-lg border border-[#bae6fd] space-y-4">
              <div className="border-b border-[#bae6fd] pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-serif font-bold text-[#0369a1] uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#0284c7]" />
                  <span>{lang === 'es' ? 'C. SERVICIOS ADICIONALES Y MEJORAS OPCIONALES' : 'C. OPTIONAL EXTRAS & UPGRADES'}</span>
                </h3>
                {quotation.lineItems && quotation.lineItems.length > 0 ? (
                  <span className="text-[11px] font-mono text-[#0369a1] bg-[#e0f2fe] px-2 py-0.5 rounded border border-[#bae6fd] self-start sm:self-auto">
                    {quotation.lineItems.length} {lang === 'es' ? (quotation.lineItems.length === 1 ? 'servicio seleccionado' : 'servicios seleccionados') : (quotation.lineItems.length === 1 ? 'selected extra' : 'selected extras')}
                  </span>
                ) : null}
              </div>

              {quotation.lineItems && quotation.lineItems.length > 0 && (
                <>
                  <p className="text-xs text-[#0369a1] leading-relaxed">
                    {lang === 'es'
                      ? 'Los siguientes servicios adicionales personalizados han sido seleccionados e incorporados al precio total de su propuesta:'
                      : 'The following customized optional add-on services have been selected and are included in your total proposal price:'}
                  </p>

                  <div className="border border-[#bae6fd] rounded overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#e0f2fe] text-[#0369a1] font-mono text-[11px] uppercase border-b border-[#bae6fd]">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">{lang === 'es' ? 'Descripción del Servicio' : 'Service Description'}</th>
                          <th className="py-2.5 px-4 font-semibold text-center w-24">{lang === 'es' ? 'Cantidad' : 'Quantity'}</th>
                          <th className="py-2.5 px-4 font-semibold text-right w-32">{lang === 'es' ? 'Tarifa (USD)' : 'Unit Price (USD)'}</th>
                          <th className="py-2.5 px-4 font-semibold text-right w-36">{lang === 'es' ? 'Total (USD)' : 'Line Total (USD)'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e0f2fe]">
                        {quotation.lineItems.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-[#f0f9ff]">
                            <td className="py-3 px-4 font-medium text-[#1e293b]">
                              <div className="flex items-center gap-2">
                                <span className="text-[#0284c7] font-bold">+</span>
                                <span>{lang === 'es' && item.descriptionEs ? item.descriptionEs : item.description}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center text-[#475569] font-mono">{item.quantity}</td>
                            <td className="py-3 px-4 text-right text-[#475569] font-mono tabular-nums">${item.unitPrice.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-[#0369a1] tabular-nums">${item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Available Upgrades Subsection */}
              {availableUpgrades.length > 0 && (
                <div className="bg-white p-4 rounded border border-[#bae6fd] space-y-2">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs font-serif font-bold text-[#0369a1] uppercase tracking-wider">
                      {lang === 'es' ? '✦ Mejoras Opcionales Disponibles (No incluidas en la cotización)' : '✦ Available Optional Upgrades (Not included in quotation)'}
                    </strong>
                    <span className="text-[10px] text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded font-mono">
                      {lang === 'es' ? 'Precios de referencia' : 'Reference rates'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {lang === 'es'
                      ? 'Las siguientes opciones pueden ser añadidas a solicitud. No forman parte del total de esta cotización hasta ser confirmadas:'
                      : 'The following optional upgrades may be requested prior to departure. They are not included in this quotation total until confirmed:'}
                  </p>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-xs text-slate-700">
                    {availableUpgrades.map((upg, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-[#f8fbff] p-2.5 rounded border border-[#bae6fd]/60">
                        <span className="text-sky-600 font-bold shrink-0 mt-0.5">•</span>
                        <span className="leading-relaxed">{lang === 'es' ? upg.es : upg.en}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* SECTION D: IMPORTANT TRAVEL INFORMATION (Champagne / Ivory Palette) */}
          <div className="bg-[#faf8f5] p-6 rounded-lg border border-[#c8ac75]/50 space-y-4">
            <div className="border-b border-[#c8ac75]/30 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-serif font-bold text-[#0e3b2f] uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#c8ac75]" />
                <span>{lang === 'es' ? 'D. INFORMACIÓN IMPORTANTE DEL VIAJE' : 'D. IMPORTANT TRAVEL INFORMATION'}</span>
              </h3>
              <span className="text-[11px] font-mono text-[#0e3b2f] bg-[#f5eedd] px-2 py-0.5 rounded border border-[#c8ac75]/50 self-start sm:self-auto">
                {lang === 'es' ? 'Guía del Viajero Guna Yala' : 'Guna Yala Traveler Guide'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#2d3a45]">
              {/* Card 1: Pickup & Departure Schedule */}
              <div className="bg-white p-4 rounded border border-[#e5dec9] space-y-1.5 shadow-2xs">
                <strong className="block text-[#0e3b2f] font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#c8ac75]" />
                  <span>{lang === 'es' ? '1. Horarios de Recogida y Retorno' : '1. Pickup & Return Schedule'}</span>
                </strong>
                <p className="leading-relaxed text-[#4a5568]">
                  {getDepartureScheduleText()}
                </p>
              </div>

              {/* Card 2: Passport & Border Checkpoint */}
              <div className="bg-white p-4 rounded border border-[#e5dec9] space-y-1.5 shadow-2xs">
                <strong className="block text-[#0e3b2f] font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#c8ac75]" />
                  <span>{lang === 'es' ? '2. Pasaporte Original Obligatorio' : '2. Original Passport Required'}</span>
                </strong>
                <p className="leading-relaxed text-[#4a5568]">
                  {lang === 'es'
                    ? 'Todos los viajeros deben portar su pasaporte físico original (o cédula panameña para nacionales/residentes) para pasar el puesto de control fronterizo del Congreso General Guna. No se aceptan fotocopias ni fotografías en el teléfono celular.'
                    : 'Every traveler must carry their original physical passport (or Panamanian cédula for nationals/residents) at the Guna General Congress border checkpoint. Digital copies and mobile phone photos are strictly not accepted.'}
                </p>
              </div>

              {/* Card 3: Cash Currency in Small Bills */}
              <div className="bg-white p-4 rounded border border-[#e5dec9] space-y-1.5 shadow-2xs">
                <strong className="block text-[#0e3b2f] font-semibold flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-[#c8ac75]" />
                  <span>{lang === 'es' ? '3. Moneda y Efectivo en Billetes Pequeños' : '3. Cash Only & Small Denominations'}</span>
                </strong>
                <p className="leading-relaxed text-[#4a5568]">
                  {lang === 'es'
                    ? 'En todo el archipiélago de Guna Yala no existen cajeros automáticos (ATM) ni terminales de tarjeta de crédito. Por favor traiga suficiente efectivo en denominaciones pequeñas ($1, $5, $10, $20) para tasas territoriales, bebidas, artesanías tradicionales (molas) y propinas.'
                    : 'There are no ATMs or credit card terminals anywhere in Guna Yala. Please carry cash in small denominations ($1, $5, $10, $20) for checkpoint entrance fees, drinks, traditional mola artisan crafts, and personal expenses.'}
                </p>
              </div>

              {/* Card 4: Luggage & Sea Conditions */}
              <div className="bg-white p-4 rounded border border-[#e5dec9] space-y-1.5 shadow-2xs">
                <strong className="block text-[#0e3b2f] font-semibold flex items-center gap-1.5">
                  <Anchor className="w-3.5 h-3.5 text-[#c8ac75]" />
                  <span>{lang === 'es' ? '4. Equipaje y Condiciones Marítimas' : '4. Luggage Limit & Weather Advisory'}</span>
                </strong>
                <p className="leading-relaxed text-[#4a5568]">
                  {lang === 'es'
                    ? 'Recomendamos 1 bolso o mochila mediana de tela suave por persona debido a la capacidad de carga en los vehículos 4x4 y lanchas. Las excursiones de snorkel y visitas a piscinas naturales operan sujetas a condiciones de viento, marea y seguridad marítima.'
                    : 'We recommend 1 medium soft-sided duffle bag or backpack per traveler due to cargo space in 4x4s and island boats. Snorkeling excursions and sandbar visits operate subject to wind, tide, and maritime safety conditions.'}
                </p>
              </div>
            </div>
          </div>

          {/* Attached Photos Gallery — Only Petra-Confirmed Authentic Photos */}
          {verifiedPhotos.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-[#ebdcb8] print:break-inside-avoid">
              <h3 className="text-sm font-serif font-bold text-[#0e3b2f] uppercase tracking-wider flex items-center gap-2">
                <Anchor className="w-4 h-4 text-[#c9a96e]" />
                <span>Destination Visual Showcase</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {verifiedPhotos.map((photo) => {
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

            {quotation.termsStatus !== 'Approved by Petra' && (
              <p className="text-[11px] text-amber-800 italic bg-amber-50 p-2.5 rounded border border-amber-200">
                {lang === 'es'
                  ? 'Nota: Estos términos son un borrador informativo para revisión previa. La confirmación formal de la reserva estará sujeta a la aprobación de términos y condiciones definitivos por parte de Petra.'
                  : 'Note: These booking terms are an informational draft for preliminary review. Formal reservation confirmation remains subject to definitive terms approved by Petra.'}
              </p>
            )}

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

          {/* Professional Closing */}
          <div className="p-6 bg-[#FAF8F5] border border-[#C8AC75]/30 rounded-lg text-center space-y-2 print:break-inside-avoid">
            <h4 className="font-serif text-base font-medium text-[#0E3B2F]">
              {lang === 'es' ? 'Esperamos darte la bienvenida a Guna Yala.' : 'We look forward to welcoming you to Guna Yala.'}
            </h4>
            <p className="text-xs text-[#687785] italic font-serif">
              {lang === 'es' ? 'Tu viaje al corazón del Caribe Guna comienza aquí.' : 'Your journey into the heart of the Guna Caribbean begins here.'}
            </p>
          </div>

          {/* Sign-off Footer */}
          <div className="pt-6 border-t border-[#e5dec9] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#687785] text-center sm:text-left print:break-inside-avoid">
            <div>
              <p className="font-serif font-semibold text-[#0e3b2f]">Guna Yala Panama Travel</p>
            </div>
            <div className="text-[11px] font-mono">
              Quotation Ref: <span className="font-bold text-[#0e3b2f]">{quotation.reference}</span>
              {quotation.termsStatus !== 'Approved by Petra' && (
                <span className="text-amber-800 font-semibold ml-2">
                  {lang === 'es' ? '[BORRADOR INFORMATIVO]' : '[INFORMATIONAL DRAFT]'}
                </span>
              )}
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

      {/* Create Revision Confirmation Modal */}
      {isRevisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-[#e5dec9] space-y-4 text-left">
            <div className="flex items-center gap-3 text-[#0e3b2f]">
              <GitBranch className="w-6 h-6 text-[#c9a96e] shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-[#1c242c]">
                  Create Proposal Revision
                </h3>
                <p className="text-xs text-[#52606d]">
                  Generate a separate, persistent revision record for this proposal.
                </p>
              </div>
            </div>

            <div className="bg-[#faf8f5] p-3 rounded border border-[#e0d6c1] text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-[#687785]">Base Reference:</span>
                <span className="font-mono font-semibold text-[#1c242c]">{quotation.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#687785]">New Revision Reference:</span>
                <span className="font-mono font-bold text-[#0e3b2f] text-sm">
                  {generateNextRevisionReference(quotation, allQuotations || []).nextReference}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#687785]">Customer:</span>
                <span className="font-semibold text-[#1c242c]">{quotation.customerName || 'Unnamed Customer'}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#1c242c]">
                Revision Note / Summary of Changes (Optional)
              </label>
              <textarea
                value={revisionNoteInput}
                onChange={(e) => setRevisionNoteInput(e.target.value)}
                placeholder="e.g. Switched to private 4x4, upgraded cabaña to beachfront, and added Cayos Limón excursion."
                rows={3}
                className="w-full px-3 py-2 text-xs border border-[#cfc7b2] rounded focus:outline-none focus:ring-1 focus:ring-[#0e3b2f] focus:border-[#0e3b2f] bg-white text-[#1c242c]"
              />
            </div>

            <p className="text-[11px] text-[#687785] leading-relaxed">
              The original proposal (<strong className="font-mono">{quotation.reference}</strong>) will remain completely unchanged in Supabase.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmittingRevision}
                onClick={() => setIsRevisionModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#52606d] hover:bg-[#f0eae0] rounded transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingRevision}
                onClick={async () => {
                  if (onCreateRevision) {
                    setIsSubmittingRevision(true);
                    try {
                      await onCreateRevision(quotation, revisionNoteInput.trim());
                      setIsRevisionModalOpen(false);
                    } catch (err: any) {
                      console.error('Revision creation error:', err);
                    } finally {
                      setIsSubmittingRevision(false);
                    }
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#0e3b2f] hover:bg-[#155243] disabled:opacity-50 text-white rounded transition-colors shadow-sm cursor-pointer"
              >
                {isSubmittingRevision ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c9a96e]" />
                ) : (
                  <GitBranch className="w-3.5 h-3.5 text-[#c9a96e]" />
                )}
                <span>
                  {isSubmittingRevision
                    ? 'Creating…'
                    : `Confirm Create Revision ${generateNextRevisionReference(quotation, allQuotations || []).nextReference}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
