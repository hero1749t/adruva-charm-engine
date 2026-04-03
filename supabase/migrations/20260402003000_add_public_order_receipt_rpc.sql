CREATE OR REPLACE FUNCTION public.get_public_order_receipt(_order_id UUID)
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
  ORDER BY oi.created_at, oi.id;
$$;

REVOKE ALL ON FUNCTION public.get_public_order_receipt(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_order_receipt(UUID) TO anon, authenticated;
