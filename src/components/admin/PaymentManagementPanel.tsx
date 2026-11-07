import React, { useState } from 'react';
import {
  CreditCard,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Lock,
  Info,
  DollarSign,
  FileCheck,
} from 'lucide-react';
import { PaymentLifecycleStatus } from '../../types/payment';

interface PaymentManagementPanelProps {
  onBackToDashboard?: () => void;
}

export const PaymentManagementPanel: React.FC<PaymentManagementPanelProps> = () => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const statusDefinitions: Array<{
    status: PaymentLifecycleStatus;
    labelEn: string;
    labelEs: string;
    description: string;
    badgeClass: string;
    icon: any;
  }> = [
    {
      status: 'awaiting_approval',
      labelEn: 'Awaiting Petra\'s Approval',
      labelEs: 'Esperando Aprobación de Petra',
      description: 'Trip request submitted; Petra must verify cabana and boat availability with local island hosts before payment can be generated.',
      badgeClass: 'bg-amber-50 text-amber-900 border-amber-200',
      icon: Clock,
    },
    {
      status: 'pending',
      labelEn: 'Payment Link Generated',
      labelEs: 'Enlace de Pago Generado',
      description: 'Quotation approved and timed PagueloFacil hosted checkout link created. Customer has received payment instructions.',
      badgeClass: 'bg-sky-50 text-sky-900 border-sky-200',
      icon: ExternalLink,
    },
    {
      status: 'processing',
      labelEn: 'Payment Processing (3DS)',
      labelEs: 'Procesando Pago (3DS)',
      description: 'Customer is on checkout.paguelofacil.com completing card verification or 3D Secure challenge.',
      badgeClass: 'bg-blue-50 text-blue-900 border-blue-200',
      icon: RotateCcw,
    },
    {
      status: 'approved',
      labelEn: 'Payment Verified & Approved',
      labelEs: 'Pago Verificado y Aprobado',
      description: 'PagueloFacil gateway webhook confirmed approved transaction. Booking officially confirmed in Supabase.',
      badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      icon: CheckCircle2,
    },
    {
      status: 'rejected',
      labelEn: 'Payment Declined / Failed',
      labelEs: 'Pago Rechazado / Fallido',
      description: 'Card declined or payment failed gateway fraud filters. Customer can retry with an alternative card.',
      badgeClass: 'bg-red-50 text-red-900 border-red-200',
      icon: XCircle,
    },
    {
      status: 'expired',
      labelEn: 'Payment Window Expired',
      labelEs: 'Enlace de Pago Vencido',
      description: 'Customer did not complete payment within the provisional hold window (e.g. 48 hours). Cabana hold released.',
      badgeClass: 'bg-gray-100 text-gray-800 border-gray-300',
      icon: AlertTriangle,
    },
    {
      status: 'refunded',
      labelEn: 'Refunded',
      labelEs: 'Reembolsado',
      description: 'Administrative refund issued via PagueloFacil (e.g. extreme weather port authority closure).',
      badgeClass: 'bg-purple-50 text-purple-900 border-purple-200',
      icon: RotateCcw,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner: Safe Preparation Mode */}
      <div className="bg-[#FAF8F5] border border-[#E2D8C5] rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-700 mt-0.5">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-[#06121e]">
                PagueloFacil Payment Gateway — Safe Preparation Mode
              </h3>
              <span className="px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-wider rounded-full bg-amber-100 text-amber-800 border border-amber-300 font-semibold">
                Unconfigured (Zero Live Charges)
              </span>
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              The payment infrastructure is fully architected and ready for activation. Real customer credit card charges remain strictly disabled until Petra confirms her PagueloFacil merchant credentials (<code className="bg-amber-100/50 px-1 py-0.5 rounded font-mono text-[11px]">CCLW</code>, <code className="bg-amber-100/50 px-1 py-0.5 rounded font-mono text-[11px]">API Key</code>, and Webhook callback).
            </p>
          </div>
        </div>
      </div>

      {/* Merchant Checklist */}
      <div className="bg-white border border-[#E2D8C5] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#06121e]">
            <FileCheck className="w-4 h-4 text-[#06121e]" />
            <span>PagueloFacil Pre-Activation Checklist for Petra</span>
          </div>
          <span className="text-xs text-[#64748b] font-mono">Pending Merchant Confirmation</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] space-y-1">
            <span className="font-semibold text-[#06121e] block">1. Merchant Web Connection Key (CCLW)</span>
            <p className="text-[#64748b]">128-character hex code found in PagueloFacil Portal (Mi Empresa &gt; Llaves).</p>
            <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-gray-200 text-gray-700">Awaiting Sandbox &amp; Live CCLW</span>
          </div>

          <div className="p-3.5 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] space-y-1">
            <span className="font-semibold text-[#06121e] block">2. REST Management API Token</span>
            <p className="text-[#64748b]">Secret bearer token for server-side transaction verification.</p>
            <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-gray-200 text-gray-700">Awaiting Token</span>
          </div>

          <div className="p-3.5 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] space-y-1">
            <span className="font-semibold text-[#06121e] block">3. Webhook URL Registration</span>
            <p className="text-[#64748b]">Endpoint to register with PagueloFacil support: <code className="font-mono text-[10px]">/.netlify/functions/paguelofacil-webhook</code></p>
            <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-gray-200 text-gray-700">Ready to Register</span>
          </div>

          <div className="p-3.5 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] space-y-1">
            <span className="font-semibold text-[#06121e] block">4. Overnight Deposit Rules</span>
            <p className="text-[#64748b]">Standard deposit required to reserve cabanas (e.g. 50% card, 50% cash on island).</p>
            <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-gray-200 text-gray-700">To confirm with Petra</span>
          </div>
        </div>
      </div>

      {/* Lifecycle Status Overview & Visual Guide */}
      <div className="bg-white border border-[#E2D8C5] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#06121e]">
            <CreditCard className="w-4 h-4 text-[#06121e]" />
            <span>Payment Lifecycle Architecture</span>
          </div>
          <span className="text-xs text-[#64748b]">7 Defined Strict Lifecycle States</span>
        </div>

        <div className="space-y-3">
          {statusDefinitions.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.status}
                className="p-3.5 rounded-xl border border-[#E2E8F0] hover:border-[#CBD5E1] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-lg border font-mono font-medium text-[11px] inline-flex items-center gap-1.5 ${item.badgeClass}`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.labelEn}</span>
                  </span>
                  <span className="text-gray-400 hidden sm:inline">&bull;</span>
                  <span className="text-[#334155] font-medium">{item.labelEs}</span>
                </div>
                <p className="text-[#64748b] text-[11px] sm:max-w-md sm:text-right">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Simulation / Guard Banner */}
      <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-700" />
          <span>Payment action controls in Quotation Editor will become active once Petra's merchant keys are confirmed.</span>
        </div>
        <button
          disabled
          className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-500 font-mono text-[11px] cursor-not-allowed opacity-75"
          title="Disabled in Safe Preparation Mode"
        >
          Generate Payment Link (Locked)
        </button>
      </div>
    </div>
  );
};
