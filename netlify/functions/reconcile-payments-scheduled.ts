import type { Config } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { reconcilePaymentTransaction } from './paymentReconciliation.js';

/**
 * Netlify Scheduled Functions Configuration
 * Runs every 10 minutes to process eligible pending production payments.
 * Netlify free plan limit: 125,000 background function invocations/month.
 * Running every 10 minutes uses ~4,320 invocations/month (< 4% of quota).
 */
export const config: Config = {
  schedule: '*/10 * * * *',
};

interface ScheduledReconciliationPayload {
  success: boolean;
  workerId: string;
  checkedCount: number;
  reconciledCount: number;
  skippedCount: number;
  failedCount: number;
  failureCategories: Record<string, number>;
  timestamp: string;
  disabled?: boolean;
  message?: string;
  error?: string;
}

/**
 * Execute Scheduled Payment Reconciliation Fallback
 * 
 * Safety invariants:
 * 1. Process ONLY production pending/processing transactions where booking status is 'pending_payment'.
 * 2. Never auto-confirm cancelled, expired, refunded, needs_manual_review, or disputed records.
 * 3. Never bypass merchant identity or relationship verification.
 * 4. Bound batch size and age (e.g. max 10 transactions, created in the last 72 hours).
 * 5. Reuses reconcilePaymentTransaction and the atomic Supabase RPC.
 * 6. Logs sanitized operational metrics with ZERO secret/customer data exposure.
 */
