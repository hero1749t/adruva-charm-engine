CREATE OR REPLACE FUNCTION public.can_correct_order_billing(_owner_id UUID)
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
      AND sm.role IN ('owner', 'manager')
  ) OR auth.uid() = _owner_id;
$$;

CREATE OR REPLACE FUNCTION public.restore_inventory_for_billing_correction(
  _order_id UUID,
  _movement_type TEXT,
  _note TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  r RECORD;
BEGIN
  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = _order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status <> 'served' THEN
    RETURN;
  END IF;

  FOR r IN
    WITH ordered_components AS (
      SELECT
        oi.menu_item_id,
        oi.quantity::numeric AS effective_quantity
      FROM public.order_items oi
      WHERE oi.order_id = v_order.id
        AND oi.menu_item_id IS NOT NULL

      UNION ALL

      SELECT
        ci.menu_item_id,
        (oi.quantity * ci.quantity)::numeric AS effective_quantity
      FROM public.order_items oi
      JOIN public.combo_items ci ON ci.combo_id = oi.combo_id
      WHERE oi.order_id = v_order.id
        AND oi.combo_id IS NOT NULL
    )
    SELECT
      ri.ingredient_id,
      SUM(ri.quantity_used * oc.effective_quantity) AS total_restore
    FROM ordered_components oc
    JOIN public.recipe_ingredients ri ON ri.menu_item_id = oc.menu_item_id
    WHERE ri.owner_id = v_order.owner_id
    GROUP BY ri.ingredient_id
  LOOP
    UPDATE public.ingredients
    SET current_stock = current_stock + r.total_restore,
        updated_at = now()
    WHERE id = r.ingredient_id
      AND owner_id = v_order.owner_id;

    INSERT INTO public.stock_movements (
      owner_id,
      ingredient_id,
      order_id,
      quantity_changed,
      movement_type,
      note
    )
    VALUES (
      v_order.owner_id,
      r.ingredient_id,
      v_order.id,
      r.total_restore,
      _movement_type,
      _note
    );
  END LOOP;
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
  v_reason TEXT;
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

  IF NOT public.can_correct_order_billing(v_order.owner_id) THEN
    RAISE EXCEPTION 'Only owner or manager can reopen this bill';
  END IF;

  IF v_order.payment_status <> 'confirmed' THEN
    RAISE EXCEPTION 'Only confirmed payments can be reverted';
  END IF;

  v_reason := COALESCE(NULLIF(trim(COALESCE(_reason, '')), ''), 'Reopened by manager');

  PERFORM public.restore_inventory_for_billing_correction(
    v_order.id,
    'order_reopen_restock',
    'Inventory restored after bill reopen'
  );

  UPDATE public.orders
  SET
    payment_status = 'pending',
    payment_method = NULL,
    payment_reference = NULL,
    payment_confirmed_at = NULL,
    bill_status = 'reverted',
    billing_reverted_at = now(),
    billing_revert_reason = v_reason,
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
  v_reason TEXT;
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

  IF NOT public.can_correct_order_billing(v_order.owner_id) THEN
    RAISE EXCEPTION 'Only owner or manager can void this bill';
  END IF;

  IF v_order.payment_status <> 'confirmed' THEN
    RAISE EXCEPTION 'Only confirmed bills can be voided';
  END IF;

  v_reason := COALESCE(NULLIF(trim(COALESCE(_reason, '')), ''), 'Voided by manager');

  PERFORM public.restore_inventory_for_billing_correction(
    v_order.id,
    'order_void_restock',
    'Inventory restored after bill void'
  );

  UPDATE public.orders
  SET
    payment_status = 'voided',
    bill_status = 'voided',
    billing_voided_at = now(),
    billing_void_reason = v_reason,
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

REVOKE ALL ON FUNCTION public.can_correct_order_billing(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_correct_order_billing(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.restore_inventory_for_billing_correction(UUID, TEXT, TEXT) FROM PUBLIC;
