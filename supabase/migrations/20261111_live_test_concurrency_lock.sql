-- ==============================================================================
-- GUNA YALA PANAMA TRAVEL — CONTROLLED LIVE TEST CONCURRENCY LOCK MIGRATION
-- Migration Date: 2026-11-11
-- Version: 20261111_live_test_concurrency_lock.sql
-- Purpose: Dedicated PostgreSQL lock table & atomic PL/pgSQL RPCs for live test creation
-- ==============================================================================

-- 1. Dedicated admin_live_test_locks Table
CREATE TABLE IF NOT EXISTS public.admin_live_test_locks (
  lock_name TEXT PRIMARY KEY,
  owner_token UUID NOT NULL,
  admin_user_id TEXT NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for lock expiration queries
CREATE INDEX IF NOT EXISTS idx_admin_live_test_locks_expires 
  ON public.admin_live_test_locks(expires_at);

-- Row Level Security (RLS) Configuration
ALTER TABLE public.admin_live_test_locks ENABLE ROW LEVEL SECURITY;

-- Policy for service_role access (Netlify Functions)
CREATE POLICY "Service role full access on admin_live_test_locks"
  ON public.admin_live_test_locks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Revoke default public/anon/authenticated access and grant strictly to service_role
REVOKE ALL ON public.admin_live_test_locks FROM anon, public, authenticated;
GRANT ALL ON public.admin_live_test_locks TO service_role;

-- 2. Atomic Lock Acquisition PL/pgSQL Function (RPC)
-- Race-free initial lock creation & atomic expiration update with safe search_path
CREATE OR REPLACE FUNCTION public.acquire_controlled_live_test_lock(
  p_lock_name TEXT,
  p_owner_token UUID,
  p_admin_user_id TEXT,
  p_ttl_seconds INT DEFAULT 300
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_expires_at TIMESTAMPTZ := v_now + (p_ttl_seconds || ' seconds')::INTERVAL;
  v_current_owner UUID;
BEGIN
  -- Race-free atomic upsert:
  -- Inserts new lock if non-existent, or updates expired lock (expires_at <= v_now)
  INSERT INTO public.admin_live_test_locks (
    lock_name,
    owner_token,
    admin_user_id,
    locked_at,
    expires_at
  ) VALUES (
    p_lock_name,
    p_owner_token,
    p_admin_user_id,
    v_now,
    v_expires_at
  )
  ON CONFLICT (lock_name) DO UPDATE
    SET owner_token = EXCLUDED.owner_token,
        admin_user_id = EXCLUDED.admin_user_id,
        locked_at = EXCLUDED.locked_at,
        expires_at = EXCLUDED.expires_at
    WHERE admin_live_test_locks.expires_at <= v_now;

  -- Read current lock owner atomically
  SELECT owner_token INTO v_current_owner
  FROM public.admin_live_test_locks
  WHERE lock_name = p_lock_name;

  IF v_current_owner = p_owner_token THEN
    RETURN jsonb_build_object(
      'acquired', true,
      'owner_token', p_owner_token,
      'expires_at', v_expires_at
    );
  ELSE
    RETURN jsonb_build_object(
      'acquired', false,
      'reason', 'locked',
      'current_owner', v_current_owner,
      'message', 'A controlled live test creation request is currently in progress across function instances. Please wait.'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'acquired', false,
    'reason', 'error',
    'message', SQLERRM
  );
END;
$$;

-- 3. Atomic Ownership-Aware Lock Release PL/pgSQL Function (RPC)
CREATE OR REPLACE FUNCTION public.release_controlled_live_test_lock(
  p_lock_name TEXT,
  p_owner_token UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM public.admin_live_test_locks
  WHERE lock_name = p_lock_name
    AND owner_token = p_owner_token;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted > 0 THEN
    RETURN jsonb_build_object('released', true);
  ELSE
    RETURN jsonb_build_object(
      'released', false,
      'reason', 'owner_mismatch_or_not_found',
      'message', 'Lock was not released because owner_token did not match active lock owner.'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'released', false,
    'reason', 'error',
    'message', SQLERRM
  );
END;
$$;

-- Revoke EXECUTE permissions from PUBLIC, anon, and authenticated
REVOKE ALL ON FUNCTION public.acquire_controlled_live_test_lock(TEXT, UUID, TEXT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_controlled_live_test_lock(TEXT, UUID) FROM PUBLIC, anon, authenticated;

-- Grant EXECUTE permissions strictly to service_role (Netlify Functions backend)
GRANT EXECUTE ON FUNCTION public.acquire_controlled_live_test_lock(TEXT, UUID, TEXT, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_controlled_live_test_lock(TEXT, UUID) TO service_role;
