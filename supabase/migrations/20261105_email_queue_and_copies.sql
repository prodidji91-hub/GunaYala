-- ==============================================================================
-- GUNA YALA PANAMA TRAVEL — PART 22C.4 ADDITIVE MIGRATION
-- Migration Date: 2026-11-05
-- Version: 20261105_email_queue_and_copies.sql
-- Purpose: Durable Email Delivery Queue, Petra Customer Copies, Partial Unique Conflict Inference,
--          Targeted Historical Test Archiving & Stale Sending Lease Recovery
-- ==============================================================================

-- 1. Additive columns for public.email_logs (Durable Queue, Leases & Audit Metadata)
ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS queue_key TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS body_html TEXT,
  ADD COLUMN IF NOT EXISTS body_text TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_retries INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by TEXT,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- 2. Widen email_type CHECK constraint to support Petra's copy and future status templates
ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS email_logs_email_type_check;
ALTER TABLE public.email_logs ADD CONSTRAINT email_logs_email_type_check CHECK (
  email_type IN (
    'customer_acknowledgement',
    'petra_notification',
    'customer_acknowledgement_copy',
    'availability_confirmed',
    'payment_instructions',
    'booking_confirmation'
  )
);

-- 3. Widen delivery_status CHECK constraint to include 'archived' for excluded historical records
ALTER TABLE public.email_logs DROP CONSTRAINT IF EXISTS email_logs_delivery_status_check;
ALTER TABLE public.email_logs ADD CONSTRAINT email_logs_delivery_status_check CHECK (
  delivery_status IN (
    'pending',
    'sending',
    'accepted',
    'delivered',
    'failed',
    'archived'
  )
);

-- 4. Dedicated partial unique indexes for logical idempotency and queue worker polling
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_logs_queue_key 
  ON public.email_logs (queue_key) 
  WHERE queue_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_logs_idempotency_key 
  ON public.email_logs (idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_logs_queue_claim 
  ON public.email_logs (delivery_status, next_retry_at, locked_until) 
  WHERE delivery_status IN ('pending', 'failed', 'sending');

-- 5. Safely archive pre-activation historical test email records (Preserves for audit, prevents auto-send)
-- Booking GNY-482325 was a verified test booking created prior to email activation.
-- Targeted strictly to GNY-482325 to prevent inadvertently archiving legitimate customer notifications based on timestamps.
UPDATE public.email_logs
SET delivery_status = 'archived',
    error_details = 'Historical test record (pre-activation); preserved for audit, excluded from automatic queue delivery'
WHERE delivery_status = 'pending'
  AND booking_reference = 'GNY-482325';

-- 6. Concurrency-safe queue claiming helper (Atomic lease locking with SKIP LOCKED)
-- Requires complete rendered content (body_html IS NOT NULL) before an item can be claimed for delivery
-- Safely recovers expired 'sending' leases from crashed workers while preventing concurrent double-sends
CREATE OR REPLACE FUNCTION public.claim_email_queue_batch(
  p_worker_id TEXT,
  p_batch_size INT DEFAULT 10,
  p_lease_seconds INT DEFAULT 60
)
RETURNS SETOF public.email_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN QUERY
  WITH available AS (
    SELECT id
    FROM public.email_logs
    WHERE body_html IS NOT NULL 
      AND TRIM(body_html) <> ''
      AND retry_count < max_retries
      AND (
        -- Fresh or previously failed items ready for retry with no active lease
        (delivery_status IN ('pending', 'failed') 
         AND next_retry_at <= NOW() 
         AND (locked_until IS NULL OR locked_until < NOW()))
        OR
        -- Interrupted/crashed worker items whose lease has expired
        (delivery_status = 'sending' 
         AND locked_until IS NOT NULL 
         AND locked_until < NOW())
      )
    ORDER BY created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.email_logs e
  SET delivery_status = 'sending',
      locked_by = p_worker_id,
      locked_until = NOW() + (p_lease_seconds || ' seconds')::INTERVAL
  FROM available a
  WHERE e.id = a.id
  RETURNING e.*;
END;
$$;

-- Restrict queue claim execution strictly to server-side service role
REVOKE EXECUTE ON FUNCTION public.claim_email_queue_batch(TEXT, INT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_email_queue_batch(TEXT, INT, INT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_email_queue_batch(TEXT, INT, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_email_queue_batch(TEXT, INT, INT) TO service_role;

-- 7. Updated Atomic Booking Transaction: Enqueues all 3 Phase 1 email records
-- Uses PostgreSQL conflict target inference matching the partial unique index:
-- ON CONFLICT (queue_key) WHERE queue_key IS NOT NULL DO NOTHING;
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
  v_petra_copy_subject TEXT;
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

  -- 5. Enqueue All 3 Phase 1 Email Messages with Unique Queue Keys
  -- Matches idx_email_logs_queue_key partial unique index:
  -- ON CONFLICT (queue_key) WHERE queue_key IS NOT NULL DO NOTHING;
  v_petra_copy_subject := '[CUSTOMER COPY] ' || p_customer_subject;

  INSERT INTO public.email_logs (
    booking_reference,
    recipient_email,
    recipient_role,
    email_type,
    subject,
    delivery_status,
    queue_key,
    idempotency_key,
    retry_count,
    max_retries,
    next_retry_at
  ) VALUES 
  (
    p_booking_reference,
    v_norm_email,
    'customer',
    'customer_acknowledgement',
    p_customer_subject,
    'pending',
    p_booking_reference || ':customer_ack',
    'idem_' || p_booking_reference || '_cust_ack',
    0,
    5,
    NOW()
  ),
  (
    p_booking_reference,
    p_petra_email,
    'petra',
    'petra_notification',
    p_petra_subject,
    'pending',
    p_booking_reference || ':petra_notif',
    'idem_' || p_booking_reference || '_petra_notif',
    0,
    5,
    NOW()
  ),
  (
    p_booking_reference,
    p_petra_email,
    'petra',
    'customer_acknowledgement_copy',
    v_petra_copy_subject,
    'pending',
    p_booking_reference || ':petra_ack_copy',
    'idem_' || p_booking_reference || '_petra_ack_copy',
    0,
    5,
    NOW()
  )
  ON CONFLICT (queue_key) WHERE queue_key IS NOT NULL DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'booking_reference', p_booking_reference,
    'idempotent_replay', false,
    'message', 'Booking request created successfully with 3 transactional emails enqueued.'
  );
END;
$$;

-- Restrict EXECUTE privileges on transaction function strictly to service_role
REVOKE EXECUTE ON FUNCTION public.create_booking_request_transaction FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_booking_request_transaction FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_booking_request_transaction FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_request_transaction TO service_role;
