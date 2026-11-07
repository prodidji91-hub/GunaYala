-- ==============================================================================
-- GUNA YALA PANAMA TRAVEL — PART 25G.2
-- Additive Migration: Explicit Payment Environment Requirement
-- Date: 2026-11-07
-- File: supabase/migrations/20261107_payment_environment.sql
-- Purpose: Add dedicated environment column to public.payment_transactions
--          with NO DEFAULT value, requiring every backend insertion to explicitly
--          specify 'sandbox' or 'production'.
-- IMPORTANT SAFETY RULE: DO NOT EXECUTE IN PRODUCTION UNTIL INSTRUCTED.
-- ==============================================================================

-- 1. Add dedicated environment column with check constraint and NO DEFAULT value
-- Forces backend callers to explicitly declare 'sandbox' or 'production' on every INSERT.
-- Zero records currently exist in public.payment_transactions.
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS environment TEXT NOT NULL
  CHECK (environment IN ('sandbox', 'production'));

-- If a previous draft set a default, explicitly drop it so no implicit fallback can occur
ALTER TABLE public.payment_transactions
  ALTER COLUMN environment DROP DEFAULT;

-- 2. Performance and isolation indexes
-- Index for querying by environment alone
CREATE INDEX IF NOT EXISTS idx_payment_tx_environment
  ON public.payment_transactions(environment);

-- Composite index for querying active / approved transactions within an environment
CREATE INDEX IF NOT EXISTS idx_payment_tx_env_status
  ON public.payment_transactions(environment, status);

-- Composite index for booking lookups scoped by environment
CREATE INDEX IF NOT EXISTS idx_payment_tx_env_booking_ref
  ON public.payment_transactions(environment, booking_reference);

-- 3. Document table isolation semantics
COMMENT ON COLUMN public.payment_transactions.environment IS 
  'Financial boundary isolation: strictly "sandbox" for test/demo operations, "production" for real transactions. Explicitly required on every record.';
