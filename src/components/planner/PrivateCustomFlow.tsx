import React, { useState } from 'react';
import { Language } from '../../types';
import {
  Sparkles,
  Ship,
  Users,
  Calendar,
  Send,
  MessageCircle,
  ArrowLeft,
  Check,
  Compass,
  Anchor,
} from 'lucide-react';

interface PrivateCustomFlowProps {
  currentLang: Language;
  onBackToSelector: () => void;
}

export const PrivateCustomFlow: React.FC<PrivateCustomFlowProps> = ({
  currentLang,
  onBackToSelector,
}) => {
  const isEs = currentLang === 'es';

  const [step, setStep] = useState<'form' | 'submitted'>('form');

  // Form State
  const [charterType, setCharterType] = useState<string>('private-day');
  const [targetDates, setTargetDates] = useState<string>('');
  const [adults, setAdults] = useState<number>(2);
  const [children, setChildren] = useState<number>(0);
  const [interests, setInterests] = useState<string[]>(['snorkeling', 'relaxation']);
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  const charterOptions = [
    {
      id: 'private-day',
      title: isEs ? 'Pasadía Privado (4x4 y Bote Exclusivo)' : 'Private Day Trip (Exclusive 4x4 & Boat)',
      desc: isEs ? 'Horarios a su medida, sin compartir con otros grupos' : 'Custom departure time, exclusive boat for your party',
    },
    {
      id: 'private-overnight',
      title: isEs ? 'Estadía Nocturna Privada en Isla' : 'Private Island Overnight Stay',
      desc: isEs ? 'Cabaña privada en la playa con traslados dedicados' : 'Dedicated transfers and private beachfront cabana',
    },
    {
      id: 'sailboat',
      title: isEs ? 'Velero Monocasco Privado a Vela' : 'Private Monohull Sailboat Charter',
      desc: isEs ? 'Navegación tradicional a vela entre arrecifes exteriores' : 'Wind sailing between secluded outer atolls',
    },
    {
      id: 'catamaran',
      title: isEs ? 'Catamarán de Lujo Exclusivo' : 'Private Luxury Catamaran Charter',
      desc: isEs ? 'Máxima amplitud, cabinas en suite y confort de alta gama' : 'Wide sun decks, en-suite cabins, and maximum stability',
    },
    {
      id: 'custom-event',
      title: isEs ? 'Celebración Familiar / Viaje Especial' : 'Family Gathering / Special Event',
      desc: isEs ? 'Cumpleaños, fotografía, luna de miel o evento privado' : 'Anniversaries, honeymoons, photography, or group travel',
    },
  ];

  const interestOptions = [
    { id: 'relaxation', label: isEs ? 'Playas tranquilas & descanso' : 'Quiet beaches & relaxation' },
    { id: 'snorkeling', label: isEs ? 'Snorkel en arrecifes y barcos hundidos' : 'Reef & shipwreck snorkeling' },
    { id: 'culture', label: isEs ? 'Visita cultural a comunidad Guna' : 'Authentic Guna village cultural visit' },
    { id: 'sailing', label: isEs ? 'Navegación a vela en mar abierto' : 'Open-sea sailing & secluded atolls' },
    { id: 'seafood', label: isEs ? 'Almuerzo especial de langosta fresca' : 'Fresh lobster & seafood experience' },
  ];

  const toggleInterest = (id: string) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const validate = () => {
    const errors: { [key: string]: string } = {};
    if (!fullName.trim()) errors.fullName = isEs ? 'Nombre requerido' : 'Name required';
    if (!email.trim() || !email.includes('@')) errors.email = isEs ? 'Correo inválido' : 'Valid email required';
    if (!phone.trim()) errors.phone = isEs ? 'WhatsApp o teléfono requerido' : 'WhatsApp or phone required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setStep('submitted');
    }
  };

  const selectedCharterTitle =
    charterOptions.find((c) => c.id === charterType)?.title || charterType;

  const getWhatsappText = () => {
    const charterTitle = selectedCharterTitle;
    const dateStr = targetDates || (isEs ? 'Flexible' : 'Flexible');
    const interestsStr = interests.length > 0 ? interests.join(', ') : (isEs ? 'General' : 'General');
    const specialRequests = message.trim() || (isEs ? 'Ninguna' : 'None');

    if (isEs) {
      return encodeURIComponent(
        `¡Hola Guna Yala Panama Travel!\n\nMe gustaría solicitar información sobre una experiencia de ${charterTitle}.\n\nFecha preferida: ${dateStr}\nAdultos: ${adults}\nNiños: ${children}\nIntereses: ${interestsStr}\nSolicitudes especiales: ${specialRequests}\n\n¿Podrían confirmar disponibilidad y enviarme una cotización?`
      );
    }

    return encodeURIComponent(
      `Hello Guna Yala Panama Travel!\n\nI would like to inquire about a ${charterTitle} experience.\n\nPreferred date: ${dateStr}\nAdults: ${adults}\nChildren: ${children}\nInterests: ${interestsStr}\nSpecial requests: ${specialRequests}\n\nCould you please confirm availability and provide a quotation?`
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Top Header & Breadcrumb */}
      <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-[#e5dccb]">
        <button
          onClick={onBackToSelector}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#475569] hover:text-[#06121e] uppercase tracking-[0.14em] transition-colors"
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

          <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-[#e2d8c5] shadow-sm max-w-2xl mx-auto space-y-6">
            {/* Step 1: What type of experience */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-3">
                {isEs ? '1. ¿Qué tipo de experiencia privada busca?' : '1. What type of private experience are you planning?'}
              </label>
              <div className="space-y-2.5">
                {charterOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCharterType(opt.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                      charterType === opt.id
                        ? 'bg-[#f0fdfa] border-[#0f766e] ring-1 ring-[#0f766e]'
                        : 'bg-[#faf8f5] border-[#e2d8c5] hover:border-[#0f766e]'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      charterType === opt.id ? 'border-[#0f766e] bg-[#0f766e] text-white' : 'border-[#cbd5e1]'
                    }`}>
                      {charterType === opt.id && <Check className="w-3 h-3" />}
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-[#06121e]">{opt.title}</div>
                      <div className="text-xs text-[#64748b] font-light">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Dates & Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#f1f5f9]">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-1.5">
                  {isEs ? '2. Fechas Aproximadas o Exactas' : '2. Target Travel Dates'}
                </label>
                <input
                  type="text"
                  placeholder={isEs ? 'Ej. 15 de Noviembre o Flexible' : 'e.g., Mid-November or Exact Date'}
                  value={targetDates}
                  onChange={(e) => setTargetDates(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#cbd5e1] bg-[#faf8f5] focus:outline-none focus:border-[#0f766e]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#475569] mb-1.5">
                  {isEs ? 'Número de Pasajeros' : 'Number of Travelers'}
                </label>
                <div className="flex items-center gap-3 py-1">
                  <div className="flex-1 p-2 bg-[#faf8f5] rounded-xl border border-[#e2d8c5] flex items-center justify-between text-xs">
                    <span>{isEs ? 'Adultos:' : 'Adults:'}</span>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setAdults((p) => Math.max(1, p - 1))} className="w-6 h-6 rounded bg-white border border-[#cbd5e1]">-</button>
                      <span className="w-5 text-center font-bold">{adults}</span>
                      <button type="button" onClick={() => setAdults((p) => p + 1)} className="w-6 h-6 rounded bg-white border border-[#cbd5e1]">+</button>
                    </div>
                  </div>
                  <div className="flex-1 p-2 bg-[#faf8f5] rounded-xl border border-[#e2d8c5] flex items-center justify-between text-xs">
                    <span>{isEs ? 'Niños:' : 'Kids:'}</span>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setChildren((p) => Math.max(0, p - 1))} className="w-6 h-6 rounded bg-white border border-[#cbd5e1]">-</button>
                      <span className="w-5 text-center font-bold">{children}</span>
                      <button type="button" onClick={() => setChildren((p) => p + 1)} className="w-6 h-6 rounded bg-white border border-[#cbd5e1]">+</button>
                    </div>
                  </div>
                </div>
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
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center gap-2 ${
                        isChecked
                          ? 'bg-[#f0fdfa] border-[#0f766e] text-[#0f766e] font-medium'
                          : 'bg-[#faf8f5] border-[#e2d8c5] text-[#475569]'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isChecked ? 'bg-[#0f766e] border-[#0f766e] text-white' : 'border-[#cbd5e1]'
                      }`}>
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
                    onChange={(e) => setFullName(e.target.value)}
                    className={`w-full px-4 py-2.5 text-sm rounded-xl border ${
                      formErrors.fullName ? 'border-red-400 bg-red-50/30' : 'border-[#cbd5e1] bg-[#faf8f5]'
                    } focus:outline-none focus:border-[#0f766e]`}
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
                    } focus:outline-none focus:border-[#0f766e]`}
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
                  } focus:outline-none focus:border-[#0f766e]`}
                />
                {formErrors.phone && <p className="text-xs text-red-500 mt-1">{formErrors.phone}</p>}
              </div>

              <div>
                <textarea
                  rows={3}
                  placeholder={isEs ? 'Cuéntenos más sobre su viaje, horarios deseados o requisitos particulares...' : 'Tell us more about your ideal trip, timing, or special requests...'}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#cbd5e1] bg-[#faf8f5] focus:outline-none focus:border-[#0f766e]"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={onBackToSelector}
                className="text-xs font-medium uppercase tracking-[0.14em] text-[#64748b] hover:text-[#06121e]"
              >
                {isEs ? 'Cancelar' : 'Cancel'}
              </button>

              <button
                type="submit"
                className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-[#06121e] hover:bg-[#0f766e] text-white text-xs uppercase tracking-[0.16em] font-medium transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>{isEs ? 'Enviar Solicitud Privada' : 'Submit Private Inquiry'}</span>
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
            {isEs ? 'Solicitud Privada Recibida' : 'Custom Inquiry Received'}
          </h3>

          <p className="text-sm text-[#475569] font-light leading-relaxed">
            {isEs
              ? `Gracias ${fullName}. Petra revisará su solicitud para ${selectedCharterTitle} y preparará una propuesta detallada adaptada a su grupo.`
              : `Thank you, ${fullName}. Petra is reviewing your requirements for ${selectedCharterTitle} and will prepare a tailored itinerary proposal.`}
          </p>

          <div className="p-5 bg-white rounded-2xl border border-[#e2d8c5] text-left text-xs space-y-2">
            <div className="font-semibold text-[#06121e] border-b border-[#f1f5f9] pb-2">
              {isEs ? 'Detalles de la Solicitud:' : 'Inquiry Summary:'}
            </div>
            <div><span className="text-[#64748b]">{isEs ? 'Tipo:' : 'Type:'}</span> {selectedCharterTitle}</div>
            <div><span className="text-[#64748b]">{isEs ? 'Fechas:' : 'Dates:'}</span> {targetDates || (isEs ? 'Flexible' : 'Flexible')}</div>
            <div><span className="text-[#64748b]">{isEs ? 'Viajeros:' : 'Travelers:'}</span> {adults + children} ({adults} Adults, {children} Children)</div>
            <div><span className="text-[#64748b]">{isEs ? 'Contacto:' : 'Contact:'}</span> {email} · {phone}</div>
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
