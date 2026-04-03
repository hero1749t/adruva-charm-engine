CREATE OR REPLACE FUNCTION public.get_admin_clients()
RETURNS TABLE (
  owner_id uuid,
  client_name text,
  owner_name text,
  contact text,
  phone text,
  address text,
  plan_name text,
  subscription_status text,
  client_status text,
  outlets_count integer,
  onboarding_status text,
  last_active timestamptz,
  subscription_expiry timestamptz,
  monthly_revenue numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  WITH latest_subscription AS (
    SELECT DISTINCT ON (os.owner_id)
      os.owner_id,
      os.status,
      os.expires_at,
      sp.name AS plan_name,
      sp.price
    FROM public.owner_subscriptions os
    JOIN public.subscription_plans sp ON sp.id = os.plan_id
    ORDER BY os.owner_id, COALESCE(os.expires_at, os.created_at) DESC, os.created_at DESC
  ),
  outlet_counts AS (
    SELECT o.owner_id, COUNT(*)::integer AS outlet_count
    FROM public.outlets o
    GROUP BY o.owner_id
  ),
  onboarding_stats AS (
    SELECT
      p.user_id AS owner_id,
      (
        CASE WHEN COALESCE(NULLIF(p.restaurant_name, ''), NULLIF(p.full_name, '')) IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN p.restaurant_logo_url IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN EXISTS (SELECT 1 FROM public.menu_items mi WHERE mi.owner_id = p.user_id) THEN 1 ELSE 0 END +
        CASE WHEN COALESCE(NULLIF(p.gst_number, ''), NULLIF(p.upi_id, '')) IS NOT NULL THEN 1 ELSE 0 END +
        CASE WHEN EXISTS (SELECT 1 FROM public.restaurant_tables rt WHERE rt.owner_id = p.user_id) OR EXISTS (SELECT 1 FROM public.restaurant_rooms rr WHERE rr.owner_id = p.user_id) THEN 1 ELSE 0 END +
        CASE WHEN EXISTS (SELECT 1 FROM public.staff_members sm WHERE sm.restaurant_owner_id = p.user_id AND sm.is_active = true) THEN 1 ELSE 0 END +
        CASE WHEN EXISTS (SELECT 1 FROM public.orders ord WHERE ord.owner_id = p.user_id) THEN 1 ELSE 0 END
      ) AS score
    FROM public.profiles p
  )
  SELECT
    p.user_id,
    COALESCE(NULLIF(p.restaurant_name, ''), NULLIF(p.full_name, ''), u.email, 'Unnamed Client') AS client_name,
    COALESCE(NULLIF(p.full_name, ''), split_part(COALESCE(u.email, ''), '@', 1), 'Owner') AS owner_name,
    COALESCE(u.email, '') AS contact,
    p.phone,
    p.address,
    COALESCE(ls.plan_name, 'No Plan') AS plan_name,
    COALESCE(ls.status, 'trial') AS subscription_status,
    CASE
      WHEN COALESCE(ls.status, 'trial') = 'trial' THEN 'Trial'
      WHEN COALESCE(ls.status, '') IN ('paused', 'cancelled', 'expired', 'inactive') THEN 'Paused'
      WHEN ls.expires_at IS NOT NULL AND ls.expires_at <= now() + interval '7 days' THEN 'At Risk'
      ELSE 'Active'
    END AS client_status,
    COALESCE(oc.outlet_count, 0) AS outlets_count,
    CASE
      WHEN COALESCE(os.score, 0) >= 6 THEN 'Ready'
      WHEN COALESCE(os.score, 0) >= 3 THEN 'In Progress'
      ELSE 'Pending'
    END AS onboarding_status,
    u.last_sign_in_at,
    ls.expires_at,
    COALESCE(ls.price, 0)
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN latest_subscription ls ON ls.owner_id = p.user_id
  LEFT JOIN outlet_counts oc ON oc.owner_id = p.user_id
  LEFT JOIN onboarding_stats os ON os.owner_id = p.user_id
  ORDER BY COALESCE(u.last_sign_in_at, p.updated_at) DESC NULLS LAST, p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_client_detail(_owner_id uuid)
RETURNS TABLE (
  owner_id uuid,
  client_name text,
  owner_name text,
  contact text,
  phone text,
  address text,
  restaurant_logo_url text,
  plan_name text,
  subscription_status text,
  subscription_expiry timestamptz,
  billing_period text,
  monthly_revenue numeric,
  outlets_count integer,
  tables_count integer,
  rooms_count integer,
  staff_count integer,
  total_orders integer,
  feature_analytics boolean,
  feature_inventory boolean,
  feature_expenses boolean,
  feature_chain boolean,
  feature_coupons boolean,
  feature_online_orders boolean,
  feature_kitchen_display boolean,
  feature_customer_reviews boolean,
  feature_white_label boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  WITH latest_subscription AS (
    SELECT
      os.owner_id,
      os.status,
      os.expires_at,
      sp.name AS plan_name,
      sp.price,
      sp.billing_period,
      sp.feature_analytics,
      sp.feature_inventory,
      sp.feature_expenses,
      sp.feature_chain,
      sp.feature_coupons,
      sp.feature_online_orders,
      sp.feature_kitchen_display,
      sp.feature_customer_reviews,
      sp.feature_white_label
    FROM public.owner_subscriptions os
    JOIN public.subscription_plans sp ON sp.id = os.plan_id
    WHERE os.owner_id = _owner_id
    ORDER BY COALESCE(os.expires_at, os.created_at) DESC, os.created_at DESC
    LIMIT 1
  )
  SELECT
    p.user_id,
    COALESCE(NULLIF(p.restaurant_name, ''), NULLIF(p.full_name, ''), u.email, 'Unnamed Client'),
    COALESCE(NULLIF(p.full_name, ''), split_part(COALESCE(u.email, ''), '@', 1), 'Owner'),
    COALESCE(u.email, ''),
    p.phone,
    p.address,
    p.restaurant_logo_url,
    COALESCE(ls.plan_name, 'No Plan'),
    COALESCE(ls.status, 'trial'),
    ls.expires_at,
    ls.billing_period,
    COALESCE(ls.price, 0),
    COALESCE((SELECT COUNT(*)::integer FROM public.outlets o WHERE o.owner_id = p.user_id), 0),
    COALESCE((SELECT COUNT(*)::integer FROM public.restaurant_tables rt WHERE rt.owner_id = p.user_id), 0),
    COALESCE((SELECT COUNT(*)::integer FROM public.restaurant_rooms rr WHERE rr.owner_id = p.user_id), 0),
    COALESCE((SELECT COUNT(*)::integer FROM public.staff_members sm WHERE sm.restaurant_owner_id = p.user_id AND sm.is_active = true), 0),
    COALESCE((SELECT COUNT(*)::integer FROM public.orders ord WHERE ord.owner_id = p.user_id), 0),
    COALESCE(ls.feature_analytics, false),
    COALESCE(ls.feature_inventory, false),
    COALESCE(ls.feature_expenses, false),
    COALESCE(ls.feature_chain, false),
    COALESCE(ls.feature_coupons, false),
    COALESCE(ls.feature_online_orders, false),
    COALESCE(ls.feature_kitchen_display, false),
    COALESCE(ls.feature_customer_reviews, false),
    COALESCE(ls.feature_white_label, false)
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  LEFT JOIN latest_subscription ls ON true
  WHERE p.user_id = _owner_id
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_client_outlets(_owner_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  address text,
  phone text,
  manager_name text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.address,
    o.phone,
    o.manager_name,
    o.is_active,
    o.created_at,
    o.updated_at
  FROM public.outlets o
  WHERE o.owner_id = _owner_id
  ORDER BY o.updated_at DESC, o.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_client_users(_owner_id uuid)
RETURNS TABLE (
  user_id uuid,
  name text,
  email text,
  phone text,
  role text,
  is_active boolean,
  source text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    p.user_id,
    COALESCE(NULLIF(p.full_name, ''), NULLIF(p.restaurant_name, ''), split_part(COALESCE(u.email, ''), '@', 1), 'Owner') AS name,
    u.email::text,
    p.phone,
    'owner'::text AS role,
    true AS is_active,
    'profile'::text AS source
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.user_id = _owner_id

  UNION ALL

  SELECT
    sm.user_id,
    sm.name,
    NULL::text AS email,
    sm.phone,
    sm.role::text,
    sm.is_active,
    'staff'::text AS source
  FROM public.staff_members sm
  WHERE sm.restaurant_owner_id = _owner_id
  ORDER BY role, name;
END;
$$;
