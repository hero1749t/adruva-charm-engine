ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_menu_or_combo_check;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS combo_id UUID REFERENCES public.menu_combos(id) ON DELETE SET NULL;

ALTER TABLE public.order_items
  ALTER COLUMN menu_item_id DROP NOT NULL;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_menu_or_combo_check
  CHECK (num_nonnulls(menu_item_id, combo_id) = 1);

DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders with valid owner" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can create order items for existing orders" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can insert validated coupon usage" ON public.coupon_usage;

CREATE OR REPLACE FUNCTION public.place_public_order(
  _owner_id UUID,
  _table_number INTEGER,
  _customer_phone TEXT,
  _notes TEXT,
  _items JSONB,
  _coupon_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id UUID;
  _staged_order_id UUID := gen_random_uuid();
  _item JSONB;
  _menu_item_id UUID;
  _combo_id UUID;
  _quantity INTEGER;
  _variant_option_ids UUID[];
  _addon_option_ids UUID[];
  _menu_item RECORD;
  _combo RECORD;
  _variant_extra NUMERIC := 0;
  _addon_extra NUMERIC := 0;
  _variant_count INTEGER := 0;
  _addon_count INTEGER := 0;
  _required_variant_groups INTEGER := 0;
  _selected_required_groups INTEGER := 0;
  _extras_label TEXT[];
  _item_name TEXT;
  _unit_price NUMERIC;
  _subtotal NUMERIC := 0;
  _discount_amount NUMERIC := 0;
  _total_amount NUMERIC := 0;
  _coupon public.discount_coupons%ROWTYPE;
  _coupon_usage_count INTEGER := 0;
BEGIN
  IF _owner_id IS NULL THEN
    RAISE EXCEPTION 'Restaurant owner is required';
  END IF;

  IF _table_number IS NULL OR _table_number <= 0 THEN
    RAISE EXCEPTION 'A valid table number is required';
  END IF;

  IF _items IS NULL OR jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'At least one order item is required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.restaurant_tables rt
    WHERE rt.owner_id = _owner_id
      AND rt.table_number = _table_number
      AND rt.is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid or inactive table';
  END IF;

  INSERT INTO public.orders (id, owner_id, table_number, customer_phone, total_amount, status, notes)
  VALUES (
    _staged_order_id,
    _owner_id,
    _table_number,
    NULLIF(trim(COALESCE(_customer_phone, '')), ''),
    0,
    'new',
    NULLIF(trim(COALESCE(_notes, '')), '')
  )
  RETURNING id INTO _order_id;

  FOR _item IN
    SELECT value
    FROM jsonb_array_elements(_items)
  LOOP
    _menu_item_id := NULLIF(_item->>'menu_item_id', '')::UUID;
    _combo_id := NULLIF(_item->>'combo_id', '')::UUID;
    _quantity := GREATEST(COALESCE((_item->>'quantity')::INTEGER, 0), 0);
    _variant_extra := 0;
    _addon_extra := 0;
    _variant_count := 0;
    _addon_count := 0;
    _required_variant_groups := 0;
    _selected_required_groups := 0;
    _extras_label := ARRAY[]::TEXT[];
    _variant_option_ids := COALESCE(ARRAY(
      SELECT jsonb_array_elements_text(COALESCE(_item->'selected_variant_option_ids', '[]'::jsonb))::UUID
    ), ARRAY[]::UUID[]);
    _addon_option_ids := COALESCE(ARRAY(
      SELECT jsonb_array_elements_text(COALESCE(_item->'selected_addon_option_ids', '[]'::jsonb))::UUID
    ), ARRAY[]::UUID[]);

    IF num_nonnulls(_menu_item_id, _combo_id) <> 1 THEN
      RAISE EXCEPTION 'Each order line must reference exactly one menu item or combo';
    END IF;

    IF _quantity <= 0 OR _quantity > 20 THEN
      RAISE EXCEPTION 'Invalid quantity supplied';
    END IF;

    IF _combo_id IS NOT NULL THEN
      IF array_length(_variant_option_ids, 1) IS NOT NULL OR array_length(_addon_option_ids, 1) IS NOT NULL THEN
        RAISE EXCEPTION 'Combos cannot include item customizations';
      END IF;

      SELECT id, name, combo_price
      INTO _combo
      FROM public.menu_combos
      WHERE id = _combo_id
        AND owner_id = _owner_id
        AND is_available = true;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or unavailable combo';
      END IF;

      _item_name := _combo.name;
      _unit_price := _combo.combo_price;

      INSERT INTO public.order_items (order_id, menu_item_id, combo_id, item_name, item_price, quantity)
      VALUES (_staged_order_id, NULL, _combo_id, _item_name, _unit_price, _quantity);

      _subtotal := _subtotal + (_unit_price * _quantity);
      CONTINUE;
    END IF;

    SELECT id, name, price
    INTO _menu_item
    FROM public.menu_items
    WHERE id = _menu_item_id
      AND owner_id = _owner_id
      AND is_available = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid or unavailable menu item';
    END IF;

    SELECT COUNT(*)
    INTO _required_variant_groups
    FROM public.variant_groups vg
    WHERE vg.menu_item_id = _menu_item_id
      AND vg.is_required = true;

    SELECT COALESCE(SUM(vo.price), 0), COUNT(*), array_agg(vo.name ORDER BY vo.sort_order)
    INTO _variant_extra, _variant_count, _extras_label
    FROM public.variant_options vo
    JOIN public.variant_groups vg ON vg.id = vo.variant_group_id
    WHERE vo.id = ANY(_variant_option_ids)
      AND vg.menu_item_id = _menu_item_id;

    IF _variant_count <> COALESCE(array_length(_variant_option_ids, 1), 0) THEN
      RAISE EXCEPTION 'Invalid variant selection';
    END IF;

    SELECT COUNT(DISTINCT vg.id)
    INTO _selected_required_groups
    FROM public.variant_options vo
    JOIN public.variant_groups vg ON vg.id = vo.variant_group_id
    WHERE vo.id = ANY(_variant_option_ids)
      AND vg.menu_item_id = _menu_item_id
      AND vg.is_required = true;

    IF _selected_required_groups <> _required_variant_groups THEN
      RAISE EXCEPTION 'Required variants are missing';
    END IF;

    SELECT COALESCE(SUM(ao.price), 0), COUNT(*), COALESCE(_extras_label, ARRAY[]::TEXT[]) || COALESCE(array_agg(ao.name ORDER BY ao.sort_order), ARRAY[]::TEXT[])
    INTO _addon_extra, _addon_count, _extras_label
    FROM public.addon_options ao
    JOIN public.addon_groups ag ON ag.id = ao.addon_group_id
    JOIN public.menu_item_addon_groups miag ON miag.addon_group_id = ag.id
    WHERE ao.id = ANY(_addon_option_ids)
      AND ao.is_available = true
      AND miag.menu_item_id = _menu_item_id;

    IF _addon_count <> COALESCE(array_length(_addon_option_ids, 1), 0) THEN
      RAISE EXCEPTION 'Invalid addon selection';
    END IF;

    _item_name := _menu_item.name;
    IF array_length(_extras_label, 1) IS NOT NULL THEN
      _item_name := _item_name || ' (' || array_to_string(_extras_label, ', ') || ')';
    END IF;

    _unit_price := _menu_item.price + _variant_extra + _addon_extra;

    INSERT INTO public.order_items (order_id, menu_item_id, combo_id, item_name, item_price, quantity)
    VALUES (_staged_order_id, _menu_item_id, NULL, _item_name, _unit_price, _quantity);

    _subtotal := _subtotal + (_unit_price * _quantity);
  END LOOP;

  IF _subtotal <= 0 THEN
    RAISE EXCEPTION 'Order total must be greater than zero';
  END IF;

  IF _coupon_id IS NOT NULL THEN
    SELECT *
    INTO _coupon
    FROM public.discount_coupons
    WHERE id = _coupon_id
      AND owner_id = _owner_id
      AND is_active = true;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid coupon';
    END IF;

    IF trim(COALESCE(_customer_phone, '')) = '' THEN
      RAISE EXCEPTION 'Phone number is required for coupon usage';
    END IF;

    IF now() < _coupon.valid_from OR now() > _coupon.valid_until THEN
      RAISE EXCEPTION 'Coupon has expired';
    END IF;

    IF _subtotal < _coupon.min_order_amount THEN
      RAISE EXCEPTION 'Order does not meet the coupon minimum';
    END IF;

    SELECT COUNT(*)
    INTO _coupon_usage_count
    FROM public.coupon_usage cu
    WHERE cu.coupon_id = _coupon_id
      AND cu.customer_phone = trim(_customer_phone);

    IF _coupon_usage_count >= _coupon.max_uses_per_person THEN
      RAISE EXCEPTION 'Coupon usage limit reached';
    END IF;

    _discount_amount := CASE
      WHEN _coupon.discount_type = 'percentage' THEN round(_subtotal * _coupon.discount_value / 100)
      ELSE LEAST(_coupon.discount_value, _subtotal)
    END;
  END IF;

  _total_amount := _subtotal - _discount_amount;

  UPDATE public.orders
  SET total_amount = _total_amount
  WHERE id = _order_id;

  IF _coupon_id IS NOT NULL AND trim(COALESCE(_customer_phone, '')) <> '' THEN
    INSERT INTO public.coupon_usage (coupon_id, owner_id, customer_phone, order_id)
    VALUES (_coupon_id, _owner_id, trim(_customer_phone), _order_id);
  END IF;

  RETURN _order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.place_public_order(UUID, INTEGER, TEXT, TEXT, JSONB, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.place_public_order(UUID, INTEGER, TEXT, TEXT, JSONB, UUID) TO anon, authenticated;
