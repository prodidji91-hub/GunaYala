-- ==============================================================================
-- GUNA YALA PANAMA TRAVEL — PART 25I FINAL ATOMIC RECONCILIATION MIGRATION
-- Migration Date: 2026-11-12
-- Version: 20261112_atomic_payment_reconciliation.sql
-- Purpose: Atomic PostgreSQL function for payment_transactions and booking_requests
--          reconciliation with row locking, exact booking reference correlation,
--          exact integer cent amount validation, duplicate operation ID prevention,
--          and strict lifecycle status transition rules.
-- SECURITY & ACCESS:
--   - Restricts execution exclusively to service_role with hardened search_path = public, pg_temp.
--   - Revokes EXECUTE from PUBLIC, anon, and authenticated users.
-- IMPORTANT SAFETY RULE: DO NOT EXECUTE OR APPLY AUTOMATICALLY IN PRODUCTION.
-- ==============================================================================

-- Atomic Reconciliation PostgreSQL RPC Function
CREATE OR REPLACE FUNCTION public.reconcile_payment_and_booking_atomic(
  p_transaction_id UUID,
  p_booking_reference TEXT,
  p_gateway_operation_id TEXT,
  p_amount_paid NUMERIC,
  p_verified_at TIMESTAMPTZ,
  p_audit_metadata JSONB,
  p_special_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tx RECORD;
  v_other_tx_id UUID;
  v_booking_ref TEXT;
  v_booking_record RECORD;
  v_current_notes TEXT;
  v_new_notes TEXT;
  v_payment_updated INT := 0;
  v_booking_updated INT := 0;
  v_already_approved BOOLEAN := FALSE;
  v_paid_cents BIGINT;
  v_expected_cents BIGINT;
BEGIN
  -- 1. Enforce non-null, non-empty p_booking_reference
  IF p_booking_reference IS NULL OR TRIM(p_booking_reference) = '' THEN
    RAISE EXCEPTION 'Atomic reconciliation failed: Booking reference parameter is required and cannot be null or empty.';
  END IF;

  v_booking_ref := TRIM(p_booking_reference);

  -- 2. Enforce non-null, non-empty p_gateway_operation_id
  IF p_gateway_operation_id IS NULL OR TRIM(p_gateway_operation_id) = '' THEN
    RAISE EXCEPTION 'Atomic reconciliation failed: Gateway operation ID parameter is required and cannot be null or empty.';
  END IF;

  -- 3. Lock and retrieve target payment_transactions row
  SELECT * INTO v_tx
  FROM public.payment_transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Atomic reconciliation failed: Target payment_transactions row % not found.', p_transaction_id;
  END IF;

  -- 4. Verify stored transaction booking_reference exactly equals p_booking_reference
  IF v_tx.booking_reference IS NULL OR TRIM(v_tx.booking_reference) = '' THEN
    RAISE EXCEPTION 'Atomic reconciliation failed: Target payment_transactions row % has missing stored booking_reference.', p_transaction_id;
  END IF;

  IF TRIM(v_tx.booking_reference) <> v_booking_ref THEN
    RAISE EXCEPTION 'Atomic reconciliation failed: Stored transaction booking_reference (%) does not match requested booking_reference (%).', v_tx.booking_reference, v_booking_ref;
  END IF;

  -- 5. Lock and verify required target booking_requests row (reject payment-only orphans)
  SELECT * INTO v_booking_record
  FROM public.booking_requests
  WHERE booking_reference = v_booking_ref
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Atomic reconciliation failed: Required booking_requests row (%) not found. Payment-only confirmation rejected.', v_booking_ref;
  END IF;

  -- 6. Amount Validation: Enforce positive amount_paid representing exact whole cents
  IF p_amount_paid IS NULL OR p_amount_paid <= 0 THEN
    RAISE EXCEPTION 'Atomic reconciliation failed: Amount paid must be a positive number (% provided).', p_amount_paid;
  END IF;

  v_paid_cents := ROUND(p_amount_paid * 100.0)::BIGINT;
  IF (p_amount_paid * 100.0) <> v_paid_cents::NUMERIC THEN
    RAISE EXCEPTION 'Atomic reconciliation failed: Amount paid (%) must represent exact whole cents.', p_amount_paid;
  END IF;

  -- Determine expected cents: compare against stored amount_in_cents when available, otherwise derive from expected_amount
  IF v_tx.amount_in_cents IS NOT NULL AND v_tx.amount_in_cents > 0 THEN
    v_expected_cents := v_tx.amount_in_cents::BIGINT;
  ELSIF v_tx.expected_amount IS NOT NULL AND v_tx.expected_amount > 0 THEN
    v_expected_cents := ROUND(v_tx.expected_amount * 100.0)::BIGINT;
  ELSE
    RAISE EXCEPTION 'Atomic reconciliation failed: Target payment_transactions row % has absent or invalid expected amount.', p_transaction_id;
  END IF;

  -- Exact whole cents comparison (zero tolerance)
  IF v_paid_cents <> v_expected_cents THEN
    RAISE EXCEPTION 'Atomic reconciliation failed: Paid amount (% cents) does not match stored expected amount (% cents).', v_paid_cents, v_expected_cents;
  END IF;

  -- 7. Status Transition & Idempotency Rules
  -- Enforce strict booking_requests status restrictions:
  --   Case A: When payment transaction status is 'pending' or 'processing':
  --           booking_requests.status MUST BE 'pending_payment'.
  --   Case B: When payment transaction status is 'approved':
  --           booking_requests.status MUST BE EITHER 'fully_confirmed' (idempotent retry) OR 'pending_payment' (approved payment repair).
  --   ALL OTHER booking statuses (NULL, cancelled, expired, unavailable, quotation_sent, deposit_received, etc.) are strictly rejected.

  IF v_tx.status IN ('pending', 'processing') THEN
    v_already_approved := FALSE;

    IF v_booking_record.status IS NULL OR v_booking_record.status <> 'pending_payment' THEN
      RAISE EXCEPTION 'Atomic reconciliation failed: Associated booking_requests row % has status %, but automatic reconciliation requires status pending_payment.', v_booking_ref, COALESCE(v_booking_record.status, 'NULL');
    END IF;

  ELSIF v_tx.status = 'approved' THEN
    v_already_approved := TRUE;

    IF v_booking_record.status IS NULL OR v_booking_record.status NOT IN ('pending_payment', 'fully_confirmed') THEN
      RAISE EXCEPTION 'Atomic reconciliation failed: Associated booking_requests row % has status %, which is incompatible with approved transaction reconciliation.', v_booking_ref, COALESCE(v_booking_record.status, 'NULL');
    END IF;

    IF v_tx.gateway_operation_id IS NULL OR TRIM(v_tx.gateway_operation_id) = '' THEN
      RAISE EXCEPTION 'Atomic reconciliation failed: Transaction % is marked approved but lacks a stored gateway operation ID.', p_transaction_id;
    END IF;

    IF TRIM(v_tx.gateway_operation_id) <> TRIM(p_gateway_operation_id) THEN
      RAISE EXCEPTION 'Atomic reconciliation failed: Transaction % is already approved under operation ID %, cannot overwrite with %.', p_transaction_id, v_tx.gateway_operation_id, TRIM(p_gateway_operation_id);
    END IF;

    IF v_tx.amount_paid IS NOT NULL AND ROUND(v_tx.amount_paid * 100.0)::BIGINT <> v_paid_cents THEN
      RAISE EXCEPTION 'Atomic reconciliation failed: Transaction % is already approved with amount %, cannot update with %.', p_transaction_id, v_tx.amount_paid, p_amount_paid;
    END IF;

  ELSE
    -- Incompatible transaction status (e.g., 'rejected', 'expired', 'refunded', etc.)
    RAISE EXCEPTION 'Atomic reconciliation failed: Transaction % has status %, which is incompatible with standard automatic reconciliation.', p_transaction_id, v_tx.status;
  END IF;

  -- 8. Concurrency-safe duplicate operation check across other payment transactions
  SELECT id INTO v_other_tx_id
  FROM public.payment_transactions
  WHERE gateway_operation_id = TRIM(p_gateway_operation_id)
    AND id <> p_transaction_id
  LIMIT 1;

  IF v_other_tx_id IS NOT NULL THEN
    RAISE EXCEPTION 'Atomic reconciliation failed: Gateway operation ID % is already assigned to another transaction (%).', TRIM(p_gateway_operation_id), v_other_tx_id;
  END IF;

  -- 9. Update booking_requests row
  v_current_notes := v_booking_record.special_notes;
  IF p_special_notes IS NOT NULL AND TRIM(p_special_notes) <> '' THEN
    v_new_notes := p_special_notes;
  ELSE
    v_new_notes := COALESCE(v_current_notes, '');
    IF NOT (v_new_notes LIKE '%[RECONCILED]%') THEN
      v_new_notes := TRIM('[RECONCILED] ' || v_new_notes);
    END IF;
  END IF;

  UPDATE public.booking_requests
  SET
    status = 'fully_confirmed',
    special_notes = v_new_notes,
    updated_at = NOW()
  WHERE booking_reference = v_booking_ref;

  GET DIAGNOSTICS v_booking_updated = ROW_COUNT;

  IF v_booking_updated <> 1 THEN
    RAISE EXCEPTION 'Atomic reconciliation failed: Target booking_requests row % update failed.', v_booking_ref;
  END IF;

  -- 10. Update payment_transactions row
  UPDATE public.payment_transactions
  SET
    status = 'approved',
    gateway_operation_id = TRIM(p_gateway_operation_id),
    amount_paid = p_amount_paid,
    verified_at = COALESCE(p_verified_at, NOW()),
    updated_at = NOW(),
    audit_metadata = COALESCE(p_audit_metadata, audit_metadata)
  WHERE id = p_transaction_id;

  GET DIAGNOSTICS v_payment_updated = ROW_COUNT;

  IF v_payment_updated <> 1 THEN
    RAISE EXCEPTION 'Atomic reconciliation failed: Target payment_transactions row % update failed.', p_transaction_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already_approved', v_already_approved,
    'payment_updated', v_payment_updated,
    'booking_updated', v_booking_updated,
    'transaction_id', p_transaction_id,
    'booking_reference', v_booking_ref,
    'reconciled_at', NOW()
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Restrict execution strictly to service_role
REVOKE EXECUTE ON FUNCTION public.reconcile_payment_and_booking_atomic(UUID, TEXT, TEXT, NUMERIC, TIMESTAMPTZ, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_payment_and_booking_atomic(UUID, TEXT, TEXT, NUMERIC, TIMESTAMPTZ, JSONB, TEXT) TO service_role;
