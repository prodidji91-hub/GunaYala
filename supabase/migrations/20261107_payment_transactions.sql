-- ==============================================================================
-- GUNA YALA PANAMA TRAVEL — PART 25B PREPARATION MIGRATION
-- Migration Date: 2026-11-07
-- Version: 20261107_payment_transactions.sql
-- Purpose: Additive Payment Transaction Ledger for PagueloFacil Integration
-- IMPORTANT SAFETY RULE: DO NOT EXECUTE IN PRODUCTION UNTIL PETRA CONFIRMS
--                        MERCHANT CREDENTIALS AND LIVE PROCESSING RULES.
-- ==============================================================================

-- 1. Create Dedicated payment_transactions Table
-- Linked to existing booking_requests (via booking_reference) and quotations (via id as TEXT)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key Relationships (Strictly matches existing schema)
  -- booking_requests.booking_reference is TEXT UNIQUE
  booking_reference TEXT NOT NULL REFERENCES public.booking_requests(booking_reference) ON DELETE RESTRICT,
  
  -- quotations.id in public.quotations is TEXT (e.g. 'quote-1727448...', 'demo-quote-002')
  quotation_id TEXT REFERENCES public.quotations(id) ON DELETE SET NULL,
  
  -- Booking experience type
  booking_type TEXT NOT NULL CHECK (booking_type IN ('overnight', 'day-trip', 'private-charter')),
  
  -- Payment gateway & identification
  gateway TEXT NOT NULL DEFAULT 'paguelofacil',
  gateway_operation_id TEXT UNIQUE, -- PagueloFacil Oper / codOper (e.g., 'AUTH_CAP-XXXXXX')
  gateway_link_code TEXT,           -- Checkout link identifier (code parameter)
  payment_url TEXT,                 -- Secure hosted checkout URL
  
  -- Financial amounts (Server-Authoritative in USD)
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
  expected_amount NUMERIC(10, 2) NOT NULL CHECK (expected_amount >= 1.00),
  amount_paid NUMERIC(10, 2),
  
  -- Payment purpose
  payment_type TEXT NOT NULL CHECK (payment_type IN ('deposit', 'full', 'balance')),
  
  -- Lifecycle Status
  -- Strictly controls state transitions; customers cannot manipulate this directly
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',     -- Payment link generated, awaiting customer checkout
      'processing',  -- Customer redirected / 3DS in flight
      'approved',    -- Gateway verified approved transaction
      'rejected',    -- Declined by issuing bank / fraud filter
      'expired',     -- Payment window expired before completion
      'refunded'     -- Administrative refund processed
    )
  ),
  
  -- Card brand & authorization code (NEVER store raw card numbers or CVVs)
  card_type TEXT,                   -- 'VISA', 'MASTERCARD', 'CLAVE', etc.
  auth_code TEXT,                   -- Network approval auth code
  error_code TEXT,                  -- Gateway error code on failure
  error_message TEXT,               -- Gateway error message on failure
  
  -- Concurrency, Idempotency & Expiration
  idempotency_key TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  
  -- Safe Audit Metadata (Strictly NO PAN, CVV, or Gateway Secret Keys)
  audit_metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Audit timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Performance & Idempotency Indexes
CREATE INDEX IF NOT EXISTS idx_payment_tx_booking_ref 
  ON public.payment_transactions(booking_reference);

CREATE INDEX IF NOT EXISTS idx_payment_tx_quotation_id 
  ON public.payment_transactions(quotation_id) 
  WHERE quotation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_tx_oper_id 
  ON public.payment_transactions(gateway_operation_id) 
  WHERE gateway_operation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_tx_status 
  ON public.payment_transactions(status);

CREATE INDEX IF NOT EXISTS idx_payment_tx_idempotency 
  ON public.payment_transactions(idempotency_key);

-- 3. Row-Level Security (RLS) Configuration
-- Financial Authoritative Ledger: Strictly read-only for administrators.
-- All mutations (INSERT, UPDATE, DELETE) are restricted exclusively to trusted service_role backend operations.
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated quotation administrators have READ-ONLY visibility
-- Uses the actual system security function: public.is_quotation_admin()
CREATE POLICY "Admins can view payment transactions"
  ON public.payment_transactions
  FOR SELECT
  TO authenticated
  USING (public.is_quotation_admin());

-- Policy 2: Service Role (Netlify Functions backend) has full operational access
CREATE POLICY "Service role full access on payment transactions"
  ON public.payment_transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Explicitly revoke all default and existing permissions from public, anon, and authenticated
REVOKE ALL ON public.payment_transactions FROM anon, public, authenticated;

-- Grant strictly READ-ONLY (SELECT) permission to authenticated users (evaluated via RLS Policy 1)
GRANT SELECT ON public.payment_transactions TO authenticated;

-- Grant operational permissions exclusively to service_role backend
GRANT ALL ON public.payment_transactions TO service_role;

-- 4. Automatic Timestamp Update Trigger
CREATE OR REPLACE FUNCTION public.update_payment_transaction_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_transaction_updated ON public.payment_transactions;
CREATE TRIGGER trg_payment_transaction_updated
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_transaction_timestamp();
