import React, { useEffect, useState, useCallback } from 'react';
import {
  CreditCard,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  MessageCircle,
  Loader2,
  Search,
  Edit3,
  Link2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatUsdFromCents } from '../../utils/quotationDepositCalculator';

export interface DepositTransactionSummary {
  id: string;
  bookingReference: string;
  quotationId: string;
  status: string;
  bookingStatus: string | null;
  paymentType: string;
  environment: string;
  paymentUrl: string | null;
  gatewayLinkCode: string | null;
  gatewayOperationId: string | null;
  expectedAmount: number;
  amountPaid: number | null;
  amountInCents: number;
  approvedTotalCents: number;
  remainingBalanceCents: number;
  expiresAt: string | null;
  verifiedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DepositQuotationItem {
  quotationId: string;
  quotationReference: string;
  status: string;
  termsStatus: string;
  pricingStatus: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  island: string;
  arrivalDate: string;
  departureDate: string;
  nights: number;
  travelers: number;
  expiryDate: string;
  eligibleForDeposit: boolean;
  ineligibleReason: string | null;
  approvedTotalCents: number;
  depositCents: number;
  remainingBalanceCents: number;
  latestTransaction: DepositTransactionSummary | null;
  updatedAt?: string;
}

interface DepositPaymentLinksSectionProps {
  focusedQuotationId?: string | null;
  onEditQuotationById?: (quotationId: string) => void;
}

function buildWhatsAppShareUrl(item: DepositQuotationItem, tx: DepositTransactionSummary): string {
  const cleanPhone = (item.customerPhone || '').replace(/[^\d]/g, '');
  const depositFormatted = `$${formatUsdFromCents(tx.amountInCents || item.depositCents)} USD`;
  const balanceFormatted = `$${formatUsdFromCents(tx.remainingBalanceCents || item.remainingBalanceCents)} USD`;
  const totalFormatted = `$${formatUsdFromCents(tx.approvedTotalCents || item.approvedTotalCents)} USD`;

  const message = [
    `Hola ${item.customerName || 'traveler'} / Hello ${item.customerName || 'traveler'},`,
    '',
    `Here is your secure 50% deposit payment link from Guna Yala Panama Travel for Quotation ${item.quotationReference} (${item.island}):`,
    `• Approved Total: ${totalFormatted}`,
    `• 50% Deposit Due Now: ${depositFormatted}`,
    `• Remaining Balance: ${balanceFormatted}`,
    `• Booking Reference: ${tx.bookingReference}`,
    '',
    `Secure PagueloFacil Link: ${tx.paymentUrl || ''}`,
    '',
    `Please let us know once completed so Petra can finalize your island logistics.`,
  ].join('\n');

  const encoded = encodeURIComponent(message);
  return cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

export const DepositPaymentLinksSection: React.FC<DepositPaymentLinksSectionProps> = ({
  focusedQuotationId,
  onEditQuotationById,
}) => {
  const [items, setItems] = useState<DepositQuotationItem[]>([]);
  const [environment, setEnvironment] = useState<string>('unconfigured');
  const [gatewayReady, setGatewayReady] = useState<boolean>(false);
  const [gatewayNotice, setGatewayNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAllOvernight, setShowAllOvernight] = useState<boolean>(false);

  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [operationInputs, setOperationInputs] = useState<Record<string, string>>({});

  const callDepositApi = async (payload: Record<string, any>) => {
    if (!supabase) {
      throw new Error('Supabase authentication client is not initialized.');
    }
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData?.session?.access_token) {
      throw new Error('You must sign in as an authorized quotation administrator.');
    }

    const response = await fetch('/api/admin/deposit-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  };

  const loadDepositQuotations = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const { ok, data } = await callDepositApi({ action: 'list_deposit_quotations' });
      if (!ok || !data.success) {
        throw new Error(data.error || 'Failed to load overnight quotations.');
      }
      setItems(Array.isArray(data.items) ? data.items : []);
      setEnvironment(data.environment || 'unconfigured');
      setGatewayReady(Boolean(data.gatewayReady));
      setGatewayNotice(data.gatewayNotice || null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to load deposit payment quotations.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepositQuotations();
  }, [loadDepositQuotations]);

  const handleGenerateDepositLink = async (item: DepositQuotationItem) => {
    setGeneratingId(item.quotationId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const { ok, data } = await callDepositApi({
        action: 'generate_deposit_link',
        quotationId: item.quotationId,
      });

      if (!ok || !data.success) {
        throw new Error(data.error || 'Could not generate 50% deposit payment link.');
      }

      setSuccessMsg(data.message || `50% deposit payment link ready for ${item.quotationReference}.`);
      await loadDepositQuotations();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error generating 50% deposit payment link.');
      await loadDepositQuotations();
    } finally {
      setGeneratingId(null);
    }
  };

  const handleRefreshStatus = async (item: DepositQuotationItem) => {
    setRefreshingId(item.quotationId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const opCode = (operationInputs[item.quotationId] || '').trim();
      const { data } = await callDepositApi({
        action: 'refresh_deposit_status',
        quotationId: item.quotationId,
        transactionId: item.latestTransaction?.id,
        bookingReference: item.latestTransaction?.bookingReference,
        operationCode: opCode || undefined,
      });

      if (data.success && data.transaction?.status === 'approved') {
        setSuccessMsg(
          `Verified with PagueloFacil: 50% Deposit Approved ($${Number(data.transaction.amountPaid ?? data.transaction.expectedAmount).toFixed(2)} USD). Booking marked deposit_received.`
        );
      } else {
        setSuccessMsg(data.message || 'Checked PagueloFacil transaction status.');
      }
      await loadDepositQuotations();
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to verify payment status with PagueloFacil.');
    } finally {
      setRefreshingId(null);
    }
  };

  const handleCopyLink = async (url: string, quotationId: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
      setCopiedId(quotationId);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // Fallback copy if clipboard blocked
    }
  };

  const renderBadge = (item: DepositQuotationItem) => {
    const tx = item.latestTransaction;
    if (!tx) {
      if (!item.eligibleForDeposit) {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            Not Approved Yet
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <Clock className="w-3.5 h-3.5" />
          Not Generated
        </span>
      );
    }

    if (tx.status === 'approved') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Deposit Paid (Accommodation Confirmation Needed)
        </span>
      );
    }

