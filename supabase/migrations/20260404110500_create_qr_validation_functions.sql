-- QR Scan Validation Function
-- Validates QR scans and initializes order tracking

-- Validation Function: validate_qr_scan
-- Purpose: Validate table existence and availability, return menu URL
DROP FUNCTION IF EXISTS public.validate_qr_scan(UUID, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION public.validate_qr_scan(
  p_owner_id UUID,
  p_table_number INTEGER
)
RETURNS TABLE (
  success BOOLEAN,
  table_id UUID,
  table_status TEXT,
  menu_url TEXT,
  error_message TEXT,
  available BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_table_id UUID;
  v_table_status TEXT;
  v_owner_exists BOOLEAN;
  v_table_exists BOOLEAN;
BEGIN
  -- Verify owner exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = p_owner_id)
  INTO v_owner_exists;

  IF NOT v_owner_exists THEN
    RETURN QUERY SELECT
      false,
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      'Restaurant not found',
      false;
    RETURN;
  END IF;

  -- Find table by owner and number
  SELECT id, status
  FROM public.restaurant_tables
  WHERE owner_id = p_owner_id
    AND table_number = p_table_number
  INTO v_table_id, v_table_status;

  IF v_table_id IS NULL THEN
    -- Log failed scan
    INSERT INTO public.qr_scan_logs (
      owner_id, table_id, success, error_reason, scan_timestamp
    ) VALUES (
      p_owner_id, v_table_id, false, 'Table not found', now()
    );

    RETURN QUERY SELECT
      false,
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      'Table ' || p_table_number::TEXT || ' not found',
      false;
    RETURN;
  END IF;

  -- Log successful scan
  INSERT INTO public.qr_scan_logs (
    owner_id, table_id, success, scan_timestamp
  ) VALUES (
    p_owner_id, v_table_id, true, now()
  );

  -- Return success with menu URL
  RETURN QUERY SELECT
    true,
    v_table_id,
    v_table_status,
    '/menu/' || p_owner_id::TEXT || '?table=' || p_table_number::TEXT,
    NULL::TEXT,
    v_table_status NOT IN ('occupied', 'reserved', 'cleaning')::BOOLEAN;
END;
$$;

-- Initialize Order Abandonment Tracking
DROP FUNCTION IF EXISTS public.initialize_abandonment_tracking(UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.initialize_abandonment_tracking(p_order_id UUID)
RETURNS TABLE (
  id UUID,
  tracking_created BOOLEAN,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id UUID;
  v_table_id UUID;
  v_tracking_id UUID;
BEGIN
  -- Get order details
  SELECT owner_id, table_id
  FROM public.orders
  WHERE id = p_order_id
  INTO v_owner_id, v_table_id;

  IF v_owner_id IS NULL THEN
    RETURN QUERY SELECT
      NULL::UUID,
      false,
      'order_not_found';
    RETURN;
  END IF;

  -- Check if tracking already exists
  SELECT id FROM public.order_abandonment_tracking
  WHERE order_id = p_order_id
  INTO v_tracking_id;

  IF v_tracking_id IS NOT NULL THEN
    RETURN QUERY SELECT
      v_tracking_id,
      false,
      'already_tracking';
    RETURN;
  END IF;

  -- Create new tracking record
  INSERT INTO public.order_abandonment_tracking (
    order_id, owner_id, table_id, created_at, status
  ) VALUES (
    p_order_id, v_owner_id, v_table_id, now(), 'active'
  )
  RETURNING order_abandonment_tracking.id INTO v_tracking_id;

  RETURN QUERY SELECT
    v_tracking_id,
    true,
    'tracking_initialized';
END;
$$;

-- Mark Order as Paid (from abandonment tracking)
DROP FUNCTION IF EXISTS public.mark_order_paid_from_tracking(UUID, TIMESTAMPTZ) CASCADE;

CREATE OR REPLACE FUNCTION public.mark_order_paid_from_tracking(
  p_order_id UUID,
  p_paid_at TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  id UUID,
  status TEXT,
  time_to_payment_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tracking_id UUID;
  v_time_to_payment INTEGER;
BEGIN
  UPDATE public.order_abandonment_tracking
  SET
    paid_at = p_paid_at,
    status = 'paid',
    time_to_payment_seconds = EXTRACT(EPOCH FROM (p_paid_at - created_at))::INTEGER
  WHERE order_id = p_order_id
  RETURNING
    id,
    status,
    time_to_payment_seconds
  INTO v_tracking_id, v_status, v_time_to_payment;

  IF v_tracking_id IS NULL THEN
    RETURN QUERY SELECT
      NULL::UUID,
      'not_found'::TEXT,
      0::INTEGER;
  ELSE
    RETURN QUERY SELECT
      v_tracking_id,
      'paid'::TEXT,
      v_time_to_payment;
  END IF;
END;
$$;

-- Check for Abandoned Orders
DROP FUNCTION IF EXISTS public.check_abandoned_orders(UUID, INTEGER) CASCADE;

CREATE OR REPLACE FUNCTION public.check_abandoned_orders(
  p_owner_id UUID,
  p_minutes_threshold INTEGER DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  order_id UUID,
  table_id UUID,
  table_number INTEGER,
  time_ago_minutes INTEGER,
  order_total NUMERIC,
  customer_phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    oat.id,
    oat.order_id,
    oat.table_id,
    rt.table_number,
    EXTRACT(EPOCH FROM (now() - oat.created_at))::INTEGER / 60 AS time_ago_minutes,
    o.total_amount,
    o.customer_phone
  FROM public.order_abandonment_tracking oat
  JOIN public.restaurant_tables rt ON rt.id = oat.table_id
  JOIN public.orders o ON o.id = oat.order_id
  WHERE
    oat.owner_id = p_owner_id
    AND oat.status = 'active'
    AND oat.paid_at IS NULL
    AND EXTRACT(EPOCH FROM (now() - oat.created_at))::INTEGER / 60 > p_minutes_threshold
  ORDER BY oat.created_at ASC;
END;
$$;

-- Create Payment Link Token
DROP FUNCTION IF EXISTS public.create_payment_link(UUID, TEXT, TEXT, BIGINT, TIMESTAMPTZ, UUID) CASCADE;

CREATE OR REPLACE FUNCTION public.create_payment_link(
  p_order_id UUID,
  p_gateway TEXT,
  p_token TEXT,
  p_amount_paise BIGINT,
  p_expires_at TIMESTAMPTZ,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  payment_token TEXT,
  expires_at TIMESTAMPTZ,
  status TEXT,
  created BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id UUID;
  v_new_id UUID;
BEGIN
  -- Get owner from order
  SELECT owner_id FROM public.orders WHERE id = p_order_id
  INTO v_owner_id;

  IF v_owner_id IS NULL THEN
    RETURN QUERY SELECT
      NULL::UUID,
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      'order_not_found'::TEXT,
      false;
    RETURN;
  END IF;

  -- Create link token
  INSERT INTO public.payment_link_tokens (
    order_id,
    owner_id,
    payment_token,
    gateway,
    amount_paise,
    expires_at,
    status,
    idempotency_key
  ) VALUES (
    p_order_id,
    v_owner_id,
    p_token,
    p_gateway,
    p_amount_paise,
    p_expires_at,
    'active',
    COALESCE(p_idempotency_key, gen_random_uuid())
  )
  ON CONFLICT (idempotency_key) DO UPDATE
  SET
    gateway = EXCLUDED.gateway,
    amount_paise = EXCLUDED.amount_paise
  RETURNING payment_link_tokens.id, payment_link_tokens.payment_token,
            payment_link_tokens.expires_at, payment_link_tokens.status
  INTO v_new_id, p_token, p_expires_at, v_status;

  RETURN QUERY SELECT
    v_new_id,
    p_token,
    p_expires_at,
    v_status,
    true;
END;
$$;

-- Update Payment Link Status
DROP FUNCTION IF EXISTS public.update_payment_link_status(UUID, TEXT, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.update_payment_link_status(
  p_payment_link_id UUID,
  p_new_status TEXT,
  p_gateway_reference TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  status TEXT,
  completed_at TIMESTAMPTZ,
  order_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_new_status NOT IN ('active', 'completed', 'failed', 'expired') THEN
    RAISE EXCEPTION 'Invalid payment link status: %', p_new_status;
  END IF;

  UPDATE public.payment_link_tokens
  SET
    status = p_new_status,
    gateway_reference = COALESCE(p_gateway_reference, gateway_reference),
    completed_at = CASE WHEN p_new_status = 'completed' THEN now() ELSE NULL END,
    webhook_received_at = CASE WHEN p_new_status IN ('completed', 'failed') THEN now() ELSE NULL END
  WHERE id = p_payment_link_id
  RETURNING
    payment_link_tokens.id,
    payment_link_tokens.status,
    payment_link_tokens.completed_at,
    payment_link_tokens.order_id;
END;
$$;
