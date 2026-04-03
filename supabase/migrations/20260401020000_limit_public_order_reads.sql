DROP POLICY IF EXISTS "Anyone can view their order by id" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view order items" ON public.order_items;

CREATE OR REPLACE FUNCTION public.get_public_order_tracking(_order_id UUID)
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
  LIMIT 1;
$$;
