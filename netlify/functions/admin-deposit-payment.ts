import crypto from 'node:crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  PagueloFacilGatewayAdapter,
  validateCclw,
} from './paymentGateway.js';
import { reconcilePaymentTransaction } from './paymentReconciliation.js';
import {
  calculate50PercentDepositCents,
  validateApprovedOvernightQuotation,
} from '../../src/utils/quotationDepositCalculator.js';

interface NetlifyEvent {
  httpMethod: string;
  body: string | null;
  headers: Record<string, string | undefined>;
}

export interface AdminDepositDependencies {
  supabaseClient?: SupabaseClient | any;
  envOverride?: Record<string, string | undefined>;
  fetchFn?: typeof fetch;
  now?: Date;
}

const activeDepositQuotationLocks = new Set<string>();

export function resetDepositQuotationLocksForTesting(): void {
  activeDepositQuotationLocks.clear();
}

function getSafeResponseHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  };
}

async function authenticateQuotationAdmin(
  authToken: string | null,
  supabase: any
): Promise<{ ok: true; adminUserId: string; adminEmail?: string } | { ok: false; statusCode: number; error: string }> {
  if (!authToken || !authToken.trim()) {
    return { ok: false, statusCode: 401, error: 'Unauthorized: Administrator Bearer token is required.' };
  }

  const cleanToken = authToken.replace(/^Bearer\s+/i, '').trim();
  if (!cleanToken) {
    return { ok: false, statusCode: 401, error: 'Unauthorized: Invalid Authorization header format.' };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser(cleanToken);
  if (authError || !authData?.user?.id) {
    return { ok: false, statusCode: 401, error: 'Unauthorized: Invalid or expired administrator credentials.' };
  }

  const adminUserId = authData.user.id;
  const { data: adminRecord, error: adminError } = await supabase
    .from('quotation_admins')
    .select('user_id')
    .eq('user_id', adminUserId)
    .maybeSingle();

  if (adminError || !adminRecord?.user_id) {
    return { ok: false, statusCode: 403, error: 'Forbidden: Access restricted to authorized quotation administrators.' };
  }

  return { ok: true, adminUserId, adminEmail: authData.user.email };
}

function generateBookingReference(): string {
  const num = 100000 + crypto.randomInt(0, 900000);
  return `GNY-${num}`;
}

async function acquireQuotationDepositLock(
  supabase: any,
  quotationId: string,
  adminUserId: string
): Promise<{ acquired: boolean; ownerToken?: string; rpcUsed?: string; error?: string }> {
  const ownerToken = crypto.randomUUID();

  if (!supabase || typeof supabase.rpc !== 'function') {
    return { acquired: false, error: 'Database lock RPC unavailable.' };
  }

  // Primary RPC: dedicated acquire_quotation_deposit_lock; fallback: existing acquire_controlled_live_test_lock
  try {
    const primary = await supabase.rpc('acquire_quotation_deposit_lock', {
      p_quotation_id: quotationId,
      p_owner_token: ownerToken,
      p_admin_user_id: adminUserId,
      p_ttl_seconds: 120,
    });

    if (!primary.error && primary.data) {
      if (primary.data.acquired === true) {
        return { acquired: true, ownerToken, rpcUsed: 'acquire_quotation_deposit_lock' };
      }
      return {
        acquired: false,
        error: primary.data.message || 'Another deposit link generation is already in progress for this quotation.',
      };
    }

    const errMsg = String(primary.error?.message || '').toLowerCase();
    const isMissingFn = errMsg.includes('does not exist') || errMsg.includes('could not find the function') || errMsg.includes('unknown rpc');
    if (!isMissingFn) {
      return {
        acquired: false,
        error: primary.error?.message || 'Failed to acquire deposit generation lock.',
      };
    }
  } catch {
    // Try fallback RPC below
  }

  try {
    const fallback = await supabase.rpc('acquire_controlled_live_test_lock', {
      p_lock_name: `QUOTATION_DEPOSIT_${quotationId}`,
      p_owner_token: ownerToken,
      p_admin_user_id: adminUserId,
      p_ttl_seconds: 120,
    });

    if (!fallback.error && fallback.data?.acquired === true) {
      return { acquired: true, ownerToken, rpcUsed: 'acquire_controlled_live_test_lock' };
    }

    return {
      acquired: false,
      error: fallback.data?.message || fallback.error?.message || 'Deposit lock currently held by another request.',
    };
  } catch (err: any) {
    return {
      acquired: false,
      error: err?.message || 'Failed to acquire distributed deposit generation lock.',
    };
  }
}

async function releaseQuotationDepositLock(
  supabase: any,
  quotationId: string,
  ownerToken?: string,
  rpcUsed?: string
): Promise<void> {
  if (!ownerToken || !supabase || typeof supabase.rpc !== 'function') return;
  try {
    if (rpcUsed === 'acquire_quotation_deposit_lock') {
      await supabase.rpc('release_quotation_deposit_lock', {
        p_quotation_id: quotationId,
        p_owner_token: ownerToken,
      });
    } else {
      await supabase.rpc('release_controlled_live_test_lock', {
        p_lock_name: `QUOTATION_DEPOSIT_${quotationId}`,
        p_owner_token: ownerToken,
      });
    }
  } catch {
    // Non-fatal; lock has 120s TTL safety expiration
  }
}

function resolveDepositGatewayConfig(env: Record<string, string | undefined>): {
  environment: 'production' | 'sandbox' | 'unconfigured';
  error?: string;
} {
  if (String(env.ENABLE_DEPOSIT_PAYMENT_LINKS || '').trim().toLowerCase() === 'false') {
    return {
      environment: 'unconfigured',
      error: 'Deposit payment link generation is disabled by ENABLE_DEPOSIT_PAYMENT_LINKS=false.',
    };
  }

  const serverEnvSetting = String(env.PAGUELOFACIL_ENV || '').trim().toLowerCase();

  if (serverEnvSetting === 'production') {
    const cclw = String(env.PAGUELOFACIL_CCLW || '').trim();
    const token = String(env.PAGUELOFACIL_ACCESS_TOKEN || '').trim();
    if (!validateCclw(cclw) || !token) {
      return {
        environment: 'unconfigured',
        error: 'Production PagueloFacil credentials (PAGUELOFACIL_CCLW / PAGUELOFACIL_ACCESS_TOKEN) are missing or invalid.',
      };
    }
    return { environment: 'production' };
  }

  if (serverEnvSetting === 'sandbox' || serverEnvSetting === 'demo') {
    const sbCclw = String(env.PAGUELOFACIL_SANDBOX_CCLW || env.PAGUELOFACIL_DEMO_CCLW || '').trim();
    const sbToken = String(env.PAGUELOFACIL_SANDBOX_ACCESS_TOKEN || env.PAGUELOFACIL_DEMO_ACCESS_TOKEN || '').trim();
    if (!validateCclw(sbCclw) || !sbToken) {
      return {
        environment: 'unconfigured',
        error: 'Sandbox PagueloFacil credentials (PAGUELOFACIL_SANDBOX_CCLW / PAGUELOFACIL_SANDBOX_ACCESS_TOKEN) are missing or invalid.',
      };
    }
    return { environment: 'sandbox' };
  }

  return {
    environment: 'unconfigured',
    error: 'PAGUELOFACIL_ENV is not configured as production or sandbox on the server.',
  };
}

function sanitizeDepositTransactionSummary(tx: any, bookingRec?: any) {
  if (!tx) return null;
  const audit = typeof tx.audit_metadata === 'object' && tx.audit_metadata !== null ? tx.audit_metadata : {};
  const depositCents = Number(tx.amount_in_cents || audit.deposit_cents || Math.round(Number(tx.expected_amount || 0) * 100));
  const approvedTotalCents = Number(tx.approved_total_cents || audit.approved_total_cents || 0);
  const remainingBalanceCents =
    tx.remaining_balance_cents !== undefined && tx.remaining_balance_cents !== null
      ? Number(tx.remaining_balance_cents)
      : audit.remaining_balance_cents !== undefined
        ? Number(audit.remaining_balance_cents)
        : approvedTotalCents > 0
          ? Math.max(0, approvedTotalCents - depositCents)
          : 0;

  return {
    id: tx.id,
    bookingReference: tx.booking_reference,
    quotationId: tx.quotation_id,
    status: tx.status,
    bookingStatus: bookingRec?.status || null,
    paymentType: tx.payment_type,
    environment: tx.environment,
    paymentUrl: tx.payment_url || null,
    gatewayLinkCode: tx.gateway_link_code || null,
    gatewayOperationId: tx.gateway_operation_id || null,
    expectedAmount: Number(tx.expected_amount || 0),
    amountPaid: tx.amount_paid !== null && tx.amount_paid !== undefined ? Number(tx.amount_paid) : null,
    amountInCents: depositCents,
    approvedTotalCents,
    remainingBalanceCents,
    expiresAt: tx.expires_at || null,
    verifiedAt: tx.verified_at || null,
    errorMessage: tx.error_message || null,
    createdAt: tx.created_at,
    updatedAt: tx.updated_at,
  };
}

export async function executeAdminDepositPaymentAction(
  authToken: string | null,
  requestBody: any = {},
  dependencies: AdminDepositDependencies = {}
): Promise<{ statusCode: number; body: any }> {
  const env = dependencies.envOverride || process.env;
  const fetchFn = dependencies.fetchFn || global.fetch;
  const now = dependencies.now || new Date();
  const supabaseUrl = env.SUPABASE_URL || '';
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

  const supabase = dependencies.supabaseClient || createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Strict Administrator Auth Check
  const authResult = await authenticateQuotationAdmin(authToken, supabase);
  if (!authResult.ok) {
    return {
      statusCode: authResult.statusCode,
      body: { success: false, error: authResult.error },
    };
  }

  const action = String(requestBody?.action || 'list_deposit_quotations').trim();
  const gatewayResolution = resolveDepositGatewayConfig(env);

  // =========================================================================
  // ACTION 1: LIST APPROVED OVERNIGHT QUOTATIONS & DEPOSIT PAYMENT STATUSES
  // =========================================================================
  if (action === 'list_deposit_quotations') {
    const [{ data: quoteRows, error: qErr }, { data: txRows }, { data: bookingRows }, { data: inquiryRows }, { data: customerRows }] = await Promise.all([
      supabase.from('quotations').select('*').order('updated_at', { ascending: false }),
      supabase.from('payment_transactions').select('*').eq('payment_type', 'deposit').order('created_at', { ascending: false }),
      supabase.from('booking_requests').select('booking_reference, status, updated_at'),
      supabase.from('crm_inquiries').select('*'),
      supabase.from('crm_customers').select('*'),
    ]);

    if (qErr) {
      return {
        statusCode: 500,
        body: { success: false, error: `Failed to load quotations: ${qErr.message}` },
      };
    }

    const inquiriesById = new Map<string, any>();
    for (const inq of inquiryRows || []) inquiriesById.set(inq.id, inq);
    const customersById = new Map<string, any>();
    for (const cust of customerRows || []) customersById.set(cust.id, cust);
    const bookingsByRef = new Map<string, any>();
    for (const b of bookingRows || []) bookingsByRef.set(b.booking_reference, b);

    const txsByQuotationId = new Map<string, any[]>();
    for (const tx of txRows || []) {
      if (!tx.quotation_id) continue;
      const list = txsByQuotationId.get(tx.quotation_id) || [];
      list.push(tx);
      txsByQuotationId.set(tx.quotation_id, list);
    }

    const items: any[] = [];
    for (const row of quoteRows || []) {
      const qData = row.data && typeof row.data === 'object' ? row.data : row;
      const linkedInquiry = row.inquiry_id || qData.inquiry_id ? inquiriesById.get(row.inquiry_id || qData.inquiry_id) : undefined;
      const linkedCustomer = linkedInquiry?.customer_id ? customersById.get(linkedInquiry.customer_id) : undefined;

      const validation = validateApprovedOvernightQuotation({
        rowId: row.id,
        rowStatus: row.status,
        rowTotal: row.total,
        rowInquiryId: row.inquiry_id,
        rowCustomerName: row.customer_name,
        quotationData: qData,
        linkedInquiry,
        linkedCustomer,
        now,
      });

      const qTxs = txsByQuotationId.get(row.id) || [];
      const approvedTx = qTxs.find((t) => t.status === 'approved');
      const manualReviewTx = qTxs.find((t) => t.status === 'needs_manual_review');
      const activePendingTx = qTxs.find(
        (t) =>
          (t.status === 'pending' || t.status === 'processing') &&
          (!t.expires_at || new Date(t.expires_at).getTime() > now.getTime())
      );
      const latestTx = approvedTx || manualReviewTx || activePendingTx || qTxs[0] || null;

      // Include quotation if it's a valid overnight quotation (approved), or if it already has deposit history,
      // or if it is an overnight quotation awaiting approval (so UI can explain why it's not eligible yet).
      const hasDepositHistory = qTxs.length > 0;
      const isOvernightRow = Number(qData?.nights || 0) >= 1 && !String(qData?.experience || '').toLowerCase().includes('day tour');
      if (!validation.valid && !hasDepositHistory && !isOvernightRow) {
        continue;
      }

      const storedApprovedTotalCents =
        validation.deposit?.approvedTotalCents ||
        latestTx?.approved_total_cents ||
        latestTx?.audit_metadata?.approved_total_cents ||
        Math.round(Number(row.total ?? qData?.total ?? 0) * 100);

      let fallbackDeposit = validation.deposit;
      if (!fallbackDeposit && storedApprovedTotalCents >= 200) {
        try {
          fallbackDeposit = calculate50PercentDepositCents(storedApprovedTotalCents);
        } catch {
          fallbackDeposit = undefined;
        }
      }

      const bookingRec = latestTx?.booking_reference ? bookingsByRef.get(latestTx.booking_reference) : undefined;

      items.push({
        quotationId: row.id,
        quotationReference: validation.quotationReference,
        status: qData?.status || row.status,
        termsStatus: qData?.termsStatus || 'Draft',
        pricingStatus: qData?.pricingStatus || 'Rates to Be Confirmed',
        customerName: validation.customerName || row.customer_name || '',
        customerEmail: validation.customerEmail || '',
        customerPhone: validation.customerPhone || '',
        island: validation.island || qData?.island || '',
        arrivalDate: validation.arrivalDate || '',
        departureDate: validation.departureDate || '',
        nights: validation.nights || 1,
        travelers: validation.travelers || 1,
        expiryDate: qData?.expiryDate || '',
        eligibleForDeposit: validation.valid,
        ineligibleReason: validation.valid ? null : validation.error,
        approvedTotalCents: fallbackDeposit?.approvedTotalCents || 0,
        depositCents: fallbackDeposit?.depositCents || 0,
        remainingBalanceCents: fallbackDeposit?.remainingBalanceCents || 0,
        latestTransaction: sanitizeDepositTransactionSummary(latestTx, bookingRec),
        updatedAt: row.updated_at || qData?.updatedAt,
      });
    }

    return {
      statusCode: 200,
      body: {
        success: true,
        environment: gatewayResolution.environment,
        gatewayReady: gatewayResolution.environment !== 'unconfigured',
        gatewayNotice: gatewayResolution.error || null,
        items,
      },
    };
  }

  // =========================================================================
  // ACTION 2: GENERATE 50% DEPOSIT PAYMENT LINK FOR APPROVED QUOTATION
  // =========================================================================
  if (action === 'generate_deposit_link') {
    const quotationId = String(requestBody?.quotationId || '').trim();
    if (!quotationId) {
      return {
        statusCode: 400,
        body: { success: false, error: 'Missing required quotationId.' },
      };
    }

    // Never trust client-supplied depositAmount / amount / total / environment;
    // optionally notice if tampered values were supplied (for telemetry) without using them.
    if (activeDepositQuotationLocks.has(quotationId)) {
      return {
        statusCode: 409,
        body: {
          success: false,
          error: 'Deposit link generation is already in progress for this quotation. Please wait.',
        },
      };
    }

    activeDepositQuotationLocks.add(quotationId);
    let lockOwnerToken: string | undefined;
    let lockRpcUsed: string | undefined;

    try {
      const dbLock = await acquireQuotationDepositLock(supabase, quotationId, authResult.adminUserId);
      if (!dbLock.acquired || !dbLock.ownerToken) {
        return {
          statusCode: 409,
          body: {
            success: false,
            error: dbLock.error || 'Another deposit link request is currently active for this quotation.',
          },
        };
      }
      lockOwnerToken = dbLock.ownerToken;
      lockRpcUsed = dbLock.rpcUsed;

      // 2a. Load authoritative quotation from Supabase
      const { data: quoteRow, error: quoteErr } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .maybeSingle();

      if (quoteErr || !quoteRow) {
        return {
          statusCode: 404,
          body: { success: false, error: `Approved quotation (${quotationId}) not found in Supabase.` },
        };
      }

      const qData = quoteRow.data && typeof quoteRow.data === 'object' ? quoteRow.data : quoteRow;
      const effectiveInquiryId = String(quoteRow.inquiry_id || qData.inquiry_id || '').trim();

      let linkedInquiry: any = undefined;
      let linkedCustomer: any = undefined;
      if (effectiveInquiryId) {
        const { data: inqData } = await supabase
          .from('crm_inquiries')
          .select('*')
          .eq('id', effectiveInquiryId)
          .maybeSingle();
        linkedInquiry = inqData || null;
        if (linkedInquiry?.customer_id) {
          const { data: custData } = await supabase
            .from('crm_customers')
            .select('*')
            .eq('id', linkedInquiry.customer_id)
            .maybeSingle();
          linkedCustomer = custData || null;
        }
      }

      // 2b. Authoritative Validation & Exact Integer-Cent 50% Calculation
      const validation = validateApprovedOvernightQuotation({
        rowId: quoteRow.id,
        rowStatus: quoteRow.status,
        rowTotal: quoteRow.total,
        rowInquiryId: quoteRow.inquiry_id,
        rowCustomerName: quoteRow.customer_name,
        quotationData: qData,
        linkedInquiry,
        linkedCustomer,
        now,
      });

      if (!validation.valid || !validation.deposit) {
        return {
          statusCode: 422,
          body: {
            success: false,
            reasonCode: validation.reasonCode,
            error: validation.error || 'Quotation is not eligible for 50% deposit link generation.',
          },
        };
      }

      const depositCalc = validation.deposit;

      // 2c. Check gateway readiness before issuing/inserting
      if (gatewayResolution.environment === 'unconfigured') {
        return {
          statusCode: 503,
          body: {
            success: false,
            environment: 'unconfigured',
            error: gatewayResolution.error || 'PagueloFacil gateway credentials are not configured on the server.',
          },
        };
      }
      const activeEnv = gatewayResolution.environment;

      // 2d. Duplicate, Approved & Uncertain-State Prevention
      const { data: existingDepositTxs, error: existingTxErr } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('quotation_id', quotationId)
        .eq('payment_type', 'deposit')
        .order('created_at', { ascending: false });

      if (existingTxErr) {
        return {
          statusCode: 500,
          body: { success: false, error: `Failed to inspect existing deposit transactions: ${existingTxErr.message}` },
        };
      }

      const txs = existingDepositTxs || [];

      const approvedTx = txs.find((t: any) => t.status === 'approved');
      if (approvedTx) {
        const { data: bRec } = await supabase
          .from('booking_requests')
          .select('booking_reference, status')
          .eq('booking_reference', approvedTx.booking_reference)
          .maybeSingle();
        return {
          statusCode: 409,
          body: {
            success: false,
            alreadyApproved: true,
            error: `50% deposit has already been paid and approved (Operation: ${approvedTx.gateway_operation_id || approvedTx.booking_reference}).`,
            transaction: sanitizeDepositTransactionSummary(approvedTx, bRec),
          },
        };
      }

      const manualReviewTx = txs.find((t: any) => t.status === 'needs_manual_review');
      if (manualReviewTx) {
        const { data: bRec } = await supabase
          .from('booking_requests')
          .select('booking_reference, status')
          .eq('booking_reference', manualReviewTx.booking_reference)
          .maybeSingle();
        return {
          statusCode: 409,
          body: {
            success: false,
            requiresManualReview: true,
            error: `Previous deposit attempt (${manualReviewTx.booking_reference}) had an uncertain gateway outcome. Click "Refresh Verified Payment Status" to verify with PagueloFacil before issuing a new link.`,
            transaction: sanitizeDepositTransactionSummary(manualReviewTx, bRec),
          },
        };
      }

      const activePendingTx = txs.find(
        (t: any) =>
          (t.status === 'pending' || t.status === 'processing') &&
          (!t.expires_at || new Date(t.expires_at).getTime() > now.getTime())
      );

      if (activePendingTx) {
        const activeCents = Number(activePendingTx.amount_in_cents || Math.round(Number(activePendingTx.expected_amount || 0) * 100));
        const sameAmountAndEnv = activeCents === depositCalc.depositCents && activePendingTx.environment === activeEnv;

        if (activePendingTx.payment_url && sameAmountAndEnv) {
          const { data: bRec } = await supabase
            .from('booking_requests')
            .select('booking_reference, status')
            .eq('booking_reference', activePendingTx.booking_reference)
            .maybeSingle();
          return {
            statusCode: 200,
            body: {
              success: true,
              reused: true,
              environment: activeEnv,
              approvedTotalCents: depositCalc.approvedTotalCents,
              depositCents: depositCalc.depositCents,
              remainingBalanceCents: depositCalc.remainingBalanceCents,
              message: `Existing active 50% deposit payment link reused (${activePendingTx.booking_reference}).`,
              transaction: sanitizeDepositTransactionSummary(activePendingTx, bRec),
            },
          };
        }

        return {
          statusCode: 409,
          body: {
            success: false,
            error: `An active pending deposit transaction (${activePendingTx.booking_reference}) already exists for this quotation. Refresh its verified payment status first.`,
            transaction: sanitizeDepositTransactionSummary(activePendingTx),
          },
        };
      }

      // If previous pending deposit links had expired, expire them cleanly so DB partial unique index permits replacement
      const expiredPendingTxs = txs.filter(
        (t: any) =>
          (t.status === 'pending' || t.status === 'processing') &&
          t.expires_at &&
          new Date(t.expires_at).getTime() <= now.getTime()
      );
      for (const oldTx of expiredPendingTxs) {
        await supabase
          .from('payment_transactions')
          .update({
            status: 'expired',
            audit_metadata: {
              ...(oldTx.audit_metadata || {}),
              expired_at_replacement: now.toISOString(),
            },
          })
          .eq('id', oldTx.id);
      }

      // 2e. Create linked booking_requests + pending payment_transactions record BEFORE calling PagueloFacil
      const bookingReference = generateBookingReference();
      const idempotencyKey = `idem_dep_${Date.now()}_${crypto.randomUUID()}`;
      const verificationToken = `pvt_${crypto.randomBytes(24).toString('hex')}`;
      const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
      const expiresInSeconds = 86400; // 24 hours hosted checkout validity for overnight quote links
      const expiresAtIso = new Date(now.getTime() + expiresInSeconds * 1000).toISOString();
      const tokenExpiresAtIso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const specialNotes = `[50% DEPOSIT LINK: ${validation.quotationReference}] Total: $${depositCalc.approvedTotalUsd.toFixed(2)} USD | Deposit (50%): $${depositCalc.depositUsd.toFixed(2)} USD | Remaining Balance: $${depositCalc.remainingBalanceUsd.toFixed(2)} USD.`;

      const { error: bookingInsertErr } = await supabase
        .from('booking_requests')
        .upsert(
          {
            booking_reference: bookingReference,
            idempotency_key: idempotencyKey,
            booking_type: 'overnight',
            customer_id: linkedCustomer?.id || null,
            inquiry_id: linkedInquiry?.id || null,
            customer_name: validation.customerName,
            customer_email: validation.customerEmail,
            customer_phone: validation.customerPhone || '',
            experience_id: validation.island || null,
            experience_title: validation.experienceTitle,
            target_date: validation.arrivalDate || now.toISOString().slice(0, 10),
            departure_date: validation.departureDate || null,
            nights: String(validation.nights),
            adults: validation.travelers,
            children: 0,
            special_notes: specialNotes,
            terms_accepted: true,
            terms_version: '2026-10-18',
            customer_language: qData.language === 'es' ? 'es' : 'en',
            status: 'awaiting_payment',
          },
          { onConflict: 'booking_reference' }
        );

      if (bookingInsertErr) {
        return {
          statusCode: 500,
          body: {
            success: false,
            error: `Failed to persist linked booking record before checkout generation: ${bookingInsertErr.message}`,
          },
        };
      }

      const initialAuditMetadata = {
        environment: activeEnv,
        is_demo: activeEnv === 'sandbox',
        created_via: 'admin-deposit-payment',
        created_by_admin_id: authResult.adminUserId,
        quotation_id: quotationId,
        quotation_reference: validation.quotationReference,
        approved_total_cents: depositCalc.approvedTotalCents,
        deposit_cents: depositCalc.depositCents,
        remaining_balance_cents: depositCalc.remainingBalanceCents,
        verification_token_hash: verificationTokenHash,
        verification_token_created_at: now.toISOString(),
        verification_token_expires_at: tokenExpiresAtIso,
        created_at: now.toISOString(),
      };

      const { data: insertedTx, error: insertTxErr } = await supabase
        .from('payment_transactions')
        .insert({
          booking_reference: bookingReference,
          quotation_id: quotationId,
          booking_type: 'overnight',
          gateway: 'paguelofacil',
          environment: activeEnv,
          currency: 'USD',
          expected_amount: depositCalc.depositUsd,
          amount_in_cents: depositCalc.depositCents,
          approved_total_cents: depositCalc.approvedTotalCents,
          remaining_balance_cents: depositCalc.remainingBalanceCents,
          payment_type: 'deposit',
          status: 'pending',
          idempotency_key: idempotencyKey,
          expires_at: expiresAtIso,
          audit_metadata: initialAuditMetadata,
        })
        .select('*')
        .single();

      if (insertTxErr || !insertedTx) {
        // Unique constraint violation on partial index (concurrency safety net)
        if (String(insertTxErr?.code || '') === '23505') {
          return {
            statusCode: 409,
            body: {
              success: false,
              error: 'Concurrent deposit link generation detected for this quotation. Please refresh payment status.',
            },
          };
        }
        return {
          statusCode: 500,
          body: {
            success: false,
            error: `Failed to initialize deposit transaction record: ${insertTxErr?.message || 'Unknown DB error'}`,
          },
        };
      }

      // 2f. Invoke PagueloFacil LinkDeamon.cfm strictly via server adapter with timeout protection
      const adapter = new PagueloFacilGatewayAdapter({
        environment: activeEnv,
        enableLivePayments: activeEnv === 'production',
        enableSandboxPayments: activeEnv === 'sandbox',
        cclw: env.PAGUELOFACIL_CCLW,
        accessToken: env.PAGUELOFACIL_ACCESS_TOKEN,
        sandboxCclw: env.PAGUELOFACIL_SANDBOX_CCLW || env.PAGUELOFACIL_DEMO_CCLW,
        sandboxAccessToken: env.PAGUELOFACIL_SANDBOX_ACCESS_TOKEN || env.PAGUELOFACIL_DEMO_ACCESS_TOKEN,
      });

      const originalGlobalFetch = global.fetch;
      let sessionResult;
      try {
        if (fetchFn && fetchFn !== global.fetch) {
          global.fetch = fetchFn;
        }
        sessionResult = await adapter.createPaymentSession({
          bookingReference,
          bookingType: 'overnight',
          quotationId,
          customerName: validation.customerName,
          customerEmail: validation.customerEmail,
          customerPhone: validation.customerPhone,
          amount: depositCalc.depositUsd,
          currency: 'USD',
          paymentType: 'deposit',
          description: `Guna Yala 50% Deposit - Quote ${validation.quotationReference} (${validation.island || 'San Blas'})`,
          expiresInSeconds,
          idempotencyKey,
          verificationToken,
          timeoutMs: 15000,
        });
      } finally {
        global.fetch = originalGlobalFetch;
      }

      if (!sessionResult.success || !sessionResult.paymentUrl) {
        const isUncertain = Boolean(sessionResult.uncertainFailure);
        const targetFailureStatus = isUncertain ? 'needs_manual_review' : 'rejected';

        const { data: failedTx } = await supabase
          .from('payment_transactions')
          .update({
            status: targetFailureStatus,
            error_message: sessionResult.error || 'Gateway failed to issue payment link.',
            audit_metadata: {
              ...initialAuditMetadata,
              uncertain_gateway_failure: isUncertain,
              gateway_failure_at: new Date().toISOString(),
              gateway_failure_reason: sessionResult.error || 'Unknown gateway error',
            },
          })
          .eq('id', insertedTx.id)
          .select('*')
          .maybeSingle();

        return {
          statusCode: 502,
          body: {
            success: false,
            requiresManualReview: isUncertain,
            error: isUncertain
              ? `Gateway timeout or uncertain response (${sessionResult.error}). Marked needs_manual_review so no duplicate link is issued until verified.`
              : `PagueloFacil rejected checkout link request: ${sessionResult.error}`,
            transaction: sanitizeDepositTransactionSummary(failedTx || { ...insertedTx, status: targetFailureStatus }),
          },
        };
      }

      // 2g. Save verified payment URL & link code cleanly
      const { data: finalTx, error: updateErr } = await supabase
        .from('payment_transactions')
        .update({
          payment_url: sessionResult.paymentUrl,
          gateway_link_code: sessionResult.gatewayLinkCode || null,
          expires_at: sessionResult.expiresAt || expiresAtIso,
          audit_metadata: {
            ...initialAuditMetadata,
            gateway_link_created_at: new Date().toISOString(),
          },
        })
        .eq('id', insertedTx.id)
        .select('*')
        .maybeSingle();

      if (updateErr) {
        return {
          statusCode: 500,
          body: {
            success: false,
            error: `Gateway returned link, but database update failed: ${updateErr.message}`,
          },
        };
      }

      return {
        statusCode: 200,
        body: {
          success: true,
          reused: false,
          environment: activeEnv,
          approvedTotalCents: depositCalc.approvedTotalCents,
          depositCents: depositCalc.depositCents,
          remainingBalanceCents: depositCalc.remainingBalanceCents,
          message: `50% deposit payment link generated for Quote ${validation.quotationReference} ($${depositCalc.depositUsd.toFixed(2)} USD).`,
          transaction: sanitizeDepositTransactionSummary(finalTx || {
            ...insertedTx,
            payment_url: sessionResult.paymentUrl,
            gateway_link_code: sessionResult.gatewayLinkCode,
          }, { status: 'awaiting_payment' }),
        },
      };
    } finally {
      await releaseQuotationDepositLock(supabase, quotationId, lockOwnerToken, lockRpcUsed);
      activeDepositQuotationLocks.delete(quotationId);
    }
  }

  // =========================================================================
  // ACTION 3: REFRESH VERIFIED PAYMENT STATUS (READ/RECONCILE — NEVER CREATES LINK)
  // =========================================================================
  if (action === 'refresh_deposit_status') {
    const quotationId = String(requestBody?.quotationId || '').trim();
    const transactionId = String(requestBody?.transactionId || '').trim();
    const bookingReference = String(requestBody?.bookingReference || '').trim();
    const operationCode = String(requestBody?.operationCode || '').trim() || undefined;

    if (!quotationId && !transactionId && !bookingReference) {
      return {
        statusCode: 400,
        body: { success: false, error: 'Provide quotationId, transactionId, or bookingReference to verify status.' },
      };
    }

    let query = supabase
      .from('payment_transactions')
      .select('*')
      .eq('payment_type', 'deposit')
      .order('created_at', { ascending: false });

    if (transactionId) {
      query = query.eq('id', transactionId);
    } else if (bookingReference) {
      query = query.eq('booking_reference', bookingReference);
    } else {
      query = query.eq('quotation_id', quotationId);
    }

    const { data: txList, error: txFetchErr } = await query;
    if (txFetchErr || !txList || txList.length === 0) {
      return {
        statusCode: 404,
        body: { success: false, error: 'No deposit payment transaction found for this quotation.' },
      };
    }

    // Prefer approved, then needs_manual_review, then pending, else latest
    const targetTx =
      txList.find((t: any) => t.status === 'approved') ||
      txList.find((t: any) => t.status === 'needs_manual_review') ||
      txList.find((t: any) => t.status === 'pending' || t.status === 'processing') ||
      txList[0];

    const reconResult = await reconcilePaymentTransaction({
      bookingReference: targetTx.booking_reference,
      operationCode: operationCode || targetTx.gateway_operation_id || undefined,
      linkCode: targetTx.gateway_link_code || undefined,
      idempotencyKey: targetTx.idempotency_key,
      environment: targetTx.environment as 'sandbox' | 'production',
      supabaseClient: supabase,
      env,
      fetchFn,
    });

    const [{ data: updatedTx }, { data: updatedBooking }] = await Promise.all([
      supabase.from('payment_transactions').select('*').eq('id', targetTx.id).maybeSingle(),
      supabase.from('booking_requests').select('booking_reference, status, updated_at').eq('booking_reference', targetTx.booking_reference).maybeSingle(),
    ]);

    const finalTx = updatedTx || targetTx;

    return {
      statusCode: 200,
      body: {
        success: reconResult.success || finalTx.status === 'approved',
        category: reconResult.category,
        message: reconResult.message,
        reconciled: Boolean(reconResult.databaseUpdated || finalTx.status === 'approved'),
        transaction: sanitizeDepositTransactionSummary(finalTx, updatedBooking),
      },
    };
  }

  return {
    statusCode: 400,
    body: { success: false, error: `Unsupported action: "${action}".` },
  };
}

export const handler = async (event: NetlifyEvent) => {
  const headers = getSafeResponseHeaders();

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method Not Allowed. Use POST.' }),
    };
  }

  let body: any = {};
  try {
    body = event.body ? (typeof event.body === 'string' ? JSON.parse(event.body) : event.body) : {};
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ success: false, error: 'Invalid JSON request body.' }),
    };
  }

  const authHeader = event.headers['authorization'] || event.headers['Authorization'] || null;
  const result = await executeAdminDepositPaymentAction(authHeader, body);

  return {
    statusCode: result.statusCode,
    headers,
    body: JSON.stringify(result.body),
  };
};
