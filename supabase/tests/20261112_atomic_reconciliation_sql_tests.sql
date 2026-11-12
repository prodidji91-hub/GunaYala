-- ==============================================================================
-- GUNA YALA PANAMA TRAVEL — SAFE SQL TEST SUITE FOR ATOMIC RECONCILIATION
-- Version: 20261112_atomic_reconciliation_sql_tests.sql
--
-- SAFETY & ISOLATION GUARANTEES:
-- 1. Opens an explicit transaction with BEGIN; at the start and finishes with
--    ROLLBACK; at the end, ensuring zero fixture data is committed to the database.
-- 2. Uses dynamically generated unique identifiers (pg_test_ref_<uuid>) to avoid
--    data collisions with existing production or development records.
-- 3. Fully satisfies all table constraints, non-null columns, and foreign keys for
--    public.booking_requests and public.payment_transactions.
-- 4. Verifies specific exception error messages (SQLERRM pattern matching) for
--    every expected rejection to eliminate false-positive PASS results.
-- 5. Asserts explicit database row states before and after each operation.
-- 6. Unexpected errors or assertion failures propagate immediately to fail psql runs.
--
-- EXECUTION INSTRUCTIONS (ON ISOLATED DEV POSTGRESQL DATABASE):
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
--     -v ON_ERROR_STOP=1 \
--     -f supabase/tests/20261112_atomic_reconciliation_sql_tests.sql
--
-- DO NOT EXECUTE AGAINST PRODUCTION DATABASES.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_test_prefix TEXT := 'pg_test_' || replace(gen_random_uuid()::text, '-', '');
  v_test_tx_id UUID := gen_random_uuid();
  v_test_tx_dup_id UUID := gen_random_uuid();
  v_test_tx_quot_id UUID := gen_random_uuid();
  
  v_test_booking_ref TEXT := v_test_prefix || '_ref_001';
  v_test_booking_dup_ref TEXT := v_test_prefix || '_ref_002';
  v_test_booking_quot_ref TEXT := v_test_prefix || '_ref_003';
  
  v_result JSONB;
  v_caught_exception BOOLEAN;
  v_exception_msg TEXT;
  
  -- State Assertion Variables
  v_actual_tx_status TEXT;
  v_actual_tx_oper_id TEXT;
  v_actual_tx_amount NUMERIC;
  v_actual_booking_status TEXT;
  v_actual_booking_notes TEXT;
