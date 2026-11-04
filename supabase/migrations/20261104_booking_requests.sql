-- ==============================================================================
-- GUNA YALA PANAMA TRAVEL — PHASE 1 BOOKING DATABASE & SECURITY MIGRATION
-- Migration Date: 2026-11-04
-- Version: 20261104_booking_requests.sql (CRM Constraint Compatibility & Full Idempotency Fingerprint)
-- ==============================================================================

-- 1. Safe Case-Insensitive Unique Index for Nonblank Customer Emails in crm_customers
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_customers_lower_email 
  ON public.crm_customers (LOWER(TRIM(email))) 
  WHERE email IS NOT NULL AND TRIM(email) <> '';

-- 2. Additive Columns for crm_inquiries table (Preserves historical data)
ALTER TABLE public.crm_inquiries 
  ADD COLUMN IF NOT EXISTS booking_reference TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'overnight',
  ADD COLUMN IF NOT EXISTS accommodation_preference TEXT,
  ADD COLUMN IF NOT EXISTS pickup_location TEXT,
  ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS terms_version TEXT DEFAULT '2026-10-18',
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS special_notes TEXT;

-- 3. Dedicated booking_requests table with unified status model & idempotency
CREATE TABLE IF NOT EXISTS public.booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference TEXT UNIQUE NOT NULL,
  idempotency_key TEXT UNIQUE,
  request_hash TEXT,
  booking_type TEXT NOT NULL CHECK (booking_type IN ('overnight', 'day-trip', 'private-charter')),
  customer_id UUID REFERENCES public.crm_customers(id) ON DELETE SET NULL,
  inquiry_id UUID REFERENCES public.crm_inquiries(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  experience_id TEXT,
  experience_title TEXT NOT NULL,
  target_date TEXT NOT NULL,
  departure_date TEXT,
  nights TEXT,
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER NOT NULL DEFAULT 0,
  accommodation_preference TEXT,
  pickup_location TEXT,
  special_notes TEXT,
  terms_accepted BOOLEAN NOT NULL DEFAULT FALSE, -- Must be explicitly TRUE on submission
  terms_version TEXT DEFAULT '2026-10-18',
  terms_accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  customer_language TEXT DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'request_received' CHECK (
    status IN (
      'request_received',
      'availability_under_review',
      'availability_confirmed',
      'quotation_sent',
      'awaiting_payment',
      'deposit_received',
      'balance_received',
      'fully_confirmed',
      'cancelled',
      'unavailable'
    )
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_booking_requests_ref ON public.booking_requests(booking_reference);
CREATE INDEX IF NOT EXISTS idx_booking_requests_idem ON public.booking_requests(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_booking_requests_email ON public.booking_requests(customer_email);
CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON public.booking_requests(status);

-- 4. Dedicated email_logs table with audit status model
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference TEXT REFERENCES public.booking_requests(booking_reference) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_role TEXT NOT NULL CHECK (recipient_role IN ('customer', 'petra')),
  email_type TEXT NOT NULL CHECK (email_type IN ('customer_acknowledgement', 'petra_notification')),
  subject TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    delivery_status IN ('pending', 'sending', 'accepted', 'delivered', 'failed')
  ),
  provider_message_id TEXT,
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_ref ON public.email_logs(booking_reference);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(delivery_status);

-- 5. Helper Function: Verify Administrator Status via quotation_admins table
CREATE OR REPLACE FUNCTION public.is_quotation_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.quotation_admins 
    WHERE user_id = auth.uid()
  );
$$;

-- Restrict execution permissions on admin helper
REVOKE EXECUTE ON FUNCTION public.is_quotation_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_quotation_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_quotation_admin() TO service_role;

-- 6. Transactional Atomic Postgres Function (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.create_booking_request_transaction(
  p_idempotency_key TEXT,
  p_booking_reference TEXT,
  p_booking_type TEXT,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_experience_title TEXT,
  p_target_date TEXT,
  p_departure_date TEXT,
  p_nights TEXT,
  p_adults INTEGER,
  p_children INTEGER,
  p_accommodation_preference TEXT,
  p_pickup_location TEXT,
  p_special_notes TEXT,
  p_terms_accepted BOOLEAN,
  p_terms_version TEXT,
  p_customer_language TEXT,
  p_customer_subject TEXT,
  p_petra_subject TEXT,
  p_petra_email TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_existing_ref TEXT;
  v_existing_hash TEXT;
  v_request_hash TEXT;
  v_customer_id UUID;
  v_inquiry_id UUID;
  v_booking_id UUID;
  v_norm_email TEXT;
  v_arrival_date DATE;
  v_departure_date DATE;
  v_travelers_count INTEGER;
BEGIN
  -- 0. Explicit Terms & Conditions Acceptance Gate
  IF p_terms_accepted IS NOT TRUE THEN
    RAISE EXCEPTION 'Terms & Conditions acceptance is required.';
  END IF;

  v_norm_email := LOWER(TRIM(p_customer_email));
  v_travelers_count := COALESCE(p_adults, 1) + COALESCE(p_children, 0);

  -- CRM Constraint Check: crm_valid_travelers
  IF v_travelers_count <= 0 THEN
    RAISE EXCEPTION 'Travelers count (adults + children) must be greater than zero.';
  END IF;

  -- Safe Date Conversions
  IF p_target_date IS NOT NULL AND TRIM(p_target_date) <> '' THEN
    BEGIN
      v_arrival_date := TRIM(p_target_date)::DATE;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Invalid target_date format: %', p_target_date;
    END;
  ELSE
    v_arrival_date := NULL;
  END IF;

  IF p_departure_date IS NOT NULL AND TRIM(p_departure_date) <> '' THEN
    BEGIN
      v_departure_date := TRIM(p_departure_date)::DATE;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'Invalid departure_date format: %', p_departure_date;
    END;
  ELSE
    v_departure_date := NULL;
  END IF;

  -- CRM Constraint Check: crm_valid_dates
  IF v_arrival_date IS NOT NULL AND v_departure_date IS NOT NULL AND v_departure_date < v_arrival_date THEN
    RAISE EXCEPTION 'Departure date (%) cannot be earlier than arrival date (%).', v_departure_date, v_arrival_date;
  END IF;

  -- Compute Canonical Request Fingerprint covering all meaningful payload details
  v_request_hash := md5(
    LOWER(TRIM(p_customer_name)) || '|' ||
    v_norm_email || '|' ||
    TRIM(p_customer_phone) || '|' ||
    p_booking_type || '|' ||
    TRIM(p_experience_title) || '|' ||
    COALESCE(TRIM(p_target_date), '') || '|' ||
    COALESCE(TRIM(p_departure_date), '') || '|' ||
    COALESCE(TRIM(p_nights), '') || '|' ||
    p_adults::text || '|' ||
    p_children::text || '|' ||
    LOWER(TRIM(COALESCE(p_accommodation_preference, ''))) || '|' ||
    LOWER(TRIM(COALESCE(p_pickup_location, ''))) || '|' ||
    LOWER(TRIM(COALESCE(p_special_notes, ''))) || '|' ||
    p_customer_language || '|' ||
    p_terms_version
  );

  -- 1. Pre-execution Idempotency & Payload Fingerprint Verification
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT booking_reference, request_hash 
    INTO v_existing_ref, v_existing_hash
    FROM public.booking_requests
    WHERE idempotency_key = p_idempotency_key;

    IF v_existing_ref IS NOT NULL THEN
      -- Reject if same idempotency key was retransmitted with conflicting booking details
      IF v_existing_hash IS NOT NULL AND v_existing_hash <> v_request_hash THEN
        RAISE EXCEPTION 'Idempotency key reuse error: key was previously used for a different booking request.';
      END IF;

      RETURN jsonb_build_object(
        'success', true,
        'booking_reference', v_existing_ref,
        'idempotent_replay', true,
        'message', 'Idempotent replay: booking request already processed.'
      );
    END IF;
  END IF;

  -- 2. Customer Lookup or Safe Insert (Normalized email matching)
  SELECT id INTO v_customer_id
  FROM public.crm_customers
  WHERE LOWER(TRIM(email)) = v_norm_email
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    BEGIN
      INSERT INTO public.crm_customers (full_name, email, whatsapp)
      VALUES (p_customer_name, v_norm_email, p_customer_phone)
      RETURNING id INTO v_customer_id;
    EXCEPTION WHEN unique_violation THEN
      SELECT id INTO v_customer_id
      FROM public.crm_customers
      WHERE LOWER(TRIM(email)) = v_norm_email
      ORDER BY created_at ASC
      LIMIT 1;
    END;
  END IF;

  -- 3. Primary Booking Request Insertion FIRST
  -- (Acquires idempotency constraint lock before writing crm_inquiries or email_logs)
  INSERT INTO public.booking_requests (
    booking_reference,
    idempotency_key,
    request_hash,
    booking_type,
    customer_id,
    customer_name,
    customer_email,
    customer_phone,
    experience_title,
    target_date,
    departure_date,
    nights,
    adults,
    children,
    accommodation_preference,
    pickup_location,
    special_notes,
    terms_accepted,
    terms_version,
    terms_accepted_at,
    customer_language,
    status
  ) VALUES (
    p_booking_reference,
    p_idempotency_key,
    v_request_hash,
    p_booking_type,
    v_customer_id,
    p_customer_name,
    v_norm_email,
    p_customer_phone,
    p_experience_title,
    p_target_date,
    p_departure_date,
    p_nights,
    p_adults,
    p_children,
    p_accommodation_preference,
    p_pickup_location,
    p_special_notes,
    p_terms_accepted,
    p_terms_version,
    NOW(),
    p_customer_language,
    'request_received'
  ) RETURNING id INTO v_booking_id;

  -- 4. CRM Inquiry Insertion (Strictly uses CRM crm_valid_status 'New Inquiry')
  INSERT INTO public.crm_inquiries (
    customer_id,
    experience_interest,
    arrival_date,
    departure_date,
    travelers_count,
    inquiry_source,
    pipeline_status,
    internal_notes,
    booking_reference,
    booking_type,
    accommodation_preference,
    pickup_location,
    terms_accepted,
    terms_version,
    terms_accepted_at,
    customer_language,
    special_notes
  ) VALUES (
    v_customer_id,
    p_experience_title,
    v_arrival_date,
    v_departure_date,
    v_travelers_count,
    'Website Booking Request',
    'New Inquiry',
    'Ref: ' || p_booking_reference || '. Type: ' || p_booking_type || '. Pickup: ' || COALESCE(p_pickup_location, 'N/A'),
    p_booking_reference,
    p_booking_type,
    p_accommodation_preference,
    p_pickup_location,
    p_terms_accepted,
    p_terms_version,
    NOW(),
    p_customer_language,
    p_special_notes
  ) RETURNING id INTO v_inquiry_id;

  -- Link inquiry ID back to primary request
  UPDATE public.booking_requests
  SET inquiry_id = v_inquiry_id
  WHERE id = v_booking_id;

  -- 5. Tracked Email Audit Logs (Initial status 'pending')
  INSERT INTO public.email_logs (
    booking_reference,
    recipient_email,
    recipient_role,
    email_type,
    subject,
    delivery_status
  ) VALUES 
  (
    p_booking_reference,
    v_norm_email,
    'customer',
    'customer_acknowledgement',
    p_customer_subject,
    'pending'
  ),
  (
    p_booking_reference,
    p_petra_email,
    'petra',
    'petra_notification',
    p_petra_subject,
    'pending'
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_reference', p_booking_reference,
    'idempotent_replay', false,
    'message', 'Booking request created successfully within atomic transaction.'
  );
END;
$$;

-- Restrict EXECUTE privileges on transaction function strictly to service_role
REVOKE EXECUTE ON FUNCTION public.create_booking_request_transaction FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_booking_request_transaction FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_booking_request_transaction FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_request_transaction TO service_role;

-- 7. Row Level Security (RLS) & Access Control Restrictions

ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Revoke direct permissions from public/anonymous users
REVOKE ALL ON public.booking_requests FROM anon, public;
REVOKE ALL ON public.email_logs FROM anon, public;

-- Drop legacy open policies if present
DROP POLICY IF EXISTS "Allow public booking request submissions" ON public.booking_requests;
DROP POLICY IF EXISTS "Allow public email log insertions" ON public.email_logs;
DROP POLICY IF EXISTS "Allow admin full access to booking requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Allow admin view email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Deny anonymous access to booking_requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Deny anonymous access to email_logs" ON public.email_logs;
DROP POLICY IF EXISTS "Allow authenticated admins to read booking_requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Allow authenticated admins to update booking_requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Allow authenticated admins to delete booking_requests" ON public.booking_requests;
DROP POLICY IF EXISTS "Allow authenticated admins to read email_logs" ON public.email_logs;

-- Strict Policy: Anonymous users cannot read, insert, or update booking requests directly
CREATE POLICY "Deny anonymous access to booking_requests" 
  ON public.booking_requests FOR ALL 
  TO anon 
  USING (false);

CREATE POLICY "Deny anonymous access to email_logs" 
  ON public.email_logs FOR ALL 
  TO anon 
  USING (false);

-- Verified Administrator Policies (Restricted to quotation_admins members)
CREATE POLICY "Allow authenticated admins to read booking_requests" 
  ON public.booking_requests FOR SELECT 
  TO authenticated 
  USING (public.is_quotation_admin());

CREATE POLICY "Allow authenticated admins to update booking_requests" 
  ON public.booking_requests FOR UPDATE 
  TO authenticated 
  USING (public.is_quotation_admin())
  WITH CHECK (public.is_quotation_admin());

CREATE POLICY "Allow authenticated admins to delete booking_requests" 
  ON public.booking_requests FOR DELETE 
  TO authenticated 
  USING (public.is_quotation_admin());

CREATE POLICY "Allow authenticated admins to read email_logs" 
  ON public.email_logs FOR SELECT 
  TO authenticated 
  USING (public.is_quotation_admin());

-- Explicit Table Grants for Authorised Admins and Service Role
GRANT SELECT, UPDATE, DELETE ON public.booking_requests TO authenticated;
GRANT SELECT ON public.email_logs TO authenticated;
GRANT ALL ON public.booking_requests TO service_role;
GRANT ALL ON public.email_logs TO service_role;
