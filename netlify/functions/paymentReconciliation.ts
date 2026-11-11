import { SupabaseClient } from '@supabase/supabase-js';

export interface ReconciliationParams {
  bookingReference?: string;
  operationCode?: string;
  linkCode?: string;
  idempotencyKey?: string;
  environment?: 'sandbox' | 'production';
  supabaseClient: SupabaseClient;
  env?: Record<string, string | undefined>;
}

export interface ReconciliationResult {
  success: boolean;
  duplicate?: boolean;
  category: 'approved' | 'declined' | 'absent_records' | 'ambiguous_records' | 'authentication_failure' | 'mismatched_identifiers' | 'validation_rejection' | 'parsing_problem';
  bookingReference?: string;
  operationCode?: string;
  amountPaid?: number;
  message: string;
  databaseUpdated?: boolean;
  error?: string;
  audit?: any;
}

/**
 * Shared Authoritative Payment Reconciliation Helper
 * Used by both normal payment-webhook.ts and admin-payment-sandbox-test.ts (reconcile_existing_transaction action).
 */
export async function reconcilePaymentTransaction(params: ReconciliationParams): Promise<ReconciliationResult> {
  const {
    bookingReference,
    operationCode,
    linkCode,
    idempotencyKey,
    environment = 'sandbox',
    supabaseClient,
    env = process.env,
  } = params;

  if (!bookingReference && !operationCode && !linkCode) {
    return {
      success: false,
      category: 'mismatched_identifiers',
      message: 'Reconciliation failed: Missing required transaction identifier (bookingReference, operationCode, or linkCode).',
      error: 'Missing identifiers.',
    };
  }

  // 1. Always load existing payment transaction from Supabase by trustworthy unique keys / fallback
  let existingTx: any = null;
  let lookupMethod = 'none';

  try {
    // 1. Try by bookingReference (PARM_1) with strict single-row check first
    if (!existingTx && bookingReference) {
      const { data: attempts, error: selectErr } = await supabaseClient
        .from('payment_transactions')
        .select('*')
        .eq('booking_reference', bookingReference);

      if (selectErr) {
        console.error('[PaymentReconciliation] Supabase select error:', selectErr.code, selectErr.message);
        return {
          success: false,
          category: 'parsing_problem',
          message: `Database select error: ${selectErr.message}`,
          error: selectErr.code,
        };
      }

      if (attempts && attempts.length === 1) {
        existingTx = attempts[0];
        lookupMethod = 'booking_reference_strict_unique';
      } else if (attempts && attempts.length > 1) {
        return {
          success: false,
          category: 'ambiguous_records',
          bookingReference,
          message: `Ambiguous payment records: Booking "${bookingReference}" has ${attempts.length} transaction attempts. Cannot uniquely reconcile without operation code or attempt key.`,
          error: 'Multiple records found for booking reference.',
        };
      }
    }

    // 2. Try by operationCode (gateway_operation_id)
    if (!existingTx && operationCode) {
      const { data } = await supabaseClient
        .from('payment_transactions')
        .select('*')
        .eq('gateway_operation_id', operationCode)
        .maybeSingle();
      if (data) {
        existingTx = data;
        lookupMethod = 'gateway_operation_id';
      }
    }

    // 3. Try by linkCode (gateway_link_code)
    if (!existingTx && linkCode) {
      const { data } = await supabaseClient
        .from('payment_transactions')
        .select('*')
        .eq('gateway_link_code', linkCode)
        .maybeSingle();
      if (data) {
        existingTx = data;
        lookupMethod = 'gateway_link_code';
      }
    }

    // 4. Try by idempotencyKey
    if (!existingTx && idempotencyKey) {
      const { data } = await supabaseClient
        .from('payment_transactions')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (data) {
        existingTx = data;
        lookupMethod = 'idempotency_key';
      }
    }
  } catch (err: any) {
    return {
      success: false,
      category: 'parsing_problem',
      message: `Database query exception: ${err.message}`,
      error: err.message,
    };
  }

  if (!existingTx) {
    return {
      success: false,
      category: 'absent_records',
      bookingReference,
      message: 'Transaction record could not be located in database.',
      error: 'Transaction not found.',
    };
  }

  // Sandbox PARM_1 Diagnostic Logging (equality boolean and character length without exposing secrets/PII)
  const isSandbox = (existingTx.environment || environment) === 'sandbox';
  if (isSandbox && bookingReference) {
    const parm1EqualsStored = existingTx.booking_reference === bookingReference;
    const incomingLength = (bookingReference || '').length;
    const storedLength = (existingTx.booking_reference || '').length;
    console.log(`[PaymentReconciliation] [Sandbox PARM_1 Check] equal=${parm1EqualsStored}, incomingLength=${incomingLength}, storedLength=${storedLength}`);
  }

  // 2. Idempotency Check: if already approved, skip duplicate work safely
  if (existingTx.status === 'approved') {
    return {
      success: true,
      duplicate: true,
      category: 'approved',
      bookingReference: existingTx.booking_reference,
      operationCode: existingTx.gateway_operation_id || operationCode,
      amountPaid: existingTx.amount_paid || existingTx.expected_amount,
      message: 'Transaction is already recorded and approved. Idempotent check passed.',
      databaseUpdated: false,
    };
  }

  // 3. Call PagueloFacil MerchantTransactions API authoritatively
  const activeToken = isSandbox
    ? (env.PAGUELOFACIL_SANDBOX_ACCESS_TOKEN || env.PAGUELOFACIL_DEMO_ACCESS_TOKEN || '').trim()
    : (env.PAGUELOFACIL_ACCESS_TOKEN || '').trim();

  if (!activeToken) {
    return {
      success: false,
      category: 'authentication_failure',
      bookingReference: existingTx.booking_reference,
      message: 'Authoritative transaction verification requires PagueloFacil REST API access token.',
      error: 'Missing access token.',
    };
  }

  const verifyUrl = isSandbox
    ? 'https://sandbox.paguelofacil.com/PFManagementServices/api/v1/MerchantTransactions'
    : 'https://admin.paguelofacil.com/PFManagementServices/api/v1/MerchantTransactions';

  const opToQuery = operationCode || existingTx.gateway_operation_id;
  if (!opToQuery) {
    return {
      success: false,
      category: 'mismatched_identifiers',
      bookingReference: existingTx.booking_reference,
      message: 'Cannot query MerchantTransactions API without an authoritative operation code (Oper/codOper).',
      error: 'Missing operation code.',
    };
  }

  const filterParam = `codOper::${opToQuery}`;

  try {
    const response = await fetch(`${verifyUrl}?filter=${encodeURIComponent(filterParam)}`, {
      method: 'GET',
      headers: {
        Authorization: activeToken, // Direct access token without Bearer prefix
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return {
        success: false,
        category: 'parsing_problem',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: `Verification API returned HTTP ${response.status}.`,
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    const records = Array.isArray(data?.data) ? data.data : (data?.data ? [data.data] : (Array.isArray(data) ? data : []));

    if (records.length === 0) {
      return {
        success: false,
        category: 'absent_records',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: `No authoritative record found in gateway for operation ${opToQuery}.`,
        error: 'Record not found in gateway.',
      };
    }

    const matched = records.find((r: any) => String(r.codOper || r.oper || r.id || '').trim() === String(opToQuery).trim()) || records[0];

    // 4. Validate Authoritative Evidence
    // Status 1 means approved, 0 means declined. Successful captured sale uses txType AUTH_CAPTURE.
    const rawStatus = matched.status !== undefined ? Number(matched.status) : String(matched.estado || '').trim().toLowerCase();
    const isStatusApproved = rawStatus === 1 || rawStatus === '1' || rawStatus === 'aprobada' || rawStatus === 'approved';
    const isStatusDeclined = rawStatus === 0 || rawStatus === '0' || rawStatus === 'rechazada' || rawStatus === 'declined';

    const txType = String(matched.txType || matched.type || matched.operationType || matched.tipo || '').trim().toUpperCase();
    const isAuthCapture = txType === 'AUTH_CAPTURE' || txType === 'SALE' || txType === 'CAPTURE';

    if (isStatusDeclined) {
      return {
        success: false,
        category: 'declined',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: 'Transaction was declined by gateway (status 0).',
        error: 'Gateway status declined.',
      };
    }

    if (!isStatusApproved || !isAuthCapture) {
      return {
        success: false,
        category: 'validation_rejection',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: `Transaction not fully captured/approved: status=${rawStatus}, txType=${txType}.`,
        error: 'Invalid status or transaction type.',
      };
    }

    // Amount validation in integer cents
    const rawAmount = matched.authAmount ?? matched.amount ?? matched.total ?? matched.TotalPagado;
    if (rawAmount === undefined || rawAmount === null || rawAmount === '') {
      return {
        success: false,
        category: 'validation_rejection',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: 'Gateway record missing amount field.',
        error: 'Missing amount.',
      };
    }

    const amountPaid = Number(rawAmount);
    const amountCents = amountPaid < 1000 ? Math.round(amountPaid * 100) : Math.round(amountPaid);
    const expectedCents = existingTx.amount_in_cents || Math.round((existingTx.expected_amount || 0) * 100);

    if (amountCents !== expectedCents) {
      return {
        success: false,
        category: 'validation_rejection',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: `Exact amount mismatch: Paid ${amountCents} cents does not match expected ${expectedCents} cents.`,
        error: 'Amount mismatch.',
      };
    }

    // Currency validation (840 or USD)
    const rawCurrency = matched.authCurrency ?? matched.currency ?? matched.moneda;
    const currencyStr = String(rawCurrency || '').trim().toUpperCase();
    const isUsd = currencyStr === 'USD' || currencyStr === '840' || currencyStr === 'US_DOLLAR';
    if (!isUsd) {
      return {
        success: false,
        category: 'validation_rejection',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: `Invalid or missing currency "${rawCurrency}". USD (840) required.`,
        error: 'Invalid currency.',
      };
    }

    // Booking reference conflict check if returned by API
    const returnedRef = String(matched.customParm1 || matched.parm1 || matched.bookingReference || '').trim();
    if (bookingReference && returnedRef && returnedRef !== bookingReference) {
      return {
        success: false,
        category: 'mismatched_identifiers',
        bookingReference,
        operationCode: opToQuery,
        message: `Booking reference conflict: Gateway record reference "${returnedRef}" does not match requested "${bookingReference}".`,
        error: 'Reference conflict.',
      };
    }

    // 5. Persist updates consistently to payment_transactions and booking_requests
    const { data: updatedRows, error: updateErr } = await supabaseClient
      .from('payment_transactions')
      .update({
        status: 'approved',
        gateway_operation_id: opToQuery,
        amount_paid: amountPaid,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        audit_metadata: {
          ...(existingTx.audit_metadata || {}),
          verified: true,
          verified_via: 'reconciliation_helper',
          verified_at: new Date().toISOString(),
          gateway_operation_id: opToQuery,
          auth_code: matched.authCode || matched.authStatus,
          card_type: matched.cardType || matched.Tipo,
        },
      })
      .eq('id', existingTx.id)
      .select('id');

    if (updateErr) {
      return {
        success: false,
        category: 'parsing_problem',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: `Database update error: ${updateErr.message}`,
        error: updateErr.code,
      };
    }

    if (!updatedRows || updatedRows.length !== 1) {
      return {
        success: false,
        category: 'parsing_problem',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: `Database update failed to target exactly one row (updated: ${updatedRows?.length ?? 0}).`,
        error: 'Row count violation.',
      };
    }

    // Update corresponding booking_requests record if it exists
    if (existingTx.booking_reference) {
      await supabaseClient
        .from('booking_requests')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('booking_reference', existingTx.booking_reference);
    }

    return {
      success: true,
      category: 'approved',
      bookingReference: existingTx.booking_reference,
      operationCode: opToQuery,
      amountPaid,
      message: `Transaction successfully verified and reconciled. payment_transactions row updated.`,
      databaseUpdated: true,
      audit: {
        txId: existingTx.id,
        authCode: matched.authCode || matched.authStatus,
        cardType: matched.cardType || matched.Tipo,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      category: 'parsing_problem',
      bookingReference: existingTx?.booking_reference || bookingReference,
      operationCode: opToQuery,
      message: `Reconciliation exception: ${err.message}`,
      error: err.message,
    };
  }
}
