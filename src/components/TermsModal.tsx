import React, { useState } from 'react';
import { Language } from '../types';
import { X, FileText, Shield, AlertCircle } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: Language;
  initialTab?: 'overnight' | 'day-trip';
}

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  onClose,
  currentLang,
  initialTab = 'day-trip',
}) => {
  const [activeTab, setActiveTab] = useState<'overnight' | 'day-trip'>(initialTab);

  if (!isOpen) return null;

  const isEs = currentLang === 'es';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FAF8F5] border border-[#C8AC75]/40 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#061815] text-[#FAF8F5] px-6 py-4 flex items-center justify-between border-b border-[#C8AC75]/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-[#C8AC75]" />
            <div>
              <h2 className="font-serif text-lg text-white font-medium">
                {isEs ? 'Términos y Condiciones Oficiales' : 'Official Terms & Conditions'}
              </h2>
              <span className="text-[10px] font-mono text-[#C8AC75]">
                {isEs ? 'Actualizado: 18 de Octubre, 2026' : 'Effective Date: October 18, 2026'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#FAF8F5] transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#E2D8C5] bg-[#F2ECE0] shrink-0">
          <button
            onClick={() => setActiveTab('day-trip')}
            className={`flex-1 py-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'day-trip'
                ? 'border-[#061815] text-[#061815] bg-white'
                : 'border-transparent text-[#64748b] hover:text-[#06121e]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#C8AC75]" />
            <span>{isEs ? 'Tour de Día Compartido (Day Tour)' : 'Shared Day Tour Terms'}</span>
          </button>
          <button
            onClick={() => setActiveTab('overnight')}
            className={`flex-1 py-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'overnight'
                ? 'border-[#061815] text-[#061815] bg-white'
                : 'border-transparent text-[#64748b] hover:text-[#06121e]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-[#C8AC75]" />
            <span>{isEs ? 'Estadía Nocturna (Overnight Stay)' : 'Overnight Stay Terms'}</span>
          </button>
        </div>

        {/* Spanish Notice Banner */}
        {isEs && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-xs text-amber-900 flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              El documento legal oficial está redactado y disponible en inglés (versión 2026-10-18).
            </span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs sm:text-sm text-[#1C242C] font-sans font-light leading-relaxed">
          
          {activeTab === 'day-trip' ? (
            <div className="space-y-6">
              <div className="border-b border-[#E2D8C5] pb-4">
                <h3 className="text-base font-serif font-semibold text-[#061815]">
                  GUNA YALA PANAMA TRAVEL — SHARED DAY TOUR TERMS & CONDITIONS
                </h3>
                <span className="text-xs text-[#687785] font-mono">Authoritative English Version (October 18, 2026)</span>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-[#061815]">1. Reservation & Confirmation</h4>
                <p>
                  All shared day tour reservations require advance booking and confirmation through our official channels or authorized local coordinators. Availability is subject to weather conditions, comarca access regulations, and vehicle capacity.
                </p>

                <h4 className="font-semibold text-[#061815]">2. Payment & Port Fees</h4>
                <p>
                  Published day tour rates include round-trip 4×4 overland transportation from central Panama City, boat transfers, designated island visits, natural pool stops, lunch with a non-alcoholic drink, and snorkeling equipment usage. Guna Yala territory entrance fees ($22 for foreign visitors / $7 for Panamanian citizens and residents) and port taxes are payable in cash directly at checkpoints and are not included in tour rates unless explicitly specified.
                </p>

                <h4 className="font-semibold text-[#061815]">3. Cancellation & Weather Policy</h4>
                <p>
                  San Blas is an open-air marine reserve. In the event of official port closures or severe maritime weather warnings issued by local authorities (SINAPROC), tours may be rescheduled or fully refunded. Cancellations by guests made less than 24 hours prior to departure are non-refundable due to pre-arranged 4×4 vehicle and boat commitments.
                </p>

                <h4 className="font-semibold text-[#061815]">4. Mandatory Documentation & Conduct</h4>
                <p>
                  All participants must carry their original, valid physical passport (or national cédula for Panamanians) for mandatory Guna Yala comarca border checkpoint inspection. Digital photos or copies are strictly rejected by border authorities. Guests must respect local Guna community customs, environmental guidelines, and captain instructions at all times.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="border-b border-[#E2D8C5] pb-4">
                <h3 className="text-base font-serif font-semibold text-[#061815]">
                  GUNA YALA PANAMA TRAVEL — OVERNIGHT STAY TERMS & CONDITIONS
                </h3>
                <span className="text-xs text-[#687785] font-mono">Authoritative English Version (October 18, 2026)</span>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-[#061815]">1. Overnight Accommodation & Booking Confirmation</h4>
                <p>
                  Overnight island stays in Guna Yala are confirmed upon receipt of deposit or full payment as specified in your personalized quotation. Accommodations consist of traditional eco-island beach cabins or overwater bungalows managed by local Guna families and island hosts.
                </p>

                <h4 className="font-semibold text-[#061815]">2. Inclusions & Exclusions</h4>
                <p>
                  Standard overnight packages include beachfront cabana accommodation, shared round-trip 4×4 overland transfers from Panama City, shared motorboat transfers between Cartí Port and the destination island, traditional meal plans (starting with lunch on arrival and concluding with breakfast or lunch on departure as specified per island), and designated excursion boat tours. Guna Yala territory entrance fees ($22 foreign / $7 national), port taxes ($5), bottled drinks, and personal expenses are excluded.
                </p>

                <h4 className="font-semibold text-[#061815]">3. Deposit & Cancellation Terms</h4>
                <p>
                  Overnight bookings require a deposit to secure cabana inventory. Cancellations made 7 days or more prior to arrival are eligible for date rescheduling or refund minus administrative fees. Late cancellations (within 7 days of arrival) or no-shows are subject to forfeiture of deposit due to limited island capacity and advance food/logistics preparations.
                </p>

                <h4 className="font-semibold text-[#061815]">4. Island Living & Logistics</h4>
                <p>
                  Infrastructure in Guna Yala is rustic and eco-friendly. Electricity and generator hours are scheduled by island hosts. Freshwater is a precious resource transported from the mainland. Original physical passports are mandatory at comarca checkpoints. Guests acknowledge and embrace the remote, off-grid nature of the archipelago.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-[#F2ECE0] px-6 py-4 border-t border-[#E2D8C5] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[#687785]">
            {isEs ? 'Guna Yala Panama Travel — Todos los derechos reservados' : 'Guna Yala Panama Travel — All Rights Reserved'}
          </span>
          <button
            onClick={onClose}
            className="py-2 px-5 bg-[#061815] text-[#FAF8F5] text-xs uppercase tracking-wider font-semibold rounded-xl hover:bg-[#112D24] transition-colors shadow-sm"
          >
            {isEs ? 'Cerrar' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
