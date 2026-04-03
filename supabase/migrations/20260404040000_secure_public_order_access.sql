ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS public_tracking_token UUID DEFAULT gen_random_uuid();

UPDATE public.orders
SET public_tracking_token = gen_random_uuid()
WHERE public_tracking_token IS NULL;

ALTER TABLE public.orders
ALTER COLUMN public_tracking_token SET NOT NULL;

CREATE OR REPLACE FUNCTION public.place_public_order_secure(
  _owner_id UUID,
  _table_number INTEGER,
  _customer_phone TEXT,
  _notes TEXT,
  _items JSONB,
  _coupon_id UUID DEFAULT NULL
)
RETURNS TABLE (
  order_id UUID,
  public_tracking_token UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
BEGIN
  v_order_id := public.place_public_order(
    _owner_id,
    _table_number,
    _customer_phone,
    _notes,
    _items,
    _coupon_id
  );

  RETURN QUERY
  SELECT o.id, o.public_tracking_token
  FROM public.orders o
  WHERE o.id = v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_order_tracking_secure(
  _order_id UUID,
  _public_tracking_token UUID
)
RETURNS TABLE (
  status public.order_status,
  payment_method TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.status,
    o.payment_method
  FROM public.orders o
  WHERE o.id = _order_id
    AND o.public_tracking_token = _public_tracking_token
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_public_order_receipt_secure(
  _order_id UUID,
  _public_tracking_token UUID
)
RETURNS TABLE (
  created_at TIMESTAMPTZ,
  item_name TEXT,
  item_price NUMERIC,
  quantity INTEGER,
  total_amount NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.created_at,
    oi.item_name,
    oi.item_price,
    oi.quantity,
    o.total_amount
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  WHERE o.id = _order_id
    AND o.public_tracking_token = _public_tracking_token
  ORDER BY oi.created_at, oi.id;
$$;

REVOKE ALL ON FUNCTION public.get_public_order_tracking(UUID) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.get_public_order_receipt(UUID) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.place_public_order(UUID, INTEGER, TEXT, TEXT, JSONB, UUID) FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.place_public_order_secure(UUID, INTEGER, TEXT, TEXT, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_public_order_secure(UUID, INTEGER, TEXT, TEXT, JSONB, UUID) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_public_order_tracking_secure(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_order_tracking_secure(UUID, UUID) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.get_public_order_receipt_secure(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_order_receipt_secure(UUID, UUID) TO anon, authenticated;
