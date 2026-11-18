-- ==============================================================================
-- GUNA YALA PANAMA TRAVEL — OVERNIGHT QUOTATION 50% DEPOSIT PAYMENT LINKS
-- Migration Date: 2026-11-18
-- Version: 20261118_deposit_payment_links.sql
-- Purpose:
--   1. Allow 'needs_manual_review' and 'cancelled_pending_expiry' in
--      public.payment_transactions.status CHECK constraint.
--   2. Add additive integer-cent audit columns (approved_total_cents,
--      remaining_balance_cents) to public.payment_transactions.
--   3. Enforce DB-level uniqueness of active/approved deposit transactions per
--      approved quotation to prevent duplicate deposit link generation.
--   4. Update public.reconcile_payment_and_booking_atomic(...) so:
--      - Deposit payments (payment_type = 'deposit') transition booking_requests
--        strictly to 'deposit_received' (NEVER 'fully_confirmed'), and accept
--        initial quotation booking statuses ('awaiting_payment', 'quotation_sent',
--        'availability_confirmed', 'request_received', 'pending_payment').
--      - Full/balance payments (e.g. Day Tours) preserve their existing strict
--        'pending_payment' -> 'fully_confirmed' lifecycle transition.
--   5. Provide per-quotation lock helper RPCs backed by admin_live_test_locks.
-- IMPORTANT SAFETY RULE: DO NOT APPLY AUTOMATICALLY WITHOUT REVIEW.
-- ==============================================================================

-- 1. Widen payment_transactions.status CHECK constraint cleanly
ALTER TABLE public.payment_transactions
  DROP CONSTRAINT IF EXISTS payment_transactions_status_check;

ALTER TABLE public.payment_transactions
  ADD CONSTRAINT payment_transactions_status_check CHECK (
    status IN (
      'pending',
      'processing',
      'approved',
      'rejected',
      'expired',
      'refunded',
      'needs_manual_review',
      'cancelled_pending_expiry'
    )
  );

-- 2. Additive integer-cent tracking columns on payment_transactions
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS approved_total_cents BIGINT,
  ADD COLUMN IF NOT EXISTS remaining_balance_cents BIGINT;

COMMENT ON COLUMN public.payment_transactions.approved_total_cents IS
  'Server-verified full approved quotation total in integer cents.';
COMMENT ON COLUMN public.payment_transactions.remaining_balance_cents IS
  'Server-calculated remaining balance due after deposit (approved_total_cents - amount_in_cents) in integer cents.';

-- 3. Prevent duplicate pending, uncertain, or approved 50% deposit links per quotation
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_or_approved_deposit_per_quotation
  ON public.payment_transactions (quotation_id)
  WHERE quotation_id IS NOT NULL
    AND payment_type = 'deposit'
    AND status IN ('pending', 'processing', 'needs_manual_review', 'approved');

