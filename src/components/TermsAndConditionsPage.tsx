import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { Shield, FileText, ArrowLeft, Calendar, CheckCircle2, AlertCircle, ExternalLink, Download, Printer } from 'lucide-react';
import { BrandWordmark } from './BrandWordmark';
import { updateSeoMetadata, SeoRoute } from '../utils/seo';

interface TermsAndConditionsPageProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  onBackToWebsite: () => void;
  onOpenPlanner: () => void;
  initialPolicy?: 'overnight' | 'day-tour' | 'hub';
}

export const TermsAndConditionsPage: React.FC<TermsAndConditionsPageProps> = ({
  currentLang,
  onLanguageChange,
  onBackToWebsite,
  onOpenPlanner,
  initialPolicy = 'hub',
}) => {
  const [activePolicy, setActivePolicy] = useState<'hub' | 'overnight' | 'day-tour'>(initialPolicy);

  // Sync URL pathname with activePolicy and update SEO metadata
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;
    let policy: 'hub' | 'overnight' | 'day-tour' = 'hub';
    let route: SeoRoute = 'terms-hub';
    if (path.includes('/overnight')) {
      policy = 'overnight';
      route = 'terms-overnight';
    } else if (path.includes('/day-tour')) {
      policy = 'day-tour';
      route = 'terms-day-tour';
    }
    setActivePolicy(policy);
    updateSeoMetadata(route, currentLang);
  }, [currentLang]);

  const handleSelectPolicy = (policy: 'hub' | 'overnight' | 'day-tour') => {
    setActivePolicy(policy);
    if (typeof window !== 'undefined') {
      let url = '/terms-and-conditions';
      let route: SeoRoute = 'terms-hub';
      if (policy === 'overnight') {
        url = '/terms-and-conditions/overnight';
        route = 'terms-overnight';
      } else if (policy === 'day-tour') {
        url = '/terms-and-conditions/day-tour';
        route = 'terms-day-tour';
      }
      if (currentLang === 'es') {
        url += '?lang=es';
      }
      window.history.pushState({}, '', url);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      updateSeoMetadata(route, currentLang);
    }
  };

  const isEs = currentLang === 'es';

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F2] text-[#173D36] selection:bg-[#E2D2BB] selection:text-[#173D36]">
      {/* Navbar */}
      <Navbar
        currentLang={currentLang}
        onLanguageChange={onLanguageChange}
        onOpenPlanner={onOpenPlanner}
      />

      {/* Hero Header */}
      <section className="bg-[#173D36] text-[#FAF8F2] pt-28 pb-16 px-4 sm:px-6 lg:px-8 border-b-2 border-[#C5A46B]">
        <div className="max-w-5xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (activePolicy !== 'hub') {
                  handleSelectPolicy('hub');
                } else {
                  onBackToWebsite();
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs font-serif uppercase tracking-widest text-[#C5A46B] hover:text-white transition-colors bg-white/10 px-3 py-1.5 rounded-full border border-[#C5A46B]/40 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{activePolicy !== 'hub' ? (isEs ? 'Volver a Términos' : 'Back to Hub') : (isEs ? 'Volver al Inicio' : 'Back to Home')}</span>
            </button>
            <span className="text-[#C5A46B]/40">|</span>
            <span className="text-xs font-mono text-[#E2D2BB]">
              {isEs ? 'Versión Oficial: 18 de Octubre, 2026' : 'Official Version: October 18, 2026'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-normal text-white tracking-wide">
            {isEs ? 'Términos y Condiciones Oficiales' : 'Official Terms & Conditions'}
          </h1>
          <p className="text-base sm:text-lg text-[#E2D2BB] font-serif italic max-w-2xl">
            {isEs
              ? 'Viaje con claridad. Explore con confianza en la Comarca Guna Yala.'
              : 'Travel with clarity. Explore with confidence in the Guna Yala Comarca.'}
          </p>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full space-y-10">

        {/* Spanish Translation Pending Notice */}
        {isEs && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs sm:text-sm text-amber-900 flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block text-amber-950">
                Aviso de Traducción en Español (Pendiente de Aprobación Final de Petra)
              </span>
              <p className="text-amber-900/90 leading-relaxed">
                Los documentos legales oficiales están redactados en inglés (versión 2026-10-18). La siguiente traducción al español latinoamericano conserva estrictamente todos los porcentajes de pago, plazos de cancelación, comisiones de gestión y estipulaciones operativas, y está pendiente de la confirmación formal por parte de Petra.
              </p>
            </div>
          </div>
        )}

        {/* Policy Selector Cards (when on Hub) */}
        {activePolicy === 'hub' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-2xl font-serif font-bold text-[#173D36]">
                {isEs ? 'Seleccione el Documento de Política' : 'Select Policy Document'}
              </h2>
              <p className="text-sm text-[#4A5568]">
                {isEs
                  ? 'Por favor elija entre nuestras condiciones para estadías con alojamiento o tours compartidos de un día.'
                  : 'Please choose between our governing conditions for overnight island stays or shared day tour excursions.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Overnight Card */}
              <div
                onClick={() => handleSelectPolicy('overnight')}
                className="bg-white border-2 border-[#C8AC75]/50 hover:border-[#0E3B2F] rounded-2xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0E3B2F]/10 text-[#0E3B2F] flex items-center justify-center group-hover:bg-[#0E3B2F] group-hover:text-white transition-colors">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-widest font-mono text-[#0E3B2F] font-semibold">
                      {isEs ? 'Estadías con Alojamiento' : 'Overnight Stays'}
                    </span>
                    <h3 className="text-xl font-serif font-bold text-[#0E3B2F] mt-1">
                      {isEs ? 'Términos y Condiciones para Estadías en Isla' : 'Overnight Stay — Terms & Conditions'}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-[#4A5568] leading-relaxed">
                    {isEs
                      ? 'Condiciones de reserva, depósitos del 50%, saldos a 15 días, políticas de cancelación por tramos (15 días / 72 horas), tarifas de gestión, transporte 4x4, requisitos de pasaporte original y normativas de las islas.'
                      : 'Booking conditions, 50% deposits, 15-day balance deadlines, tiered cancellation schedules (15 days / 72 hours), handling fees, 4x4 overland logistics, original passport requirements, and island stay guidelines.'}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-[#E5DEC9] flex items-center justify-between text-xs font-semibold text-[#0E3B2F] group-hover:text-[#C8AC75]">
                  <span>{isEs ? 'Leer documento completo' : 'Read Full Document'}</span>
                  <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>

              {/* Day Tour Card */}
              <div
                onClick={() => handleSelectPolicy('day-tour')}
                className="bg-white border-2 border-[#C8AC75]/50 hover:border-[#0E3B2F] rounded-2xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-[#0E3B2F]/10 text-[#0E3B2F] flex items-center justify-center group-hover:bg-[#0E3B2F] group-hover:text-white transition-colors">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-widest font-mono text-[#0E3B2F] font-semibold">
                      {isEs ? 'Tours de Día' : 'Shared Day Tours'}
                    </span>
                    <h3 className="text-xl font-serif font-bold text-[#0E3B2F] mt-1">
                      {isEs ? 'Términos y Condiciones para Tours de Día' : 'Shared Day Tour — Terms & Conditions'}
                    </h3>
                  </div>
                  <p className="text-xs sm:text-sm text-[#4A5568] leading-relaxed">
                    {isEs
                      ? 'Pago total al reservar, políticas de cancelación (72 horas / 24 horas), política de mal tiempo y cierres de puerto de SINAPROC, transporte compartido, equipo de snorkel y comarca Guna Yala.'
                      : 'Full payment at booking, 72/24 hour cancellation schedules, SINAPROC weather and port closure policies, shared overland transfers, snorkeling gear, and Comarca entry regulations.'}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-[#E5DEC9] flex items-center justify-between text-xs font-semibold text-[#0E3B2F] group-hover:text-[#C8AC75]">
                  <span>{isEs ? 'Leer documento completo' : 'Read Full Document'}</span>
                  <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </div>

            {/* General Governance Notice */}
            <div className="bg-[#FAF8F5] border border-[#C8AC75]/40 rounded-xl p-6 space-y-3 text-xs sm:text-sm text-[#4A5568]">
              <h4 className="font-serif font-bold text-[#0E3B2F] text-sm">
                {isEs ? 'Jurisdicción y Marco Legal de la Comarca' : 'Comarca Jurisdiction & Legal Framework'}
              </h4>
              <p className="leading-relaxed">
                {isEs
                  ? 'Guna Yala Panama Travel opera bajo la estricta coordinación y respeto a las autoridades del Congreso General Guna y el Congreso de la Cultura. Todos los servicios turísticos están sujetos a las leyes de la Comarca Guna Yala, normas de navegación marítima de la AMP y directrices de SINAPROC.'
                  : 'Guna Yala Panama Travel operates under strict coordination and respect for the authorities of the General Guna Congress and the Congress of Culture. All tourism services are subject to the laws of the Guna Yala Comarca, AMP maritime navigation rules, and SINAPROC directives.'}
              </p>
            </div>
          </div>
        )}

        {/* Overnight Stay Policy Document View */}
        {activePolicy === 'overnight' && (
          <div className="bg-white border border-[#C8AC75]/40 rounded-2xl p-6 sm:p-12 shadow-lg space-y-8 animate-fadeIn font-sans">
            
            {/* Header */}
            <div className="border-b border-[#E5DEC9] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-[#0E3B2F] font-semibold">
                  {isEs ? 'Documento Oficial — Versión 2026-10-18' : 'Official Document — Version 2026-10-18'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#0E3B2F] mt-1">
                  {isEs ? 'Estadías con Alojamiento — Términos y Condiciones' : 'Overnight Stay — Terms & Conditions'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSelectPolicy('day-tour')}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#FAF8F5] border border-[#C8AC75]/40 text-[#0E3B2F] rounded-lg hover:bg-[#0E3B2F] hover:text-white transition-colors"
                >
                  {isEs ? 'Ver Tours de Día →' : 'View Day Tour Terms →'}
                </button>
              </div>
            </div>

            {/* Body Text / Official Transcription */}
            <div className="space-y-8 text-xs sm:text-sm text-[#2D3A45] font-light leading-relaxed">
              
              {/* Section 1 */}
              <div className="space-y-3">
                <h3 className="font-serif font-bold text-[#0E3B2F] text-base border-l-2 border-[#C8AC75] pl-3">
                  {isEs ? '1. Ámbito de Aplicación y Reservas' : '1. Scope of Application & Reservations'}
                </h3>
                <p>
                  {isEs
                    ? 'Estos Términos y Condiciones rigen todas las reservas de estadías con alojamiento nocturno en las islas y cayos de la Comarca Guna Yala (San Blas), gestionadas y coordinadas por Guna Yala Panama Travel. Al confirmar una reserva mediante el pago de un depósito o tarifa completa, el cliente acepta íntegramente las presentes disposiciones.'
                    : 'These Terms & Conditions govern all overnight island stay bookings in the islands and cays of the Guna Yala Comarca (San Blas), managed and coordinated by Guna Yala Panama Travel. By confirming a booking via deposit or full payment, the client fully accepts these provisions.'}
                </p>
              </div>

              {/* Section 2 */}
              <div className="space-y-3">
                <h3 className="font-serif font-bold text-[#0E3B2F] text-base border-l-2 border-[#C8AC75] pl-3">
                  {isEs ? '2. Condiciones de Pago y Depósitos' : '2. Payment Conditions & Deposits'}
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    {isEs
                      ? 'Las reservas se aseguran mediante el pago de una seña o depósito del 50% del valor total del paquete, o bien mediante el pago total anticipado según se indique en la cotización personalizada.'
                      : 'Bookings are secured through a 50% deposit of the total package value, or through full advance payment as specified in your personalized quotation.'}
                  </li>
                  <li>
                    {isEs
                      ? 'El saldo restante del pago debe cancelarse en su totalidad a más tardar quince (15) días antes de la fecha de salida programada.'
                      : 'The remaining balance is due no later than fifteen (15) days prior to the scheduled departure date.'}
                  </li>
                  <li>
                    {isEs
                      ? 'Para reservas realizadas dentro de los quince (15) días previos a la fecha de viaje, se requiere el pago total inmediato.'
                      : 'For bookings made within fifteen (15) days prior to travel, immediate full payment is required.'}
                  </li>
                  <li>
                    {isEs
                      ? 'Las condiciones de pago específicas detalladas en cotizaciones aprobadas por Petra prevalecerán sobre los términos generales.'
                      : 'Specific payment terms detailed in quotations approved by Petra shall take precedence over general terms.'}
                  </li>
                </ul>
              </div>

              {/* Section 3 */}
              <div className="space-y-3">
                <h3 className="font-serif font-bold text-[#0E3B2F] text-base border-l-2 border-[#C8AC75] pl-3">
                  {isEs ? '3. Política de Cancelación y Reembolso' : '3. Cancellation & Refund Policy'}
                </h3>
                <p>
                  {isEs
                    ? 'Las cancelaciones de reservas de estadías nocturnas están sujetas a los siguientes cargos por penalización y deducciones administrativas:'
                    : 'Cancellations of overnight stay bookings are subject to the following penalty charges and administrative deductions:'}
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    {isEs
                      ? 'Más de 15 días antes de la salida: Reembolso de los pagos efectuados menos las comisiones de gestión aplicables.'
                      : 'More than 15 days before departure: Refund of payments made minus applicable handling fees.'}
                  </li>
                  <li>
                    {isEs
                      ? 'De 15 días a 72 horas antes de la salida: Cargo por cancelación del 50% del valor total del paquete, más comisiones de gestión.'
                      : 'From 15 days to 72 hours before departure: 50% cancellation charge of the total package value, plus applicable handling fees.'}
                  </li>
                  <li>
                    {isEs
                      ? 'Menos de 72 horas antes de la salida o no presentación (no-show): Pérdida total del 100% de los fondos abonados (sin reembolso).'
                      : 'Less than 72 hours before departure or no-show: 100% forfeiture of paid funds (non-refundable).'}
                  </li>
                  <li>
                    {isEs
                      ? 'Comisión de gestión administrativa: 3% del precio total de la reserva, con un mínimo de USD $20.'
                      : 'Administrative handling fee: 3% of the total booking price, minimum USD $20.'}
                  </li>
                </ul>
              </div>

              {/* Section 4 */}
              <div className="space-y-3">
                <h3 className="font-serif font-bold text-[#0E3B2F] text-base border-l-2 border-[#C8AC75] pl-3">
                  {isEs ? '4. Inclusiones y Exclusiones del Paquete' : '4. Package Inclusions & Exclusions'}
                </h3>
                <p>
                  {isEs
                    ? 'Los paquetes estándar de estadía nocturna incluyen alojamiento en cabaña de playa o sobre el agua, transporte terrestre compartido en 4x4 desde Ciudad de Panamá, traslados en lancha motora entre el puerto y la isla, plan de comidas tradicionales (desde el almuerzo del día 1 hasta el desayuno/almuerzo del día final según isla) y excursión guiada en bote. Quedan excluidos: la tasa de entrada al territorio de Guna Yala ($22 extranjeros / $7 nacionales), tasa portuaria ($5), bebidas embotelladas, propinas y gastos personales.'
                    : 'Standard overnight packages include beachfront or overwater cabana accommodation, shared round-trip 4x4 overland transfers from Panama City, motorboat transfers between port and island, traditional meal plans (from day 1 lunch through departure day breakfast/lunch as specified), and guided boat excursions. Excluded: Guna Yala territory entrance fee ($22 foreign / $7 national), port tax ($5), bottled drinks, tips, and personal expenses.'}
                </p>
              </div>

              {/* Section 5 */}
              <div className="space-y-3">
                <h3 className="font-serif font-bold text-[#0E3B2F] text-base border-l-2 border-[#C8AC75] pl-3">
                  {isEs ? '5. Documentación y Requisitos Fronterizos' : '5. Documentation & Border Requirements'}
                </h3>
                <p>
                  {isEs
                    ? 'Es obligatorio portar el pasaporte físico original (o cédula nacional para panameños) en vigor para la inspección en el puesto de control fronterizo de la Comarca. Las autoridades locales rechazan estrictamente copias digitales o fotografías. Asimismo, se requiere efectivo en billetes pequeños (USD $1, $5, $10, $20) para el pago de entradas y consumos en las islas, ya que no existen cajeros automáticos ni terminales de tarjetas.'
                    : 'Carrying the original physical passport (or national cédula for Panamanians) is mandatory for inspection at the Comarca border checkpoint. Local authorities strictly reject digital copies or photographs. Additionally, cash in small denominations (USD $1, $5, $10, $20) is required for entrance fees and island purchases, as no ATMs or card terminals exist.'}
                </p>
              </div>

              {/* Section 6 */}
              <div className="space-y-3">
                <h3 className="font-serif font-bold text-[#0E3B2F] text-base border-l-2 border-[#C8AC75] pl-3">
                  {isEs ? '6. Limitación de Responsabilidad y Clima' : '6. Limitation of Liability & Weather'}
                </h3>
                <p>
                  {isEs
                    ? 'San Blas es una reserva marina y archipiélago remoto con infraestructura eco-turística tradicional. Guna Yala Panama Travel actúa como intermediario y coordinador logístico, no asumiendo responsabilidad por suspensiones marítimas ordenadas por la AMP, cierres de puerto de SINAPROC, condiciones meteorológicas adversas o modificaciones de itinerario impuestas por autoridades tradicionales gunas.'
                    : 'San Blas is a marine reserve and remote archipelago with traditional eco-tourism infrastructure. Guna Yala Panama Travel acts as intermediary and logistics coordinator, assuming no liability for maritime suspensions ordered by AMP, SINAPROC port closures, adverse weather conditions, or itinerary modifications mandated by traditional Guna authorities.'}
                </p>
              </div>

            </div>

            {/* Footer action */}
            <div className="pt-6 border-t border-[#E5DEC9] flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-[#687785]">
                {isEs ? 'Guna Yala Panama Travel — Versión 2026-10-18' : 'Guna Yala Panama Travel — Version 2026-10-18'}
              </span>
              <button
                onClick={onOpenPlanner}
                className="px-6 py-2.5 bg-[#0E3B2F] text-white text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-[#114D3D] transition-colors shadow-sm"
              >
                {isEs ? 'Reservar Estadía en Isla' : 'Inquire Overnight Stay'}
              </button>
            </div>

          </div>
        )}

        {/* Day Tour Policy Document View */}
        {activePolicy === 'day-tour' && (
          <div className="bg-white border border-[#C8AC75]/40 rounded-2xl p-6 sm:p-12 shadow-lg space-y-8 animate-fadeIn font-sans">
            
            {/* Header */}
            <div className="border-b border-[#E5DEC9] pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-[#0E3B2F] font-semibold">
                  {isEs ? 'Documento Oficial — Versión 2026-10-18' : 'Official Document — Version 2026-10-18'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#0E3B2F] mt-1">
                  {isEs ? 'Tours Compartidos de un Día — Términos y Condiciones' : 'Shared Day Tour — Terms & Conditions'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSelectPolicy('overnight')}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#FAF8F5] border border-[#C8AC75]/40 text-[#0E3B2F] rounded-lg hover:bg-[#0E3B2F] hover:text-white transition-colors"
                >
                  {isEs ? 'Ver Estadías Nocturnas →' : 'View Overnight Terms →'}
                </button>
              </div>
            </div>

            {/* Body Text / Official Transcription */}
            <div className="space-y-8 text-xs sm:text-sm text-[#2D3A45] font-light leading-relaxed">
              
              {/* Section 1 */}
              <div className="space-y-3">
                <h3 className="font-serif font-bold text-[#0E3B2F] text-base border-l-2 border-[#C8AC75] pl-3">
                  {isEs ? '1. Ámbito y Reserva de Tours de Día' : '1. Scope & Day Tour Booking'}
                </h3>
                <p>
                  {isEs
                    ? 'Los presentes Términos y Condiciones regulan la contratación de excursiones y tours compartidos de un día (Panama City Day Tour y Puerto Day Tour) operados por Guna Yala Panama Travel.'
                    : 'These Terms & Conditions regulate the booking of shared day tour excursions (Panama City Day Tour and Port Day Tour) operated by Guna Yala Panama Travel.'}
                </p>
              </div>

              {/* Section 2 */}
              <div className="space-y-3">
                <h3 className="font-serif font-bold text-[#0E3B2F] text-base border-l-2 border-[#C8AC75] pl-3">
                  {isEs ? '2. Pago Total y Tarifas' : '2. Full Payment & Rates'}
                </h3>
                <p>
                  {isEs
                    ? 'Para garantizar los cupos en los vehículos 4x4 y las lanchas compartidas, los tours de un día requieren el pago total al momento de confirmar la reserva. Las tarifas publicadas incluyen transporte terrestre desde Ciudad de Panamá (o puerto), traslados en bote, visitas a islas designadas, parada en la Piscina Natural, almuerzo con bebida, guía local y equipo de snorkel. Las entradas a la Comarca y tasas portuarias se pagan en efectivo en el sitio.'
                    : 'To guarantee seats in 4x4 vehicles and shared boats, day tours require full payment at the time of booking confirmation. Published rates include overland transport from Panama City (or port), boat transfers, island visits, Natural Pool stop, lunch with drink, local guide, and snorkeling gear. Comarca entry fees and port taxes are payable in cash on site.'}
                </p>
              </div>

              {/* Section 3 */}
              <div className="space-y-3">
                <h3 className="font-serif font-bold text-[#0E3B2F] text-base border-l-2 border-[#C8AC75] pl-3">
                  {isEs ? '3. Política de Cancelación de Tours de Día' : '3. Day Tour Cancellation Policy'}
                </h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    {isEs
                      ? 'Más de 72 horas antes de la salida: Reembolso de los pagos efectuados menos comisiones de gestión.'
                      : 'More than 72 hours before departure: Refund of payments made minus handling fees.'}
                  </li>
                  <li>
                    {isEs
                      ? 'De 72 a 24 horas antes de la salida: Reembolso del 50% menos comisiones de gestión.'
                      : 'From 72 to 24 hours before departure: 50% refund less applicable handling fees.'}
                  </li>
                  <li>
                    {isEs
                      ? 'Menos de 24 horas antes de la salida o no presentación (no-show): Sin reembolso (pérdida del 100%).'
                      : 'Less than 24 hours before departure or no-show: No refund (100% forfeiture).'}
                  </li>
                  <li>
                    {isEs
                      ? 'Comisión de gestión: 3% del precio total, mínimo USD $20 (las deducciones totales nunca excederán el monto pagado).'
                      : 'Handling fee: 3% of total booking price, minimum USD $20, with total deductions not exceeding the amount paid.'}
                  </li>
                </ul>
              </div>

              {/* Section 4 */}
              <div className="space-y-3">
                <h3 className="font-serif font-bold text-[#0E3B2F] text-base border-l-2 border-[#C8AC75] pl-3">
                  {isEs ? '4. Clima y Cierres de Puerto (SINAPROC)' : '4. Weather & Port Closures (SINAPROC)'}
                </h3>
                <p>
                  {isEs
                    ? 'Las excursiones marítimas están sujetas a las condiciones meteorológicas y restricciones de navegación emitidas por las autoridades competentes (SINAPROC y Capitanía de Puerto). En caso de cierre oficial de puerto o prohibición de zarpe por mal tiempo, se ofrecerá la reprogramación sin costo o el reembolso íntegro de la excursión.'
                    : 'Maritime excursions are subject to weather conditions and navigation restrictions issued by competent authorities (SINAPROC and Port Captaincy). In case of official port closure or sailing ban due to bad weather, free rescheduling or a full refund of the excursion will be provided.'}
                </p>
              </div>

              {/* Section 5 */}
              <div className="space-y-3">
                <h3 className="font-serif font-bold text-[#0E3B2F] text-base border-l-2 border-[#C8AC75] pl-3">
                  {isEs ? '5. Documentación y Normas de Comportamiento' : '5. Documentation & Conduct Rules'}
                </h3>
                <p>
                  {isEs
                    ? 'Todo participante debe portar su pasaporte físico original. Los visitantes deben respetar las costumbres de las comunidades gunas, no arrojar basura al mar ni a las islas, y seguir estrictamente las indicaciones de los capitanes y guías autorizados.'
                    : 'Every participant must carry their original physical passport. Visitors must respect Guna community customs, avoid littering at sea or on islands, and strictly follow instructions from authorized captains and guides.'}
                </p>
              </div>

            </div>

            {/* Footer action */}
            <div className="pt-6 border-t border-[#E5DEC9] flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-[#687785]">
                {isEs ? 'Guna Yala Panama Travel — Versión 2026-10-18' : 'Guna Yala Panama Travel — Version 2026-10-18'}
              </span>
              <button
                onClick={onOpenPlanner}
                className="px-6 py-2.5 bg-[#0E3B2F] text-white text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-[#114D3D] transition-colors shadow-sm"
              >
                {isEs ? 'Reservar Tour de Día' : 'Inquire Day Tour'}
              </button>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <Footer
        currentLang={currentLang}
        onLanguageChange={onLanguageChange}
        onOpenPlanner={onOpenPlanner}
      />
    </div>
  );
};
