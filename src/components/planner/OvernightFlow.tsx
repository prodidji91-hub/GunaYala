import React, { useState, useEffect, useRef } from 'react';
import { Language, Experience } from '../../types';
import { EXPERIENCES_DATA } from '../../data/experiences';
import { VisualAsset } from '../../pictures';
import { bookingRequestService } from '../../services/bookingRequestService';
import {
  OVERNIGHT_PACKAGES,
  OvernightSelectablePackage,
  findOvernightPackageBySelection,
  resolveOvernightPackage,
  resolveAccommodationOption,
  buildOvernightBookingRequestPayload,
  buildOvernightWhatsappText,
  validateOvernightInquiry,
  computeOvernightDraftFingerprint,
  getPanamaTodayDateISO,
} from '../../utils/overnightBooking';
import {
  Moon,
  Home,
  Check,
  Send,
  MessageCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Info,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface OvernightFlowProps {
  currentLang: Language;
  onBackToSelector: () => void;
  onOpenDetailsModal?: (exp: Experience) => void;
  initialExperienceId?: string;
}

export const OvernightFlow: React.FC<OvernightFlowProps> = ({
  currentLang,
  onBackToSelector,
  onOpenDetailsModal,
  initialExperienceId,
}) => {
  const isEs = currentLang === 'es';

  const initialMatchedPackage = findOvernightPackageBySelection(initialExperienceId);
  const initialPkg = initialMatchedPackage || OVERNIGHT_PACKAGES[0];

  const [step, setStep] = useState<'browse' | 'inquire' | 'submitted'>(
    initialMatchedPackage ? 'inquire' : 'browse'
  );
  const [selectedPackageId, setSelectedPackageId] = useState<string>(initialPkg.id);
  const [selectedAccommodationId, setSelectedAccommodationId] = useState<string>(
    resolveAccommodationOption(initialPkg.id, null).id
  );

  // Sync selection whenever the modal/planner is reopened with a specific island or experience ID
  useEffect(() => {
    const matched = findOvernightPackageBySelection(initialExperienceId);
    if (matched) {
      setSelectedPackageId(matched.id);
      setSelectedAccommodationId(resolveAccommodationOption(matched.id, null).id);
      setStep('inquire');
    } else if (initialExperienceId === undefined) {
      setStep('browse');
    }
    setFormErrors({});
    setSubmitError(null);
  }, [initialExperienceId]);

  const selectedPackage: OvernightSelectablePackage = resolveOvernightPackage(selectedPackageId);
  const validAccommodationOptions = selectedPackage.accommodationOptions;
  const selectedAccommodation = resolveAccommodationOption(
    selectedPackage.id,
    selectedAccommodationId
  );

  // Inquiry Form State
  const [nights, setNights] = useState<'1' | '2' | '3+'>('1');
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);
  const [targetDate, setTargetDate] = useState<string>('');
  const [dateFlexibility, setDateFlexibility] = useState<'exact' | 'flexible'>('flexible');
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [assignedBookingRef, setAssignedBookingRef] = useState<string>('');

  // Synchronous mutex & per-fingerprint idempotency key store
  const submittingRef = useRef<boolean>(false);
  const idempotencyKeyMapRef = useRef<Map<string, string>>(new Map());
  const errorBannerRef = useRef<HTMLDivElement | null>(null);
  const submittedRef = useRef<HTMLDivElement | null>(null);
  const minTodayDate = getPanamaTodayDateISO();

  const scrollErrorIntoView = () => {
    requestAnimationFrame(() => {
      errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const getIdempotencyKeyForDraft = (fingerprint: string): string => {
    const existing = idempotencyKeyMapRef.current.get(fingerprint);
    if (existing) return existing;
    const created = bookingRequestService.generateIdempotencyKey();
    idempotencyKeyMapRef.current.set(fingerprint, created);
    return created;
  };

  const handleSelectPackage = (pkg: OvernightSelectablePackage) => {
    setSelectedPackageId(pkg.id);
    setSelectedAccommodationId(resolveAccommodationOption(pkg.id, null).id);
    setFormErrors({});
    setSubmitError(null);
    setStep('inquire');
  };

  const clearFieldError = (field: string) => {
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (submitError) {
      setSubmitError(null);
    }
  };

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent rapid double-taps before React state re-renders
    if (submittingRef.current || isSubmitting) {
      return;
    }

    const validation = validateOvernightInquiry({
      fullName,
      email,
      phone,
      targetDate,
      adults,
      children,
      termsAccepted,
      customerLanguage: currentLang,
    });

    if (!validation.valid) {
      setFormErrors(validation.fieldErrors);
      setSubmitError(
        validation.summaryError ||
          (isEs
            ? 'Por favor revise los campos obligatorios antes de enviar.'
            : 'Please complete all required fields before submitting.')
      );
      scrollErrorIntoView();
      return;
    }

    setFormErrors({});
    setSubmitError(null);
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const fingerprint = computeOvernightDraftFingerprint({
        packageId: selectedPackage.id,
        customerName: fullName,
        customerEmail: email,
        customerPhone: phone,
        targetDate,
        nights,
        adults,
        children,
        selectedAccommodationId: selectedAccommodation.id,
        specialNotes: notes,
        termsAccepted: true,
        customerLanguage: currentLang,
      });

      const requestIdempotencyKey = getIdempotencyKeyForDraft(fingerprint);

      const payload = buildOvernightBookingRequestPayload({
        idempotencyKey: requestIdempotencyKey,
        packageId: selectedPackage.id,
        customerName: fullName,
        customerEmail: email,
        customerPhone: phone,
        targetDate,
        nights,
        adults,
        children,
        selectedAccommodationId: selectedAccommodation.id,
        specialNotes: notes,
        termsAccepted: true,
        customerLanguage: currentLang,
      });

      const result = await bookingRequestService.submitBookingRequest(payload);

      if (result.success && result.bookingReference) {
        setAssignedBookingRef(result.bookingReference);
        setStep('submitted');
        requestAnimationFrame(() => {
          submittedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      } else {
        setSubmitError(
          result.error ||
            result.message ||
            (isEs
              ? 'No pudimos completar su solicitud. Por favor intente nuevamente o contáctenos por WhatsApp.'
              : 'Unable to submit your booking request. Please try again or contact Petra via WhatsApp.')
        );
        scrollErrorIntoView();
      }
    } catch (err: any) {
      console.error('[OvernightFlow Error] Submission failed:', err);
      setSubmitError(
        err?.message ||
          (isEs
            ? 'Error de conexión al procesar su solicitud. Por favor intente nuevamente.'
            : 'Connection error while submitting your booking request. Please try again.')
      );
      scrollErrorIntoView();
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const getWhatsappText = () =>
    buildOvernightWhatsappText({
      packageId: selectedPackage.id,
      customerLanguage: currentLang,
      targetDate,
      adults,
      children,
      nights,
      selectedAccommodationId: selectedAccommodation.id,
      specialNotes: notes,
    });

  return (
    <div className="w-full max-w-4xl mx-auto px-3.5 sm:px-6 py-4 sm:py-8">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-[#e5dccb]">
        <button
          type="button"
          onClick={step === 'browse' ? onBackToSelector : () => setStep('browse')}
          className="inline-flex items-center gap-1.5 min-h-[44px] text-xs font-medium text-[#475569] hover:text-[#06121e] uppercase tracking-[0.14em] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>
            {step === 'browse'
              ? isEs
                ? 'Volver a Opciones'
                : 'Back to Options'
              : isEs
              ? 'Explorar Estadías'
              : 'Browse Experiences'}
          </span>
        </button>

        <div className="text-right">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#1e3a5f]">
            {isEs ? 'Planificación Personalizada' : 'Personalized Planning'}
          </div>
          <div className="text-xs text-[#64748b]">
            {isEs ? 'Atención Directa con Petra' : 'Direct Support with Petra'}
          </div>
        </div>
      </div>

      {/* ========================================================
          PHASE 1: BROWSE OVERNIGHT EXPERIENCES (ALL 7 ISLANDS + EXPEDITIONS)
         ======================================================== */}
      {step === 'browse' && (
        <div className="space-y-8 animate-fadeIn">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] text-[11px] font-mono uppercase tracking-[0.2em] mb-3">
              <Moon className="w-3.5 h-3.5" />
              <span>{isEs ? 'Estadías con Noche en Isla' : 'Island Overnight Stays'}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-display font-light text-[#06121e]">
              {isEs ? 'Duerma Bajo las Estrellas del Caribe' : 'Sleep Under the Caribbean Stars'}
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-[#475569] font-light max-w-xl mx-auto leading-relaxed">
              {isEs
                ? 'Las estadías nocturnas requieren coordinación directa para verificar la disponibilidad de cabañas rústicas de madera con las familias locales. No utilizamos cobro automático.'
                : 'Overnight stays involve personal coordination with local island families to secure authentic beachfront cabanas and boat schedules. We do not use automatic checkout here.'}
            </p>
          </div>

          {/* Overnight Experiences Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {OVERNIGHT_PACKAGES.map((pkg) => {
              const isSelected = selectedPackage.id === pkg.id;
              const matchingDetailExp =
                pkg.kind === 'expedition' || pkg.id === 'chichime-grande'
                  ? EXPERIENCES_DATA.find((e) => e.id === pkg.experienceModalId)
                  : undefined;

              return (
                <div
                  key={pkg.id}
                  data-overnight-id={pkg.id}
                  className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-lg ${
                    isSelected ? 'border-[#1e3a5f] ring-2 ring-[#1e3a5f]/20' : 'border-[#e2d8c5]'
                  }`}
                >
                  <div>
                    <div className="relative aspect-[16/10] bg-[#e8e2d5]">
                      {pkg.image ? (
                        <img
                          src={pkg.image}
                          alt={pkg.title[currentLang]}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <VisualAsset
                          variant={pkg.imageType || 'multi-day'}
                          alt={pkg.title[currentLang]}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute top-3 left-3 max-w-[calc(100%-1.5rem)] truncate bg-[#06121e]/85 backdrop-blur-md text-white text-[10px] font-mono uppercase tracking-[0.16em] px-3 py-1 rounded-full border border-white/15">
                        {pkg.firstNightRate[currentLang]}
                      </div>
                    </div>

                    <div className="p-5 sm:p-6">
                      <h4 className="text-xl font-display font-medium text-[#06121e] mb-2">
                        {pkg.title[currentLang]}
                      </h4>
                      <p className="text-xs sm:text-sm text-[#475569] font-light leading-relaxed mb-4">
                        {pkg.subtitle[currentLang]}
                      </p>

                      <div className="space-y-1.5 text-xs text-[#334155] font-light mb-4">
                        {pkg.highlights[currentLang].slice(0, 3).map((hl, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-[#1e3a5f] font-bold">✓</span>
                            <span>{hl}</span>
                          </div>
                        ))}
                      </div>

                      <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] text-xs text-[#475569] flex items-start gap-2 mb-4">
                        <Home className="w-4 h-4 text-[#1e3a5f] shrink-0 mt-0.5" />
                        <span>{pkg.accommodationSummary[currentLang]}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 pt-0 flex flex-wrap items-center gap-3">
                    {onOpenDetailsModal && matchingDetailExp && (
                      <button
                        type="button"
                        onClick={() => onOpenDetailsModal(matchingDetailExp)}
                        className="py-2.5 px-4 min-h-[44px] text-xs font-medium uppercase tracking-[0.14em] text-[#06121e] bg-[#faf8f5] hover:bg-[#ede5d6] rounded-xl border border-[#e2d8c5] transition-colors cursor-pointer"
                      >
                        {isEs ? 'Ver Detalles' : 'View Details'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSelectPackage(pkg)}
                      className="flex-1 min-h-[44px] py-3 px-4 rounded-xl bg-[#06121e] hover:bg-[#1e3a5f] text-white text-xs uppercase tracking-[0.16em] font-medium transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      <span>{isEs ? 'Planear con Petra' : 'Inquire with Petra'}</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================
          PHASE 2: INQUIRY FORM FOR SELECTED OVERNIGHT STAY
         ======================================================== */}
      {step === 'inquire' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Selected Island / Experience Summary Banner */}
          <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-[#e2d8c5] p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-full sm:w-32 h-36 sm:h-24 rounded-2xl overflow-hidden bg-[#e8e2d5] shrink-0">
              {selectedPackage.image ? (
                <img
                  src={selectedPackage.image}
                  alt={selectedPackage.title[currentLang]}
                  className="w-full h-full object-cover"
                />
              ) : (
                <VisualAsset
                  variant={selectedPackage.imageType || 'multi-day'}
                  alt={selectedPackage.title[currentLang]}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#1e3a5f]">
                  {isEs ? 'Experiencia Elegida' : 'Selected Experience'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#faf8f5] border border-[#e2d8c5] text-[10px] font-mono text-[#06121e]">
                  <Sparkles className="w-3 h-3 text-[#55B8B3]" />
                  <span>{selectedPackage.firstNightRate[currentLang]}</span>
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-medium text-[#06121e] leading-snug">
                {selectedPackage.title[currentLang]}
              </h3>
              <p className="text-xs text-[#475569] font-light leading-relaxed line-clamp-3">
                {selectedPackage.description[currentLang]}
              </p>
              {!selectedPackage.isPriceOnRequest && (
                <div className="text-[11px] font-mono text-[#64748b]">
                  {selectedPackage.additionalNightRate[currentLang]}
                </div>
              )}
            </div>
          </div>

          <form
            onSubmit={handleSubmitInquiry}
            noValidate
            className="bg-white p-4 sm:p-8 rounded-3xl border border-[#e2d8c5] shadow-sm max-w-2xl mx-auto space-y-6"
          >
            {/* Nights Duration Selection */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-2">
                {isEs ? 'Duración de la Estadía' : 'Length of Stay'}
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[
                  { id: '1', label: isEs ? '1 Noche' : '1 Night', sub: isEs ? '2 días' : '2 days' },
                  { id: '2', label: isEs ? '2 Noches' : '2 Nights', sub: isEs ? '3 días' : '3 days' },
                  { id: '3+', label: isEs ? '3+ Noches' : '3+ Nights', sub: isEs ? 'A medida' : 'Extended' },
                ].map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setNights(n.id as '1' | '2' | '3+')}
                    className={`p-2.5 sm:p-3 min-h-[52px] rounded-2xl border text-center transition-all cursor-pointer ${
                      nights === n.id
                        ? 'bg-[#06121e] text-white border-[#06121e] shadow-sm'
                        : 'bg-[#faf8f5] border-[#e2d8c5] text-[#334155] hover:border-[#1e3a5f]'
                    }`}
                  >
                    <span className="block text-xs sm:text-sm font-semibold">{n.label}</span>
                    <span className="block text-[10px] opacity-75 font-mono">{n.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dates & Flexibility */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="min-w-0">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-1.5">
                  {isEs ? 'Fecha Deseada' : 'Target Travel Date'}
                </label>
                <input
                  type="date"
                  min={minTodayDate}
                  value={targetDate}
                  onChange={(e) => {
                    setTargetDate(e.target.value);
                    clearFieldError('targetDate');
                  }}
                  className={`w-full min-w-0 appearance-none px-4 py-3 text-base sm:text-sm rounded-xl border ${
                    formErrors.targetDate
                      ? 'border-red-400 bg-red-50/30'
                      : 'border-[#cbd5e1] bg-[#faf8f5]'
                  } focus:outline-none focus:border-[#1e3a5f]`}
                />
                {formErrors.targetDate && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.targetDate}</p>
                )}
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-1.5">
                  {isEs ? 'Flexibilidad de Fechas' : 'Date Flexibility'}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDateFlexibility('flexible')}
                    className={`flex-1 min-h-[44px] py-2.5 px-2 text-xs rounded-xl border transition-all cursor-pointer ${
                      dateFlexibility === 'flexible'
                        ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                        : 'bg-[#faf8f5] border-[#cbd5e1] text-[#475569]'
                    }`}
                  >
                    {isEs ? 'Flexible (±2 días)' : 'Flexible (±2 days)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFlexibility('exact')}
                    className={`flex-1 min-h-[44px] py-2.5 px-2 text-xs rounded-xl border transition-all cursor-pointer ${
                      dateFlexibility === 'exact'
                        ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                        : 'bg-[#faf8f5] border-[#cbd5e1] text-[#475569]'
                    }`}
                  >
                    {isEs ? 'Fecha Exacta' : 'Exact Date'}
                  </button>
                </div>
              </div>
            </div>

            {/* Number of Travelers */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-2">
                {isEs ? 'Número de Viajeros' : 'Number of Travelers'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="p-3 bg-[#faf8f5] rounded-xl border border-[#e2d8c5] flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-[#475569] font-medium">
                    {isEs ? 'Adultos (12+)' : 'Adults (12+)'}
                  </span>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setAdults((prev) => Math.max(1, prev - 1))}
                      className="w-9 h-9 rounded-full bg-white border border-[#cbd5e1] flex items-center justify-center font-bold text-base cursor-pointer"
                      aria-label={isEs ? 'Reducir adultos' : 'Decrease adults'}
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-sm">{adults}</span>
                    <button
                      type="button"
                      onClick={() => setAdults((prev) => prev + 1)}
                      className="w-9 h-9 rounded-full bg-white border border-[#cbd5e1] flex items-center justify-center font-bold text-base cursor-pointer"
                      aria-label={isEs ? 'Aumentar adultos' : 'Increase adults'}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-[#faf8f5] rounded-xl border border-[#e2d8c5] flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-[#475569] font-medium">
                    {isEs ? 'Niños' : 'Children'}
                  </span>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setChildren((prev) => Math.max(0, prev - 1))}
                      className="w-9 h-9 rounded-full bg-white border border-[#cbd5e1] flex items-center justify-center font-bold text-base cursor-pointer"
                      aria-label={isEs ? 'Reducir niños' : 'Decrease children'}
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-bold text-sm">{children}</span>
                    <button
                      type="button"
                      onClick={() => setChildren((prev) => prev + 1)}
                      className="w-9 h-9 rounded-full bg-white border border-[#cbd5e1] flex items-center justify-center font-bold text-base cursor-pointer"
                      aria-label={isEs ? 'Aumentar niños' : 'Increase children'}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Island-Specific Valid Accommodation Options */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-2">
                {validAccommodationOptions.length === 1
                  ? isEs
                    ? `Alojamiento en ${selectedPackage.name}`
                    : `Included Accommodation for ${selectedPackage.name}`
                  : isEs
                  ? 'Preferencia de Alojamiento'
                  : 'Accommodation Preference'}
              </label>
              <div
                className={`grid gap-2.5 ${
                  validAccommodationOptions.length === 1
                    ? 'grid-cols-1'
                    : 'grid-cols-1 sm:grid-cols-2'
                }`}
              >
                {validAccommodationOptions.map((option) => {
                  const isOptionSelected = selectedAccommodation.id === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedAccommodationId(option.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-start justify-between gap-3 cursor-pointer ${
                        isOptionSelected
                          ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-xs'
                          : 'bg-[#faf8f5] border-[#e2d8c5] text-[#334155] hover:border-[#1e3a5f]'
                      }`}
                    >
                      <div>
                        <span className="block text-xs sm:text-sm font-semibold">
                          {option.label[currentLang]}
                        </span>
                        <span className="block text-[11px] opacity-80 font-mono mt-0.5">
                          {option.sub[currentLang]}
                        </span>
                      </div>
                      {isOptionSelected && <Check className="w-4 h-4 shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4 pt-2 border-t border-[#f1f5f9]">
              <h5 className="text-xs font-mono uppercase tracking-wider text-[#06121e] font-semibold">
                {isEs ? 'Información de Contacto' : 'Contact Information'}
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <input
                    type="text"
                    placeholder={isEs ? 'Su Nombre Completo *' : 'Your Full Name *'}
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      clearFieldError('fullName');
                    }}
                    className={`w-full px-4 py-3 text-base sm:text-sm rounded-xl border ${
                      formErrors.fullName
                        ? 'border-red-400 bg-red-50/30'
                        : 'border-[#cbd5e1] bg-[#faf8f5]'
                    } focus:outline-none focus:border-[#1e3a5f]`}
                  />
                  {formErrors.fullName && (
                    <p className="text-xs text-red-600 mt-1">{formErrors.fullName}</p>
                  )}
                </div>

                <div>
                  <input
                    type="email"
                    placeholder={isEs ? 'Correo Electrónico *' : 'Email Address *'}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldError('email');
                    }}
                    className={`w-full px-4 py-3 text-base sm:text-sm rounded-xl border ${
                      formErrors.email
                        ? 'border-red-400 bg-red-50/30'
                        : 'border-[#cbd5e1] bg-[#faf8f5]'
                    } focus:outline-none focus:border-[#1e3a5f]`}
                  />
                  {formErrors.email && (
                    <p className="text-xs text-red-600 mt-1">{formErrors.email}</p>
                  )}
                </div>
              </div>

              <div>
                <input
                  type="tel"
                  placeholder={isEs ? 'WhatsApp / Teléfono Móvil *' : 'WhatsApp / Mobile Phone *'}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    clearFieldError('phone');
                  }}
                  className={`w-full px-4 py-3 text-base sm:text-sm rounded-xl border ${
                    formErrors.phone
                      ? 'border-red-400 bg-red-50/30'
                      : 'border-[#cbd5e1] bg-[#faf8f5]'
                  } focus:outline-none focus:border-[#1e3a5f]`}
                />
                {formErrors.phone && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.phone}</p>
                )}
              </div>

              <div>
                <textarea
                  rows={2}
                  placeholder={
                    isEs
                      ? 'Preguntas para Petra o requerimientos dietéticos (opcional)...'
                      : 'Questions for Petra or dietary requests (optional)...'
                  }
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 text-base sm:text-sm rounded-xl border border-[#cbd5e1] bg-[#faf8f5] focus:outline-none focus:border-[#1e3a5f]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4 pt-2">
              <div>
                <div
                  className={`flex items-start gap-2.5 p-3.5 rounded-xl text-xs text-[#334155] border ${
                    formErrors.termsAccepted
                      ? 'bg-red-50/40 border-red-400'
                      : 'bg-[#FAF8F5] border-[#E2D8C5]'
                  }`}
                >
                  <input
                    type="checkbox"
                    id="overnight-terms-chk"
                    checked={termsAccepted}
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked);
                      clearFieldError('termsAccepted');
                    }}
                    className="mt-0.5 rounded border-[#C8AC75] text-[#061815] focus:ring-[#061815]"
                  />
                  <label htmlFor="overnight-terms-chk" className="cursor-pointer select-none leading-relaxed">
                    {isEs ? (
                      <>
                        He leído y acepto los{' '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            window.history.pushState({}, '', '/terms-and-conditions/overnight');
                            window.dispatchEvent(new Event('popstate'));
                          }}
                          className="text-[#061815] font-semibold underline hover:text-[#C8AC75]"
                        >
                          Términos y condiciones
                        </button>{' '}
                        aplicables a mi solicitud de reserva.
                      </>
                    ) : (
                      <>
                        I have read and agree to the{' '}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            window.history.pushState({}, '', '/terms-and-conditions/overnight');
                            window.dispatchEvent(new Event('popstate'));
                          }}
                          className="text-[#061815] font-semibold underline hover:text-[#C8AC75]"
                        >
                          Terms & Conditions
                        </button>{' '}
                        applicable to my booking request.
                      </>
                    )}
                  </label>
                </div>
                {formErrors.termsAccepted && (
                  <p className="text-xs text-red-600 mt-1">{formErrors.termsAccepted}</p>
                )}
              </div>

              {/* Explicit Pre-Submission Notice */}
              <div className="p-3.5 bg-[#FEFCE8] border border-[#FEF08A] rounded-xl text-xs text-[#854D0E] flex items-start gap-2.5">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#A16207]" />
                <span className="leading-relaxed">
                  {isEs
                    ? 'Su reserva aún no está confirmada. Verificaremos la disponibilidad con la isla y nos pondremos en contacto con usted para indicarle los siguientes pasos y detalles de pago.'
                    : 'Your reservation is not yet confirmed. We will check availability with the island and contact you with the next steps and payment details.'}
                </span>
              </div>

              {/* Inline Submission / Validation Error Banner */}
              {submitError && (
                <div
                  ref={errorBannerRef}
                  role="alert"
                  className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-1"
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>
                      {isEs ? 'No se pudo enviar la solicitud' : 'Unable to Submit Request'}
                    </span>
                  </div>
                  <p className="leading-relaxed">{submitError}</p>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setStep('browse')}
                  className="min-h-[44px] text-xs font-medium uppercase tracking-[0.14em] text-[#64748b] hover:text-[#06121e] cursor-pointer"
                >
                  {isEs ? 'Cambiar Experiencia' : 'Change Experience'}
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full sm:w-auto min-h-[48px] py-3.5 px-8 rounded-xl text-xs uppercase tracking-[0.16em] font-medium transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer ${
                    isSubmitting
                      ? 'bg-[#334155] text-white cursor-wait'
                      : termsAccepted
                      ? 'bg-[#06121e] hover:bg-[#1e3a5f] text-white'
                      : 'bg-[#1e293b]/70 hover:bg-[#06121e] text-white'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>{isEs ? 'Enviando Solicitud...' : 'Submitting Request...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{isEs ? 'Enviar solicitud de reserva' : 'Submit Booking Request'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          PHASE 3: INQUIRY SUBMITTED STATE
         ======================================================== */}
      {step === 'submitted' && (
        <div ref={submittedRef} className="space-y-6 text-center max-w-xl mx-auto py-8 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8" />
          </div>

          <h3 className="text-2xl sm:text-3xl font-display font-light text-[#06121e]">
            {isEs ? 'Solicitud de Reserva Recibida' : 'Booking Request Received'}
          </h3>

          {assignedBookingRef && (
            <div className="inline-block bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A] px-4 py-1.5 rounded-full font-mono font-bold text-sm tracking-wider shadow-xs">
              {isEs ? 'Código de Referencia:' : 'Booking Reference:'} {assignedBookingRef}
            </div>
          )}

          <p className="text-sm text-[#475569] font-light leading-relaxed">
            {isEs
              ? `¡Gracias, ${fullName}! Hemos recibido su solicitud de reserva. Su reserva aún no está confirmada. Verificaremos la disponibilidad de cabañas en ${selectedPackage.title.es} y nos pondremos en contacto con usted con los siguientes pasos.`
              : `Thank you, ${fullName}! Your booking request has been received. Your reservation is not yet confirmed. We will check availability with local island hosts for ${selectedPackage.title.en} and contact you with the next steps.`}
          </p>

          <div className="p-5 bg-white rounded-2xl border border-[#e2d8c5] text-left text-xs space-y-2">
            <div className="font-semibold text-[#06121e] border-b border-[#f1f5f9] pb-2 flex justify-between items-center">
              <span>{isEs ? 'Resumen de su Solicitud:' : 'Summary of Your Request:'}</span>
              {assignedBookingRef && (
                <span className="font-mono text-[11px] text-[#0e7490]">{assignedBookingRef}</span>
              )}
            </div>
            <div>
              <span className="text-[#64748b]">{isEs ? 'Experiencia:' : 'Experience:'}</span>{' '}
              {selectedPackage.title[currentLang]}
            </div>
            <div>
              <span className="text-[#64748b]">{isEs ? 'Alojamiento:' : 'Accommodation:'}</span>{' '}
              {selectedAccommodation.label[currentLang]}
            </div>
            <div>
              <span className="text-[#64748b]">{isEs ? 'Noches:' : 'Duration:'}</span> {nights}{' '}
              {isEs ? 'Noches' : 'Nights'}
            </div>
            <div>
              <span className="text-[#64748b]">{isEs ? 'Viajeros:' : 'Travelers:'}</span>{' '}
              {adults + children} ({adults} {isEs ? 'Adultos' : 'Adults'}, {children}{' '}
              {isEs ? 'Niños' : 'Children'})
            </div>
            <div>
              <span className="text-[#64748b]">{isEs ? 'Contacto:' : 'Contact:'}</span> {email} ·{' '}
              {phone}
            </div>
          </div>

          {/* Direct WhatsApp Option */}
          <div className="p-5 bg-[#ecfdf5] border border-[#a7f3d0] rounded-2xl text-xs text-[#065f46] space-y-3">
            <p className="font-light">
              {isEs
                ? '¿Desea una respuesta más rápida? También puede abrir esta consulta directamente en WhatsApp con Petra:'
                : 'Prefer immediate communication? You can also send this inquiry directly to Petra via WhatsApp:'}
            </p>
            <a
              href={`https://wa.me/50764443649?text=${getWhatsappText()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] py-2.5 px-6 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-medium shadow-sm transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{isEs ? 'Abrir en WhatsApp con Petra' : 'Chat with Petra on WhatsApp'}</span>
            </a>
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={onBackToSelector}
              className="py-2.5 px-6 min-h-[44px] text-xs uppercase tracking-wider text-[#64748b] hover:text-[#06121e] cursor-pointer"
            >
              {isEs ? 'Volver al Inicio del Planificador' : 'Back to Experience Selection'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
