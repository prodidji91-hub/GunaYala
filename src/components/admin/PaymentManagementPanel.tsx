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
  Play,
  Loader2,
  Server,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { PaymentLifecycleStatus, AdminSandboxTestResponse } from '../../types/payment';
import { supabase } from '../../lib/supabase';
import { parseSandboxReturnParams, ParsedSandboxReturn } from '../../utils/sandboxReturnParser';

interface PaymentManagementPanelProps {
  onBackToDashboard?: () => void;
}

export const PaymentManagementPanel: React.FC<PaymentManagementPanelProps> = ({ onBackToDashboard }) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  // Sandbox Connectivity Test State (Part 25H)
  const [isTestingSandbox, setIsTestingSandbox] = useState<boolean>(false);
  const [sandboxTestResult, setSandboxTestResult] = useState<AdminSandboxTestResponse | null>(null);
  const [testErrorMessage, setTestErrorMessage] = useState<string | null>(null);

  // Existing Transaction Sandbox Diagnostic State (TEST-DAYTOUR-GNY-643300)
  const [isDiagnosingExistingTx, setIsDiagnosingExistingTx] = useState<boolean>(false);
  const [existingTxDiagnosticResult, setExistingTxDiagnosticResult] = useState<any>(null);
  const [existingTxError, setExistingTxError] = useState<string | null>(null);

  // Sandbox Hosted-Checkout Return Detection State (Part 25I)
  const [sandboxReturnResult, setSandboxReturnResult] = useState<ParsedSandboxReturn | null>(() => {
    if (typeof window !== 'undefined') {
      const parsed = parseSandboxReturnParams(window.location.search);
      if (parsed.isSandboxReturn) {
        return parsed;
      }
    }
    return null;
  });

  const handleDismissSandboxReturn = () => {
    setSandboxReturnResult(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const handleRunSandboxTest = async () => {
    setIsTestingSandbox(true);
    setTestErrorMessage(null);
    setSandboxTestResult(null);

    try {
      if (!supabase) {
        throw new Error('Supabase client is not available.');
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session?.access_token) {
        throw new Error('You must be logged in as an authorized quotation administrator.');
      }

      const response = await fetch('/api/admin/payment-sandbox-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          adminNote: 'Admin dashboard manual connectivity verification',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setSandboxTestResult(data);
        setTestErrorMessage(data.error || `HTTP ${response.status}: Sandbox test did not succeed.`);
      } else {
        setSandboxTestResult(data);
      }
    } catch (err: any) {
      setTestErrorMessage(err.message || 'An unexpected error occurred while running the sandbox test.');
    } finally {
      setIsTestingSandbox(false);
    }
  };

  const handleDiagnoseExistingTransaction = async () => {
    setIsDiagnosingExistingTx(true);
    setExistingTxError(null);
    setExistingTxDiagnosticResult(null);

    try {
      if (!supabase) {
        throw new Error('Supabase client is not available.');
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session?.access_token) {
        throw new Error('You must be logged in as an authorized quotation administrator.');
      }

      const response = await fetch('/api/admin/payment-sandbox-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          action: 'diagnose_existing_transaction',
          bookingReference: 'TEST-DAYTOUR-GNY-643300',
          operationCode: 'LK-BMMRPXP4MZDB',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setExistingTxError(data.error || `HTTP ${response.status}: Diagnostic failed.`);
      } else {
        setExistingTxDiagnosticResult(data.existingTransactionDiagnostic);
      }
    } catch (err: any) {
      setExistingTxError(err.message || 'An unexpected error occurred while running the existing transaction diagnostic.');
    } finally {
      setIsDiagnosingExistingTx(false);
    }
  };

  const [isReconcilingExistingTx, setIsReconcilingExistingTx] = useState<boolean>(false);
  const [reconciliationResult, setReconciliationResult] = useState<any>(null);
  const [reconciliationError, setReconciliationError] = useState<string | null>(null);

  const handleReconcileExistingTransaction = async () => {
    setIsReconcilingExistingTx(true);
    setReconciliationError(null);
    setReconciliationResult(null);

    try {
      if (!supabase) {
        throw new Error('Supabase client is not available.');
      }
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session?.access_token) {
        throw new Error('You must be logged in as an authorized quotation administrator.');
      }

      const response = await fetch('/api/admin/payment-sandbox-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: JSON.stringify({
          action: 'reconcile_existing_transaction',
          bookingReference: 'TEST-DAYTOUR-GNY-643300',
          operationCode: 'LK-BMMRPXP4MZDB',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setReconciliationError(data.error || data.message || `HTTP ${response.status}: Reconciliation failed.`);
      } else {
        setReconciliationResult(data.reconciliation);
      }
    } catch (err: any) {
      setReconciliationError(err.message || 'An unexpected error occurred during payment reconciliation.');
    } finally {
      setIsReconcilingExistingTx(false);
    }
  };

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
      {/* Top Bar Navigation if onBackToDashboard provided */}
      {onBackToDashboard && (
        <div className="flex items-center justify-between pb-2 border-b border-[#E2D8C5]">
          <button
            onClick={onBackToDashboard}
            className="text-xs text-[#0e3b2f] hover:underline font-medium flex items-center gap-1 cursor-pointer"
          >
            &larr; Back to Quotation Administration
          </button>
        </div>
      )}

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

      {/* ========================================================
          PART 25I: SANDBOX HOSTED-CHECKOUT RETURN RESULT (UNVERIFIED)
         ======================================================== */}
      {sandboxReturnResult && (
        <div className="bg-white border-2 border-amber-400/80 rounded-2xl p-6 shadow-sm space-y-5">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-100 pb-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-[#06121e]">
                  {sandboxReturnResult.headline}
                </h3>
                <span className="px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold">
                  Unverified Browser Return
                </span>
                <span className="px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider rounded-full bg-purple-100 text-purple-900 border border-purple-300 font-semibold">
                  Sandbox Only
                </span>
              </div>
              <p className="text-xs text-[#64748b]">
                PagueloFacil Demo hosted checkout redirected back to <code className="font-mono text-[11px] bg-gray-100 px-1 py-0.5 rounded">/admin?sandbox-test=complete</code>.
              </p>
            </div>

            <button
              onClick={handleDismissSandboxReturn}
              className="text-xs text-[#64748b] hover:text-[#06121e] hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto shrink-0"
              title="Clear return notice from screen and remove query parameters"
            >
              <span>Dismiss Notice</span>
              <XCircle className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>

          {/* Security & Verification Banner */}
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-950">
                  {sandboxReturnResult.verificationNotice}
                </p>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Browser query parameters can be altered in the address bar and are strictly untrusted. Under payment security policy, no transaction or booking is ever marked paid based on client redirects. Authoritative settlement confirmation requires PagueloFacil merchant server verification.
                </p>
              </div>
            </div>
          </div>

          {/* Returned Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Reference Number */}
            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E2D8C5] space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#64748b] block">
                Reference (PARM_1)
              </span>
              <div className="font-mono text-xs font-semibold text-[#06121e] break-all">
                {sandboxReturnResult.reference || <span className="text-gray-400 font-normal italic">Not provided</span>}
              </div>
              <p className="text-[10px] text-[#64748b]">Unique sandbox test operation tag</p>
            </div>

            {/* Returned Amount */}
            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E2D8C5] space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#64748b] block">
                Returned Amount (TotalPagado)
              </span>
              <div className="text-sm font-bold text-[#06121e] flex items-center gap-2">
                {sandboxReturnResult.amount !== null ? (
                  <span>${sandboxReturnResult.amount.toFixed(2)} USD</span>
                ) : (
                  <span className="text-gray-400 font-normal italic">
                    {sandboxReturnResult.totalPagadoRaw || 'Not provided'}
                  </span>
                )}
                {sandboxReturnResult.isZeroAmount && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-800">
                    Zero / Unconfirmed
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#64748b]">Amount reported in query string</p>
            </div>

            {/* Reported Estado */}
            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E2D8C5] space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#64748b] block">
                Reported Estado
              </span>
              <div className="text-xs font-bold text-[#06121e]">
                {sandboxReturnResult.estado ? (
                  <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-300">
                    {sandboxReturnResult.estado}
                  </span>
                ) : (
                  <span className="text-gray-400 font-normal italic">Not reported</span>
                )}
              </div>
              <p className="text-[10px] text-[#64748b]">Client-side claim (unverified)</p>
            </div>

            {/* Reported Oper */}
            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E2D8C5] space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#64748b] block">
                Gateway Operation ID (Oper)
              </span>
              <div className="font-mono text-xs font-semibold text-[#06121e]">
                {sandboxReturnResult.oper || <span className="text-gray-400 font-normal italic">Not reported</span>}
              </div>
              <p className="text-[10px] text-[#64748b]">Operation reference in gateway logs</p>
            </div>

            {/* Reported Razon */}
            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E2D8C5] space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#64748b] block">
                Reported Reason (Razon)
              </span>
              <div className="text-xs text-[#06121e]">
                {sandboxReturnResult.razon || <span className="text-gray-400 italic">None reported</span>}
              </div>
              <p className="text-[10px] text-[#64748b]">Gateway response narrative</p>
            </div>

            {/* Verification Status */}
            <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E2D8C5] space-y-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#64748b] block">
                Database & Payment Status
              </span>
              <div className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Payment status not verified</span>
              </div>
              <p className="text-[10px] text-[#64748b]">Zero database mutations executed</p>
            </div>
          </div>

          {/* Merchant Dashboard Guidance & Action Buttons */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-3">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="font-semibold text-slate-900">
                  Authoritative Transaction Verification in Merchant Dashboard
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  No public client verification endpoint exists for the $1 test. To confirm card authorization, approval, or test fund settlement, open Petra&apos;s PagueloFacil Demo portal. Look up the Oper ID or Reference above in the merchant transactions ledger.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href="https://admin.paguelofacil.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0e3b2f] hover:bg-[#155243] text-[#FAF8F5] text-xs font-semibold rounded-xl shadow-sm transition-all duration-200 cursor-pointer"
              >
                <span>Open PagueloFacil Merchant Dashboard</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#D6BA80]" />
              </a>

              <button
                onClick={handleDismissSandboxReturn}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-gray-100 text-[#06121e] border border-[#E2D8C5] text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <span>Clear Sandbox Return Notice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PART 25H: ADMIN-ONLY SANDBOX CONNECTIVITY TEST RUNNER
         ======================================================== */}
      <div className="bg-white border-2 border-[#D6BA80]/60 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F1F5F9] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-[#0e3b2f]" />
              <h3 className="text-sm sm:text-base font-bold text-[#06121e]">
                Admin-Only PagueloFacil Sandbox Connection Test (Part 25H)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded bg-sky-100 text-sky-800 border border-sky-300 font-semibold">
                Isolated $1.00 USD
              </span>
            </div>
            <p className="text-xs text-[#64748b]">
              Verify that Petra's Sandbox Demo account can programmatically generate a genuine PagueloFacil hosted-checkout URL.
            </p>
          </div>

          <button
            onClick={handleRunSandboxTest}
            disabled={isTestingSandbox}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0e3b2f] hover:bg-[#155243] text-[#FAF8F5] text-xs font-semibold rounded-xl shadow-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {isTestingSandbox ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#D6BA80]" />
                <span>Contacting Sandbox...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 text-[#D6BA80]" />
                <span>Test Sandbox Connection ($1.00)</span>
              </>
            )}
          </button>
        </div>

        {/* Isolation Principles Callout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E2D8C5] space-y-1">
            <span className="font-semibold text-[#0e3b2f] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zero Database Mutation</span>
            </span>
            <p className="text-[11px] text-[#64748b]">
              Connectivity-only test. Does not write to <code className="font-mono text-[10px]">payment_transactions</code> or affect real customer bookings.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E2D8C5] space-y-1">
            <span className="font-semibold text-[#0e3b2f] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>Sandbox Only</span>
            </span>
            <p className="text-[11px] text-[#64748b]">
              Targeted strictly at <code className="font-mono text-[10px]">sandbox.paguelofacil.com</code>. Production payment endpoints are strictly forbidden.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E2D8C5] space-y-1">
            <span className="font-semibold text-[#0e3b2f] flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-amber-600" />
              <span>Admin Bearer Auth</span>
            </span>
            <p className="text-[11px] text-[#64748b]">
              Requires verified Supabase <code className="font-mono text-[10px]">quotation_admins</code> session token. Public users have zero access.
            </p>
          </div>
        </div>

        {/* Test Result: Success */}
        {sandboxTestResult && sandboxTestResult.success && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-bold text-sm">
                Sandbox Connection Verified Successfully!
              </span>
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed">
              {sandboxTestResult.message}
            </p>
            <div className="p-3 rounded-lg bg-white/80 border border-emerald-200 font-mono text-[11px] space-y-1">
              <div><strong>Test Ref:</strong> {sandboxTestResult.testReference}</div>
              <div><strong>Amount:</strong> ${sandboxTestResult.amount?.toFixed(2)} {sandboxTestResult.currency}</div>
              <div><strong>Link Code:</strong> {sandboxTestResult.linkCode || 'N/A'}</div>
              <div><strong>Expires:</strong> {sandboxTestResult.expiresAt}</div>
            </div>
            {sandboxTestResult.checkoutUrl && (
              <div className="pt-1">
                <a
                  href={sandboxTestResult.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-medium text-xs shadow-sm transition-colors cursor-pointer"
                >
                  <span>Open Genuine Sandbox Checkout Page</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        )}

        {/* Test Result: Error / Rejection / Diagnostic */}
        {testErrorMessage && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="font-bold text-sm">Sandbox Connection Test Status</span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed font-mono">
              {testErrorMessage}
            </p>
            {sandboxTestResult?.diagnostic && (
              <div className="p-3 rounded-lg bg-white/80 border border-amber-200 font-mono text-[11px] space-y-1">
                <div><strong>CCLW Configured:</strong> {sandboxTestResult.diagnostic.cclwConfigured ? 'Yes' : 'No'}</div>
                <div><strong>CCLW Masked:</strong> {sandboxTestResult.diagnostic.cclwMasked}</div>
                <div><strong>Token Configured:</strong> {sandboxTestResult.diagnostic.tokenConfigured ? 'Yes' : 'No'}</div>
                <div><strong>Target Endpoint:</strong> {sandboxTestResult.diagnostic.gatewayEndpoint}</div>
                <div><strong>Timestamp:</strong> {sandboxTestResult.diagnostic.requestTimestamp}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================
          EXISTING APPROVED TRANSACTION DIAGNOSTIC CARD (TEST-DAYTOUR-GNY-643300)
         ======================================================== */}
      <div className="bg-white border-2 border-[#0e3b2f]/40 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F1F5F9] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0e3b2f]" />
              <h3 className="text-sm sm:text-base font-bold text-[#06121e]">
                Existing Transaction Diagnostic (TEST-DAYTOUR-GNY-643300)
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold">
                Read-Only Audit
              </span>
            </div>
            <p className="text-xs text-[#64748b]">
              Verify Supabase booking record and query PagueloFacil Sandbox MerchantTransactions for approved TX ID 703537 (LK-BMMRPXP4MZDB, $69.00 USD).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleDiagnoseExistingTransaction}
              disabled={isDiagnosingExistingTx}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0e3b2f] hover:bg-[#155243] text-[#FAF8F5] text-xs font-semibold rounded-xl shadow-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isDiagnosingExistingTx ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#D6BA80]" />
                  <span>Running Audit...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-[#D6BA80]" />
                  <span>Run Existing Tx Diagnostic</span>
                </>
              )}
            </button>

            <button
              onClick={handleReconcileExistingTransaction}
              disabled={isReconcilingExistingTx}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isReconcilingExistingTx ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Reconciling...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Verify &amp; Reconcile Existing Payment</span>
                </>
              )}
            </button>
          </div>
        </div>

        {existingTxError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-xs text-red-900 font-mono">
            <strong>Diagnostic Error:</strong> {existingTxError}
          </div>
        )}

        {reconciliationError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-xs text-red-900 font-mono">
            <strong>Reconciliation Error:</strong> {reconciliationError}
          </div>
        )}

        {reconciliationResult && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 space-y-2 font-mono">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Reconciliation Completed Successfully!</span>
            </div>
            <div><strong>Message:</strong> {reconciliationResult.message}</div>
            <div><strong>Category:</strong> {reconciliationResult.category}</div>
            <div><strong>Database Updated:</strong> {reconciliationResult.databaseUpdated ? 'Yes' : 'No (Already Approved / Skipped)'}</div>
            <div><strong>Amount Paid:</strong> ${reconciliationResult.amountPaid?.toFixed(2)} USD</div>
          </div>
        )}

        {existingTxDiagnosticResult && (
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E2D8C5] text-xs text-[#06121e] space-y-3">
            <div className="flex items-center justify-between border-b border-[#E2D8C5] pb-2">
              <span className="font-bold uppercase tracking-wider font-mono text-[11px] text-[#0e3b2f]">
                Diagnostic Results — Category: <span className="underline">{existingTxDiagnosticResult.gatewayDiagnostic.diagnosticCategory}</span>
              </span>
              <span className="text-[10px] text-gray-500 font-mono">{existingTxDiagnosticResult.timestamp}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Database Lookup Report */}
              <div className="p-3 bg-white rounded-xl border border-[#E2D8C5] space-y-1 font-mono text-[11px]">
                <div className="font-semibold text-[#0e3b2f] border-b pb-1 mb-1">Supabase Database Lookup</div>
                <div><strong>Booking Ref:</strong> {existingTxDiagnosticResult.bookingReference}</div>
                <div><strong>Row Found:</strong> {existingTxDiagnosticResult.databaseLookup.rowFound ? 'Yes' : 'No'}</div>
                <div><strong>Exact One Row:</strong> {existingTxDiagnosticResult.databaseLookup.exactOneRow ? 'Yes' : 'No'}</div>
                <div><strong>Match Count:</strong> {existingTxDiagnosticResult.databaseLookup.matchCount}</div>
                {existingTxDiagnosticResult.databaseLookup.dbErrorCode && (
                  <div><strong>DB Error Code:</strong> {existingTxDiagnosticResult.databaseLookup.dbErrorCode}</div>
                )}
                {existingTxDiagnosticResult.databaseLookup.transactionRecord && (
                  <div className="pt-1 text-[10px] text-gray-600">
                    <div>Status: {existingTxDiagnosticResult.databaseLookup.transactionRecord.status}</div>
                    <div>Expected: ${existingTxDiagnosticResult.databaseLookup.transactionRecord.expected_amount}</div>
                  </div>
                )}
              </div>

              {/* Gateway MerchantTransactions Report */}
              <div className="p-3 bg-white rounded-xl border border-[#E2D8C5] space-y-1 font-mono text-[11px]">
                <div className="font-semibold text-[#0e3b2f] border-b pb-1 mb-1">PagueloFacil Sandbox API</div>
                <div><strong>Target Code:</strong> {existingTxDiagnosticResult.targetOperationCode}</div>
                <div><strong>HTTP Status:</strong> {existingTxDiagnosticResult.gatewayDiagnostic.httpStatus ?? 'N/A'}</div>
                <div><strong>Records Found:</strong> {existingTxDiagnosticResult.gatewayDiagnostic.recordsFoundCount}</div>
                <div><strong>Category:</strong> {existingTxDiagnosticResult.gatewayDiagnostic.diagnosticCategory}</div>
                {existingTxDiagnosticResult.gatewayDiagnostic.parsedRecord && (
                  <div className="pt-1 text-[10px] text-gray-600 space-y-0.5">
                    <div>codOper: {existingTxDiagnosticResult.gatewayDiagnostic.parsedRecord.codOper}</div>
                    <div>Status: {existingTxDiagnosticResult.gatewayDiagnostic.parsedRecord.status}</div>
                    <div>Amount: ${existingTxDiagnosticResult.gatewayDiagnostic.parsedRecord.amount}</div>
                    <div>Currency: {existingTxDiagnosticResult.gatewayDiagnostic.parsedRecord.currency}</div>
                  </div>
                )}
                {existingTxDiagnosticResult.gatewayDiagnostic.error && (
                  <div className="text-red-600 pt-1 text-[10px]">Error: {existingTxDiagnosticResult.gatewayDiagnostic.error}</div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-[#475569] italic">
              {existingTxDiagnosticResult.message} Zero database mutations were performed.
            </p>
          </div>
        )}
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
            <p className="text-[#64748b]">Endpoint to register with PagueloFacil support: <code className="font-mono text-[10px]">/.netlify/functions/payment-webhook</code></p>
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

