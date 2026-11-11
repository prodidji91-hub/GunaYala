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
  category: 'approved' | 'declined' | 'absent_records' | 'ambiguous_records' | 'authentication_failure' | 'mismatched_identifiers' | 'validation_rejection' | 'parsing_problem' | 'needs_manual_review' | 'partial_synchronization_failure';
  bookingReference?: string;
  operationCode?: string;
  amountPaid?: number;
  message: string;
  databaseUpdated?: boolean;
  error?: string;
  audit?: any;
}

export interface RelationshipValidationResult {
  verified: boolean;
  evidence: 'customParm1' | 'parm1' | 'PARM_1' | 'bookingReference' | 'linkCode' | 'code' | 'gatewayLinkCode' | 'urlString_parameter' | 'none';
  provingField?: string;
  details: string;
}

/**
 * Strict Authoritative Relationship Validation Helper
 * Validates trusted gateway parameters, link codes, and safely parsed urlString query parameters.
 * Rejects substring matches, malformed URLs, and conflicting identifiers.
 */
export function validatePaymentRelationship(matched: any, existingTx: any): RelationshipValidationResult {
  if (!matched || !existingTx) {
    return {
      verified: false,
      evidence: 'none',
      details: 'Missing gateway record or existing transaction for relationship validation.',
    };
  }

  const storedRef = String(existingTx.booking_reference || '').trim();
  const storedLinkCode = String(existingTx.gateway_link_code || '').trim();

  if (!storedRef && !storedLinkCode) {
    return {
      verified: false,
      evidence: 'none',
      details: 'Missing stored booking reference and link code for relationship validation.',
    };
  }

  // 1. Check direct structured gateway parameters (customParm1, parm1, PARM_1, bookingReference)
  const directFields = ['customParm1', 'parm1', 'PARM_1', 'bookingReference'];
  for (const field of directFields) {
    const actualKey = field in matched ? field : Object.keys(matched).find(k => k.toLowerCase() === field.toLowerCase());
    if (actualKey && matched[actualKey] !== undefined && matched[actualKey] !== null) {
      const val = String(matched[actualKey]).trim();
      if (storedRef && val === storedRef) {
        return {
          verified: true,
          evidence: field as any,
          provingField: actualKey,
          details: `Verified via trusted gateway parameter "${actualKey}" matching stored booking reference.`,
        };
      }
      if (storedRef && val && val !== storedRef) {
        return {
          verified: false,
          evidence: field as any,
          provingField: actualKey,
          details: `Booking reference conflict: gateway field "${actualKey}" contains "${val}", expected "${storedRef}".`,
        };
      }
    }
  }

  // 2. Check gateway link code correlation (linkCode, code, gatewayLinkCode)
  const linkFields = ['linkCode', 'code', 'gatewayLinkCode'];
  for (const field of linkFields) {
    const actualKey = field in matched ? field : Object.keys(matched).find(k => k.toLowerCase() === field.toLowerCase());
    if (actualKey && matched[actualKey] !== undefined && matched[actualKey] !== null) {
      const val = String(matched[actualKey]).trim();
      if (storedLinkCode && val === storedLinkCode) {
        return {
          verified: true,
          evidence: field as any,
          provingField: actualKey,
          details: `Verified via trusted gateway link code correlation in field "${actualKey}".`,
        };
      }
    }
  }

  // 3. Check urlString trusted URL parameters safely (Requirements 1 & 2)
  const urlStringVal = matched.urlString || matched.url || matched.returnUrl || matched.callbackUrl;
  if (urlStringVal && typeof urlStringVal === 'string' && urlStringVal.trim() !== '') {
    try {
      const parsedUrl = new URL(urlStringVal);
      const searchParams = parsedUrl.searchParams;
      const trustedParams = ['bookingReference', 'PARM_1', 'parm1', 'customParm1', 'ref', 'booking_reference'];

      for (const param of trustedParams) {
        const paramVal = searchParams.get(param);
        if (paramVal && storedRef && paramVal.trim() === storedRef) {
          return {
            verified: true,
            evidence: 'urlString_parameter',
            provingField: `urlString?${param}`,
            details: `Verified via trusted URL parameter "${param}" in urlString matching stored booking reference.`,
          };
        }
        if (paramVal && storedRef && paramVal.trim() !== storedRef) {
          return {
            verified: false,
            evidence: 'urlString_parameter',
            provingField: `urlString?${param}`,
            details: `URL parameter conflict in urlString: parameter "${param}" contains "${paramVal.trim()}", expected "${storedRef}".`,
          };
        }
      }
    } catch {
      // Malformed URL in urlString - reject per requirement 2
      return {
        verified: false,
        evidence: 'none',
        details: 'Malformed URL in urlString; rejected per strict relationship validation rules.',
      };
    }
  }

  return {
    verified: false,
    evidence: 'none',
    details: 'Relationship evidence unavailable.',
  };
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

  // Enforce server-configured environment security and reject cross-environment mismatches
  const txEnvironment = existingTx.environment || 'sandbox';
  if (environment && txEnvironment !== environment) {
    return {
      success: false,
      category: 'validation_rejection',
      bookingReference: existingTx.booking_reference,
      operationCode: existingTx.gateway_operation_id,
      message: `Cross-environment mismatch: Transaction environment is "${txEnvironment}" but request environment is "${environment}".`,
      error: 'Environment mismatch.',
    };
  }

  const isSandbox = txEnvironment === 'sandbox';
  if (isSandbox && bookingReference) {
    const parm1EqualsStored = existingTx.booking_reference === bookingReference;
    const incomingLength = (bookingReference || '').length;
    const storedLength = (existingTx.booking_reference || '').length;
    console.log(`[PaymentReconciliation] [Sandbox PARM_1 Check] equal=${parm1EqualsStored}, incomingLength=${incomingLength}, storedLength=${storedLength}`);
  }

  // Helper to sync/repair booking_requests record atomically/safely with TEST flag
  async function syncBookingRequest(bookingRef: string): Promise<{ success: boolean; error?: any }> {
    if (!bookingRef) return { success: true };

    const { data: currentBooking } = await supabaseClient
      .from('booking_requests')
      .select('special_notes')
      .eq('booking_reference', bookingRef)
      .maybeSingle();

    const existingNotes = currentBooking?.special_notes || '';
    const updatedNotes = existingNotes.includes('[TEST') ? existingNotes : `[TEST / RECONCILED] ${existingNotes}`.trim();

    const { data: bookingUpdatedRows, error: bookingUpdateErr } = await supabaseClient
      .from('booking_requests')
      .update({
        status: 'fully_confirmed',
        special_notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('booking_reference', bookingRef)
      .select('booking_reference');

    if (bookingUpdateErr) {
      console.error(`[Reconciliation] Failed to update booking_requests for ${bookingRef}:`, bookingUpdateErr);
      return { success: false, error: bookingUpdateErr };
    }
    if (!bookingUpdatedRows || bookingUpdatedRows.length === 0) {
      console.warn(`[Reconciliation] No booking_requests record found with booking_reference ${bookingRef} to update.`);
      return { success: false, error: 'Booking record not found.' };
    }
    return { success: true };
  }

  // 2. Idempotency Check & Approved Payment Repair
  if (existingTx.status === 'approved') {
    let bookingNeedsRepair = false;
    if (existingTx.booking_reference) {
      const { data: bookingRec } = await supabaseClient
        .from('booking_requests')
        .select('status')
        .eq('booking_reference', existingTx.booking_reference)
        .maybeSingle();
      if (bookingRec && bookingRec.status !== 'fully_confirmed') {
        bookingNeedsRepair = true;
      }
    }

    if (!bookingNeedsRepair) {
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

    // Approved payment but booking is pending. Revalidate against gateway and check strict relationship validation.
    const opToQuery = existingTx.gateway_operation_id;
    if (!opToQuery) {
      return {
        success: false,
        category: 'needs_manual_review',
        bookingReference: existingTx.booking_reference,
        message: 'Approved payment lacks gateway operation ID to revalidate before repairing booking.',
        error: 'Missing operation code for revalidation.',
      };
    }

    const activeToken = isSandbox
      ? (env.PAGUELOFACIL_SANDBOX_ACCESS_TOKEN || env.PAGUELOFACIL_DEMO_ACCESS_TOKEN || '').trim()
      : (env.PAGUELOFACIL_ACCESS_TOKEN || '').trim();

    if (!activeToken) {
      return {
        success: false,
        category: 'authentication_failure',
        bookingReference: existingTx.booking_reference,
        message: 'Authoritative transaction revalidation requires PagueloFacil access token.',
        error: 'Missing access token.',
      };
    }

    const verifyUrl = isSandbox
      ? 'https://sandbox.paguelofacil.com/PFManagementServices/api/v1/MerchantTransactions'
      : 'https://admin.paguelofacil.com/PFManagementServices/api/v1/MerchantTransactions';

    const filterParam = `codOper::${opToQuery}`;

    try {
      const response = await fetch(`${verifyUrl}?filter=${encodeURIComponent(filterParam)}`, {
        method: 'GET',
        headers: {
          Authorization: activeToken,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          category: 'parsing_problem',
          bookingReference: existingTx.booking_reference,
          operationCode: opToQuery,
          message: `Revalidation API returned HTTP ${response.status}.`,
          error: `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      const records = Array.isArray(data?.data) ? data.data : (data?.data ? [data.data] : (Array.isArray(data) ? data : []));
      const matchingRecords = records.filter((r: any) => String(r.codOper || r.oper || r.id || '').trim() === String(opToQuery).trim());

      if (matchingRecords.length !== 1) {
        return {
          success: false,
          category: matchingRecords.length === 0 ? 'absent_records' : 'ambiguous_records',
          bookingReference: existingTx.booking_reference,
          operationCode: opToQuery,
          message: `Revalidation failed: Expected exactly 1 gateway record for ${opToQuery}, found ${matchingRecords.length}.`,
          error: 'Gateway record count mismatch.',
        };
      }

      const matched = matchingRecords[0];
      const rawStatus = matched.status !== undefined ? Number(matched.status) : String(matched.estado || '').trim().toLowerCase();
      const isStatusApproved = rawStatus === 1 || rawStatus === '1' || rawStatus === 'aprobada' || rawStatus === 'approved';
      const txType = String(matched.txType || matched.type || matched.operationType || matched.tipo || '').trim().toUpperCase();
      const isAuthCapture = txType === 'AUTH_CAPTURE' || txType === 'SALE' || txType === 'CAPTURE';

      if (!isStatusApproved || !isAuthCapture) {
        return {
          success: false,
          category: 'validation_rejection',
          bookingReference: existingTx.booking_reference,
          operationCode: opToQuery,
          message: `Revalidation failed: Gateway status/type not approved (status=${rawStatus}, txType=${txType}).`,
          error: 'Invalid status or transaction type.',
        };
      }

      const relCheck = validatePaymentRelationship(matched, existingTx);
      if (!relCheck.verified) {
        return {
          success: false,
          category: relCheck.details.includes('conflict') ? 'mismatched_identifiers' : 'needs_manual_review',
          bookingReference: existingTx.booking_reference,
          operationCode: opToQuery,
          message: `Approved payment revalidation relationship check failed: ${relCheck.details}`,
          error: 'Missing or conflicting relationship evidence.',
        };
      }

      const bookingSync = await syncBookingRequest(existingTx.booking_reference);
      if (!bookingSync.success) {
        return {
          success: false,
          category: 'partial_synchronization_failure',
          bookingReference: existingTx.booking_reference,
          operationCode: opToQuery,
          message: 'Payment revalidated successfully but failed to update booking_requests record.',
          error: String(bookingSync.error),
        };
      }

      return {
        success: true,
        duplicate: true,
        category: 'approved',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        amountPaid: existingTx.amount_paid || existingTx.expected_amount,
        message: 'Approved payment revalidated against gateway and successfully repaired booking_requests record.',
        databaseUpdated: true,
        audit: existingTx.audit_metadata,
      };
    } catch (err: any) {
      return {
        success: false,
        category: 'parsing_problem',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: `Revalidation exception: ${err.message}`,
        error: err.message,
      };
    }
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

    const matchingRecords = records.filter((r: any) => String(r.codOper || r.oper || r.id || '').trim() === String(opToQuery).trim());

    if (matchingRecords.length === 0) {
      return {
        success: false,
        category: 'absent_records',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: `No authoritative record found in gateway for operation ${opToQuery}.`,
        error: 'Record not found in gateway.',
      };
    }

    if (matchingRecords.length > 1) {
      return {
        success: false,
        category: 'ambiguous_records',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: `Ambiguous gateway response: Multiple records found for operation code ${opToQuery}.`,
        error: 'Ambiguous gateway records.',
      };
    }

    const matched = matchingRecords[0];

    // 4. Validate Authoritative Evidence
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

    // Authoritative relationship validation using shared helper
    const relCheck = validatePaymentRelationship(matched, existingTx);
    if (!relCheck.verified) {
      return {
        success: false,
        category: relCheck.details.includes('conflict') ? 'mismatched_identifiers' : 'needs_manual_review',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: `Relationship verification failed: ${relCheck.details}`,
        error: 'Missing or conflicting relationship evidence.',
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
    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      return {
        success: false,
        category: 'validation_rejection',
        bookingReference: existingTx.booking_reference,
        operationCode: opToQuery,
        message: `Invalid amount paid value: ${rawAmount}.`,
        error: 'Invalid amount.',
      };
    }

    const amountCents = Math.round(amountPaid * 100);
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
          relationship_evidence: relCheck.evidence,
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

    // Update corresponding booking_requests record if it exists to fully_confirmed (Atomic consistency check)
    if (existingTx.booking_reference) {
      const bookingSync = await syncBookingRequest(existingTx.booking_reference);
      if (!bookingSync.success) {
        return {
          success: false,
          category: 'partial_synchronization_failure',
          bookingReference: existingTx.booking_reference,
          operationCode: opToQuery,
          message: `Payment transaction approved but booking_requests update failed: ${JSON.stringify(bookingSync.error)}.`,
          error: 'Partial reconciliation failure (booking update failed).',
        };
      }
    }

    return {
      success: true,
      category: 'approved',
      bookingReference: existingTx.booking_reference,
      operationCode: opToQuery,
      amountPaid,
      message: `Transaction successfully verified and reconciled. Both payment_transactions and booking_requests records updated.`,
      databaseUpdated: true,
      audit: {
        txId: existingTx.id,
        authCode: matched.authCode || matched.authStatus,
        cardType: matched.cardType || matched.Tipo,
        relationshipEvidence: relCheck.evidence,
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
