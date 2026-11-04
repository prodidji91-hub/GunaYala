import React, { useState } from 'react';
import { Language, Experience } from '../../types';
import { EXPERIENCES_DATA } from '../../data/experiences';
import { VisualAsset } from '../../pictures';
import { bookingRequestService } from '../../services/bookingRequestService';
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
  Copy,
} from 'lucide-react';

interface DayTripBookingFlowProps {
  currentLang: Language;
  onBackToSelector: () => void;
}

export const DayTripBookingFlow: React.FC<DayTripBookingFlowProps> = ({
  currentLang,
  onBackToSelector,
}) => {
  const isEs = currentLang === 'es';

  // Find the day trip experience from confirmed data
  const dayTripExperience: Experience =
    EXPERIENCES_DATA.find((e) => e.category === 'day-trip') || EXPERIENCES_DATA[0];

  // Progressive Steps: 1: Experience | 2: Date | 3: Travelers | 4: Trip Info | 5: Review | 6: Request | 7: Received
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);

  // Form State
  const [selectedExperienceId, setSelectedExperienceId] = useState<string>(dayTripExperience.id);
  
  // Date State: helper for upcoming dates
  const today = new Date();
  const formatDateISO = (d: Date) => d.toISOString().split('T')[0];

  // Default target date: tomorrow or in 2 days
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
  const [pickupLocation, setPickupLocation] = useState<string>('');
  const [specialNotes, setSpecialNotes] = useState<string>('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Generated confirmation number on checkout
  const [reservationNumber, setReservationNumber] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [idempotencyKey] = useState<string>(() => bookingRequestService.generateIdempotencyKey());

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
    if (!pickupLocation.trim()) {
      errors.pickupLocation = isEs
        ? 'Por favor ingrese su hotel o dirección en Ciudad de Panamá'
        : 'Please enter your hotel or pickup address in Panama City';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProceedToRequestStep = () => {
    setCurrentStep(6);
  };

  const handleBookingRequestSubmit = async () => {
    if (!termsAccepted) {
      alert(isEs ? 'Debe aceptar los Términos y Condiciones para continuar.' : 'Please acknowledge the Terms & Conditions to proceed.');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await bookingRequestService.submitBookingRequest({
        idempotencyKey,
        bookingType: 'day-trip',
        customerName: fullName,
        customerEmail: email,
        customerPhone: phone,
        experienceTitle: dayTripExperience.title[currentLang],
        targetDate: selectedDate,
        adults,
        children,
        pickupLocation,
        specialNotes,
        termsAccepted: true,
        termsVersion: '2026-10-18',
        customerLanguage: currentLang,
      });

      if (result.success && result.bookingReference) {
        setReservationNumber(result.bookingReference);
        setCurrentStep(7);
      } else {
        alert(result.error || (isEs ? 'Error al enviar la solicitud. Intente nuevamente.' : 'Error submitting booking request. Please try again.'));
      }
    } catch (err: any) {
      console.error('[DayTripBookingFlow Error] Submission failed:', err);
      alert(err?.message || (isEs ? 'Error al enviar la solicitud. Intente nuevamente.' : 'Error submitting booking request. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = [
    { num: 1, label: isEs ? 'Experiencia' : 'Experience' },
    { num: 2, label: isEs ? 'Fecha' : 'Date' },
    { num: 3, label: isEs ? 'Viajeros' : 'Travelers' },
    { num: 4, label: isEs ? 'Detalles' : 'Details' },
    { num: 5, label: isEs ? 'Revisión' : 'Review' },
    { num: 6, label: isEs ? 'Solicitud' : 'Request' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      
      {/* Top Navigation & Breadcrumb */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-[#e5dccb]">
        <button
          onClick={currentStep === 1 ? onBackToSelector : () => setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as any) : 1))}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#475569] hover:text-[#06121e] uppercase tracking-[0.14em] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{currentStep === 1 ? (isEs ? 'Volver a Opciones' : 'Back to Options') : (isEs ? 'Paso Anterior' : 'Previous Step')}</span>
        </button>

        <div className="text-right">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#0e7490]">
            {isEs ? 'Reserva de Pasadía Directa' : 'Direct Day Trip Reservation'}
          </div>
          <div className="text-xs text-[#64748b]">
            {currentStep < 7
              ? `${isEs ? 'Paso' : 'Step'} ${currentStep} ${isEs ? 'de' : 'of'} 6`
              : (isEs ? 'Confirmación Final' : 'Final Confirmation')}
          </div>
        </div>
      </div>

      {/* Progressive Step Indicator (Steps 1-6) */}
      {currentStep < 7 && (
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
      )}

      {/* ========================================================
          STEP 1: SELECT EXPERIENCE
         ======================================================== */}
      {currentStep === 1 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="text-center max-w-xl mx-auto mb-6">
            <h3 className="text-2xl sm:text-3xl font-display font-light text-[#06121e]">
              {isEs ? 'Seleccione su Pasadía' : 'Choose Your Day Trip'}
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] font-light mt-1">
              {isEs
                ? 'Excursión completa de un día desde Ciudad de Panamá. Sin intermediarios, coordinado con la comunidad Guna.'
                : 'Full-day Caribbean immersion from Panama City. Zero intermediaries, coordinated directly with local Guna hosts.'}
            </p>
          </div>

          {/* Visual Day Trip Card */}
          <div className="bg-white rounded-3xl border-2 border-[#0e7490] overflow-hidden shadow-md flex flex-col md:flex-row">
            <div className="relative md:w-5/12 aspect-[16/10] md:aspect-auto">
              <VisualAsset
                variant="day-trip"
                alt={dayTripExperience.title[currentLang]}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-[#06121e]/85 backdrop-blur-md text-white text-[10px] font-mono uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-white/15">
                {isEs ? 'Pasadía Estándar' : 'Standard Day Trip'}
              </div>
            </div>

            <div className="p-6 md:w-7/12 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#0e7490] font-mono uppercase tracking-wider mb-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{dayTripExperience.duration[currentLang]}</span>
                </div>

                <h4 className="text-xl sm:text-2xl font-display font-medium text-[#06121e] mb-2">
                  {dayTripExperience.title[currentLang]}
                </h4>

                <p className="text-xs sm:text-sm text-[#475569] font-light leading-relaxed mb-4">
                  {dayTripExperience.subtitle[currentLang]}
                </p>

                {/* Key Highlights */}
                <div className="space-y-1.5 mb-5 text-xs text-[#334155] font-light">
                  {dayTripExperience.highlights[currentLang].slice(0, 3).map((hl, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-[#0e7490] font-bold">✓</span>
                      <span>{hl}</span>
                    </div>
                  ))}
                </div>

                {/* Confirmed Rate Note (Never invent fake prices) */}
                <div className="p-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-xs text-[#475569] mb-4">
                  <span className="font-semibold text-[#06121e]">
                    {isEs ? 'Tarifas confirmadas por persona:' : 'Confirmed rate structure:'}
                  </span>{' '}
                  {dayTripExperience.pricingNote[currentLang]}
                </div>
              </div>

              <button
                onClick={() => setCurrentStep(2)}
                className="w-full py-3.5 px-6 rounded-xl bg-[#06121e] hover:bg-[#0e7490] text-white text-xs uppercase tracking-[0.16em] font-medium transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span>{isEs ? 'Seleccionar Esta Excursión' : 'Select This Day Trip'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
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
              {isEs ? '¿Cuándo Desea Viajar?' : 'When Would You Like to Go?'}
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] font-light mt-1">
              {isEs
                ? 'Los vehículos 4x4 parten diariamente entre 5:00 AM y 5:30 AM desde Ciudad de Panamá.'
                : 'Shared 4x4 vehicles depart daily between 5:00 AM and 5:30 AM from Panama City.'}
            </p>
          </div>

          {/* Quick Date Picker Pills (Mobile-First) */}
          <div className="bg-white p-5 rounded-3xl border border-[#e2d8c5] shadow-sm">
            <label className="block text-xs font-mono uppercase tracking-[0.18em] text-[#64748b] mb-3">
              {isEs ? 'Fechas Próximas Disponibles' : 'Upcoming Available Dates'}
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 mb-6">
              {upcomingDates.map((item) => {
                const isSelected = selectedDate === item.iso;
                return (
                  <button
                    key={item.iso}
                    type="button"
                    onClick={() => setSelectedDate(item.iso)}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center ${
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

            {/* Custom Date Input for Any Date */}
            <div className="pt-4 border-t border-[#f1f5f9] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-[#64748b] font-light">
                {isEs ? 'O elija una fecha específica en el calendario:' : 'Or choose a specific date:'}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  min={defaultDateStr}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3.5 py-2 text-xs font-mono border border-[#cbd5e1] rounded-xl focus:outline-none focus:border-[#0e7490] bg-[#faf8f5]"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setCurrentStep(1)}
              className="py-3 px-5 text-xs font-medium uppercase tracking-[0.14em] text-[#64748b] hover:text-[#06121e]"
            >
              {isEs ? 'Atrás' : 'Back'}
            </button>
            <button
              onClick={() => setCurrentStep(3)}
              className="py-3.5 px-6 rounded-xl bg-[#06121e] hover:bg-[#0e7490] text-white text-xs uppercase tracking-[0.16em] font-medium transition-all flex items-center gap-2 shadow-sm"
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
              {isEs ? '¿Cuántas Personas Viajan?' : 'How Many People Are Traveling?'}
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] font-light mt-1">
              {isEs
                ? 'Indique el número de personas en su grupo para la reserva de asientos 4x4 y bote.'
                : 'Select the number of travelers to reserve 4x4 seats and boat spots.'}
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#e2d8c5] shadow-sm max-w-md mx-auto space-y-6">
            {/* Adults Stepper */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[#06121e]">
                  {isEs ? 'Adultos' : 'Adults'}
                </div>
                <div className="text-xs text-[#64748b] font-light">
                  {isEs ? '12 años o más' : '12+ years'}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAdults((prev) => Math.max(1, prev - 1))}
                  className="w-10 h-10 rounded-full border border-[#cbd5e1] hover:border-[#06121e] flex items-center justify-center text-lg font-medium text-[#06121e] transition-colors"
                  aria-label="Decrease adults"
                >
                  -
                </button>
                <span className="w-8 text-center text-lg font-bold font-mono text-[#06121e]">
                  {adults}
                </span>
                <button
                  type="button"
                  onClick={() => setAdults((prev) => Math.min(12, prev + 1))}
                  className="w-10 h-10 rounded-full border border-[#cbd5e1] hover:border-[#06121e] flex items-center justify-center text-lg font-medium text-[#06121e] transition-colors"
                  aria-label="Increase adults"
                >
                  +
                </button>
              </div>
            </div>

            {/* Children Stepper */}
            <div className="flex items-center justify-between pt-4 border-t border-[#f1f5f9]">
              <div>
                <div className="text-sm font-medium text-[#06121e]">
                  {isEs ? 'Niños' : 'Children'}
                </div>
                <div className="text-xs text-[#64748b] font-light">
                  {isEs ? 'Menores de 12 años' : 'Under 12 years'}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setChildren((prev) => Math.max(0, prev - 1))}
                  className="w-10 h-10 rounded-full border border-[#cbd5e1] hover:border-[#06121e] flex items-center justify-center text-lg font-medium text-[#06121e] transition-colors"
                  aria-label="Decrease children"
                >
                  -
                </button>
                <span className="w-8 text-center text-lg font-bold font-mono text-[#06121e]">
                  {children}
                </span>
                <button
                  type="button"
                  onClick={() => setChildren((prev) => Math.min(8, prev + 1))}
                  className="w-10 h-10 rounded-full border border-[#cbd5e1] hover:border-[#06121e] flex items-center justify-center text-lg font-medium text-[#06121e] transition-colors"
                  aria-label="Increase children"
                >
                  +
                </button>
              </div>
            </div>

            {/* Total Travelers Badge */}
            <div className="p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-2xl flex items-center justify-between text-xs text-[#334155]">
              <span className="font-mono uppercase tracking-wider text-[#64748b]">
                {isEs ? 'Total Pasajeros:' : 'Total Travelers:'}
              </span>
              <span className="font-bold text-sm text-[#0e7490] font-mono">
                {adults + children} {adults + children === 1 ? (isEs ? 'Persona' : 'Person') : (isEs ? 'Personas' : 'People')}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setCurrentStep(2)}
              className="py-3 px-5 text-xs font-medium uppercase tracking-[0.14em] text-[#64748b] hover:text-[#06121e]"
            >
              {isEs ? 'Atrás' : 'Back'}
            </button>
            <button
              onClick={() => setCurrentStep(4)}
              className="py-3.5 px-6 rounded-xl bg-[#06121e] hover:bg-[#0e7490] text-white text-xs uppercase tracking-[0.16em] font-medium transition-all flex items-center gap-2 shadow-sm"
            >
              <span>{isEs ? 'Continuar a Datos del Viaje' : 'Continue to Trip Details'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          STEP 4: TRIP INFORMATION (ONLY GENUINELY REQUIRED FIELDS)
         ======================================================== */}
      {currentStep === 4 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="text-center max-w-xl mx-auto mb-6">
            <h3 className="text-2xl sm:text-3xl font-display font-light text-[#06121e]">
              {isEs ? 'Información para la Reserva' : 'Trip Information'}
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] font-light mt-1">
              {isEs
                ? 'Solo solicitamos los datos estrictamente necesarios para su recogida y confirmación.'
                : 'We collect only the information genuinely required for your pickup and reservation.'}
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-[#e2d8c5] shadow-sm max-w-xl mx-auto space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-1.5">
                {isEs ? 'Nombre Completo del Titular *' : 'Full Name *'}
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
              {formErrors.fullName && (
                <p className="text-xs text-red-500 mt-1">{formErrors.fullName}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-1.5">
                {isEs ? 'Correo Electrónico (para confirmación) *' : 'Email Address (for confirmation) *'}
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
              {formErrors.email && (
                <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
              )}
            </div>

            {/* WhatsApp / Phone */}
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
              {formErrors.phone && (
                <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>
              )}
              <p className="text-[11px] text-[#64748b] mt-1 font-light">
                {isEs
                  ? 'El conductor enviará un mensaje la tarde previa con la hora exacta y placa del 4x4.'
                  : 'The driver coordinates exact pickup time and vehicle plate via WhatsApp the evening prior.'}
              </p>
            </div>

            {/* Hotel or Pickup Location */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-1.5">
                {isEs ? 'Hotel o Lugar de Recogida en Ciudad de Panamá *' : 'Hotel or Pickup Location in Panama City *'}
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
              {formErrors.pickupLocation && (
                <p className="text-xs text-red-500 mt-1">{formErrors.pickupLocation}</p>
              )}
            </div>

            {/* Special Notes (Optional) */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-1.5">
                {isEs ? 'Notas Especiales o Preferencias Dietéticas (Opcional)' : 'Special Notes or Dietary Preferences (Optional)'}
              </label>
              <textarea
                rows={2}
                placeholder={isEs ? 'Ej. Almuerzo vegetariano, celebración de cumpleaños...' : 'e.g., Vegetarian lunch request, anniversary trip...'}
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#cbd5e1] bg-[#faf8f5] focus:outline-none focus:border-[#0e7490]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setCurrentStep(3)}
              className="py-3 px-5 text-xs font-medium uppercase tracking-[0.14em] text-[#64748b] hover:text-[#06121e]"
            >
              {isEs ? 'Atrás' : 'Back'}
            </button>
            <button
              onClick={() => {
                if (validateStep4()) {
                  setCurrentStep(5);
                }
              }}
              className="py-3.5 px-6 rounded-xl bg-[#06121e] hover:bg-[#0e7490] text-white text-xs uppercase tracking-[0.16em] font-medium transition-all flex items-center gap-2 shadow-sm"
            >
              <span>{isEs ? 'Revisar Reserva' : 'Review Reservation'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          STEP 5: REVIEW RESERVATION SUMMARY
         ======================================================== */}
      {currentStep === 5 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="text-center max-w-xl mx-auto mb-6">
            <h3 className="text-2xl sm:text-3xl font-display font-light text-[#06121e]">
              {isEs ? 'Resumen de su Reserva' : 'Reservation Summary'}
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] font-light mt-1">
              {isEs
                ? 'Verifique los detalles antes de continuar al pago seguro.'
                : 'Please verify the details before continuing to secure checkout.'}
            </p>
          </div>

          {/* Luxury Editorial Summary Card */}
          <div className="bg-white rounded-3xl border border-[#e2d8c5] shadow-sm overflow-hidden max-w-2xl mx-auto">
            <div className="bg-[#06121e] text-white p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#38bdf8]">
                  {isEs ? 'Excursión Seleccionada' : 'Selected Journey'}
                </span>
                <h4 className="text-xl sm:text-2xl font-display font-light">
                  {dayTripExperience.title[currentLang]}
                </h4>
              </div>
              <div className="text-right">
                <span className="text-xs text-white/70 block">
                  {isEs ? 'Duración:' : 'Duration:'}
                </span>
                <span className="text-sm font-mono text-cyan-300">
                  5:00 AM – 7:00 PM
                </span>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              {/* Itemized Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-[#f8fafc] rounded-2xl border border-[#f1f5f9]">
                  <span className="text-[#64748b] font-mono uppercase tracking-wider block mb-1">
                    {isEs ? 'Fecha de Viaje' : 'Travel Date'}
                  </span>
                  <span className="font-semibold text-sm text-[#06121e]">
                    {selectedDate}
                  </span>
                </div>

                <div className="p-3.5 bg-[#f8fafc] rounded-2xl border border-[#f1f5f9]">
                  <span className="text-[#64748b] font-mono uppercase tracking-wider block mb-1">
                    {isEs ? 'Pasajeros' : 'Travelers'}
                  </span>
                  <span className="font-semibold text-sm text-[#06121e]">
                    {adults} {isEs ? 'Adultos' : 'Adults'}
                    {children > 0 ? `, ${children} ${isEs ? 'Niños' : 'Children'}` : ''}
                  </span>
                </div>

                <div className="p-3.5 bg-[#f8fafc] rounded-2xl border border-[#f1f5f9]">
                  <span className="text-[#64748b] font-mono uppercase tracking-wider block mb-1">
                    {isEs ? 'Lugar de Recogida' : 'Pickup Location'}
                  </span>
                  <span className="font-semibold text-sm text-[#06121e] line-clamp-1">
                    {pickupLocation}
                  </span>
                </div>

                <div className="p-3.5 bg-[#f8fafc] rounded-2xl border border-[#f1f5f9]">
                  <span className="text-[#64748b] font-mono uppercase tracking-wider block mb-1">
                    {isEs ? 'Titular de Reserva' : 'Lead Traveler'}
                  </span>
                  <span className="font-semibold text-sm text-[#06121e] line-clamp-1">
                    {fullName} ({phone})
                  </span>
                </div>
              </div>

              {/* What is Included Notice */}
              <div className="p-4 bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl text-xs text-[#166534] space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{isEs ? 'Incluido en su reserva:' : 'Included with your reservation:'}</span>
                </div>
                <p className="font-light text-[11px] leading-relaxed">
                  {isEs
                    ? 'Transporte compartido 4x4 ida y vuelta desde Ciudad de Panamá, lancha rápida con capitán guna, visita a 2-3 islas y piscina natural, almuerzo tradicional de pescado o pollo con arroz con coco.'
                    : 'Roundtrip shared 4x4 transport from Panama City, Guna speedboat with captain, visits to 2-3 coral islands & starfish sandbank, fresh traditional lunch.'}
                </p>
              </div>

              {/* Important Cash Tax Notice */}
              <div className="p-4 bg-[#fffbeb] border border-[#fde68a] rounded-2xl text-xs text-[#92400e] space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>{isEs ? 'Recordatorio de entrada a la Comarca:' : 'Comarca Entry Reminder:'}</span>
                </div>
                <p className="font-light text-[11px] leading-relaxed">
                  {isEs
                    ? 'Debe llevar su pasaporte físico original. Entrance and port fees will be confirmed in your quotation.'
                    : 'Original physical passport is required. Entrance and port fees will be confirmed in your quotation.'}
                </p>
              </div>

              {/* Confirmed Rate Note */}
              <div className="pt-2 text-xs text-[#64748b] text-center font-light">
                {dayTripExperience.pricingNote[currentLang]}
              </div>
            </div>

            <div className="p-6 bg-[#faf8f5] border-t border-[#e2d8c5] flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                onClick={() => setCurrentStep(4)}
                className="text-xs font-medium uppercase tracking-[0.14em] text-[#64748b] hover:text-[#06121e]"
              >
                {isEs ? 'Modificar Datos' : 'Edit Details'}
              </button>

              <button
                onClick={handleProceedToRequestStep}
                className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-[#06121e] hover:bg-[#0e7490] text-white text-xs uppercase tracking-[0.16em] font-medium transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span>{isEs ? 'Continuar a Solicitud de Reserva' : 'Continue to Booking Request'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          STEP 6: BOOKING REQUEST SUBMISSION
          (Transparent request state; no fake payment processing)
         ======================================================== */}
      {currentStep === 6 && (
        <div className="space-y-6 animate-fadeIn">
          <div className="text-center max-w-xl mx-auto mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-mono uppercase tracking-[0.18em] mb-3">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>{isEs ? 'Solicitud de Reserva de Pasadía' : 'Day Tour Booking Request'}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-display font-light text-[#06121e]">
              {isEs ? 'Enviar Solicitud de Pasadía' : 'Submit Day Tour Request'}
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] font-light mt-2 leading-relaxed">
              {isEs
                ? 'Esta es una solicitud de reserva, no una reserva confirmada. Nuestro equipo verificará la disponibilidad de cupos en el 4x4 y la lancha antes de emitir los datos de pago.'
                : 'This is a booking request, not a confirmed reservation. Our team will verify 4x4 vehicle and boat capacity before issuing payment instructions.'}
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-[#e2d8c5] shadow-sm p-6 sm:p-8 max-w-xl mx-auto space-y-6">
            <div className="p-4 bg-[#f8fafc] rounded-2xl border border-[#e2e8f0] space-y-2.5">
              <div className="flex justify-between text-xs text-[#64748b]">
                <span>{isEs ? 'Experiencia:' : 'Experience:'}</span>
                <span className="font-semibold text-[#06121e]">{dayTripExperience.title[currentLang]}</span>
              </div>
              <div className="flex justify-between text-xs text-[#64748b]">
                <span>{isEs ? 'Fecha Solicitada:' : 'Requested Date:'}</span>
                <span className="font-semibold text-[#06121e]">{selectedDate}</span>
              </div>
              <div className="flex justify-between text-xs text-[#64748b]">
                <span>{isEs ? 'Pasajeros:' : 'Travelers:'}</span>
                <span className="font-semibold text-[#06121e]">
                  {adults} {isEs ? 'Adultos' : 'Adults'}{children > 0 ? `, ${children} ${isEs ? 'Niños' : 'Children'}` : ''}
                </span>
              </div>
              <div className="flex justify-between text-xs text-[#64748b]">
                <span>{isEs ? 'Punto de Recogida:' : 'Pickup Location:'}</span>
                <span className="font-semibold text-[#06121e] line-clamp-1">{pickupLocation}</span>
              </div>
              <div className="flex justify-between text-xs text-[#64748b]">
                <span>{isEs ? 'Titular:' : 'Lead Customer:'}</span>
                <span className="font-semibold text-[#06121e]">{fullName} ({email})</span>
              </div>
            </div>

            {/* Terms and Submission */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-2.5 p-3.5 bg-[#FAF8F5] border border-[#E2D8C5] rounded-xl text-xs text-[#334155]">
                <input
                  type="checkbox"
                  id="shared-tour-terms-chk"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-[#C8AC75] text-[#061815] focus:ring-[#061815]"
                />
                <label htmlFor="shared-tour-terms-chk" className="cursor-pointer select-none">
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
                      {' '}aplicables a mi solicitud de reserva de pasadía.
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
                      {' '}applicable to my day tour booking request.
                    </>
                  )}
                </label>
              </div>

              <button
                type="button"
                onClick={handleBookingRequestSubmit}
                disabled={isSubmitting}
                className={`w-full py-4 px-6 rounded-xl text-xs uppercase tracking-[0.18em] font-semibold transition-all flex items-center justify-center gap-2.5 shadow-md ${
                  isSubmitting
                    ? 'bg-gray-400 text-white cursor-wait'
                    : termsAccepted
                    ? 'bg-[#06121e] hover:bg-[#0e7490] text-white cursor-pointer shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>
                  {isSubmitting
                    ? (isEs ? 'Enviando Solicitud...' : 'Submitting Request...')
                    : (isEs ? 'Enviar Solicitud de Pasadía' : 'Submit Day Tour Request')}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[11px] text-center text-[#64748b] font-light">
                {isEs
                  ? 'Nuestro equipo de atención al cliente verificará inmediatamente la disponibilidad del 4x4 y del bote.'
                  : 'Our team will immediately verify 4x4 seat allocation and boat availability for your target date.'}
              </p>

              <button
                onClick={() => setCurrentStep(5)}
                className="w-full py-2.5 text-xs text-[#64748b] hover:text-[#06121e] uppercase tracking-wider font-medium"
              >
                {isEs ? 'Volver a la Revisión' : 'Back to Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          STEP 7: CONFIRMATION / ACKNOWLEDGEMENT SCREEN
          "SOLICITUD DE PASADÍA RECIBIDA"
         ======================================================== */}
      {currentStep === 7 && (
        <div className="space-y-8 animate-fadeIn">
          {/* Header Banner */}
          <div className="text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Check className="w-8 h-8" />
            </div>

            <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-amber-700 font-semibold block mb-2">
              {isEs ? 'Solicitud Recibida' : 'Request Received'}
            </span>

            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-display font-light text-[#06121e] tracking-tight">
              {isEs ? 'Solicitud de Pasadía Recibida' : 'Day Tour Request Received'}
            </h3>

            <p className="mt-3 text-sm text-[#475569] font-light max-w-lg mx-auto leading-relaxed">
              {isEs
                ? 'Hemos registrado su solicitud de pasadía. Esta es una solicitud de reserva, no una reserva confirmada. Verificaremos la disponibilidad de 4x4 y lancha antes de confirmarle.'
                : 'Your day tour request has been recorded. This is a booking request, not a confirmed reservation. We will verify 4x4 vehicle and boat capacity before issuing payment details.'}
            </p>
          </div>

          {/* Luxury Confirmation Summary Card */}
          <div className="bg-white rounded-3xl border border-[#e2d8c5] shadow-sm overflow-hidden max-w-2xl mx-auto">
            <div className="bg-[#06121e] text-white p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#38bdf8] block">
                  {isEs ? 'Referencia de Solicitud' : 'Request Reference'}
                </span>
                <span className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-wider">
                  {reservationNumber || 'GNY-PENDING'}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-mono">
                <Clock className="w-3.5 h-3.5" />
                <span>{isEs ? 'Estado: Solicitud Pendiente de Verificación' : 'Status: Request Awaiting Verification'}</span>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {/* Confirmed Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-[#f8fafc] rounded-2xl border border-[#f1f5f9]">
                  <span className="text-[#64748b] font-mono uppercase tracking-wider block mb-1">
                    {isEs ? 'Experiencia' : 'Experience'}
                  </span>
                  <span className="font-semibold text-sm text-[#06121e]">
                    {dayTripExperience.title[currentLang]}
                  </span>
                </div>

                <div className="p-3.5 bg-[#f8fafc] rounded-2xl border border-[#f1f5f9]">
                  <span className="text-[#64748b] font-mono uppercase tracking-wider block mb-1">
                    {isEs ? 'Fecha Solicitada' : 'Requested Date'}
                  </span>
                  <span className="font-semibold text-sm text-[#06121e]">
                    {selectedDate}
                  </span>
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
                    {isEs ? 'Punto de Recogida' : 'Pickup Location'}
                  </span>
                  <span className="font-semibold text-sm text-[#06121e]">
                    {pickupLocation}
                  </span>
                </div>

                <div className="p-3.5 bg-[#f8fafc] rounded-2xl border border-[#f1f5f9] sm:col-span-2">
                  <span className="text-[#64748b] font-mono uppercase tracking-wider block mb-1">
                    {isEs ? 'Datos del Cliente' : 'Customer Details'}
                  </span>
                  <span className="font-medium text-[#06121e]">
                    {fullName} · {email} · {phone}
                  </span>
                  {specialNotes && (
                    <p className="mt-1 text-xs text-[#475569] italic">
                      "{specialNotes}"
                    </p>
                  )}
                </div>
              </div>

              {/* What Happens Next Steps */}
              <div className="space-y-3 pt-4 border-t border-[#f1f5f9]">
                <h5 className="text-xs font-mono uppercase tracking-[0.18em] text-[#06121e] font-semibold">
                  {isEs ? 'Próximos Pasos del Proceso' : 'What Happens Next'}
                </h5>

                <div className="space-y-2.5 text-xs text-[#334155] font-light">
                  <div className="flex items-start gap-3 p-3 bg-[#faf8f5] rounded-xl border border-[#e5dccb]">
                    <span className="w-5 h-5 rounded-full bg-[#06121e] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      1
                    </span>
                    <div>
                      <span className="font-semibold text-[#06121e]">
                        {isEs ? 'Acuse de Recibo Enviado:' : 'Acknowledgement Dispatched:'}
                      </span>{' '}
                      {isEs
                        ? `Se ha enviado un correo de confirmación de solicitud con la referencia ${reservationNumber} a ${email}.`
                        : `An automatic acknowledgement email with reference ${reservationNumber} has been sent to ${email}.`}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#faf8f5] rounded-xl border border-[#e5dccb]">
                    <span className="w-5 h-5 rounded-full bg-[#06121e] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      2
                    </span>
                    <div>
                      <span className="font-semibold text-[#06121e]">
                        {isEs ? 'Verificación de Cupos:' : 'Availability Verification:'}
                      </span>{' '}
                      {isEs
                        ? 'Petra y el equipo de logística verificarán la capacidad del vehículo 4x4 y la lancha.'
                        : 'Petra and the operations team will verify 4x4 seat capacity and boat space for your travel date.'}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#faf8f5] rounded-xl border border-[#e5dccb]">
                    <span className="w-5 h-5 rounded-full bg-[#06121e] text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <span className="font-semibold text-[#06121e]">
                        {isEs ? 'Contacto Directo:' : 'Direct Follow-Up:'}
                      </span>{' '}
                      {isEs
                        ? `Le contactaremos vía WhatsApp (${phone}) o correo con los detalles de confirmación y pago.`
                        : `We will contact you via WhatsApp (${phone}) or email with confirmation and payment instructions.`}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#fffbeb] rounded-xl border border-[#fde68a] text-[#92400e]">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">
                        {isEs ? 'Recordatorio Obligatorio:' : 'Mandatory Checklist:'}
                      </span>{' '}
                      {isEs
                        ? 'Recuerde que debe llevar su pasaporte físico original el día del viaje.'
                        : 'Remember that an original physical passport is required on the day of travel.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct WhatsApp fast connect */}
            {(() => {
              const whatsappMsg = isEs
                ? `Hola Guna Yala Panama Travel, acabo de enviar la solicitud de Pasadía ${reservationNumber} para el ${selectedDate}.`
                : `Hello Guna Yala Panama Travel, I just submitted Day Tour request ${reservationNumber} for ${selectedDate}.`;
              const waUrl = `https://wa.me/50764443649?text=${encodeURIComponent(whatsappMsg)}`;

              return (
                <div className="p-6 bg-[#f8fafc] border-t border-[#e2e8f0] text-center space-y-3">
                  <p className="text-xs text-[#64748b]">
                    {isEs ? '¿Desea acelerar la respuesta de su solicitud?' : 'Want to fast-track your request confirmation?'}
                  </p>
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 py-3 px-6 rounded-xl bg-[#25D366] hover:bg-[#1ebd59] text-white text-xs uppercase tracking-[0.14em] font-semibold transition-all shadow-sm"
                  >
                    <Phone className="w-4 h-4 fill-current" />
                    <span>{isEs ? 'Contactar por WhatsApp (+507 6444-3649)' : 'Contact via WhatsApp (+507 6444-3649)'}</span>
                  </a>
                </div>
              );
            })()}

            <div className="p-6 bg-white border-t border-[#e2d8c5] text-center">
              <button
                onClick={onBackToSelector}
                className="py-3 px-8 rounded-xl bg-[#06121e] hover:bg-[#0e7490] text-white text-xs uppercase tracking-[0.16em] font-medium transition-all"
              >
                {isEs ? 'Volver a Experiencias' : 'Return to Experiences'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
