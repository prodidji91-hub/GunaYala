import React, { useState } from 'react';
import {
  CreditCard,
  Lock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  X,
  Sparkles,
  Phone,
  Mail,
  Loader2,
} from 'lucide-react';
import { Language } from '../../types';

export type CustomerPaymentModalState =
  | 'review_booking'
  | 'proceed_to_payment'
  | 'processing_payment'
  | 'payment_pending_verification'
  | 'payment_verified'
  | 'payment_declined'
  | 'payment_expired';

interface CustomerPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  bookingDetails?: {
    bookingReference: string;
    bookingType: 'day-trip' | 'overnight' | 'private-charter';
    experienceTitle: string;
    targetDate?: string;
    travelersCount: number;
    adults: number;
    children: number;
    pickupLocation?: string;
    amount?: number;
    depositAmount?: number;
    balanceDue?: number;
  };
  initialState?: CustomerPaymentModalState;
}

export const CustomerPaymentModal: React.FC<CustomerPaymentModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  bookingDetails = {
    bookingReference: 'GNY-482325',
    bookingType: 'day-trip',
    experienceTitle: 'Classic San Blas Island Hopping Day Trip',
    targetDate: '2026-11-20',
    travelersCount: 2,
    adults: 2,
    children: 0,
    pickupLocation: 'Hotel La Compañía, Casco Viejo',
    amount: 290,
  },
  initialState = 'review_booking',
}) => {
  const isEs = currentLang === 'es';
  const [currentState, setCurrentState] = useState<CustomerPaymentModalState>(initialState);
  const [termsAccepted, setTermsAccepted] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#06121e]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-[#E2D8C5] shadow-2xl overflow-hidden my-8">
        
        {/* Top Header */}
        <div className="bg-[#06121e] text-white p-6 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 border border-white/15 text-[#c8ac75]">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#c8ac75]">
                {isEs ? 'Portal de Pago Seguro' : 'Secure Payment Portal'}
              </div>
              <h3 className="text-lg font-display font-light">
                Guna Yala Panama Travel &bull; PagueloFacil
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* State Preview Switcher for Petra & Quality Review */}
        <div className="bg-[#FAF8F5] border-b border-[#E2D8C5] px-4 py-2 flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono">
          <span className="text-[#64748b] mr-1 uppercase tracking-wider font-semibold">State:</span>
          {(
            [
              ['review_booking', 'Review'],
              ['proceed_to_payment', 'Proceed'],
              ['processing_payment', 'Processing'],
              ['payment_pending_verification', 'Pending Verif.'],
              ['payment_verified', 'Verified'],
              ['payment_declined', 'Declined'],
              ['payment_expired', 'Expired'],
            ] as const
          ).map(([st, label]) => (
            <button
              key={st}
              onClick={() => setCurrentState(st)}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                currentState === st
                  ? 'bg-[#06121e] text-white font-bold'
                  : 'bg-white text-[#475569] border border-[#CBD5E1] hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">

          {/* -----------------------------------------------------------
              1. STATE: REVIEW BOOKING
             ----------------------------------------------------------- */}
          {currentState === 'review_booking' && (
            <div className="space-y-6">
              <div className="text-center max-w-md mx-auto">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#0e7490] font-semibold">
                  {isEs ? 'Paso 1 de 2: Revisión' : 'Step 1 of 2: Review Details'}
                </span>
                <h4 className="text-xl sm:text-2xl font-display font-light text-[#06121e] mt-1">
                  {isEs ? 'Revisión Final de su Reserva' : 'Review Your Reservation'}
                </h4>
                <p className="text-xs text-[#64748b] mt-1">
                  {isEs
                    ? 'Verifique los detalles antes de acceder al entorno de pago seguro.'
                    : 'Verify your journey details before continuing to secure hosted payment.'}
                </p>
              </div>

              {/* Booking Details Card */}
              <div className="p-5 bg-[#FAF8F5] rounded-2xl border border-[#E2D8C5] space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-[#E2D8C5] pb-2.5">
                  <span className="text-[#64748b] font-mono uppercase tracking-wider">
                    {isEs ? 'Referencia de Reserva:' : 'Booking Reference:'}
                  </span>
                  <span className="font-mono font-bold text-sm text-[#06121e] bg-white px-2 py-0.5 rounded border border-[#CBD5E1]">
                    {bookingDetails.bookingReference}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#64748b]">{isEs ? 'Experiencia:' : 'Experience:'}</span>
                  <span className="font-semibold text-[#06121e] text-right">{bookingDetails.experienceTitle}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#64748b]">{isEs ? 'Fecha de Viaje:' : 'Travel Date:'}</span>
                  <span className="font-medium text-[#06121e]">{bookingDetails.targetDate || 'To be confirmed'}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#64748b]">{isEs ? 'Pasajeros:' : 'Travelers:'}</span>
                  <span className="font-medium text-[#06121e]">
                    {bookingDetails.adults} {isEs ? 'Adultos' : 'Adults'}
                    {bookingDetails.children > 0 ? `, ${bookingDetails.children} ${isEs ? 'Niños' : 'Children'}` : ''}
                  </span>
                </div>

                {bookingDetails.pickupLocation && (
                  <div className="flex justify-between">
                    <span className="text-[#64748b]">{isEs ? 'Recogida:' : 'Pickup:'}</span>
                    <span className="font-medium text-[#06121e] line-clamp-1">{bookingDetails.pickupLocation}</span>
                  </div>
                )}
              </div>

              {/* Pricing Notice */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-semibold">
                    {isEs ? 'Tarifas Oficiales Confirmadas' : 'Official Pricing Confirmation'}
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    {isEs
                      ? 'Las tarifas se validan directamente por el servidor. No hay cargos automáticos no autorizados.'
                      : 'All rates are validated server-side. Unapproved or client-manipulated amounts are strictly rejected.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-5 text-xs uppercase tracking-wider text-[#64748b] hover:text-[#06121e] font-medium"
                >
                  {isEs ? 'Cancelar' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentState('proceed_to_payment')}
                  className="py-3.5 px-6 rounded-xl bg-[#06121e] hover:bg-[#0e7490] text-white text-xs uppercase tracking-[0.16em] font-medium transition-all flex items-center gap-2 shadow-sm"
                >
                  <span>{isEs ? 'Continuar a Pago' : 'Continue to Payment'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* -----------------------------------------------------------
              2. STATE: PROCEED TO SECURE PAYMENT
             ----------------------------------------------------------- */}
          {currentState === 'proceed_to_payment' && (
            <div className="space-y-6">
              <div className="text-center max-w-md mx-auto">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#0e7490] font-semibold">
                  {isEs ? 'Paso 2 de 2: Pasarela PagueloFacil' : 'Step 2 of 2: PagueloFacil Gateway'}
                </span>
                <h4 className="text-xl sm:text-2xl font-display font-light text-[#06121e] mt-1">
                  {isEs ? 'Acceso a Pago Seguro Hosted' : 'Proceed to Hosted Payment'}
                </h4>
                <p className="text-xs text-[#64748b] mt-1">
                  {isEs
                    ? 'Será redirigido al entorno bancario certificado de PagueloFacil.'
                    : 'You will be transferred to PagueloFacil\'s certified secure environment.'}
                </p>
              </div>

              {/* Payment Method Badges */}
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl space-y-3">
                <div className="text-xs font-semibold text-[#06121e] flex items-center justify-between">
                  <span>{isEs ? 'Métodos Aceptados:' : 'Accepted Methods:'}</span>
                  <span className="text-[11px] font-mono text-[#0e7490]">Visa &bull; Mastercard &bull; Clave</span>
                </div>
                <div className="text-[11px] text-[#64748b] leading-relaxed">
                  {isEs
                    ? 'Transacciones protegidas con autenticación 3D Secure y cifrado bancario TLS 1.3.'
                    : 'Transactions protected with 3D Secure card authentication and TLS 1.3 bank-grade encryption.'}
                </div>
              </div>

              {/* Safe Preparation Banner */}
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <Lock className="w-4 h-4 text-amber-700" />
                  <span>{isEs ? 'Modo de Preparación Seguro (Pagos Reales Desactivados)' : 'Safe Preparation Mode (Real Charges Disabled)'}</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  {isEs
                    ? 'El botón de pago en vivo permanece deshabilitado hasta que soporte de PagueloFacil y Petra confirmen las credenciales del comercio. Ningún cargo bancario será emitido.'
                    : 'Live payment processing is disabled until PagueloFacil support and Petra confirm merchant credentials. No real charges can occur.'}
                </p>
              </div>

              {/* Locked Button */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  disabled
                  className="w-full py-4 px-6 rounded-xl bg-gray-200 text-gray-500 font-mono text-xs uppercase tracking-wider font-semibold cursor-not-allowed flex items-center justify-center gap-2"
                  title="Disabled in Safe Preparation Mode"
                >
                  <Lock className="w-4 h-4 text-gray-400" />
                  <span>{isEs ? 'Ir a PagueloFacil (Deshabilitado en Modo Seguro)' : 'Pay via PagueloFacil (Disabled in Safe Mode)'}</span>
                </button>

                <div className="flex justify-between items-center text-xs">
                  <button
                    onClick={() => setCurrentState('review_booking')}
                    className="text-[#64748b] hover:text-[#06121e] uppercase tracking-wider"
                  >
                    {isEs ? 'Volver a Revisión' : 'Back to Review'}
                  </button>
                  <button
                    onClick={() => setCurrentState('processing_payment')}
                    className="text-[11px] font-mono text-[#0e7490] underline"
                  >
                    {isEs ? 'Probar animación de proceso' : 'Simulate processing state'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* -----------------------------------------------------------
              3. STATE: PROCESSING PAYMENT
             ----------------------------------------------------------- */}
          {currentState === 'processing_payment' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-[#FAF8F5] border-2 border-[#c8ac75] flex items-center justify-center animate-spin">
                <Loader2 className="w-8 h-8 text-[#06121e]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-display font-light text-[#06121e]">
                  {isEs ? 'Conectando con la Pasarela de Pago...' : 'Connecting to Secure Gateway...'}
                </h4>
                <p className="text-xs text-[#64748b] max-w-sm mx-auto">
                  {isEs
                    ? 'Estableciendo sesión cifrada con PagueloFacil. Por favor no cierre esta ventana.'
                    : 'Establishing encrypted checkout session. Please do not close or refresh this page.'}
                </p>
              </div>
              <div className="pt-4">
                <button
                  onClick={() => setCurrentState('payment_pending_verification')}
                  className="text-[11px] font-mono text-[#0e7490] underline"
                >
                  {isEs ? 'Avanzar a verificación' : 'Simulate webhook arrival'}
                </button>
              </div>
            </div>
          )}

          {/* -----------------------------------------------------------
              4. STATE: PAYMENT PENDING VERIFICATION
             ----------------------------------------------------------- */}
          {currentState === 'payment_pending_verification' && (
            <div className="space-y-6 text-center py-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                <Clock className="w-7 h-7 animate-pulse" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h4 className="text-xl font-display font-light text-[#06121e]">
                  {isEs ? 'Verificando Transacción con el Servidor...' : 'Verifying Transaction with Gateway...'}
                </h4>
                <p className="text-xs text-[#64748b] leading-relaxed">
                  {isEs
                    ? 'Regla de Seguridad: La confirmación no depende de redirecciones del navegador. Nuestro servidor está validando el webhook oficial directamente con PagueloFacil.'
                    : 'Security Rule: Booking confirmation never relies solely on browser redirects. Our server is verifying the official transaction status directly with PagueloFacil.'}
                </p>
              </div>

              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-mono text-[#475569] max-w-sm mx-auto flex items-center justify-between">
                <span>Status:</span>
                <span className="text-blue-600 font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                  Awaiting Webhook Handshake
                </span>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setCurrentState('payment_verified')}
                  className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-mono font-medium"
                >
                  {isEs ? 'Simular Pago Aprobado' : 'Simulate Verified Approval'}
                </button>
                <button
                  onClick={() => setCurrentState('payment_declined')}
                  className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-mono font-medium"
                >
                  {isEs ? 'Simular Pago Rechazado' : 'Simulate Decline'}
                </button>
              </div>
            </div>
          )}

          {/* -----------------------------------------------------------
              5. STATE: PAYMENT VERIFIED (Confirmed)
             ----------------------------------------------------------- */}
          {currentState === 'payment_verified' && (
            <div className="space-y-6 text-center py-4 animate-fadeIn">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border-2 border-emerald-500 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-700 font-bold">
                  {isEs ? '✓ Pago Verificado & Aprobado' : '✓ Payment Verified & Approved'}
                </div>
                <h4 className="text-2xl font-display font-light text-[#06121e]">
                  {isEs ? '¡Su Reserva está Confirmada!' : 'Your Journey is Confirmed!'}
                </h4>
                <p className="text-xs text-[#64748b]">
                  {isEs
                    ? 'Hemos recibido la confirmación bancaria oficial. Los comprobantes y el itinerario han sido enviados a su correo.'
                    : 'Official gateway confirmation received. Your travel voucher and receipt have been dispatched to your email.'}
                </p>
              </div>

              {/* Receipt Badge */}
              <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl text-xs space-y-2 max-w-md mx-auto text-left">
                <div className="flex justify-between items-center border-b border-[#BBF7D0] pb-2 font-mono">
                  <span className="text-[#166534] font-semibold">Booking Ref:</span>
                  <span className="font-bold text-[#06121e]">{bookingDetails.bookingReference}</span>
                </div>
                <div className="flex justify-between items-center text-[#166534]">
                  <span>Gateway Receipt:</span>
                  <span className="font-mono text-[#06121e]">AUTH_CAP-778899</span>
                </div>
                <div className="flex justify-between items-center text-[#166534]">
                  <span>Status:</span>
                  <span className="font-bold text-emerald-800">FULLY CONFIRMED</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="py-3 px-8 rounded-xl bg-[#06121e] hover:bg-[#0e7490] text-white text-xs uppercase tracking-wider font-medium shadow-sm transition-all"
              >
                {isEs ? 'Cerrar y Ver Mi Reserva' : 'Close and View Confirmation'}
              </button>
            </div>
          )}

          {/* -----------------------------------------------------------
              6. STATE: PAYMENT DECLINED
             ----------------------------------------------------------- */}
          {currentState === 'payment_declined' && (
            <div className="space-y-6 text-center py-4 animate-fadeIn">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-50 border-2 border-red-500 text-red-700 flex items-center justify-center">
                <XCircle className="w-9 h-9" />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <div className="text-[11px] font-mono uppercase tracking-widest text-red-700 font-bold">
                  {isEs ? 'Transacción No Completada' : 'Transaction Declined'}
                </div>
                <h4 className="text-xl sm:text-2xl font-display font-light text-[#06121e]">
                  {isEs ? 'El Pago no Pudo ser Procesado' : 'Payment Could Not Be Processed'}
                </h4>
                <p className="text-xs text-[#64748b]">
                  {isEs
                    ? 'Su entidad bancaria o la pasarela rechazó la transacción. No se ha realizado ningún cobro.'
                    : 'The transaction was declined by your bank or the card processor. No charge was incurred.'}
                </p>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-900 max-w-md mx-auto text-left space-y-1.5">
                <div className="font-semibold">{isEs ? 'Sugerencias para resolverlo:' : 'Recommended next steps:'}</div>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-red-800">
                  <li>{isEs ? 'Verifique que su tarjeta tenga habilitadas compras internacionales por internet.' : 'Confirm international online purchases are enabled on your card.'}</li>
                  <li>{isEs ? 'Intente con una tarjeta alternativa (Visa, Mastercard o Clave).' : 'Retry using an alternative Visa, Mastercard, or Clave card.'}</li>
                  <li>{isEs ? 'Coordine con Petra por WhatsApp para asistencia directa.' : 'Contact Petra directly on WhatsApp for personalized booking assistance.'}</li>
                </ul>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentState('proceed_to_payment')}
                  className="py-3 px-6 rounded-xl bg-[#06121e] hover:bg-[#0e7490] text-white text-xs uppercase tracking-wider font-medium"
                >
                  {isEs ? 'Reintentar Pago' : 'Retry Payment'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-5 text-xs text-[#64748b] hover:text-[#06121e] uppercase tracking-wider font-medium"
                >
                  {isEs ? 'Cerrar' : 'Close'}
                </button>
              </div>
            </div>
          )}

          {/* -----------------------------------------------------------
              7. STATE: PAYMENT EXPIRED
             ----------------------------------------------------------- */}
          {currentState === 'payment_expired' && (
            <div className="space-y-6 text-center py-4 animate-fadeIn">
              <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 border-2 border-gray-400 text-gray-700 flex items-center justify-center">
                <AlertTriangle className="w-9 h-9" />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <div className="text-[11px] font-mono uppercase tracking-widest text-gray-600 font-bold">
                  {isEs ? 'Enlace Temporal Vencido' : 'Payment Window Expired'}
                </div>
                <h4 className="text-xl sm:text-2xl font-display font-light text-[#06121e]">
                  {isEs ? 'El Enlace de Pago ha Expirado' : 'Payment Link Has Expired'}
                </h4>
                <p className="text-xs text-[#64748b] leading-relaxed">
                  {isEs
                    ? 'Para proteger la disponibilidad de las familias en las islas de Guna Yala, los enlaces temporales tienen un plazo límite (48 horas). La retención provisional ha sido liberada.'
                    : 'To protect island family hosts and cabana allocation in Guna Yala, payment links are time-limited (48 hours). The provisional hold has been released.'}
                </p>
              </div>

              <div className="p-4 bg-[#FAF8F5] border border-[#E2D8C5] rounded-2xl text-xs max-w-md mx-auto text-left space-y-1.5">
                <div className="font-semibold text-[#06121e]">
                  {isEs ? '¿Cómo reactivar su viaje?' : 'How to reactivate your journey?'}
                </div>
                <p className="text-[11px] text-[#64748b] leading-relaxed">
                  {isEs
                    ? 'Comuníquese con Petra para reconfirmar la disponibilidad de cabañas en la fecha deseada y emitir un nuevo enlace seguro.'
                    : 'Contact Petra to re-verify island cabana availability for your dates and issue a fresh payment link.'}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="py-3 px-6 rounded-xl bg-[#06121e] hover:bg-[#0e7490] text-white text-xs uppercase tracking-wider font-medium"
              >
                {isEs ? 'Entendido / Contactar a Petra' : 'Understood / Contact Petra'}
              </button>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-[#FAF8F5] border-t border-[#E2D8C5] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748b]">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-[#06121e]" />
            <span>Guna Yala Panama Travel &bull; Direct Local Island Heritage</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>hello@gunayalapanamatravel.com</span>
            <span>WhatsApp: +507 6444-3649</span>
          </div>
        </div>

      </div>
    </div>
  );
};
