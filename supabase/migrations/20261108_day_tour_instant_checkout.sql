-- ==============================================================================
-- GUNA YALA PANAMA TRAVEL — DAY TOUR INSTANT CHECKOUT MIGRATION
-- Migration Date: 2026-11-08
-- File: supabase/migrations/20261108_day_tour_instant_checkout.sql
-- Purpose: Support Day Tour "Book & Pay Now" flow:
--          1. Add integer cents storage to payment_transactions (amount_in_cents)
--          2. Ensure public.booking_requests status supports 'pending_payment'
-- IMPORTANT SAFETY RULE: DO NOT EXECUTE IN PRODUCTION UNTIL INSTRUCTED.
-- ==============================================================================

-- 1. Add integer cents column to payment_transactions
-- Ensures monetary values are preserved without floating point precision issues
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS amount_in_cents INTEGER;

-- 2. Index on amount_in_cents for financial auditing
CREATE INDEX IF NOT EXISTS idx_payment_tx_amount_in_cents
  ON public.payment_transactions(amount_in_cents);

-- 3. Ensure booking_requests status constraint allows 'pending_payment'
-- Preserves all existing valid lifecycle statuses
ALTER TABLE public.booking_requests
  DROP CONSTRAINT IF EXISTS booking_requests_status_check;

ALTER TABLE public.booking_requests
  ADD CONSTRAINT booking_requests_status_check CHECK (
    status IN (
      'request_received',
      'availability_under_review',
      'availability_confirmed',
      'quotation_sent',
      'awaiting_payment',
      'pending_payment',
      'deposit_received',
      'balance_received',
      'fully_confirmed',
      'cancelled',
      'unavailable'
    )
  );

-- 4. Document column intent
COMMENT ON COLUMN public.payment_transactions.amount_in_cents IS
  'Server-calculated authoritative amount stored in integer cents (e.g. 29000 = $290.00 USD).';
