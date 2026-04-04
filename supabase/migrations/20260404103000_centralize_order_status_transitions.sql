CREATE OR REPLACE FUNCTION public.can_manage_order_workflow(_owner_id UUID)
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
      AND sm.role IN ('owner', 'manager', 'kitchen')
  ) OR auth.uid() = _owner_id;
$$;

CREATE OR REPLACE FUNCTION public.advance_order_status(
  _order_id UUID,
  _next_status public.order_status
)
RETURNS TABLE (
  order_id UUID,
  previous_status public.order_status,
  next_status public.order_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_expected_next public.order_status;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF NOT public.can_manage_order_workflow(v_order.owner_id) THEN
    RAISE EXCEPTION 'You are not allowed to update this order';
  END IF;

  IF v_order.status IN ('served', 'cancelled') THEN
    RAISE EXCEPTION 'This order can no longer be advanced';
  END IF;

  v_expected_next := CASE v_order.status
    WHEN 'new' THEN 'accepted'
    WHEN 'accepted' THEN 'preparing'
    WHEN 'preparing' THEN 'ready'
    WHEN 'ready' THEN 'served'
    ELSE NULL
  END;

  IF v_expected_next IS NULL THEN
    RAISE EXCEPTION 'No valid transition exists from status %', v_order.status;
  END IF;

  IF _next_status <> v_expected_next THEN
    RAISE EXCEPTION 'Invalid transition from % to %', v_order.status, _next_status;
  END IF;

  UPDATE public.orders
  SET
    status = _next_status,
    updated_at = now()
  WHERE id = v_order.id;

  RETURN QUERY
  SELECT
    v_order.id,
    v_order.status,
    _next_status;
END;
$$;

REVOKE ALL ON FUNCTION public.can_manage_order_workflow(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_order_workflow(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.advance_order_status(UUID, public.order_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advance_order_status(UUID, public.order_status) TO authenticated;
