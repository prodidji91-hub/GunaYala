import React, { useState } from 'react';
import { Language, Experience } from '../../types';
import { EXPERIENCES_DATA } from '../../data/experiences';
import { VisualAsset } from '../../pictures';
import {
  Moon,
  Clock,
  Users,
  Home,
  Check,
  Send,
  MessageCircle,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Sparkles,
  Info,
  ChevronRight,
} from 'lucide-react';

interface OvernightFlowProps {
  currentLang: Language;
  onBackToSelector: () => void;
  onOpenDetailsModal?: (exp: Experience) => void;
}

export const OvernightFlow: React.FC<OvernightFlowProps> = ({
  currentLang,
  onBackToSelector,
  onOpenDetailsModal,
}) => {
  const isEs = currentLang === 'es';

  // Filter overnight-related experiences
  const overnightExperiences = EXPERIENCES_DATA.filter(
    (e) => e.category === 'overnight' || e.category === 'multi-day' || e.category === 'sailing'
  );

  const [step, setStep] = useState<'browse' | 'inquire' | 'submitted'>('browse');
  const [selectedExperience, setSelectedExperience] = useState<Experience>(
    overnightExperiences[0] || EXPERIENCES_DATA[1]
  );

  // Inquiry Form State
  const [nights, setNights] = useState<'1' | '2' | '3+'>('1');
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);
  const [targetDate, setTargetDate] = useState<string>('');
  const [dateFlexibility, setDateFlexibility] = useState<'exact' | 'flexible'>('flexible');
  const [cabanaStyle, setCabanaStyle] = useState<'rustic' | 'private' | 'sailing'>('rustic');
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);

  const validateInquiry = () => {
    const errors: { [key: string]: string } = {};
    if (!fullName.trim()) errors.fullName = isEs ? 'Ingrese su nombre' : 'Please enter your name';
    if (!email.trim() || !email.includes('@')) errors.email = isEs ? 'Correo inválido' : 'Valid email required';
    if (!phone.trim()) errors.phone = isEs ? 'WhatsApp o teléfono requerido' : 'WhatsApp or phone required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      alert(isEs ? 'Debe aceptar los Términos y Condiciones para continuar.' : 'Please acknowledge the Terms & Conditions to proceed.');
      return;
    }
    if (validateInquiry()) {
      setStep('submitted');
    }
  };

  // WhatsApp template builder according to Section 6 specifications
  const getWhatsappText = () => {
    const expTitle = selectedExperience.title[currentLang];
    const dateStr = targetDate || (isEs ? 'Flexible' : 'Flexible');
    const interestsStr = cabanaStyle === 'rustic' 
      ? (isEs ? 'Cabaña Tradicional de Playa' : 'Traditional Beachfront Cabana') 
      : cabanaStyle === 'private' 
      ? (isEs ? 'Habitación Privada con Baño' : 'Private Room with Bath')
      : (isEs ? 'Cabina Náutica' : 'Nautical Vessel Cabin');
    const specialRequests = notes.trim() || (isEs ? 'Ninguna' : 'None');
    const termsNote = isEs
      ? `\n\nEl cliente reconoció los Términos y Condiciones de Estadía Nocturna (versión 2026-10-18) antes de abrir WhatsApp.`
      : `\n\nCustomer acknowledged the Overnight Stay Terms & Conditions (version 2026-10-18) before opening WhatsApp.`;

    if (isEs) {
      return encodeURIComponent(
        `¡Hola Guna Yala Panama Travel!\n\nMe gustaría solicitar información sobre una experiencia de ${expTitle}.\n\nFecha preferida: ${dateStr}\nAdultos: ${adults}\nNiños: ${children}\nNoches: ${nights}\nIntereses: ${interestsStr}\nSolicitudes especiales: ${specialRequests}\n\n¿Podrían confirmar disponibilidad y enviarme una cotización?` + termsNote
      );
    }

    return encodeURIComponent(
      `Hello Guna Yala Panama Travel!\n\nI would like to inquire about an ${expTitle} experience.\n\nPreferred date: ${dateStr}\nAdults: ${adults}\nChildren: ${children}\nNights: ${nights}\nInterests: ${interestsStr}\nSpecial requests: ${specialRequests}\n\nCould you please confirm availability and provide a quotation?` + termsNote
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-[#e5dccb]">
        <button
          onClick={step === 'browse' ? onBackToSelector : () => setStep('browse')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#475569] hover:text-[#06121e] uppercase tracking-[0.14em] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{step === 'browse' ? (isEs ? 'Volver a Opciones' : 'Back to Options') : (isEs ? 'Explorar Estadías' : 'Browse Experiences')}</span>
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
          PHASE 1: BROWSE OVERNIGHT EXPERIENCES
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
            {overnightExperiences.map((exp) => {
              const isSelected = selectedExperience.id === exp.id;
              return (
                <div
                  key={exp.id}
                  className={`bg-white rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-lg ${
                    isSelected ? 'border-[#1e3a5f] ring-2 ring-[#1e3a5f]/20' : 'border-[#e2d8c5]'
                  }`}
                >
                  <div>
                    <div className="relative aspect-[16/10] bg-[#e8e2d5]">
                      <VisualAsset
                        variant={exp.imageType}
                        alt={exp.title[currentLang]}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 bg-[#06121e]/85 backdrop-blur-md text-white text-[10px] font-mono uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-white/15">
                        {exp.duration[currentLang].split('(')[0]}
                      </div>
                    </div>

                    <div className="p-6">
                      <h4 className="text-xl font-display font-medium text-[#06121e] mb-2">
                        {exp.title[currentLang]}
                      </h4>
                      <p className="text-xs sm:text-sm text-[#475569] font-light leading-relaxed mb-4">
                        {exp.subtitle[currentLang]}
                      </p>

                      <div className="space-y-1.5 text-xs text-[#334155] font-light mb-4">
                        {exp.highlights[currentLang].slice(0, 3).map((hl, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-[#1e3a5f] font-bold">✓</span>
                            <span>{hl}</span>
                          </div>
                        ))}
                      </div>

                      {exp.accommodation && (
                        <div className="p-3 bg-[#f8fafc] rounded-xl border border-[#e2e8f0] text-xs text-[#475569] flex items-start gap-2 mb-4">
                          <Home className="w-4 h-4 text-[#1e3a5f] shrink-0 mt-0.5" />
                          <span>{exp.accommodation[currentLang]}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-6 pt-0 flex items-center gap-3">
                    {onOpenDetailsModal && (
                      <button
                        onClick={() => onOpenDetailsModal(exp)}
                        className="py-2.5 px-4 text-xs font-medium uppercase tracking-[0.14em] text-[#06121e] bg-[#faf8f5] hover:bg-[#ede5d6] rounded-xl border border-[#e2d8c5] transition-colors"
                      >
                        {isEs ? 'Ver Detalles' : 'View Details'}
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setSelectedExperience(exp);
                        setStep('inquire');
                      }}
                      className="flex-1 py-3 px-4 rounded-xl bg-[#06121e] hover:bg-[#1e3a5f] text-white text-xs uppercase tracking-[0.16em] font-medium transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <span>{isEs ? 'Planear con Petra' : 'Inquire with Petra'}</span>
                      <ArrowRight className="w-4 h-4" />
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
          <div className="text-center max-w-xl mx-auto mb-6">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#1e3a5f] block mb-1">
              {isEs ? 'Experiencia Elegida' : 'Selected Experience'}
            </span>
            <h3 className="text-2xl sm:text-3xl font-display font-light text-[#06121e]">
              {selectedExperience.title[currentLang]}
            </h3>
            <p className="text-xs sm:text-sm text-[#475569] font-light mt-1">
              {isEs
                ? 'Indíquenos sus fechas y preferencias para que Petra coordine la cabaña y le envíe una cotización clara.'
                : 'Share your dates and preferences so Petra can check cabana availability and prepare an itemized quote.'}
            </p>
          </div>

          <form onSubmit={handleSubmitInquiry} className="bg-white p-6 sm:p-8 rounded-3xl border border-[#e2d8c5] shadow-sm max-w-2xl mx-auto space-y-6">
            {/* Nights Duration Selection */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-2">
                {isEs ? 'Duración de la Estadía' : 'Length of Stay'}
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: '1', label: isEs ? '1 Noche' : '1 Night', sub: isEs ? '2 días en islas' : '2 island days' },
                  { id: '2', label: isEs ? '2 Noches' : '2 Nights', sub: isEs ? '3 días en islas' : '3 island days' },
                  { id: '3+', label: isEs ? '3+ Noches' : '3+ Nights', sub: isEs ? 'Inmersión profunda' : 'Deep exploration' },
                ].map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setNights(n.id as any)}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      nights === n.id
                        ? 'bg-[#06121e] text-white border-[#06121e] shadow-sm'
                        : 'bg-[#faf8f5] border-[#e2d8c5] text-[#334155] hover:border-[#1e3a5f]'
                    }`}
                  >
                    <span className="block text-sm font-semibold">{n.label}</span>
                    <span className="block text-[10px] opacity-75 font-mono">{n.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dates & Flexibility */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-1.5">
                  {isEs ? 'Fecha Deseada' : 'Target Travel Date'}
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#cbd5e1] bg-[#faf8f5] focus:outline-none focus:border-[#1e3a5f]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-1.5">
                  {isEs ? 'Flexibilidad de Fechas' : 'Date Flexibility'}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDateFlexibility('flexible')}
                    className={`flex-1 py-2.5 text-xs rounded-xl border transition-all ${
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
                    className={`flex-1 py-2.5 text-xs rounded-xl border transition-all ${
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
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#faf8f5] rounded-xl border border-[#e2d8c5] flex items-center justify-between">
                  <span className="text-xs text-[#475569] font-medium">{isEs ? 'Adultos (12+)' : 'Adults (12+)'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAdults((prev) => Math.max(1, prev - 1))}
                      className="w-7 h-7 rounded-full bg-white border border-[#cbd5e1] flex items-center justify-center font-bold"
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-mono font-bold">{adults}</span>
                    <button
                      type="button"
                      onClick={() => setAdults((prev) => prev + 1)}
                      className="w-7 h-7 rounded-full bg-white border border-[#cbd5e1] flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-[#faf8f5] rounded-xl border border-[#e2d8c5] flex items-center justify-between">
                  <span className="text-xs text-[#475569] font-medium">{isEs ? 'Niños' : 'Children'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setChildren((prev) => Math.max(0, prev - 1))}
                      className="w-7 h-7 rounded-full bg-white border border-[#cbd5e1] flex items-center justify-center font-bold"
                    >
                      -
                    </button>
                    <span className="w-5 text-center font-mono font-bold">{children}</span>
                    <button
                      type="button"
                      onClick={() => setChildren((prev) => prev + 1)}
                      className="w-7 h-7 rounded-full bg-white border border-[#cbd5e1] flex items-center justify-center font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Cabana Style Preference */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-2">
                {isEs ? 'Preferencia de Alojamiento' : 'Accommodation Preference'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'rustic', label: isEs ? 'Cabaña Tradicional' : 'Traditional Cabana', sub: isEs ? 'Suelo de arena' : 'Sand floor beachfront' },
                  { id: 'private', label: isEs ? 'Habitación Privada' : 'Private Room', sub: isEs ? 'Piso de madera' : 'Wood floor & bath' },
                  { id: 'sailing', label: isEs ? 'Cabina en Barco' : 'Boat Cabin', sub: isEs ? 'Velero o catamarán' : 'Sailboat / catamaran' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCabanaStyle(c.id as any)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      cabanaStyle === c.id
                        ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                        : 'bg-[#faf8f5] border-[#e2d8c5] text-[#334155]'
                    }`}
                  >
                    <span className="block text-xs font-semibold">{c.label}</span>
                    <span className="block text-[10px] opacity-75 font-mono">{c.sub}</span>
                  </button>
                ))}
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
                    onChange={(e) => setFullName(e.target.value)}
                    className={`w-full px-4 py-2.5 text-sm rounded-xl border ${
                      formErrors.fullName ? 'border-red-400 bg-red-50/30' : 'border-[#cbd5e1] bg-[#faf8f5]'
                    } focus:outline-none focus:border-[#1e3a5f]`}
                  />
                  {formErrors.fullName && <p className="text-xs text-red-500 mt-1">{formErrors.fullName}</p>}
                </div>

                <div>
                  <input
                    type="email"
                    placeholder={isEs ? 'Correo Electrónico *' : 'Email Address *'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-2.5 text-sm rounded-xl border ${
                      formErrors.email ? 'border-red-400 bg-red-50/30' : 'border-[#cbd5e1] bg-[#faf8f5]'
                    } focus:outline-none focus:border-[#1e3a5f]`}
                  />
                  {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                </div>
              </div>

              <div>
                <input
                  type="tel"
                  placeholder={isEs ? 'WhatsApp / Teléfono Móvil *' : 'WhatsApp / Mobile Phone *'}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full px-4 py-2.5 text-sm rounded-xl border ${
                    formErrors.phone ? 'border-red-400 bg-red-50/30' : 'border-[#cbd5e1] bg-[#faf8f5]'
                  } focus:outline-none focus:border-[#1e3a5f]`}
                />
                {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
              </div>

              <div>
                <textarea
                  rows={2}
                  placeholder={isEs ? 'Preguntas para Petra o requerimientos dietéticos (opcional)...' : 'Questions for Petra or dietary requests (optional)...'}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#cbd5e1] bg-[#faf8f5] focus:outline-none focus:border-[#1e3a5f]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-2.5 p-3.5 bg-[#FAF8F5] border border-[#E2D8C5] rounded-xl text-xs text-[#334155]">
                <input
                  type="checkbox"
                  id="overnight-terms-chk"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 rounded border-[#C8AC75] text-[#061815] focus:ring-[#061815]"
                />
                <label htmlFor="overnight-terms-chk" className="cursor-pointer select-none">
                  {isEs ? (
                    <>
                      He leído y reconozco los{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          window.dispatchEvent(new CustomEvent('open-terms', { detail: 'overnight' }));
                        }}
                        className="text-[#061815] font-semibold underline hover:text-[#C8AC75]"
                      >
                        Términos y Condiciones de Estadía Nocturna
                      </button>
                      . *
                    </>
                  ) : (
                    <>
                      I have read and acknowledge the{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          window.dispatchEvent(new CustomEvent('open-terms', { detail: 'overnight' }));
                        }}
                        className="text-[#061815] font-semibold underline hover:text-[#C8AC75]"
                      >
                        Overnight Stay Terms & Conditions
                      </button>
                      . *
                    </>
                  )}
                </label>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setStep('browse')}
                  className="text-xs font-medium uppercase tracking-[0.14em] text-[#64748b] hover:text-[#06121e]"
                >
                  {isEs ? 'Cambiar Experiencia' : 'Change Experience'}
                </button>

                <button
                  type="submit"
                  disabled={!termsAccepted}
                  className={`w-full sm:w-auto py-3.5 px-8 rounded-xl text-xs uppercase tracking-[0.16em] font-medium transition-all flex items-center justify-center gap-2 shadow-sm ${
                    termsAccepted ? 'bg-[#06121e] hover:bg-[#1e3a5f] text-white cursor-pointer' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>{isEs ? 'Enviar Solicitud a Petra' : 'Submit Inquiry to Petra'}</span>
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
        <div className="space-y-6 text-center max-w-xl mx-auto py-8 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8" />
          </div>

          <h3 className="text-2xl sm:text-3xl font-display font-light text-[#06121e]">
            {isEs ? 'Solicitud de Estadía Enviada' : 'Overnight Inquiry Received'}
          </h3>

          <p className="text-sm text-[#475569] font-light leading-relaxed">
            {isEs
              ? `Gracias ${fullName}. Petra verificará la disponibilidad de cabañas en ${selectedExperience.title.es} para las fechas indicadas y le contactará a la brevedad.`
              : `Thank you, ${fullName}. Petra is coordinating with local island cabana hosts for ${selectedExperience.title.en} and will reach out with confirmed availability.`}
          </p>

          <div className="p-5 bg-white rounded-2xl border border-[#e2d8c5] text-left text-xs space-y-2">
            <div className="font-semibold text-[#06121e] border-b border-[#f1f5f9] pb-2">
              {isEs ? 'Resumen de su Solicitud:' : 'Summary of Your Inquiry:'}
            </div>
            <div><span className="text-[#64748b]">{isEs ? 'Experiencia:' : 'Experience:'}</span> {selectedExperience.title[currentLang]}</div>
            <div><span className="text-[#64748b]">{isEs ? 'Noches:' : 'Duration:'}</span> {nights} {isEs ? 'Noches' : 'Nights'}</div>
            <div><span className="text-[#64748b]">{isEs ? 'Viajeros:' : 'Travelers:'}</span> {adults + children} ({adults} Adults, {children} Children)</div>
            <div><span className="text-[#64748b]">{isEs ? 'Contacto:' : 'Contact:'}</span> {email} · {phone}</div>
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
              className="inline-flex items-center gap-2 py-2.5 px-6 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-medium shadow-sm transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{isEs ? 'Abrir en WhatsApp con Petra' : 'Chat with Petra on WhatsApp'}</span>
            </a>
          </div>

          <div className="pt-4">
            <button
              onClick={onBackToSelector}
              className="py-2.5 px-6 text-xs uppercase tracking-wider text-[#64748b] hover:text-[#06121e]"
            >
              {isEs ? 'Volver al Inicio del Planificador' : 'Back to Experience Selection'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