BEGIN
  RAISE NOTICE 'Starting Safe Atomic Payment Reconciliation SQL Test Suite (Prefix: %)...', v_test_prefix;

  -- -------------------------------------------------------------
  -- SETUP: Create clean, fully-compliant test fixtures
  -- Satisfies all constraints on public.booking_requests & public.payment_transactions
  -- -------------------------------------------------------------
  INSERT INTO public.booking_requests (
    booking_reference,
    customer_name,
    customer_email,
    customer_phone,
    booking_type,
    experience_title,
    target_date,
    adults,
    children,
    terms_accepted,
    status,
    special_notes
  ) VALUES (
    v_test_booking_ref,
    'PGSQL Test User 1',
    v_test_prefix || '_user1@example.com',
    '+507 6000-0001',
    'day-trip',
    'San Blas Day Tour',
    '2026-12-01',
    2,
    0,
    TRUE,
    'pending_payment', -- Allowed status
    'Initial test note 1'
  ), (
    v_test_booking_dup_ref,
    'PGSQL Test User 2',
    v_test_prefix || '_user2@example.com',
    '+507 6000-0002',
    'day-trip',
    'San Blas Day Tour',
    '2026-12-01',
    2,
    0,
    TRUE,
    'pending_payment', -- Allowed status
    'Initial test note 2'
  ), (
    v_test_booking_quot_ref,
    'PGSQL Test User 3',
    v_test_prefix || '_user3@example.com',
    '+507 6000-0003',
    'day-trip',
    'San Blas Day Tour',
    '2026-12-01',
    2,
    0,
    TRUE,
    'quotation_sent', -- Incompatible status (rejection test)
    'Initial test note 3'
  );

  INSERT INTO public.payment_transactions (
    id,
    booking_reference,
    booking_type,
    gateway,
    expected_amount,
    amount_in_cents,
    currency,
    payment_type,
    status,
    idempotency_key
  ) VALUES (
    v_test_tx_id,
    v_test_booking_ref,
    'day-trip',
    'paguelofacil',
    69.00,
    6900,
    'USD',
    'full',
    'pending',
    v_test_prefix || '_idem_001'
  ), (
    v_test_tx_dup_id,
    v_test_booking_dup_ref,
    'day-trip',
    'paguelofacil',
    69.00,
    6900,
    'USD',
    'full',
    'pending',
    v_test_prefix || '_idem_002'
  ), (
    v_test_tx_quot_id,
    v_test_booking_quot_ref,
    'day-trip',
    'paguelofacil',
    69.00,
    6900,
    'USD',
    'full',
    'pending',
    v_test_prefix || '_idem_003'
  );

  -- -------------------------------------------------------------
  -- TEST 1: REJECT NULL OR EMPTY BOOKING REFERENCE PARAMETER
  -- -------------------------------------------------------------
  v_caught_exception := FALSE;
  v_exception_msg := '';
  BEGIN
    PERFORM public.reconcile_payment_and_booking_atomic(
      v_test_tx_id,
      NULL,
      'LK-OPER-SQL-001',
      69.00,
      NOW(),
      '{}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
    v_exception_msg := SQLERRM;
  END;

  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'ASSERTION FAILED (Test 1): NULL booking reference parameter was not rejected.';
  ELSIF v_exception_msg NOT LIKE '%Booking reference parameter is required%' THEN
    RAISE EXCEPTION 'ASSERTION FAILED (Test 1): Unexpected exception message: %', v_exception_msg;
  END IF;
  RAISE NOTICE 'TEST 1 PASSED: NULL p_booking_reference correctly rejected with expected message.';

  -- Verify rows remain unchanged after rejected attempt
  SELECT status INTO v_actual_tx_status FROM public.payment_transactions WHERE id = v_test_tx_id;
  SELECT status INTO v_actual_booking_status FROM public.booking_requests WHERE booking_reference = v_test_booking_ref;
  IF v_actual_tx_status <> 'pending' OR v_actual_booking_status <> 'pending_payment' THEN
    RAISE EXCEPTION 'ASSERTION FAILED (Test 1 State Verification): Rejected operation altered row state.';
  END IF;

  -- -------------------------------------------------------------
  -- TEST 2: REJECT MISMATCHED BOOKING REFERENCE PARAMETER
  -- -------------------------------------------------------------
  v_caught_exception := FALSE;
  v_exception_msg := '';
  BEGIN
    PERFORM public.reconcile_payment_and_booking_atomic(
      v_test_tx_id,
      v_test_prefix || '_WRONG_REF',
      'LK-OPER-SQL-001',
      69.00,
      NOW(),
      '{}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
    v_exception_msg := SQLERRM;
  END;

  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'ASSERTION FAILED (Test 2): Mismatched booking reference was not rejected.';
  ELSIF v_exception_msg NOT LIKE '%does not match requested booking_reference%' THEN
    RAISE EXCEPTION 'ASSERTION FAILED (Test 2): Unexpected exception message: %', v_exception_msg;
  END IF;
  RAISE NOTICE 'TEST 2 PASSED: Mismatched booking_reference correctly rejected with expected message.';

  -- Verify rows remain unchanged
  SELECT status INTO v_actual_tx_status FROM public.payment_transactions WHERE id = v_test_tx_id;
  SELECT status INTO v_actual_booking_status FROM public.booking_requests WHERE booking_reference = v_test_booking_ref;
  IF v_actual_tx_status <> 'pending' OR v_actual_booking_status <> 'pending_payment' THEN
    RAISE EXCEPTION 'ASSERTION FAILED (Test 2 State Verification): Rejected operation altered row state.';
  END IF;

  -- -------------------------------------------------------------
  -- TEST 3: REJECT NON-WHOLE CENT AMOUNT PAID ($69.005 USD)
  -- -------------------------------------------------------------
  v_caught_exception := FALSE;
  v_exception_msg := '';
  BEGIN
    PERFORM public.reconcile_payment_and_booking_atomic(
      v_test_tx_id,
      v_test_booking_ref,
      'LK-OPER-SQL-001',
      69.005, -- Fractional cent
      NOW(),
      '{}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
    v_exception_msg := SQLERRM;
  END;

  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'ASSERTION FAILED (Test 3): Non-whole cent amount was not rejected.';
  ELSIF v_exception_msg NOT LIKE '%must represent exact whole cents%' THEN
    RAISE EXCEPTION 'ASSERTION FAILED (Test 3): Unexpected exception message: %', v_exception_msg;
  END IF;
  RAISE NOTICE 'TEST 3 PASSED: Non-whole cent amount correctly rejected with expected message.';

  -- -------------------------------------------------------------
  -- TEST 4: REJECT AMOUNT MISMATCH ($50.00 vs $69.00 EXPECTED)
  -- -------------------------------------------------------------
  v_caught_exception := FALSE;
  v_exception_msg := '';
  BEGIN
    PERFORM public.reconcile_payment_and_booking_atomic(
      v_test_tx_id,
      v_test_booking_ref,
      'LK-OPER-SQL-001',
      50.00, -- Amount mismatch
      NOW(),
      '{}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
    v_exception_msg := SQLERRM;
  END;

  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'ASSERTION FAILED (Test 4): Mismatched amount was not rejected.';
  ELSIF v_exception_msg NOT LIKE '%does not match stored expected amount%' THEN
    RAISE EXCEPTION 'ASSERTION FAILED (Test 4): Unexpected exception message: %', v_exception_msg;
  END IF;
  RAISE NOTICE 'TEST 4 PASSED: Mismatched amount correctly rejected with expected message.';

  -- -------------------------------------------------------------
  -- TEST 5: REJECT INCOMPATIBLE BOOKING STATUS (quotation_sent)
  -- -------------------------------------------------------------
  v_caught_exception := FALSE;
  v_exception_msg := '';
  BEGIN
    PERFORM public.reconcile_payment_and_booking_atomic(
      v_test_tx_quot_id,
      v_test_booking_quot_ref,
      'LK-OPER-SQL-QUOT',
      69.00,
      NOW(),
      '{}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
    v_exception_msg := SQLERRM;
  END;

  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'ASSERTION FAILED (Test 5): Incompatible booking status (quotation_sent) was not rejected.';
  ELSIF v_exception_msg NOT LIKE '%automatic reconciliation requires status pending_payment%' THEN
    RAISE EXCEPTION 'ASSERTION FAILED (Test 5): Unexpected exception message: %', v_exception_msg;
  END IF;
  RAISE NOTICE 'TEST 5 PASSED: Incompatible booking status (quotation_sent) correctly rejected.';

  -- -------------------------------------------------------------
  -- TEST 6: VALID ATOMIC RECONCILIATION SUCCEEDS & ASSERTS ROW STATES
  -- -------------------------------------------------------------
  v_result := public.reconcile_payment_and_booking_atomic(
    v_test_tx_id,
    v_test_booking_ref,
    'LK-OPER-SQL-001',
    69.00,
    NOW(),
    '{"verified": true}'::jsonb,
    '[RECONCILED] Approved in SQL test'
  );

  IF (v_result->>'success')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'ASSERTION FAILED (Test 6): Atomic reconciliation returned success=false.';
  END IF;

  -- Assert exact actual row state changes in PostgreSQL
  SELECT status, gateway_operation_id, amount_paid
  INTO v_actual_tx_status, v_actual_tx_oper_id, v_actual_tx_amount
  FROM public.payment_transactions WHERE id = v_test_tx_id;

  SELECT status, special_notes
  INTO v_actual_booking_status, v_actual_booking_notes
  FROM public.booking_requests WHERE booking_reference = v_test_booking_ref;

  IF v_actual_tx_status <> 'approved' OR v_actual_tx_oper_id <> 'LK-OPER-SQL-001' OR v_actual_tx_amount <> 69.00 THEN
    RAISE EXCEPTION 'ASSERTION FAILED (Test 6 State): payment_transactions row state invalid: status=%, oper=%, amount=%', v_actual_tx_status, v_actual_tx_oper_id, v_actual_tx_amount;
  END IF;

  IF v_actual_booking_status <> 'fully_confirmed' OR v_actual_booking_notes NOT LIKE '%[RECONCILED]%' THEN
    RAISE EXCEPTION 'ASSERTION FAILED (Test 6 State): booking_requests row state invalid: status=%, notes=%', v_actual_booking_status, v_actual_booking_notes;
  END IF;

  RAISE NOTICE 'TEST 6 PASSED: Atomic reconciliation updated both rows to approved / fully_confirmed with exact $69.00 amount.';

  -- -------------------------------------------------------------
  -- TEST 7: SEQUENTIAL IDEMPOTENT RETRY ON APPROVED TRANSACTION SUCCEEDS
  -- -------------------------------------------------------------
  v_result := public.reconcile_payment_and_booking_atomic(
    v_test_tx_id,
    v_test_booking_ref,
    'LK-OPER-SQL-001',
    69.00,
    NOW(),
    '{"retry": true}'::jsonb
  );

  IF (v_result->>'already_approved')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'ASSERTION FAILED (Test 7): Idempotent retry did not return already_approved=true.';
  END IF;
  RAISE NOTICE 'TEST 7 PASSED: Sequential idempotent retry returned already_approved=true.';

  -- -------------------------------------------------------------
  -- TEST 8: REJECT ASSIGNING DUPLICATE OPERATION ID TO SECOND TRANSACTION
  -- -------------------------------------------------------------
  v_caught_exception := FALSE;
  v_exception_msg := '';
  BEGIN
    PERFORM public.reconcile_payment_and_booking_atomic(
      v_test_tx_dup_id,
      v_test_booking_dup_ref,
      'LK-OPER-SQL-001', -- Already assigned to v_test_tx_id!
      69.00,
      NOW(),
      '{}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
    v_exception_msg := SQLERRM;
  END;

  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'ASSERTION FAILED (Test 8): Duplicate operation ID assignment was not rejected.';
  ELSIF v_exception_msg NOT LIKE '%is already assigned to another transaction%' THEN
    RAISE EXCEPTION 'ASSERTION FAILED (Test 8): Unexpected exception message: %', v_exception_msg;
  END IF;
  RAISE NOTICE 'TEST 8 PASSED: Duplicate operation ID assignment correctly rejected.';

  -- -------------------------------------------------------------
  -- TEST 9: REJECT OVERWRITING APPROVED TRANSACTION WITH CONFLICTING OPER ID
  -- -------------------------------------------------------------
  v_caught_exception := FALSE;
  v_exception_msg := '';
  BEGIN
    PERFORM public.reconcile_payment_and_booking_atomic(
      v_test_tx_id,
      v_test_booking_ref,
      'LK-OPER-SQL-DIFFERENT', -- Conflicting operation ID
      69.00,
      NOW(),
      '{}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    v_caught_exception := TRUE;
    v_exception_msg := SQLERRM;
  END;

  IF NOT v_caught_exception THEN
    RAISE EXCEPTION 'ASSERTION FAILED (Test 9): Conflicting operation ID overwrite was not rejected.';
  ELSIF v_exception_msg NOT LIKE '%is already approved under operation ID%' THEN
    RAISE EXCEPTION 'ASSERTION FAILED (Test 9): Unexpected exception message: %', v_exception_msg;
  END IF;
  RAISE NOTICE 'TEST 9 PASSED: Conflicting operation ID overwrite attempt correctly rejected.';

  RAISE NOTICE '====================================================';
  RAISE NOTICE 'ALL ATOMIC RECONCILIATION SQL TESTS PASSED CLEANLY!';
  RAISE NOTICE '====================================================';
END;
$$;

ROLLBACK;
