import React, { useEffect, useState } from 'react';
import { ShieldCheck, CheckCircle2, Clock, AlertTriangle, ArrowLeft, RefreshCw, Mail } from 'lucide-react';

interface CheckoutCompletePageProps {
  onBackToHome: () => void;
  lang?: 'en' | 'es';
}

type VerificationStatus = 'verifying' | 'confirmed' | 'pending' | 'contact_support';

export const CheckoutCompletePage: React.FC<CheckoutCompletePageProps> = ({ onBackToHome, lang = 'en' }) => {
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [message, setMessage] = useState<string>('');
  const [bookingRef, setBookingRef] = useState<string>('');
  const [pollingCount, setPollingCount] = useState<number>(0);

  // Retain credentials in memory across polls after scrubbing the browser address bar
  const credentialsRef = React.useRef<{
    ref: string;
    key: string;
    oper: string;
    initialized: boolean;
  }>({
    ref: '',
    key: '',
    oper: '',
    initialized: false,
  });

  const t = {
    title: lang === 'es' ? 'Verificación de Pago' : 'Payment Verification',
    subtitle: lang === 'es' 
      ? 'Estamos confirmando los detalles de su transacción con el proveedor bancario.' 
      : 'We are securely confirming your transaction details with the payment gateway.',
    verifying: lang === 'es' ? 'Verificando con PagueloFacil...' : 'Verifying with PagueloFacil...',
    confirmed: lang === 'es' ? '¡Pago Confirmado y Reserva Finalizada!' : 'Payment Confirmed & Booking Finalized!',
    pending: lang === 'es' 
      ? 'Pago en proceso de confirmación' 
      : 'Payment verification in progress',
    contact_support: lang === 'es' ? 'Atención Requerida' : 'Assistance Required',
    bookingRefLabel: lang === 'es' ? 'Referencia de Reserva:' : 'Booking Reference:',
    backHome: lang === 'es' ? 'Volver al Inicio' : 'Return to Home',
    supportNotice: lang === 'es' 
      ? 'Si tiene alguna pregunta, contáctenos en info@gunayalapanama.com con su número de referencia.'
      : 'If you have questions, please reach out to info@gunayalapanama.com citing your booking reference.',
    checkAgain: lang === 'es' ? 'Verificar Nuevamente' : 'Check Status Again',
  };

  const checkStatus = async () => {
    if (typeof window === 'undefined') return;

    // First run initialization: capture credentials into memory, then immediately scrub browser address bar
    if (!credentialsRef.current.initialized) {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('bookingReference') || urlParams.get('PARM_1') || urlParams.get('ref') || '';
      const key = urlParams.get('pvt') || urlParams.get('vt') || urlParams.get('idem') || urlParams.get('idempotencyKey') || urlParams.get('PARM_2') || '';
      const oper = urlParams.get('codOper') || urlParams.get('oper') || '';

      credentialsRef.current = { ref, key, oper, initialized: true };
      setBookingRef(ref);

      // SECURITY: Strip sensitive capability tokens from the browser URL address bar immediately
      // so they cannot leak via Referer headers, third-party scripts, analytics tools, or browser history/bookmarks
      if (
        window.history &&
        window.history.replaceState &&
        (urlParams.has('pvt') ||
          urlParams.has('vt') ||
          urlParams.has('idem') ||
          urlParams.has('idempotencyKey') ||
          urlParams.has('PARM_2') ||
          urlParams.has('codOper') ||
          urlParams.has('oper'))
      ) {
        const sanitizedUrl = new URL(window.location.href);
        sanitizedUrl.searchParams.delete('pvt');
        sanitizedUrl.searchParams.delete('vt');
        sanitizedUrl.searchParams.delete('idem');
        sanitizedUrl.searchParams.delete('idempotencyKey');
        sanitizedUrl.searchParams.delete('PARM_2');
        sanitizedUrl.searchParams.delete('codOper');
        sanitizedUrl.searchParams.delete('oper');
        window.history.replaceState({}, document.title, sanitizedUrl.pathname + sanitizedUrl.search + sanitizedUrl.hash);
      }
    }

    const { ref, key, oper } = credentialsRef.current;

    if (!ref) {
      setStatus('contact_support');
      setMessage(
        lang === 'es'
          ? 'Falta la referencia de la reserva. Si completó el pago, su reserva será conciliada automáticamente.'
          : 'Missing booking reference. If you completed your payment, our automated system will reconcile it shortly.'
      );
      return;
    }

    try {
      const res = await fetch('/api/check-payment-status', {
        method: 'POST',
        credentials: 'include', // Transmits HttpOnly __Host-payment-capability cookie securely
        headers: {
          'Content-Type': 'application/json',
          ...(key ? { 'X-Verification-Key': key } : {}),
        },
        body: JSON.stringify({
          bookingReference: ref,
          verificationKey: key || undefined,
          operationCode: oper || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.state) {
        setStatus(data.state);
        setMessage(data.message || '');
      } else {
        setStatus('contact_support');
        setMessage(data.message || 'Unable to verify payment status at this time.');
      }
    } catch {
      setStatus('pending');
      setMessage(
        lang === 'es'
          ? 'No pudimos verificar de inmediato. La conciliación automática del servidor confirmará su reserva en breve.'
          : 'Could not contact verification service immediately. Automatic background reconciliation will confirm your booking shortly.'
      );
    }
  };

  useEffect(() => {
    // SECURITY: Enforce strict no-referrer while on the checkout confirmation page
    const existingMeta = document.querySelector('meta[name="referrer"]');
    const prevReferrer = existingMeta ? existingMeta.getAttribute('content') : null;
    if (existingMeta) {
      existingMeta.setAttribute('content', 'no-referrer');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'referrer';
      meta.content = 'no-referrer';
      document.head.appendChild(meta);
    }

    checkStatus();

    return () => {
      if (existingMeta && prevReferrer) {
        existingMeta.setAttribute('content', prevReferrer);
      } else if (!existingMeta) {
        const meta = document.querySelector('meta[name="referrer"]');
        if (meta) meta.remove();
      }
    };
  }, []);

  // Poll a maximum of 4 times if status is 'verifying'
  useEffect(() => {
    if (status === 'verifying' && pollingCount < 4) {
      const timer = setTimeout(() => {
        setPollingCount((prev) => prev + 1);
        checkStatus();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, pollingCount]);

  return (
    <div className="min-h-screen bg-sand-50 py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-sand-200 text-center">
        {/* Status Icons */}
        <div className="flex justify-center mb-6">
          {status === 'verifying' && (
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center animate-pulse">
              <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
            </div>
          )}
          {status === 'confirmed' && (
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
          )}
          {status === 'pending' && (
            <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          )}
          {status === 'contact_support' && (
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
          )}
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {status === 'verifying' && t.verifying}
          {status === 'confirmed' && t.confirmed}
          {status === 'pending' && t.pending}
          {status === 'contact_support' && t.contact_support}
        </h1>

        {/* Subtitle / Details */}
        <p className="text-sm text-gray-600 mb-6">
          {message || t.subtitle}
        </p>

        {/* Reference Pill */}
        {bookingRef && (
          <div className="bg-sand-100/70 border border-sand-300/80 rounded-xl p-3 mb-6">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold block mb-0.5">
              {t.bookingRefLabel}
            </span>
            <code className="text-base font-bold text-ocean-900 tracking-wide font-mono">
              {bookingRef}
            </code>
          </div>
        )}

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-700 bg-emerald-50/80 border border-emerald-200/60 rounded-lg py-2 px-3 mb-6">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Verified via PagueloFacil Server-to-Server Reconciler</span>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {status === 'pending' && (
            <button
              onClick={() => {
                setPollingCount(0);
                checkStatus();
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-ocean-700 bg-ocean-50 hover:bg-ocean-100 transition-colors border border-ocean-200"
            >
              <RefreshCw className="w-4 h-4" />
              {t.checkAgain}
            </button>
          )}

          <button
            onClick={onBackToHome}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-ocean-600 hover:bg-ocean-700 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.backHome}
          </button>
        </div>

        {/* Support Footer */}
        <div className="mt-8 pt-4 border-t border-sand-200 text-xs text-gray-500 flex items-center justify-center gap-1">
          <Mail className="w-3.5 h-3.5 text-gray-400" />
          <span>{t.supportNotice}</span>
        </div>
      </div>
    </div>
  );
};