-- 4. Update atomic reconciliation RPC to preserve 'deposit_received' for deposits
--    and 'fully_confirmed' for full/balance payments
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
  v_is_deposit BOOLEAN := FALSE;
  v_target_booking_status TEXT := 'fully_confirmed';
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

  v_is_deposit := (COALESCE(v_tx.payment_type, 'full') = 'deposit');
  v_target_booking_status := CASE WHEN v_is_deposit THEN 'deposit_received' ELSE 'fully_confirmed' END;

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

  IF v_tx.amount_in_cents IS NOT NULL AND v_tx.amount_in_cents > 0 THEN
    v_expected_cents := v_tx.amount_in_cents::BIGINT;
  ELSIF v_tx.expected_amount IS NOT NULL AND v_tx.expected_amount > 0 THEN
    v_expected_cents := ROUND(v_tx.expected_amount * 100.0)::BIGINT;
  ELSE
    RAISE EXCEPTION 'Atomic reconciliation failed: Target payment_transactions row % has absent or invalid expected amount.', p_transaction_id;
  END IF;

  IF v_paid_cents <> v_expected_cents THEN
    RAISE EXCEPTION 'Atomic reconciliation failed: Paid amount (% cents) does not match stored expected amount (% cents).', v_paid_cents, v_expected_cents;
  END IF;

  -- 7. Status Transition & Idempotency Rules
  IF v_tx.status IN ('pending', 'processing', 'needs_manual_review') THEN
    v_already_approved := FALSE;

    IF v_is_deposit THEN
      IF v_booking_record.status IS NULL OR v_booking_record.status NOT IN (
        'pending_payment',
        'awaiting_payment',
        'quotation_sent',
        'availability_confirmed',
        'request_received'
      ) THEN
        RAISE EXCEPTION 'Atomic reconciliation failed: Deposit booking_requests row % has incompatible status %.', v_booking_ref, COALESCE(v_booking_record.status, 'NULL');
      END IF;
    ELSE
      IF v_booking_record.status IS NULL OR v_booking_record.status <> 'pending_payment' THEN
        RAISE EXCEPTION 'Atomic reconciliation failed: Associated booking_requests row % has status %, but automatic reconciliation requires status pending_payment.', v_booking_ref, COALESCE(v_booking_record.status, 'NULL');
      END IF;
    END IF;

  ELSIF v_tx.status = 'approved' THEN
    v_already_approved := TRUE;

    IF v_is_deposit THEN
      IF v_booking_record.status IS NULL OR v_booking_record.status NOT IN (
        'pending_payment',
        'awaiting_payment',
        'quotation_sent',
        'availability_confirmed',
        'request_received',
        'deposit_received'
      ) THEN
        RAISE EXCEPTION 'Atomic reconciliation failed: Deposit booking_requests row % has status %, which is incompatible with approved deposit reconciliation.', v_booking_ref, COALESCE(v_booking_record.status, 'NULL');
      END IF;
    ELSE
      IF v_booking_record.status IS NULL OR v_booking_record.status NOT IN ('pending_payment', 'fully_confirmed') THEN
        RAISE EXCEPTION 'Atomic reconciliation failed: Associated booking_requests row % has status %, which is incompatible with approved transaction reconciliation.', v_booking_ref, COALESCE(v_booking_record.status, 'NULL');
      END IF;
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

  -- 9. Update booking_requests row (deposits transition ONLY to deposit_received)
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
    status = v_target_booking_status,
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
    'payment_type', v_tx.payment_type,
    'booking_status', v_target_booking_status,
    'transaction_id', p_transaction_id,
    'booking_reference', v_booking_ref,
    'reconciled_at', NOW()
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reconcile_payment_and_booking_atomic(UUID, TEXT, TEXT, NUMERIC, TIMESTAMPTZ, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_payment_and_booking_atomic(UUID, TEXT, TEXT, NUMERIC, TIMESTAMPTZ, JSONB, TEXT) TO service_role;

-- 5. Per-quotation concurrency lock helper RPCs reusing admin_live_test_locks
CREATE OR REPLACE FUNCTION public.acquire_quotation_deposit_lock(
  p_quotation_id TEXT,
  p_owner_token UUID,
  p_admin_user_id TEXT,
  p_ttl_seconds INT DEFAULT 120
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_quotation_id IS NULL OR TRIM(p_quotation_id) = '' THEN
    RETURN jsonb_build_object('acquired', false, 'reason', 'invalid_quotation_id', 'message', 'Quotation ID is required for deposit lock.');
  END IF;

  RETURN public.acquire_controlled_live_test_lock(
    'QUOTATION_DEPOSIT_' || TRIM(p_quotation_id),
    p_owner_token,
    p_admin_user_id,
    COALESCE(p_ttl_seconds, 120)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_quotation_deposit_lock(
  p_quotation_id TEXT,
  p_owner_token UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_quotation_id IS NULL OR TRIM(p_quotation_id) = '' THEN
    RETURN jsonb_build_object('released', false, 'reason', 'invalid_quotation_id');
  END IF;

  RETURN public.release_controlled_live_test_lock(
    'QUOTATION_DEPOSIT_' || TRIM(p_quotation_id),
    p_owner_token
  );
END;
$$;

REVOKE ALL ON FUNCTION public.acquire_quotation_deposit_lock(TEXT, UUID, TEXT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_quotation_deposit_lock(TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_quotation_deposit_lock(TEXT, UUID, TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_quotation_deposit_lock(TEXT, UUID) TO service_role;