export async function executeScheduledPaymentReconciliation(
  testOptions?: {
    supabaseClient?: any;
    env?: Record<string, string | undefined>;
    fetchFn?: typeof fetch;
  }
): Promise<{ statusCode: number; payload: ScheduledReconciliationPayload }> {
  const workerId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const env = testOptions?.env || process.env;
  const fetchFn = testOptions?.fetchFn || global.fetch;

  // Server-only environment switch: default is false.
  // The scheduled worker must exit BEFORE reading or modifying production payment records
  // unless ENABLE_AUTOMATIC_PAYMENT_RECONCILIATION is explicitly true.
  const isReconciliationEnabled = env.ENABLE_AUTOMATIC_PAYMENT_RECONCILIATION === 'true';
  if (!isReconciliationEnabled) {
    console.log(`[ScheduledReconciler] ${workerId}: Automatic reconciliation disabled (ENABLE_AUTOMATIC_PAYMENT_RECONCILIATION is not 'true'). Exiting before reading or modifying records.`);
    return {
      statusCode: 200,
      payload: {
        success: true,
        workerId,
        checkedCount: 0,
        reconciledCount: 0,
        skippedCount: 0,
        failedCount: 0,
        failureCategories: {},
        timestamp: new Date().toISOString(),
        disabled: true,
        message: 'Automatic payment reconciliation is disabled (ENABLE_AUTOMATIC_PAYMENT_RECONCILIATION is not true).',
      },
    };
  }

  const supabaseUrl = env.SUPABASE_URL || '';
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';

  const supabase = testOptions?.supabaseClient || (
    supabaseUrl && supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null
  );

  if (!supabase) {
    console.error(`[ScheduledReconciler] ${workerId}: Missing Supabase credentials.`);
    return {
      statusCode: 500,
      payload: {
        success: false,
        workerId,
        checkedCount: 0,
        reconciledCount: 0,
        skippedCount: 0,
        failedCount: 0,
        failureCategories: { missing_credentials: 1 },
        timestamp: new Date().toISOString(),
        error: 'Database credentials missing',
      },
    };
  }

  const failureCategories: Record<string, number> = {};
  let checkedCount = 0;
  let reconciledCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  try {
    // 1. Query only eligible production pending payments created within the last 72 hours
    // (Bounded window prevents unbounded retries or scanning stale transactions)
    const windowStart = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

    const { data: eligibleTxList, error: queryErr } = await supabase
      .from('payment_transactions')
      .select('id, booking_reference, status, environment, expected_amount, gateway_operation_id, gateway_link_code, idempotency_key, created_at')
      .eq('environment', 'production')
      .in('status', ['pending', 'processing'])
      .gte('created_at', windowStart)
      .order('created_at', { ascending: true })
      .limit(10); // Strict batch limit to respect execution time

    if (queryErr) {
      console.error(`[ScheduledReconciler] ${workerId}: Query error:`, queryErr.message);
      return {
        statusCode: 500,
        payload: {
          success: false,
          workerId,
          checkedCount: 0,
          reconciledCount: 0,
          skippedCount: 0,
          failedCount: 1,
          failureCategories: { query_error: 1 },
          timestamp: new Date().toISOString(),
          error: 'Failed to query pending transactions',
        },
      };
    }

    if (!eligibleTxList || eligibleTxList.length === 0) {
      return {
        statusCode: 200,
        payload: {
          success: true,
          workerId,
          checkedCount: 0,
          reconciledCount: 0,
          skippedCount: 0,
          failedCount: 0,
          failureCategories: {},
          timestamp: new Date().toISOString(),
        },
      };
    }

    // 2. Process each eligible transaction safely
    for (const tx of eligibleTxList) {
      checkedCount++;

      // Check linked booking_requests status: ONLY allow if booking status is 'pending_payment'
      const { data: booking, error: bErr } = await supabase
        .from('booking_requests')
        .select('status')
        .eq('booking_reference', tx.booking_reference)
        .maybeSingle();

      if (bErr || !booking || booking.status !== 'pending_payment') {
        skippedCount++;
        const cat = !booking ? 'booking_not_found' : `ineligible_booking_status_${booking.status}`;
        failureCategories[cat] = (failureCategories[cat] || 0) + 1;
        continue;
      }

      // 3. Reconcile via authoritative helper
      try {
        const result = await reconcilePaymentTransaction({
          bookingReference: tx.booking_reference,
          operationCode: tx.gateway_operation_id,
          linkCode: tx.gateway_link_code,
          idempotencyKey: tx.idempotency_key,
          environment: 'production',
          supabaseClient: supabase,
          env,
          fetchFn,
        });

        if (result.success && result.category === 'approved') {
          reconciledCount++;
        } else {
          failedCount++;
          const cat = result.category || 'unknown_failure';
          failureCategories[cat] = (failureCategories[cat] || 0) + 1;

          // If operation was absent and discovery could not find an authoritative match,
          // record an explicit operational alert in payment_transactions audit metadata
          // without marking the payment as rejected or approved.
          if (!tx.gateway_operation_id && cat === 'absent_records') {
            try {
              await supabase
                .from('payment_transactions')
                .update({
                  audit_metadata: {
                    ...(tx.audit_metadata || {}),
                    scheduled_reconciler_last_checked: new Date().toISOString(),
                    scheduled_reconciler_status: 'pending_gateway_operation_discovery',
                    scheduled_reconciler_note: 'Gateway operation ID is not yet recorded; PagueloFacil REST API does not support filter by booking reference.',
                  },
                })
                .eq('id', tx.id);
            } catch {
              // Non-blocking audit update
            }
          }
        }
      } catch (recErr: any) {
        failedCount++;
        failureCategories['exception'] = (failureCategories['exception'] || 0) + 1;
      }
    }

    // Sanitize and log summary
    console.log(`[ScheduledReconciler] ${workerId} complete:`, {
      checked: checkedCount,
      reconciled: reconciledCount,
      skipped: skippedCount,
      failed: failedCount,
      categories: failureCategories,
    });

    return {
      statusCode: 200,
      payload: {
        success: true,
        workerId,
        checkedCount,
        reconciledCount,
        skippedCount,
        failedCount,
        failureCategories,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    console.error(`[ScheduledReconciler] ${workerId} critical error:`, err.message);
    return {
      statusCode: 500,
      payload: {
        success: false,
        workerId,
        checkedCount,
        reconciledCount,
        skippedCount,
        failedCount,
        failureCategories: { critical_error: 1 },
        timestamp: new Date().toISOString(),
        error: err.message,
      },
    };
  }
}

/**
 * Standard Netlify Scheduled Function default export
 */
export default async function (req?: Request): Promise<Response> {
  const { statusCode, payload } = await executeScheduledPaymentReconciliation();
  return new Response(JSON.stringify(payload), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Backwards-compatible Netlify handler export for test suites and function runners
 */
export async function handler(event?: any) {
  const { statusCode, payload } = await executeScheduledPaymentReconciliation();
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  };
}
