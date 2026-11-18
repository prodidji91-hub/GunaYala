import React, { useEffect, useRef, useState } from 'react';
import { Language } from '../../types';
import { bookingRequestService } from '../../services/bookingRequestService';
import { getPanamaTodayDateISO } from '../../utils/overnightBooking';
import {
  CHARTER_OPTIONS,
  CharterTypeId,
  buildPrivateCustomBookingRequestPayload,
  buildPrivateCustomWhatsappText,
  computePrivateCustomDraftFingerprint,
  getCharterTitle,
  resolveInitialCharterType,
  validatePrivateCustomInquiry,
} from '../../utils/privateCustomBooking';
import {
  Sparkles,
  Send,
  MessageCircle,
  ArrowLeft,
  Check,
  Loader2,
  Info,
  AlertCircle,
} from 'lucide-react';

interface PrivateCustomFlowProps {
  currentLang: Language;
  onBackToSelector: () => void;
  initialCharterType?: string | null;
}

export const PrivateCustomFlow: React.FC<PrivateCustomFlowProps> = ({
  currentLang,
  onBackToSelector,
  initialCharterType,
}) => {
  const isEs = currentLang === 'es';
  const panamaToday = getPanamaTodayDateISO();

  const [step, setStep] = useState<'form' | 'submitted'>('form');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [assignedBookingRef, setAssignedBookingRef] = useState<string>('');

  const submittingRef = useRef<boolean>(false);
  const idempotencyTrackerRef = useRef<{ fingerprint: string; key: string } | null>(null);
  const errorBannerRef = useRef<HTMLDivElement | null>(null);

  // Form State
  const [charterType, setCharterType] = useState<CharterTypeId>(() =>
    resolveInitialCharterType(initialCharterType)
  );
  const [targetDates, setTargetDates] = useState<string>('');
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);
  const [interests, setInterests] = useState<string[]>(['snorkeling', 'relaxation']);
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (initialCharterType) {
      setCharterType(resolveInitialCharterType(initialCharterType));
    }
  }, [initialCharterType]);

  const interestOptions = [
    { id: 'relaxation', label: isEs ? 'Playas tranquilas & descanso' : 'Quiet beaches & relaxation' },
    { id: 'snorkeling', label: isEs ? 'Snorkel en arrecifes y barcos hundidos' : 'Reef & shipwreck snorkeling' },
    { id: 'culture', label: isEs ? 'Visita cultural a comunidad Guna' : 'Authentic Guna village cultural visit' },
    { id: 'sailing', label: isEs ? 'Navegación a vela en mar abierto' : 'Open-sea sailing & secluded atolls' },
    { id: 'seafood', label: isEs ? 'Almuerzo especial de langosta fresca' : 'Fresh lobster & seafood experience' },
  ];

  const clearFieldError = (key: string) => {
    setFormErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setSubmitError(null);
  };

  const toggleInterest = (id: string) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const scrollErrorIntoView = () => {
    setTimeout(() => {
      errorBannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 30);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;

    const validation = validatePrivateCustomInquiry({
      fullName,
      email,
      phone,
      targetDate: targetDates,
      adults,
      children,
      termsAccepted,
      customerLanguage: currentLang,
      todayISO: getPanamaTodayDateISO(),
    });

    setFormErrors(validation.fieldErrors);
    if (!validation.valid) {
      setSubmitError(validation.summaryError);
      scrollErrorIntoView();
      return;
    }

    const draftWithoutKey = {
      charterType,
      customerName: fullName,
      customerEmail: email,
      customerPhone: phone,
      targetDate: targetDates,
      adults,
      children,
      interests,
      message,
      termsAccepted,
      customerLanguage: currentLang,
    };

    const fingerprint = computePrivateCustomDraftFingerprint(draftWithoutKey);
    if (!idempotencyTrackerRef.current || idempotencyTrackerRef.current.fingerprint !== fingerprint) {
      idempotencyTrackerRef.current = {
        fingerprint,
        key: bookingRequestService.generateIdempotencyKey(),
      };
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = buildPrivateCustomBookingRequestPayload({
        ...draftWithoutKey,
        idempotencyKey: idempotencyTrackerRef.current.key,
      });

      const result = await bookingRequestService.submitBookingRequest(payload);

      if (result.success && result.bookingReference) {
        setAssignedBookingRef(result.bookingReference);
        setStep('submitted');
      } else {
        setSubmitError(
          result.error ||
            (isEs
              ? 'No pudimos enviar la solicitud en este momento. Por favor intente de nuevo o contáctenos por WhatsApp.'
              : 'Error submitting request. Please try again or reach us directly on WhatsApp.')
        );
        scrollErrorIntoView();
      }
    } catch (err: any) {
      console.error('[PrivateCustomFlow Error] Submission failed:', err);
      setSubmitError(
        err?.message ||
          (isEs
            ? 'Error al enviar la solicitud. Intente de nuevo.'
            : 'Error submitting request. Please try again.')
      );
      scrollErrorIntoView();
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const selectedCharterTitle = getCharterTitle(charterType, currentLang);

  const getWhatsappText = () =>
    buildPrivateCustomWhatsappText({
      charterType,
      customerLanguage: currentLang,
      targetDate: targetDates,
      adults,
      children,
      interests,
      message,
    });

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-[#e5dccb]">
        <button
          type="button"
          onClick={onBackToSelector}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#475569] hover:text-[#06121e] uppercase tracking-[0.14em] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isEs ? 'Volver a Opciones' : 'Back to Options'}</span>
        </button>

        <div className="text-right">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#0f766e]">
            {isEs ? 'Servicio Privado Exclusivo' : 'Private Custom Charter'}
          </div>
          <div className="text-xs text-[#64748b]">
            {isEs ? 'Diseño de Itinerario con Petra' : 'Itinerary Design with Petra'}
          </div>
        </div>
      </div>

      {step === 'form' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="text-center max-w-2xl mx-auto mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0f766e]/10 text-[#0f766e] text-[11px] font-mono uppercase tracking-[0.2em] mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isEs ? 'Experiencias a Medida' : 'Bespoke Charters'}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-display font-light text-[#06121e]">
              {isEs ? 'Diseñe su Viaje Privado en Guna Yala' : 'Plan Your Private Guna Yala Experience'}
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] font-light mt-1 max-w-lg mx-auto leading-relaxed">
              {isEs
                ? 'Para grupos privados, familias o veleros exclusivos. Petra estructura su itinerario personalizado y coordina los mejores capitanes y cayos.'
                : 'For private parties, families, or private yachts. Petra designs your custom schedule with trusted Guna captains and remote islands.'}
            </p>
          </div>

          <form
            noValidate
            onSubmit={handleSubmit}
            className="bg-white p-6 sm:p-8 rounded-3xl border border-[#e2d8c5] shadow-sm max-w-2xl mx-auto space-y-6"
          >
            {/* Step 1: What type of experience */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-3">
                {isEs ? '1. ¿Qué tipo de experiencia privada busca?' : '1. What type of private experience are you planning?'}
              </label>
              <div className="space-y-2.5">
                {CHARTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCharterType(opt.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                      charterType === opt.id
                        ? 'bg-[#f0fdfa] border-[#0f766e] ring-1 ring-[#0f766e]'
                        : 'bg-[#faf8f5] border-[#e2d8c5] hover:border-[#0f766e]'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        charterType === opt.id ? 'border-[#0f766e] bg-[#0f766e] text-white' : 'border-[#cbd5e1]'
                      }`}
                    >
                      {charterType === opt.id && <Check className="w-3 h-3" />}
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-[#06121e]">{opt.title[currentLang]}</div>
                      <div className="text-xs text-[#64748b] font-light">{opt.desc[currentLang]}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Dates & Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#f1f5f9]">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-1.5">
                  {isEs ? '2. Fecha Preferida (Opcional)' : '2. Target Travel Date (Optional)'}
                </label>
                <input
                  type="date"
                  min={panamaToday}
                  value={targetDates}
                  onChange={(e) => {
                    setTargetDates(e.target.value);
                    clearFieldError('targetDate');
                  }}
                  className={`w-full px-4 py-2.5 text-sm rounded-xl border ${
                    formErrors.targetDate ? 'border-red-400 bg-red-50/30' : 'border-[#cbd5e1] bg-[#faf8f5]'
                  } focus:outline-none focus:border-[#0f766e]`}
                />
                {formErrors.targetDate ? (
                  <p className="text-xs text-red-600 mt-1">{formErrors.targetDate}</p>
                ) : (
                  <p className="text-[11px] text-[#64748b] mt-1">
                    {isEs ? 'Déjelo vacío si su fecha es flexible.' : 'Leave blank if your travel dates are flexible.'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-1.5">
                  {isEs ? 'Número de Pasajeros' : 'Number of Travelers'}
                </label>
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 p-2 bg-[#faf8f5] rounded-xl border border-[#e2d8c5] flex items-center justify-between text-xs">
                    <span>{isEs ? 'Adultos:' : 'Adults:'}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={isEs ? 'Disminuir adultos' : 'Decrease adults'}
                        onClick={() => {
                          setAdults((p) => Math.max(1, p - 1));
                          clearFieldError('travelers');
                        }}
                        className="w-6 h-6 rounded bg-white border border-[#cbd5e1] cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-bold">{adults}</span>
                      <button
                        type="button"
                        aria-label={isEs ? 'Aumentar adultos' : 'Increase adults'}
                        onClick={() => {
                          setAdults((p) => Math.min(50, p + 1));
                          clearFieldError('travelers');
                        }}
                        className="w-6 h-6 rounded bg-white border border-[#cbd5e1] cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 p-2 bg-[#faf8f5] rounded-xl border border-[#e2d8c5] flex items-center justify-between text-xs">
                    <span>{isEs ? 'Niños:' : 'Kids:'}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={isEs ? 'Disminuir niños' : 'Decrease children'}
                        onClick={() => {
                          setChildren((p) => Math.max(0, p - 1));
                          clearFieldError('travelers');
                        }}
                        className="w-6 h-6 rounded bg-white border border-[#cbd5e1] cursor-pointer"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-bold">{children}</span>
                      <button
                        type="button"
                        aria-label={isEs ? 'Aumentar niños' : 'Increase children'}
                        onClick={() => {
                          setChildren((p) => Math.min(50, p + 1));
                          clearFieldError('travelers');
                        }}
                        className="w-6 h-6 rounded bg-white border border-[#cbd5e1] cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                {formErrors.travelers && <p className="text-xs text-red-600 mt-1">{formErrors.travelers}</p>}
              </div>
            </div>

            {/* Step 3: Interests */}
            <div className="pt-2 border-t border-[#f1f5f9]">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-2">
                {isEs ? '3. Intereses y Preferencias' : '3. Interests & Priorities'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {interestOptions.map((item) => {
                  const isChecked = interests.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleInterest(item.id)}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center gap-2 cursor-pointer ${
                        isChecked
                          ? 'bg-[#f0fdfa] border-[#0f766e] text-[#0f766e] font-medium'
                          : 'bg-[#faf8f5] border-[#e2d8c5] text-[#475569]'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isChecked ? 'bg-[#0f766e] border-[#0f766e] text-white' : 'border-[#cbd5e1]'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Contact Information */}
            <div className="space-y-4 pt-2 border-t border-[#f1f5f9]">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-1">
                {isEs ? '4. Información de Contacto' : '4. Contact Information'}
              </label>

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
                    className={`w-full px-4 py-2.5 text-sm rounded-xl border ${
                      formErrors.fullName ? 'border-red-400 bg-red-50/30' : 'border-[#cbd5e1] bg-[#faf8f5]'
                    } focus:outline-none focus:border-[#0f766e]`}
                  />
                  {formErrors.fullName && <p className="text-xs text-red-600 mt-1">{formErrors.fullName}</p>}
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
                    className={`w-full px-4 py-2.5 text-sm rounded-xl border ${
                      formErrors.email ? 'border-red-400 bg-red-50/30' : 'border-[#cbd5e1] bg-[#faf8f5]'
                    } focus:outline-none focus:border-[#0f766e]`}
                  />
                  {formErrors.email && <p className="text-xs text-red-600 mt-1">{formErrors.email}</p>}
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
                  className={`w-full px-4 py-2.5 text-sm rounded-xl border ${
                    formErrors.phone ? 'border-red-400 bg-red-50/30' : 'border-[#cbd5e1] bg-[#faf8f5]'
                  } focus:outline-none focus:border-[#0f766e]`}
                />
                {formErrors.phone && <p className="text-xs text-red-600 mt-1">{formErrors.phone}</p>}
              </div>

              <div>
                <textarea
                  rows={3}
                  placeholder={
                    isEs
                      ? 'Cuéntenos más sobre su viaje, fechas flexibles, horarios deseados o requisitos particulares...'
                      : 'Tell us more about your ideal trip, flexible dates, timing, or special requests...'
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#cbd5e1] bg-[#faf8f5] focus:outline-none focus:border-[#0f766e]"
                />
              </div>
            </div>

            {/* Terms & Conditions Agreement */}
            <div>
              <div
                className={`flex items-start gap-2.5 p-3.5 rounded-xl text-xs text-[#334155] border ${
                  formErrors.termsAccepted ? 'bg-red-50/40 border-red-400' : 'bg-[#FAF8F5] border-[#E2D8C5]'
                }`}
              >
                <input
                  type="checkbox"
                  id="private-charter-terms"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked);
                    clearFieldError('termsAccepted');
                  }}
                  className="mt-0.5 rounded border-[#C8AC75] text-[#061815] focus:ring-[#061815] cursor-pointer"
                />
                <label htmlFor="private-charter-terms" className="cursor-pointer select-none leading-relaxed">
                  {isEs ? (
                    <>
                      Entiendo que esto es una solicitud de cotización personalizada y acepto los{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          window.dispatchEvent(new CustomEvent('open-terms', { detail: 'overnight' }));
                        }}
                        className="text-[#061815] font-semibold underline hover:text-[#0f766e]"
                      >
                        Términos y Condiciones
                      </button>{' '}
                      para reservas privadas. *
                    </>
                  ) : (
                    <>
                      I understand this is a custom quotation request and agree to the{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          window.dispatchEvent(new CustomEvent('open-terms', { detail: 'overnight' }));
                        }}
                        className="text-[#061815] font-semibold underline hover:text-[#0f766e]"
                      >
                        Terms &amp; Conditions
                      </button>{' '}
                      for private charters. *
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
                  ? 'Su solicitud de chárter privado está sujeta a la verificación de disponibilidad y confirmación de itinerario por parte de Petra. Los detalles de pago se enviarán tras la verificación.'
                  : 'Your private charter request is subject to availability and custom itinerary confirmation by Petra. Payment details will be issued after availability check.'}
              </span>
            </div>

            {/* Inline Validation & Server Error Banner */}
            {submitError && (
              <div
                ref={errorBannerRef}
                role="alert"
                className="p-3.5 bg-red-50 border border-red-300 rounded-xl text-xs text-red-900 flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{submitError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={onBackToSelector}
                className="text-xs font-medium uppercase tracking-[0.14em] text-[#64748b] hover:text-[#06121e] cursor-pointer"
              >
                {isEs ? 'Cancelar' : 'Cancel'}
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full sm:w-auto py-3.5 px-8 rounded-xl bg-[#06121e] hover:bg-[#0f766e] text-white text-xs uppercase tracking-[0.16em] font-medium transition-all flex items-center justify-center gap-2 shadow-sm ${
                  isSubmitting ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
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
                    <span>{isEs ? 'Enviar Solicitud de Reserva Privada' : 'Submit Private Booking Request'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 'submitted' && (
        <div className="space-y-6 text-center max-w-xl mx-auto py-8 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-[#0f766e]/10 text-[#0f766e] flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8" />
          </div>

          <h3 className="text-2xl sm:text-3xl font-display font-light text-[#06121e]">
            {isEs ? 'Solicitud Privada Recibida' : 'Custom Booking Request Received'}
          </h3>

          {assignedBookingRef && (
            <div className="inline-block bg-[#F1F5F9] border border-[#CBD5E1] text-[#0F172A] px-4 py-1.5 rounded-full font-mono font-bold text-sm tracking-wider shadow-xs">
              {isEs ? 'Código de Referencia:' : 'Booking Reference:'} {assignedBookingRef}
            </div>
          )}

          <p className="text-sm text-[#475569] font-light leading-relaxed">
            {isEs
              ? `¡Gracias, ${fullName}! Hemos recibido su solicitud para ${selectedCharterTitle}. Petra revisará su itinerario y le contactará con la propuesta confirmada.`
              : `Thank you, ${fullName}! Your private charter request for ${selectedCharterTitle} has been received. Petra will review availability and contact you with the tailored proposal.`}
          </p>

          <div className="p-5 bg-white rounded-2xl border border-[#e2d8c5] text-left text-xs space-y-2">
            <div className="font-semibold text-[#06121e] border-b border-[#f1f5f9] pb-2 flex justify-between items-center">
              <span>{isEs ? 'Detalles de la Solicitud:' : 'Inquiry Summary:'}</span>
              {assignedBookingRef && <span className="font-mono text-[11px] text-[#0f766e]">{assignedBookingRef}</span>}
            </div>
            <div><span className="text-[#64748b]">{isEs ? 'Tipo:' : 'Type:'}</span> {selectedCharterTitle}</div>
            <div><span className="text-[#64748b]">{isEs ? 'Fecha:' : 'Date:'}</span> {targetDates || 'Flexible'}</div>
            <div><span className="text-[#64748b]">{isEs ? 'Viajeros:' : 'Travelers:'}</span> {adults + children} ({adults} {isEs ? 'Adultos' : 'Adults'}, {children} {isEs ? 'Niños' : 'Children'})</div>
            <div><span className="text-[#64748b]">{isEs ? 'Contacto:' : 'Contact:'}</span> {email.trim().toLowerCase()} · {phone.trim()}</div>
          </div>

          {/* Direct WhatsApp Option */}
          <div className="p-5 bg-[#ecfdf5] border border-[#a7f3d0] rounded-2xl text-xs text-[#065f46] space-y-3">
            <p className="font-light">
              {isEs
                ? '¿Desea conversar directamente con Petra sobre esta solicitud privada? Envíela por WhatsApp con un solo clic:'
                : 'Want to discuss this private charter directly with Petra right now? Send it via WhatsApp with one click:'}
            </p>
            <a
              href={`https://wa.me/50764443649?text=${getWhatsappText()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 py-2.5 px-6 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-medium shadow-sm transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{isEs ? 'Continuar en WhatsApp con Petra' : 'Continue on WhatsApp with Petra'}</span>
            </a>
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={onBackToSelector}
              className="py-2.5 px-6 text-xs uppercase tracking-wider text-[#64748b] hover:text-[#06121e] cursor-pointer"
            >
              {isEs ? 'Volver al Inicio del Planificador' : 'Back to Experience Selection'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