    if (tx.status === 'needs_manual_review') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-800 border border-orange-300">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-600" />
          Needs Manual Review — Refresh Status First
        </span>
      );
    }

    if (tx.status === 'pending' || tx.status === 'processing') {
      const isExpired = tx.expiresAt && new Date(tx.expiresAt).getTime() <= Date.now();
      return isExpired ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3.5 h-3.5" />
          Link Expired
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
          <Clock className="w-3.5 h-3.5" />
          Pending Payment
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-800 border border-red-200">
        <AlertTriangle className="w-3.5 h-3.5" />
        Declined / Expired ({tx.status})
      </span>
    );
  };

  const visibleItems = items
    .filter((item) => {
      if (focusedQuotationId && item.quotationId === focusedQuotationId) return true;
      if (!showAllOvernight && !item.eligibleForDeposit && !item.latestTransaction) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.customerName.toLowerCase().includes(q) ||
        item.quotationReference.toLowerCase().includes(q) ||
        item.island.toLowerCase().includes(q) ||
        (item.latestTransaction?.bookingReference || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (focusedQuotationId) {
        if (a.quotationId === focusedQuotationId) return -1;
        if (b.quotationId === focusedQuotationId) return 1;
      }
      return 0;
    });

  return (
    <div className="bg-white border-2 border-[#0e3b2f]/20 rounded-2xl p-4 sm:p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0eae0] pb-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#0e3b2f]" />
            <h2 className="text-lg font-serif font-semibold text-[#06121e]">
              Overnight 50% Deposit Payment Links
            </h2>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded font-semibold ${
                environment === 'production'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : environment === 'sandbox'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}
            >
              {environment === 'production'
                ? 'PAGUELOFACIL PRODUCTION'
                : environment === 'sandbox'
                  ? 'PAGUELOFACIL SANDBOX'
                  : 'GATEWAY UNCONFIGURED'}
            </span>
          </div>
          <p className="text-xs text-[#52606d]">
            Generate real PagueloFacil 50% deposit links strictly from approved overnight quotations. Server calculates 50% deposit &amp; remaining balance in integer cents.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDepositQuotations}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold bg-[#faf8f5] hover:bg-[#f0eae0] text-[#0e3b2f] border border-[#cfc7b2] transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Reload Quotations</span>
        </button>
      </div>

      {/* Important Policy Reminder */}
      <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <strong className="font-semibold block">
            Manual Accommodation Verification Rule
          </strong>
          <span>
            Paying a 50% deposit does NOT automatically guarantee cabaña/island inventory or mark a trip fully paid. Once deposit status reaches <strong>Deposit Paid</strong>, verify remaining 50% balance and finalize cabaña &amp; boat logistics with the island.
          </span>
        </div>
      </div>

      {gatewayNotice && !gatewayReady && (
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-800">
          <strong>Gateway Configuration Notice:</strong> {gatewayNotice}
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-xs text-red-900 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer, quotation ref (e.g. 695), island, or GNY ref..."
            className="w-full pl-9 pr-3 py-2.5 min-h-[44px] text-xs border border-[#cfc7b2] rounded-xl bg-[#faf8f5] focus:outline-none focus:ring-1 focus:ring-[#0e3b2f]"
          />
        </div>

        <label className="inline-flex items-center gap-2 text-xs text-[#334155] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showAllOvernight}
            onChange={(e) => setShowAllOvernight(e.target.checked)}
            className="rounded border-slate-300 text-[#0e3b2f]"
          />
          <span>Show unapproved overnight drafts</span>
        </label>
      </div>

      {/* Quotation Cards */}
      {isLoading ? (
        <div className="py-10 flex flex-col items-center justify-center text-xs text-slate-500 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#c9a96e]" />
          <span>Loading approved overnight quotations &amp; deposit ledger...</span>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl bg-slate-50 text-xs text-slate-600 space-y-2">
          <p className="font-semibold text-slate-800">No approved overnight quotations found</p>
          <p>
            Approve an overnight quotation (set Terms Status to <strong>Approved by Petra</strong>, Status to <strong>Ready for review</strong>, and save) or toggle "Show unapproved overnight drafts".
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleItems.map((item) => {
            const tx = item.latestTransaction;
            const isApproved = tx?.status === 'approved';
            const isManualReview = tx?.status === 'needs_manual_review';
            const isActivePending = Boolean(
              tx &&
              (tx.status === 'pending' || tx.status === 'processing') &&
              (!tx.expiresAt || new Date(tx.expiresAt).getTime() > Date.now())
            );
            const canGenerate =
              item.eligibleForDeposit &&
              gatewayReady &&
              !isApproved &&
              !isManualReview &&
              !isActivePending;

            const isFocused = focusedQuotationId === item.quotationId;

            return (
              <div
                key={item.quotationId}
                className={`p-4 sm:p-5 rounded-xl border transition-all space-y-4 ${
                  isFocused
                    ? 'border-[#0e3b2f] bg-[#faf8f5] ring-2 ring-[#c9a96e]/40'
                    : 'border-[#e5dec9] bg-[#fcfbf9]'
                }`}
              >
                {/* Top Summary */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-sm text-[#0e3b2f]">
                        {item.quotationReference}
                      </span>
                      <span className="text-sm font-semibold text-[#1c242c]">
                        {item.customerName || 'Unnamed Customer'}
                      </span>
                      {renderBadge(item)}
                    </div>
                    <p className="text-xs text-[#52606d]">
                      {item.island || 'San Blas'} &bull;{' '}
                      {item.arrivalDate ? `${item.arrivalDate} → ${item.departureDate || '?'}` : `${item.nights} night(s)`} &bull;{' '}
                      {item.travelers} traveler(s)
                      {item.customerEmail ? ` • ${item.customerEmail}` : ''}
                    </p>
                  </div>

                  {onEditQuotationById && (
                    <button
                      type="button"
                      onClick={() => onEditQuotationById(item.quotationId)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#0e3b2f] bg-white hover:bg-[#f0eae0] border border-[#cfc7b2] rounded-lg transition-colors self-start"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Open Quotation</span>
                    </button>
                  )}
                </div>

                {/* Amounts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                  <div className="p-3 bg-white rounded-lg border border-[#e5dec9]">
                    <span className="text-[11px] text-slate-500 block font-sans">Approved Quotation Total</span>
                    <span className="text-base font-bold text-[#06121e]">
                      ${formatUsdFromCents(tx?.approvedTotalCents || item.approvedTotalCents)} USD
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-emerald-200">
                    <span className="text-[11px] text-emerald-700 block font-sans font-medium">
                      50% Deposit (Card Payment Link)
                    </span>
                    <span className="text-base font-bold text-emerald-700">
                      ${formatUsdFromCents(tx?.amountInCents || item.depositCents)} USD
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-amber-200">
                    <span className="text-[11px] text-amber-800 block font-sans font-medium">
                      Remaining 50% Balance
                    </span>
                    <span className="text-base font-bold text-amber-800">
                      ${formatUsdFromCents(tx?.remainingBalanceCents ?? item.remainingBalanceCents)} USD
                    </span>
                  </div>
                </div>

                {/* Ineligibility Reason if not ready */}
                {!item.eligibleForDeposit && item.ineligibleReason && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <strong>Approval Required:</strong> {item.ineligibleReason}
                  </div>
                )}

                {/* Active or Historical Transaction Details */}
                {tx && (
                  <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-600">
                      <span>
                        Booking Ref: <strong className="text-slate-900">{tx.bookingReference}</strong>
                      </span>
                      {tx.bookingStatus && (
                        <span>
                          Booking Status: <strong className="text-emerald-800">{tx.bookingStatus}</strong>
                        </span>
                      )}
                      {tx.gatewayOperationId && (
                        <span>
                          CodOper: <strong className="text-slate-900">{tx.gatewayOperationId}</strong>
                        </span>
                      )}
                    </div>

                    {tx.errorMessage && tx.status !== 'approved' && (
                      <div className="p-2.5 rounded bg-orange-50 border border-orange-200 text-orange-900 text-[11px]">
                        {tx.errorMessage}
                      </div>
                    )}

                    {tx.paymentUrl && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
                          <Link2 className="w-3.5 h-3.5 text-[#0e3b2f]" />
                          <span>Customer Hosted Checkout URL</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] break-all text-slate-800 select-all">
                          {tx.paymentUrl}
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleCopyLink(tx.paymentUrl!, item.quotationId)}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold bg-[#0e3b2f] hover:bg-[#155243] text-white transition-colors"
                          >
                            {copiedId === item.quotationId ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-300" />
                                <span>Copied Link</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-[#c9a96e]" />
                                <span>Copy Payment Link</span>
                              </>
                            )}
                          </button>

                          <a
                            href={buildWhatsAppShareUrl(item, tx)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Share via WhatsApp</span>
                          </a>

                          <a
                            href={tx.paymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Preview Link</span>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Bar: Generate Link OR Refresh Verified Status */}
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={!canGenerate || generatingId === item.quotationId}
                    onClick={() => handleGenerateDepositLink(item)}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold transition-colors ${
                      canGenerate
                        ? 'bg-[#0e3b2f] hover:bg-[#155243] text-white shadow-sm'
                        : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {generatingId === item.quotationId ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-[#c9a96e]" />
                        <span>Generating 50% Deposit Link...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 text-[#c9a96e]" />
                        <span>
                          {isApproved
                            ? '50% Deposit Already Paid'
                            : isActivePending
                              ? 'Active Deposit Link Ready'
                              : isManualReview
                                ? 'Locked — Verify Status First'
                                : 'Generate 50% Deposit Payment Link'}
                        </span>
                      </>
                    )}
                  </button>

                  {tx && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1">
                      <input
                        type="text"
                        value={operationInputs[item.quotationId] || ''}
                        onChange={(e) =>
                          setOperationInputs((prev) => ({
                            ...prev,
                            [item.quotationId]: e.target.value,
                          }))
                        }
                        placeholder="Optional CodOper (LK-...)"
                        className="px-3 py-2.5 min-h-[44px] text-xs font-mono border border-slate-300 rounded-xl bg-white sm:max-w-[200px]"
                      />

                      <button
                        type="button"
                        disabled={refreshingId === item.quotationId}
                        onClick={() => handleRefreshStatus(item)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-semibold bg-white hover:bg-slate-100 text-[#0e3b2f] border border-[#0e3b2f]/30 transition-colors"
                      >
                        {refreshingId === item.quotationId ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Refresh Verified Payment Status</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
