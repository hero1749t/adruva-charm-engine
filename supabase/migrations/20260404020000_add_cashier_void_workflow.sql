ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS billing_voided_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS billing_void_reason TEXT;

ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE public.orders
ADD CONSTRAINT orders_payment_status_check
CHECK (payment_status IN ('pending', 'confirmed', 'failed', 'reverted', 'voided'));

ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_bill_status_check;

ALTER TABLE public.orders
ADD CONSTRAINT orders_bill_status_check
CHECK (bill_status IN ('draft', 'generated', 'reverted', 'voided'));

CREATE OR REPLACE FUNCTION public.void_order_billing(
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
    RAISE EXCEPTION 'You are not allowed to void this bill';
  END IF;

  IF v_order.payment_status <> 'confirmed' THEN
    RAISE EXCEPTION 'Only confirmed bills can be voided';
  END IF;

  UPDATE public.orders
  SET
    payment_status = 'voided',
    bill_status = 'voided',
    billing_voided_at = now(),
    billing_void_reason = COALESCE(NULLIF(trim(COALESCE(_reason, '')), ''), 'Voided by cashier'),
    updated_at = now(),
    status = 'cancelled'
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

REVOKE ALL ON FUNCTION public.void_order_billing(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.void_order_billing(UUID, TEXT) TO authenticated;
