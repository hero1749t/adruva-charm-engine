ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS bill_status TEXT NOT NULL DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS bill_number TEXT,
ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS bill_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_reference TEXT,
ADD COLUMN IF NOT EXISTS billing_notes TEXT,
ADD COLUMN IF NOT EXISTS billing_reverted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS billing_revert_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_payment_status_check'
  ) THEN
    ALTER TABLE public.orders
    ADD CONSTRAINT orders_payment_status_check
    CHECK (payment_status IN ('pending', 'confirmed', 'failed', 'reverted'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_bill_status_check'
  ) THEN
    ALTER TABLE public.orders
    ADD CONSTRAINT orders_bill_status_check
    CHECK (bill_status IN ('draft', 'generated', 'reverted'));
  END IF;
END $$;

UPDATE public.orders
SET
  payment_status = CASE
    WHEN status = 'served' THEN 'confirmed'
    ELSE COALESCE(payment_status, 'pending')
  END,
  bill_status = CASE
    WHEN status = 'served' THEN 'generated'
    ELSE COALESCE(bill_status, 'draft')
  END,
  payment_confirmed_at = CASE
    WHEN status = 'served' THEN COALESCE(payment_confirmed_at, updated_at, created_at)
    ELSE payment_confirmed_at
  END,
  bill_generated_at = CASE
    WHEN status = 'served' THEN COALESCE(bill_generated_at, updated_at, created_at)
    ELSE bill_generated_at
  END,
  bill_number = CASE
    WHEN status = 'served' AND bill_number IS NULL THEN
      'BILL-' || to_char(COALESCE(updated_at, created_at), 'YYYYMMDDHH24MISS') || '-' || upper(substr(id::text, 1, 4))
    ELSE bill_number
  END;

CREATE OR REPLACE FUNCTION public.can_manage_order_billing(_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_members sm
    WHERE sm.restaurant_owner_id = _owner_id
      AND sm.user_id = auth.uid()
      AND sm.is_active = true
      AND sm.role IN ('owner', 'manager', 'cashier')
  ) OR auth.uid() = _owner_id;
$$;

CREATE OR REPLACE FUNCTION public.confirm_order_payment(
  _order_id UUID,
  _payment_method TEXT,
  _payment_reference TEXT DEFAULT NULL,
  _billing_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  order_id UUID,
  bill_number TEXT,
  payment_status TEXT,
  bill_status TEXT,
  order_status public.order_status,
  payment_method TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_method TEXT;
  v_bill_number TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = _order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF NOT public.can_manage_order_billing(v_order.owner_id) THEN
    RAISE EXCEPTION 'You are not allowed to confirm this payment';
  END IF;

  IF v_order.status <> 'ready' THEN
    RAISE EXCEPTION 'Only ready orders can be billed';
  END IF;

  v_method := lower(trim(COALESCE(_payment_method, '')));
  IF v_method NOT IN ('cash', 'card', 'upi') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  v_bill_number := COALESCE(
    v_order.bill_number,
    'BILL-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || upper(substr(v_order.id::text, 1, 4))
  );

  UPDATE public.orders
  SET
    payment_method = v_method,
    payment_status = 'confirmed',
    payment_reference = NULLIF(trim(COALESCE(_payment_reference, '')), ''),
    billing_notes = NULLIF(trim(COALESCE(_billing_notes, '')), ''),
    payment_confirmed_at = now(),
    bill_status = 'generated',
    bill_generated_at = COALESCE(bill_generated_at, now()),
    bill_number = v_bill_number,
    billing_reverted_at = NULL,
    billing_revert_reason = NULL,
    status = 'served',
    updated_at = now()
  WHERE id = v_order.id;

  RETURN QUERY
  SELECT
    o.id,
    o.bill_number,
    o.payment_status,
    o.bill_status,
    o.status,
    o.payment_method
  FROM public.orders o
  WHERE o.id = v_order.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revert_order_payment(
  _order_id UUID,
  _reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  order_id UUID,
  payment_status TEXT,
  bill_status TEXT,
  order_status public.order_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = _order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF NOT public.can_manage_order_billing(v_order.owner_id) THEN
    RAISE EXCEPTION 'You are not allowed to revert this payment';
  END IF;

  IF v_order.payment_status <> 'confirmed' THEN
    RAISE EXCEPTION 'Only confirmed payments can be reverted';
  END IF;

  UPDATE public.orders
  SET
    payment_status = 'pending',
    payment_method = NULL,
    payment_reference = NULL,
    payment_confirmed_at = NULL,
    bill_status = 'reverted',
    billing_reverted_at = now(),
    billing_revert_reason = COALESCE(NULLIF(trim(COALESCE(_reason, '')), ''), 'Reverted by cashier'),
    status = 'ready',
    updated_at = now()
  WHERE id = v_order.id;

  RETURN QUERY
  SELECT
    o.id,
    o.payment_status,
    o.bill_status,
    o.status
  FROM public.orders o
  WHERE o.id = v_order.id;
END;
$$;

REVOKE ALL ON FUNCTION public.can_manage_order_billing(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_order_billing(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.confirm_order_payment(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment(UUID, TEXT, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.revert_order_payment(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revert_order_payment(UUID, TEXT) TO authenticated;
