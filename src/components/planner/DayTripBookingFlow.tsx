import React, { useState } from 'react';
import { Language } from '../../types';
import { VisualAsset } from '../../pictures';
import { DAY_TOUR_PACKAGES_CLIENT, DayTourPackageInfo } from '../../data/dayTourPackages';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  Calendar,
  Users,
  MapPin,
  Clock,
  ArrowRight,
  ArrowLeft,
  Check,
  ShieldCheck,
  Sparkles,
  Lock,
  Mail,
  Phone,
  FileText,
  AlertCircle,
  CreditCard,
  Loader2,
} from 'lucide-react';

interface DayTripBookingFlowProps {
  currentLang: Language;
  onBackToSelector: () => void;
  initialPackageId?: 'day-tour-panama-city' | 'day-tour-port';
}

export const DayTripBookingFlow: React.FC<DayTripBookingFlowProps> = ({
  currentLang,
  onBackToSelector,
  initialPackageId = 'day-tour-panama-city',
}) => {
  const isEs = currentLang === 'es';

  // Selected Day Tour Package State
  const [selectedPackageId, setSelectedPackageId] = useState<'day-tour-panama-city' | 'day-tour-port'>(
    initialPackageId && DAY_TOUR_PACKAGES_CLIENT[initialPackageId] ? initialPackageId : 'day-tour-panama-city'
  );

  const currentPkg: DayTourPackageInfo =
    DAY_TOUR_PACKAGES_CLIENT[selectedPackageId] || DAY_TOUR_PACKAGES_CLIENT['day-tour-panama-city'];

  // Progressive Steps: 1: Experience | 2: Date | 3: Travelers | 4: Trip Info | 5: Review | 6: Secure Checkout
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);

  // Date State: helper for upcoming dates
  const today = new Date();
  const formatDateISO = (d: Date) => d.toISOString().split('T')[0];

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const defaultDateStr = formatDateISO(tomorrow);

  const [selectedDate, setSelectedDate] = useState<string>(defaultDateStr);

  // Travelers State
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);

  // Customer & Pickup Details State
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [pickupLocation, setPickupLocation] = useState<string>(
    selectedPackageId === 'day-tour-port' ? 'Cartí Port (Puerto Cartí) - Self Transport' : ''
  );
  const [specialNotes, setSpecialNotes] = useState<string>('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Checkout & Submission State
  const [termsAccepted, setTermsAccepted] = useState<boolean>(true);
  const [beforeYouTravelAccepted, setBeforeYouTravelAccepted] = useState<boolean>(true);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [idempotencyKey] = useState<string>(() => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `daytour_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  });

  // Calculate pricing
  const pricePerPerson = currentPkg.pricePerPerson;
  const onlineTotal = (adults + children) * pricePerPerson;

  // Generate clean date pills for the next 14 days
  const upcomingDates = Array.from({ length: 14 }).map((_, index) => {
    const d = new Date(today);
    d.setDate(today.getDate() + 1 + index);
    return {
      iso: formatDateISO(d),
      dayName: d.toLocaleDateString(isEs ? 'es-PA' : 'en-US', { weekday: 'short' }),
      dayNumber: d.getDate(),
      monthName: d.toLocaleDateString(isEs ? 'es-PA' : 'en-US', { month: 'short' }),
    };
  });

  const validateStep4 = () => {
    const errors: { [key: string]: string } = {};
    if (!fullName.trim()) {
      errors.fullName = isEs ? 'Por favor ingrese su nombre completo' : 'Please enter your full name';
    }
    if (!email.trim() || !email.includes('@')) {
      errors.email = isEs ? 'Por favor ingrese un correo electrónico válido' : 'Please enter a valid email address';
    }
    if (!phone.trim()) {
      errors.phone = isEs ? 'Por favor ingrese su teléfono o WhatsApp' : 'Please enter your WhatsApp or phone';
    }
    if (selectedPackageId === 'day-tour-panama-city' && !pickupLocation.trim()) {
      errors.pickupLocation = isEs
        ? 'Por favor ingrese su hotel o dirección en Ciudad de Panamá'
        : 'Please enter your hotel or pickup address in Panama City';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBookAndPayNow = async () => {
    if (!termsAccepted || !beforeYouTravelAccepted) {
      setCheckoutError(
        isEs
          ? 'Debe aceptar los Términos y Condiciones y los Requisitos de Antes de Viajar para continuar.'
          : 'Please acknowledge both the Terms & Conditions and Before You Travel requirements to proceed.'
      );
      return;
    }

    setIsProcessingCheckout(true);
    setCheckoutError(null);

    const bookingReference = `GNY-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      const payload = {
        bookingReference,
        bookingType: 'day-trip',
        dayTourPackageId: selectedPackageId,
        customerName: fullName.trim(),
        customerEmail: email.trim().toLowerCase(),
        customerPhone: phone.trim(),
        targetDate: selectedDate,
        adults,
        children,
        pickupLocation: selectedPackageId === 'day-tour-port' ? 'Cartí Port' : pickupLocation.trim(),
        specialNotes: specialNotes.trim(),
        termsAccepted: true,
        customerLanguage: currentLang,
        idempotencyKey,
      };

      let adminToken = '';
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            adminToken = session.access_token;
          }
        } catch (e) {}
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      };
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }

      const response = await fetch('/api/payment-checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        throw new Error(
          isEs
            ? 'Entorno de vista previa local: Las funciones de Netlify (/api/payment-checkout) requieren el entorno desplegado en Netlify para procesar pasarelas de pago reales. En vista previa, por favor use el modo sandbox o despliegue a Netlify.'
            : 'Local preview environment: Netlify Functions (/api/payment-checkout) require a deployed Netlify runtime to execute payment checkouts. In preview, please deploy to Netlify or use sandbox testing mode.'
        );
      }

      let data: any = {};
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        throw new Error(
          isEs
            ? 'Respuesta inválida de la pasarela de pago (formato JSON no recibido).'
            : 'Invalid JSON response received from payment gateway endpoint.'
        );
      }

      if (response.ok && data.success && data.paymentUrl) {
        // Redirect browser to validated HTTPS PagueloFacil checkout URL
        window.location.href = data.paymentUrl;
      } else {
        setCheckoutError(
          data.error ||
            data.message ||
            (isEs
              ? 'El sistema de pago no está disponible temporalmente o la pasarela requiere configuración. Por favor verifique sus datos o intente más tarde.'
              : 'Payment gateway session could not be established. Please verify your connection or try again.')
        );
        setIsProcessingCheckout(false);
      }
    } catch (err: any) {
      console.error('[DayTripBookingFlow] Checkout error:', err);
      setCheckoutError(
        err?.message ||
          (isEs
            ? 'Error de conexión con la pasarela de pago.'
            : 'Network error connecting to secure payment gateway.')
      );
      setIsProcessingCheckout(false);
    }
  };

  const stepTitles = [
    { num: 1, label: isEs ? 'Tour' : 'Tour' },
    { num: 2, label: isEs ? 'Fecha' : 'Date' },
    { num: 3, label: isEs ? 'Viajeros' : 'Travelers' },
    { num: 4, label: isEs ? 'Detalles' : 'Details' },
    { num: 5, label: isEs ? 'Revisión' : 'Review' },
    { num: 6, label: isEs ? 'Pago' : 'Checkout' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-[#e5dccb]">
        <button
          onClick={currentStep === 1 ? onBackToSelector : () => setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as any) : 1))}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#475569] hover:text-[#06121e] uppercase tracking-[0.14em] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{currentStep === 1 ? (isEs ? 'Volver a Opciones' : 'Back to Options') : (isEs ? 'Paso Anterior' : 'Previous Step')}</span>
        </button>

        <div className="text-right">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#0e7490] font-bold">
            {isEs ? 'Reserva y Pago Directo Instantáneo' : 'Instant Direct Booking & Payment'}
          </div>
          <div className="text-xs text-[#64748b]">
            {isEs ? 'Paso' : 'Step'} {currentStep} {isEs ? 'de' : 'of'} 6
          </div>
        </div>
      </div>

      {/* Progressive Step Indicator (Steps 1-6) */}
      <div className="mb-8">
        <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {stepTitles.map((s) => (
            <div key={s.num} className="flex flex-col items-center text-center">
              <div
                className={`w-full h-1.5 rounded-full transition-all duration-300 ${
                  currentStep >= s.num ? 'bg-[#0e7490]' : 'bg-[#e2e8f0]'
                }`}
              />
              <span
                className={`hidden sm:block text-[10px] font-mono tracking-wider uppercase mt-2 ${
                  currentStep === s.num
                    ? 'text-[#0e7490] font-bold'
                    : currentStep > s.num
                    ? 'text-[#06121e]'
                    : 'text-[#94a3b8]'
                }`}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ========================================================
          STEP 1: SELECT DAY TOUR PACKAGE
         ======================================================== */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="text-center max-w-xl mx-auto mb-6">
            <h3 className="text-2xl sm:text-3xl font-display font-light text-[#06121e]">
              {isEs ? 'Seleccione su Excursión de Pasadía' : 'Choose Your Day Tour Package'}
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] font-light mt-1">
              {isEs
                ? 'Elija entre el pasadía completo con transporte desde Ciudad de Panamá o el pasadía marítimo desde Puerto Cartí.'
                : 'Choose between the full day tour with Panama City transport or the maritime port day tour from Cartí.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.values(DAY_TOUR_PACKAGES_CLIENT).map((pkg) => {
              const isSelected = selectedPackageId === pkg.id;
              return (
                <div
                  key={pkg.id}
                  onClick={() => {
                    setSelectedPackageId(pkg.id as any);
                    if (pkg.id === 'day-tour-port') {
                      setPickupLocation('Cartí Port (Puerto Cartí)');
                    } else {
                      setPickupLocation('');
                    }
                  }}
                  className={`rounded-3xl border-2 p-6 flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#0e7490] bg-cyan-50/20 shadow-md ring-2 ring-[#0e7490]/20'
                      : 'border-[#e2d8c5] bg-white hover:border-[#0e7490]/60 shadow-xs'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider rounded-full bg-[#06121e] text-white font-semibold">
                        {pkg.includesTransport ? (isEs ? 'Con Transporte 4x4' : 'Includes 4x4 Transport') : (isEs ? 'Desde Puerto Cartí' : 'From Cartí Port')}
                      </span>
                      <div className="text-right font-mono">
                        <div className="text-xl font-bold text-[#06121e]">${pkg.pricePerPerson.toFixed(2)}</div>
                        <div className="text-[10px] text-[#64748b]">{isEs ? 'USD / persona' : 'USD / person'}</div>
                      </div>
                    </div>

                    <h4 className="text-lg font-display font-medium text-[#06121e]">
                      {pkg.title[currentLang]}
                    </h4>

                    <p className="text-xs text-[#475569] font-light leading-relaxed">
                      {pkg.subtitle[currentLang]}
                    </p>

                    <div className="space-y-1.5 pt-2 text-xs text-[#334155] font-light">
                      {pkg.highlights[currentLang].slice(0, 3).map((hl, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-[#0e7490] font-bold">✓</span>
                          <span>{hl}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#f1f5f9] flex items-center justify-between">
                    <span className="text-xs font-mono font-medium text-[#0e7490]">
                      {isSelected ? (isEs ? '● Seleccionado' : '● Selected') : (isEs ? '○ Elegir este tour' : '○ Choose this tour')}
                    </span>
                    <span className="text-xs font-semibold text-[#06121e] underline">
                      {isEs ? 'Continuar →' : 'Continue →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedPackageId === 'day-tour-port' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-2">
              <div className="font-semibold flex items-center gap-1.5 text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  {isEs
                    ? 'Aviso Importante para Conducción Propia (Self-Drive — Puerto Cartí):'
                    : 'Important Self-Drive Advisory (Cartí Port):'}
                </span>
              </div>
              <p className="leading-relaxed">
                {isEs
                  ? 'Se requiere estrictamente un vehículo SUV 4x4 genuino (los autos 2WD están prohibidos). Llegada obligatoria al muelle de Cartí antes de las 8:30 AM. Tasa de entrada vehicular a la Comarca desde ~$15 y estacionamiento en el muelle de $3 por vehículo. Prevea ~3 horas desde Ciudad de Panamá y revise los requisitos de pasaporte original.'
                  : 'Genuine 4x4 SUV strictly required (2WD vehicles prohibited). Arrival at Cartí Port meeting point required by no later than 8:30 AM. Comarca vehicle entry fee starts at ~$15; port parking is $3 per vehicle. Allow ~3 hours from Panama City and note original passport requirement.'}
              </p>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="py-3.5 px-8 rounded-xl bg-[#06121e] hover:bg-[#0e7490] text-white text-xs uppercase tracking-[0.16em] font-medium transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <span>{isEs ? 'Continuar a Fecha' : 'Continue to Date'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          STEP 2: CHOOSE DATE
         ======================================================== */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="text-center max-w-xl mx-auto mb-6">
            <h3 className="text-2xl sm:text-3xl font-display font-light text-[#06121e]">
              {isEs ? '¿Cuándo Desea Viajar?' : 'When Would You Like to Travel?'}
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] font-light mt-1">
              {isEs
                ? 'Seleccione la fecha de su excursión de un día a Guna Yala.'
                : 'Select the date for your Guna Yala day excursion.'}
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#e2d8c5] shadow-sm max-w-2xl mx-auto space-y-5">
            <label className="block text-xs font-mono uppercase tracking-[0.18em] text-[#64748b]">
              {isEs ? 'Próximas Fechas Disponibles' : 'Upcoming Available Dates'}
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              {upcomingDates.map((item) => {
                const isSelected = selectedDate === item.iso;
                return (
                  <button
                    key={item.iso}
                    type="button"
                    onClick={() => setSelectedDate(item.iso)}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                      isSelected
                        ? 'bg-[#06121e] text-white border-[#06121e] shadow-md scale-102'
                        : 'bg-[#faf8f5] border-[#e5dccb] text-[#334155] hover:border-[#0e7490] hover:bg-white'
                    }`}
                  >
                    <span className="text-[10px] uppercase font-mono tracking-wider opacity-75">
                      {item.dayName}
                    </span>
                    <span className="text-lg font-bold my-0.5">{item.dayNumber}</span>
                    <span className="text-[10px] uppercase font-mono tracking-wider opacity-75">
                      {item.monthName}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-[#f1f5f9] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-[#64748b] font-light">
                {isEs ? 'O elija otra fecha en el calendario:' : 'Or pick a specific date:'}
              </span>
              <input
                type="date"
                value={selectedDate}
                min={defaultDateStr}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3.5 py-2 text-xs font-mono border border-[#cbd5e1] rounded-xl focus:outline-none focus:border-[#0e7490] bg-[#faf8f5]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setCurrentStep(1)}
              className="py-3 px-5 text-xs font-medium uppercase tracking-[0.14em] text-[#64748b] hover:text-[#06121e] cursor-pointer"
            >
              {isEs ? 'Atrás' : 'Back'}
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="py-3.5 px-6 rounded-xl bg-[#06121e] hover:bg-[#0e7490] text-white text-xs uppercase tracking-[0.16em] font-medium transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <span>{isEs ? 'Continuar a Viajeros' : 'Continue to Travelers'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          STEP 3: TRAVELERS
         ======================================================== */}
      {currentStep === 3 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="text-center max-w-xl mx-auto mb-6">
            <h3 className="text-2xl sm:text-3xl font-display font-light text-[#06121e]">
              {isEs ? 'Número de Viajeros' : 'Number of Travelers'}
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] font-light mt-1">
              {isEs
                ? `Tarifa: $${pricePerPerson.toFixed(2)} USD por persona (${currentPkg.title[isEs ? 'es' : 'en']}).`
                : `Rate: $${pricePerPerson.toFixed(2)} USD per person.`}
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#e2d8c5] shadow-sm max-w-md mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[#06121e]">
                  {isEs ? 'Adultos' : 'Adults'}
                </div>
                <div className="text-xs text-[#64748b] font-light">
                  {isEs ? '12 años o más' : '12+ years'} &bull; ${pricePerPerson.toFixed(2)} c/u
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAdults((prev) => Math.max(1, prev - 1))}
                  className="w-10 h-10 rounded-full border border-[#cbd5e1] hover:border-[#06121e] flex items-center justify-center text-lg font-medium text-[#06121e] transition-colors cursor-pointer"
                >
                  -
                </button>
                <span className="w-8 text-center text-lg font-bold font-mono text-[#06121e]">
                  {adults}
                </span>
                <button
                  type="button"
                  onClick={() => setAdults((prev) => Math.min(14, prev + 1))}
                  className="w-10 h-10 rounded-full border border-[#cbd5e1] hover:border-[#06121e] flex items-center justify-center text-lg font-medium text-[#06121e] transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#f1f5f9]">
              <div>
                <div className="text-sm font-medium text-[#06121e]">
                  {isEs ? 'Niños' : 'Children'}
                </div>
                <div className="text-xs text-[#64748b] font-light">
                  {isEs ? 'Menores de 12 años' : 'Under 12 years'} &bull; ${pricePerPerson.toFixed(2)} c/u
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setChildren((prev) => Math.max(0, prev - 1))}
                  className="w-10 h-10 rounded-full border border-[#cbd5e1] hover:border-[#06121e] flex items-center justify-center text-lg font-medium text-[#06121e] transition-colors cursor-pointer"
                >
                  -
                </button>
                <span className="w-8 text-center text-lg font-bold font-mono text-[#06121e]">
                  {children}
                </span>
                <button
                  type="button"
                  onClick={() => setChildren((prev) => Math.min(10, prev + 1))}
                  className="w-10 h-10 rounded-full border border-[#cbd5e1] hover:border-[#06121e] flex items-center justify-center text-lg font-medium text-[#06121e] transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl flex items-center justify-between text-xs">
              <span className="font-mono uppercase tracking-wider text-[#64748b]">
                {isEs ? 'Subtotal en Línea:' : 'Online Subtotal:'}
              </span>
              <span className="font-bold text-sm text-[#0e7490] font-mono">
                ${onlineTotal.toFixed(2)} USD ({adults + children} {isEs ? 'pasajeros' : 'travelers'})
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="py-3 px-5 text-xs font-medium uppercase tracking-[0.14em] text-[#64748b] hover:text-[#06121e] cursor-pointer"
            >
              {isEs ? 'Atrás' : 'Back'}
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="py-3.5 px-6 rounded-xl bg-[#06121e] hover:bg-[#0e7490] text-white text-xs uppercase tracking-[0.16em] font-medium transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <span>{isEs ? 'Continuar a Detalles' : 'Continue to Details'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          STEP 4: TRIP INFORMATION
         ======================================================== */}
      {currentStep === 4 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="text-center max-w-xl mx-auto mb-6">
            <h3 className="text-2xl sm:text-3xl font-display font-light text-[#06121e]">
              {isEs ? 'Información de Contacto y Recogida' : 'Contact & Pickup Information'}
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] font-light mt-1">
              {isEs
                ? 'Necesitamos estos datos para coordinar el transporte 4x4 y la confirmación.'
                : 'Required to coordinate 4x4 pickup and booking confirmation.'}
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#e2d8c5] shadow-sm max-w-xl mx-auto space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-1.5">
                {isEs ? 'Nombre Completo *' : 'Full Name *'}
              </label>
              <input
                type="text"
                placeholder={isEs ? 'Ej. María Pérez' : 'e.g., Sarah Jenkins'}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`w-full px-4 py-3 text-sm rounded-xl border ${
                  formErrors.fullName ? 'border-red-400 bg-red-50/30' : 'border-[#cbd5e1] bg-[#faf8f5]'
                } focus:outline-none focus:border-[#0e7490]`}
              />
              {formErrors.fullName && <p className="text-xs text-red-500 mt-1">{formErrors.fullName}</p>}
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-1.5">
                {isEs ? 'Correo Electrónico (para el recibo y comprobante) *' : 'Email Address (for receipt & voucher) *'}
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 text-sm rounded-xl border ${
                  formErrors.email ? 'border-red-400 bg-red-50/30' : 'border-[#cbd5e1] bg-[#faf8f5]'
                } focus:outline-none focus:border-[#0e7490]`}
              />
              {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-1.5">
                {isEs ? 'WhatsApp / Teléfono Móvil *' : 'WhatsApp / Mobile Phone *'}
              </label>
              <input
                type="tel"
                placeholder="+507 6000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full px-4 py-3 text-sm rounded-xl border ${
                  formErrors.phone ? 'border-red-400 bg-red-50/30' : 'border-[#cbd5e1] bg-[#faf8f5]'
                } focus:outline-none focus:border-[#0e7490]`}
              />
              {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
            </div>

            {selectedPackageId === 'day-tour-panama-city' ? (
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-1.5">
                  {isEs ? 'Hotel o Dirección de Recogida en Ciudad de Panamá *' : 'Hotel or Pickup Address in Panama City *'}
                </label>
                <input
                  type="text"
                  placeholder={isEs ? 'Ej. Hotel La Compañía, Casco Viejo' : 'e.g., Hotel La Compañía, Casco Viejo'}
                  value={pickupLocation}
                  onChange={(e) => setPickupLocation(e.target.value)}
                  className={`w-full px-4 py-3 text-sm rounded-xl border ${
                    formErrors.pickupLocation ? 'border-red-400 bg-red-50/30' : 'border-[#cbd5e1] bg-[#faf8f5]'
                  } focus:outline-none focus:border-[#0e7490]`}
                />
                {formErrors.pickupLocation && <p className="text-xs text-red-500 mt-1">{formErrors.pickupLocation}</p>}
              </div>
            ) : (
              <div className="p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs text-[#334155] space-y-1">
                <span className="font-semibold text-[#06121e]">
                  {isEs ? 'Punto de Encuentro: Puerto Cartí' : 'Meeting Point: Cartí Port'}
                </span>
                <p className="text-[11px] text-[#64748b]">
                  {isEs
                    ? 'Dado que eligió el pasadía desde el puerto, usted organiza su propio traslado hasta el muelle de Cartí (llegada antes de las 8:30 AM).'
                    : 'Since you selected the port day tour, you arrange your own ground transport to Cartí Port (arrival by 8:30 AM).'}
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-1.5">
                {isEs ? 'Notas Especiales o Alergias (Opcional)' : 'Special Notes or Dietary Preferences (Optional)'}
              </label>
              <textarea
                rows={2}
                placeholder={isEs ? 'Ej. Almuerzo vegetariano...' : 'e.g., Vegetarian lunch request...'}
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#cbd5e1] bg-[#faf8f5] focus:outline-none focus:border-[#0e7490]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setCurrentStep(3)}
              className="py-3 px-5 text-xs font-medium uppercase tracking-[0.14em] text-[#64748b] hover:text-[#06121e] cursor-pointer"
            >
              {isEs ? 'Atrás' : 'Back'}
            </button>
            <button
              onClick={() => {
                if (validateStep4()) {
                  setCurrentStep(5);
                }
              }}
              className="py-3.5 px-6 rounded-xl bg-[#06121e] hover:bg-[#0e7490] text-white text-xs uppercase tracking-[0.16em] font-medium transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <span>{isEs ? 'Revisar Reserva y Pago' : 'Review Reservation & Payment'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          STEP 5: REVIEW RESERVATION & PRICE BREAKDOWN
         ======================================================== */}
      {currentStep === 5 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="text-center max-w-xl mx-auto mb-6">
            <h3 className="text-2xl sm:text-3xl font-display font-light text-[#06121e]">
              {isEs ? 'Resumen y Desglose de Precios' : 'Review & Price Breakdown'}
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] font-light mt-1">
              {isEs
                ? 'Verifique el desglose del pago en línea y las tarifas locales pagaderas en efectivo.'
                : 'Verify online payment total and separate local cash fees.'}
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-[#e2d8c5] shadow-sm overflow-hidden max-w-2xl mx-auto">
            <div className="bg-[#06121e] text-white p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#38bdf8]">
                  {isEs ? 'Excursión Seleccionada' : 'Selected Tour'}
                </span>
                <h4 className="text-xl font-display font-light">
                  {currentPkg.title[currentLang]}
                </h4>
              </div>
              <div className="text-right font-mono">
                <span className="text-xs text-white/70 block">
                  {isEs ? 'Total Pagadero en Línea:' : 'Online Payment Total:'}
                </span>
                <span className="text-xl font-bold text-cyan-300">
                  ${onlineTotal.toFixed(2)} USD
                </span>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-5 text-xs">
              {/* Itemized Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-[#f8fafc] rounded-2xl border border-[#f1f5f9]">
                  <span className="text-[#64748b] font-mono uppercase tracking-wider block mb-1">
                    {isEs ? 'Fecha de Excursión' : 'Excursion Date'}
                  </span>
                  <span className="font-semibold text-sm text-[#06121e]">{selectedDate}</span>
                </div>

                <div className="p-3.5 bg-[#f8fafc] rounded-2xl border border-[#f1f5f9]">
                  <span className="text-[#64748b] font-mono uppercase tracking-wider block mb-1">
                    {isEs ? 'Pasajeros' : 'Travelers'}
                  </span>
                  <span className="font-semibold text-sm text-[#06121e]">
                    {adults + children} ({adults} {isEs ? 'Adultos' : 'Adults'}{children > 0 ? `, ${children} ${isEs ? 'Niños' : 'Children'}` : ''})
                  </span>
                </div>

                <div className="p-3.5 bg-[#f8fafc] rounded-2xl border border-[#f1f5f9]">
                  <span className="text-[#64748b] font-mono uppercase tracking-wider block mb-1">
                    {isEs ? 'Punto de Recogida' : 'Pickup / Meeting Point'}
                  </span>
                  <span className="font-semibold text-sm text-[#06121e] line-clamp-1">{pickupLocation}</span>
                </div>

                <div className="p-3.5 bg-[#f8fafc] rounded-2xl border border-[#f1f5f9]">
                  <span className="text-[#64748b] font-mono uppercase tracking-wider block mb-1">
                    {isEs ? 'Titular de Reserva' : 'Lead Traveler'}
                  </span>
                  <span className="font-semibold text-sm text-[#06121e] line-clamp-1">{fullName} ({phone})</span>
                </div>
              </div>

              {/* Price Breakdown Table */}
              <div className="border border-[#e2d8c5] rounded-2xl overflow-hidden">
                <div className="bg-[#faf8f5] px-4 py-2.5 border-b border-[#e2d8c5] font-mono text-[11px] uppercase tracking-wider text-[#06121e] font-semibold">
                  {isEs ? 'Desglose Financiero Autorizado' : 'Authorized Financial Breakdown'}
                </div>
                <div className="p-4 space-y-2 text-[#334155]">
                  <div className="flex justify-between items-center pb-2 border-b border-[#f1f5f9]">
                    <span>
                      {currentPkg.title[currentLang]} &times; {adults + children} {isEs ? 'pax' : 'travelers'} (${pricePerPerson.toFixed(2)} {isEs ? 'c/u' : 'each'})
                    </span>
                    <span className="font-mono font-bold">${onlineTotal.toFixed(2)} USD</span>
                  </div>

                  <div className="flex justify-between items-center text-emerald-800 font-medium">
                    <span>{isEs ? 'Total Pagadero Ahora en Línea (PagueloFacil)' : 'Online Total Payable Now'}</span>
                    <span className="font-mono font-bold text-sm">${onlineTotal.toFixed(2)} USD</span>
                  </div>
                </div>
              </div>

              {/* Separate Local Cash Fees Notice */}
              <div className="p-4 bg-[#fffbeb] border border-[#fde68a] rounded-2xl text-[#92400e] space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{isEs ? 'Tasas y Entradas Locales (Pagaderas en Efectivo en el Sitio):' : 'Local Fees & Taxes (Payable Locally in Cash USD):'}</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 font-light text-[11px]">
                  <li>
                    {isEs
                      ? 'Entrada a la Comarca Guna Yala: $22 USD por visitante extranjero (mayores de 10 años) o $7 USD por ciudadano/residente panameño. (Se paga en efectivo en el puesto de control de Llano Cartí). Los totales ya incluyen la tasa portuaria de $2.'
                      : 'Guna Yala Comarca Entrance Fee: $22 USD per foreign visitor (ages 10+) or $7 USD per Panamanian citizen/resident. (Payable in cash at the checkpoint). Totals already include the $2 port usage fee.'}
                  </li>
                  <li>
                    {isEs
                      ? 'Tasa Portuaria de Cartí: $2 (incluida en la entrada comarcal) o hasta $3 por vehículo en estacionamiento del muelle.'
                      : 'Cartí Port Fee: $2 (included in Comarca entrance) or up to $3 per vehicle for port parking.'}
                  </li>
                </ul>
              </div>

              {/* Before You Travel / Antes de Viajar Summary Box */}
              <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl text-[#334155] space-y-2">
                <div className="font-semibold text-xs text-[#06121e] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#0e7490] shrink-0" />
                  <span>{isEs ? 'Antes de Viajar — Requisitos Clave:' : 'Before You Travel — Key Requirements:'}</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 font-light text-[11px] text-[#475569]">
                  <li>
                    {isEs
                      ? 'Identificación obligatoria: Pasaporte físico original (extranjeros) o cédula/residencia original (panameños/residentes). Copias digitales no aceptadas.'
                      : 'Mandatory ID: Original physical passport (foreigners) or original cédula/residency card (Panamanians/residents). Digital copies not accepted.'}
                  </li>
                  {selectedPackageId === 'day-tour-port' && (
                    <li className="font-medium text-amber-900">
                      {isEs
                        ? 'Conducción Propia (Self-Drive): SUV 4x4 genuino obligatorio (2WD prohibido). Llegada al muelle de Cartí antes de las 8:30 AM. Tasa vehicular desde ~$15, estacionamiento $3.'
                        : 'Self-Drive: Genuine 4x4 SUV mandatory (2WD prohibited). Arrival at Cartí Port by 8:30 AM. Vehicle entry fee ~ $15+, parking $3.'}
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="p-6 bg-[#faf8f5] border-t border-[#e2d8c5] flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={() => setCurrentStep(4)}
                className="text-xs font-medium uppercase tracking-[0.14em] text-[#64748b] hover:text-[#06121e] cursor-pointer"
              >
                {isEs ? 'Modificar Datos' : 'Edit Details'}
              </button>

              <button
                onClick={() => setCurrentStep(6)}
                className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-[#06121e] hover:bg-[#0e7490] text-white text-xs uppercase tracking-[0.16em] font-medium transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <span>{isEs ? 'CONTINUAR AL PAGO SEGURO' : 'CONTINUE TO SECURE PAYMENT'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          STEP 6: SECURE CHECKOUT / BOOK & PAY NOW
         ======================================================== */}
      {currentStep === 6 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="text-center max-w-xl mx-auto mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-[11px] font-mono uppercase tracking-[0.18em] mb-3">
              <Lock className="w-4 h-4 text-emerald-700" />
              <span>{isEs ? 'Pago Seguro Encriptado • PagueloFacil' : 'Secure Encrypted Checkout • PagueloFacil'}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-display font-light text-[#06121e]">
              {isEs ? 'Finalizar Reserva de Pasadía' : 'Finalize Day Tour Reservation'}
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] font-light mt-1">
              {isEs
                ? 'Haga clic en el botón de pago para abrir la pasarela oficial encriptada.'
                : 'Click below to establish a secure encrypted session with PagueloFacil.'}
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-[#e2d8c5] shadow-sm p-6 sm:p-8 max-w-xl mx-auto space-y-6">
            <div className="p-4 bg-[#f8fafc] rounded-2xl border border-[#e2e8f0] space-y-2.5 text-xs text-[#334155]">
              <div className="flex justify-between">
                <span className="text-[#64748b]">{isEs ? 'Excursión:' : 'Tour:'}</span>
                <span className="font-semibold text-[#06121e]">{currentPkg.title[currentLang]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">{isEs ? 'Fecha:' : 'Date:'}</span>
                <span className="font-semibold text-[#06121e]">{selectedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">{isEs ? 'Pasajeros:' : 'Travelers:'}</span>
                <span className="font-semibold text-[#06121e]">{adults + children}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#e2e8f0] font-bold text-[#06121e]">
                <span>{isEs ? 'Total en Línea:' : 'Online Total:'}</span>
                <span className="text-emerald-700 font-mono text-sm">${onlineTotal.toFixed(2)} USD</span>
              </div>
            </div>

            {/* Terms and Conditions Acceptance */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-2.5 p-3.5 bg-[#FAF8F5] border border-[#E2D8C5] rounded-xl text-xs text-[#334155]">
                <input
                  type="checkbox"
                  id="day-tour-checkout-terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-[#C8AC75] text-[#061815] focus:ring-[#061815]"
                />
                <label htmlFor="day-tour-checkout-terms" className="cursor-pointer select-none">
                  {isEs ? (
                    <>
                      He leído y acepto los{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          window.history.pushState({}, '', '/terms-and-conditions/day-tour');
                          window.dispatchEvent(new Event('popstate'));
                        }}
                        className="text-[#061815] font-semibold underline hover:text-[#C8AC75]"
                      >
                        Términos y condiciones
                      </button>
                      {' '}de los tours de día.
                    </>
                  ) : (
                    <>
                      I have read and agree to the{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          window.history.pushState({}, '', '/terms-and-conditions/day-tour');
                          window.dispatchEvent(new Event('popstate'));
                        }}
                        className="text-[#061815] font-semibold underline hover:text-[#C8AC75]"
                      >
                        Terms & Conditions
                      </button>
                      {' '}for day tours.
                    </>
                  )}
                </label>
              </div>

              {/* Before You Travel / Antes de Viajar Mandatory Checkbox */}
              <div className="flex items-start gap-2.5 p-3.5 bg-[#FAF8F5] border border-[#E2D8C5] rounded-xl text-xs text-[#334155]">
                <input
                  type="checkbox"
                  id="day-tour-before-you-travel"
                  checked={beforeYouTravelAccepted}
                  onChange={(e) => setBeforeYouTravelAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-[#C8AC75] text-[#061815] focus:ring-[#061815]"
                />
                <label htmlFor="day-tour-before-you-travel" className="cursor-pointer select-none">
                  {isEs ? (
                    <>
                      Reconozco las tasas de entrada a Guna Yala ($22 extranjeros / $7 locales en efectivo, incluyendo la tasa portuaria de $2), la exigencia de pasaporte o cédula física original y los requisitos de vehículo 4x4 (prohibido 2WD). Ver detalles en{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          window.history.pushState({}, '', '/terms-and-conditions/day-tour');
                          window.dispatchEvent(new Event('popstate'));
                        }}
                        className="text-[#061815] font-semibold underline hover:text-[#C8AC75]"
                      >
                        Antes de Viajar
                      </button>.
                    </>
                  ) : (
                    <>
                      I acknowledge the Guna Yala entrance fees ($22 foreign / $7 local in cash, including the $2 port fee), mandatory original physical ID, and 4x4 self-drive requirements (2WD prohibited). See{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          window.history.pushState({}, '', '/terms-and-conditions/day-tour');
                          window.dispatchEvent(new Event('popstate'));
                        }}
                        className="text-[#061815] font-semibold underline hover:text-[#C8AC75]"
                      >
                        Before You Travel
                      </button>.
                    </>
                  )}
                </label>
              </div>

              {checkoutError && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{isEs ? 'Error en la pasarela de pago' : 'Payment Gateway Error'}</span>
                  </div>
                  <p>{checkoutError}</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleBookAndPayNow}
                disabled={isProcessingCheckout}
                className={`w-full py-4 px-6 rounded-xl text-xs uppercase tracking-[0.18em] font-semibold transition-all flex items-center justify-center gap-2.5 shadow-md cursor-pointer ${
                  isProcessingCheckout
                    ? 'bg-gray-400 text-white cursor-wait'
                    : termsAccepted && beforeYouTravelAccepted
                    ? 'bg-[#06121e] hover:bg-[#0e7490] text-white shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isProcessingCheckout ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                    <span>{isEs ? 'Conectando con PagueloFacil...' : 'Establishing Secure Session...'}</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 text-amber-300" />
                    <span>{isEs ? 'RESERVAR Y PAGAR' : 'BOOK & PAY NOW'}</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-[#64748b]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{isEs ? 'PagueloFacil 3D Secure Encriptado SSL' : 'PagueloFacil 3D Secure SSL Encryption'}</span>
              </div>

              <button
                onClick={() => setCurrentStep(5)}
                className="w-full py-2.5 text-xs text-[#64748b] hover:text-[#06121e] uppercase tracking-wider font-medium cursor-pointer"
              >
                {isEs ? 'Volver al Resumen' : 'Back to Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
