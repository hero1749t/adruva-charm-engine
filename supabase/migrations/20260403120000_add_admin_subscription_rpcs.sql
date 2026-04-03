CREATE OR REPLACE FUNCTION public.get_admin_subscription_catalog()
RETURNS TABLE (
  id UUID,
  name TEXT,
  price NUMERIC,
  billing_period TEXT,
  max_tables INTEGER,
  max_rooms INTEGER,
  max_menu_items INTEGER,
  max_staff INTEGER,
  max_orders_per_month INTEGER,
  feature_analytics BOOLEAN,
  feature_inventory BOOLEAN,
  feature_expenses BOOLEAN,
  feature_chain BOOLEAN,
  feature_coupons BOOLEAN,
  feature_online_orders BOOLEAN,
  feature_kitchen_display BOOLEAN,
  feature_customer_reviews BOOLEAN,
  feature_white_label BOOLEAN,
  is_active BOOLEAN,
  total_clients BIGINT,
  active_clients BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    sp.id,
    sp.name,
    sp.price,
    sp.billing_period,
    sp.max_tables,
    sp.max_rooms,
    sp.max_menu_items,
    sp.max_staff,
    sp.max_orders_per_month,
    sp.feature_analytics,
    sp.feature_inventory,
    sp.feature_expenses,
    sp.feature_chain,
    sp.feature_coupons,
    sp.feature_online_orders,
    sp.feature_kitchen_display,
    sp.feature_customer_reviews,
    COALESCE(sp.feature_white_label, false) AS feature_white_label,
    sp.is_active,
    COUNT(os.id)::BIGINT AS total_clients,
    COUNT(os.id) FILTER (WHERE lower(COALESCE(os.status, 'active')) = 'active')::BIGINT AS active_clients
  FROM public.subscription_plans sp
  LEFT JOIN public.owner_subscriptions os ON os.plan_id = sp.id
  GROUP BY
    sp.id,
    sp.name,
    sp.price,
    sp.billing_period,
    sp.max_tables,
    sp.max_rooms,
    sp.max_menu_items,
    sp.max_staff,
    sp.max_orders_per_month,
    sp.feature_analytics,
    sp.feature_inventory,
    sp.feature_expenses,
    sp.feature_chain,
    sp.feature_coupons,
    sp.feature_online_orders,
    sp.feature_kitchen_display,
    sp.feature_customer_reviews,
    sp.feature_white_label,
    sp.is_active
  ORDER BY sp.price ASC, sp.name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_subscription_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_subscription_catalog() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_subscription_queue()
RETURNS TABLE (
  subscription_id UUID,
  owner_id UUID,
  client_name TEXT,
  owner_name TEXT,
  contact TEXT,
  phone TEXT,
  plan_id UUID,
  plan_name TEXT,
  billing_period TEXT,
  subscription_status TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  notes TEXT,
  outlets_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  WITH latest_subscriptions AS (
    SELECT DISTINCT ON (os.owner_id)
      os.id,
      os.owner_id,
      os.plan_id,
      os.status,
      os.expires_at,
      os.created_at,
      os.notes
    FROM public.owner_subscriptions os
    ORDER BY os.owner_id, os.created_at DESC, os.id DESC
  ),
  outlet_counts AS (
    SELECT
      o.owner_id,
      COUNT(*)::BIGINT AS outlets_count
    FROM public.outlets o
    GROUP BY o.owner_id
  )
  SELECT
    ls.id AS subscription_id,
    p.id AS owner_id,
    COALESCE(NULLIF(trim(p.restaurant_name), ''), split_part(p.email, '@', 1), 'Unnamed Client') AS client_name,
    COALESCE(NULLIF(trim(p.restaurant_name), ''), split_part(p.email, '@', 1), 'Owner') AS owner_name,
    p.email AS contact,
    p.phone,
    sp.id AS plan_id,
    sp.name AS plan_name,
    sp.billing_period,
    COALESCE(NULLIF(ls.status, ''), 'trial') AS subscription_status,
    ls.expires_at,
    ls.created_at,
    ls.notes,
    COALESCE(oc.outlets_count, 0) AS outlets_count
  FROM latest_subscriptions ls
  JOIN public.profiles p ON p.id = ls.owner_id
  JOIN public.subscription_plans sp ON sp.id = ls.plan_id
  LEFT JOIN outlet_counts oc ON oc.owner_id = p.id
  ORDER BY ls.expires_at NULLS LAST, p.updated_at DESC NULLS LAST, p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_subscription_queue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_subscription_queue() TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_admin_client_plan(
  _owner_id UUID,
  _plan_id UUID,
  _status TEXT,
  _expires_at TIMESTAMPTZ,
  _notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _subscription_id UUID;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _owner_id) THEN
    RAISE EXCEPTION 'Client profile not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE id = _plan_id) THEN
    RAISE EXCEPTION 'Subscription plan not found';
  END IF;

  SELECT os.id
  INTO _subscription_id
  FROM public.owner_subscriptions os
  WHERE os.owner_id = _owner_id
  ORDER BY os.created_at DESC, os.id DESC
  LIMIT 1;

  IF _subscription_id IS NULL THEN
    INSERT INTO public.owner_subscriptions (
      owner_id,
      plan_id,
      status,
      starts_at,
      expires_at,
      assigned_by,
      notes
    )
    VALUES (
      _owner_id,
      _plan_id,
      COALESCE(NULLIF(trim(_status), ''), 'active'),
      now(),
      _expires_at,
      auth.uid(),
      NULLIF(trim(COALESCE(_notes, '')), '')
    )
    RETURNING id INTO _subscription_id;
  ELSE
    UPDATE public.owner_subscriptions
    SET
      plan_id = _plan_id,
      status = COALESCE(NULLIF(trim(_status), ''), status, 'active'),
      expires_at = _expires_at,
      assigned_by = auth.uid(),
      notes = NULLIF(trim(COALESCE(_notes, '')), ''),
      created_at = now()
    WHERE id = _subscription_id;
  END IF;

  RETURN _subscription_id;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_admin_client_plan(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_admin_client_plan(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT) TO authenticated;
