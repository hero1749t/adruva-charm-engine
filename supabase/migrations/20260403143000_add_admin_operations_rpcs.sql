CREATE OR REPLACE FUNCTION public.get_admin_outlets_directory()
RETURNS TABLE (
  outlet_id UUID,
  owner_id UUID,
  client_name TEXT,
  owner_name TEXT,
  contact TEXT,
  outlet_name TEXT,
  city TEXT,
  manager_name TEXT,
  phone TEXT,
  outlet_status TEXT,
  orders_today INTEGER,
  revenue_today NUMERIC,
  sync_status TEXT,
  qr_status TEXT,
  updated_at TIMESTAMPTZ
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
    o.id AS outlet_id,
    o.owner_id,
    COALESCE(NULLIF(p.restaurant_name, ''), NULLIF(p.full_name, ''), u.email, 'Unnamed Client') AS client_name,
    COALESCE(NULLIF(p.full_name, ''), split_part(COALESCE(u.email, ''), '@', 1), 'Owner') AS owner_name,
    COALESCE(u.email, '') AS contact,
    o.name AS outlet_name,
    COALESCE(NULLIF(trim(split_part(COALESCE(o.address, ''), ',', array_length(string_to_array(COALESCE(o.address, ''), ','), 1))), ''), 'Unknown') AS city,
    COALESCE(o.manager_name, 'Not assigned') AS manager_name,
    o.phone,
    CASE WHEN o.is_active THEN 'Active' ELSE 'Offline' END AS outlet_status,
    NULL::INTEGER AS orders_today,
    NULL::NUMERIC AS revenue_today,
    'Not Tracked'::TEXT AS sync_status,
    'Not Tracked'::TEXT AS qr_status,
    o.updated_at
  FROM public.outlets o
  JOIN public.profiles p ON p.user_id = o.owner_id
  JOIN auth.users u ON u.id = p.user_id
  ORDER BY o.updated_at DESC, o.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_outlets_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_outlets_directory() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_onboarding_clients()
RETURNS TABLE (
  owner_id UUID,
  client_name TEXT,
  owner_name TEXT,
  onboarding_status TEXT,
  progress INTEGER,
  business_info_complete BOOLEAN,
  branding_uploaded BOOLEAN,
  menu_imported BOOLEAN,
  tax_configured BOOLEAN,
  payment_setup_complete BOOLEAN,
  qr_generated BOOLEAN,
  printer_connected BOOLEAN,
  staff_accounts_created BOOLEAN,
  test_order_completed BOOLEAN,
  go_live_confirmed BOOLEAN
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
  WITH onboarding AS (
    SELECT
      p.user_id AS owner_id,
      COALESCE(NULLIF(p.restaurant_name, ''), NULLIF(p.full_name, ''), u.email, 'Unnamed Client') AS client_name,
      COALESCE(NULLIF(p.full_name, ''), split_part(COALESCE(u.email, ''), '@', 1), 'Owner') AS owner_name,
      (
        COALESCE(NULLIF(p.restaurant_name, ''), NULLIF(p.full_name, '')) IS NOT NULL
        AND COALESCE(NULLIF(p.phone, ''), NULLIF(p.address, '')) IS NOT NULL
      ) AS business_info_complete,
      p.restaurant_logo_url IS NOT NULL AS branding_uploaded,
      EXISTS (SELECT 1 FROM public.menu_items mi WHERE mi.owner_id = p.user_id) AS menu_imported,
      COALESCE(NULLIF(p.gst_number, ''), '') <> '' OR COALESCE(p.gst_percentage, 0) > 0 AS tax_configured,
      COALESCE(NULLIF(p.upi_id, ''), '') <> '' AS payment_setup_complete,
      EXISTS (SELECT 1 FROM public.restaurant_tables rt WHERE rt.owner_id = p.user_id)
        OR EXISTS (SELECT 1 FROM public.restaurant_rooms rr WHERE rr.owner_id = p.user_id) AS qr_generated,
      FALSE AS printer_connected,
      EXISTS (
        SELECT 1
        FROM public.staff_members sm
        WHERE sm.restaurant_owner_id = p.user_id
          AND sm.is_active = true
      ) AS staff_accounts_created,
      EXISTS (SELECT 1 FROM public.orders ord WHERE ord.owner_id = p.user_id) AS test_order_completed,
      EXISTS (
        SELECT 1
        FROM public.orders ord
        WHERE ord.owner_id = p.user_id
          AND ord.status IN ('served', 'ready', 'accepted', 'preparing')
      ) AS go_live_confirmed
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.user_id
  )
  SELECT
    o.owner_id,
    o.client_name,
    o.owner_name,
    CASE
      WHEN score >= 8 THEN 'Ready'
      WHEN score >= 4 THEN 'In Progress'
      ELSE 'Pending'
    END AS onboarding_status,
    ROUND(score * 100.0 / 10.0)::INTEGER AS progress,
    o.business_info_complete,
    o.branding_uploaded,
    o.menu_imported,
    o.tax_configured,
    o.payment_setup_complete,
    o.qr_generated,
    o.printer_connected,
    o.staff_accounts_created,
    o.test_order_completed,
    o.go_live_confirmed
  FROM (
    SELECT
      onboarding.*,
      (
        CASE WHEN business_info_complete THEN 1 ELSE 0 END +
        CASE WHEN branding_uploaded THEN 1 ELSE 0 END +
        CASE WHEN menu_imported THEN 1 ELSE 0 END +
        CASE WHEN tax_configured THEN 1 ELSE 0 END +
        CASE WHEN payment_setup_complete THEN 1 ELSE 0 END +
        CASE WHEN qr_generated THEN 1 ELSE 0 END +
        CASE WHEN printer_connected THEN 1 ELSE 0 END +
        CASE WHEN staff_accounts_created THEN 1 ELSE 0 END +
        CASE WHEN test_order_completed THEN 1 ELSE 0 END +
        CASE WHEN go_live_confirmed THEN 1 ELSE 0 END
      ) AS score
    FROM onboarding
  ) o
  ORDER BY progress ASC, client_name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_onboarding_clients() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_onboarding_clients() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_platform_users()
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT,
  scope TEXT,
  status TEXT,
  source TEXT
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
    au.user_id,
    COALESCE(NULLIF(p.full_name, ''), split_part(COALESCE(u.email, ''), '@', 1), 'Admin User') AS name,
    COALESCE(u.email, '') AS email,
    p.phone,
    'Super Admin'::TEXT AS role,
    'Platform'::TEXT AS scope,
    'Active'::TEXT AS status,
    'admin'::TEXT AS source
  FROM public.admin_users au
  LEFT JOIN public.profiles p ON p.user_id = au.user_id
  LEFT JOIN auth.users u ON u.id = au.user_id

  UNION ALL

  SELECT
    p.user_id,
    COALESCE(NULLIF(p.full_name, ''), NULLIF(p.restaurant_name, ''), split_part(COALESCE(u.email, ''), '@', 1), 'Owner') AS name,
    COALESCE(u.email, '') AS email,
    p.phone,
    'Client Owner'::TEXT AS role,
    COALESCE(NULLIF(p.restaurant_name, ''), 'Restaurant') AS scope,
    'Active'::TEXT AS status,
    'client'::TEXT AS source
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id

  UNION ALL

  SELECT
    sm.user_id,
    sm.name,
    ''::TEXT AS email,
    sm.phone,
    initcap(sm.role::TEXT) AS role,
    COALESCE(NULLIF(p.restaurant_name, ''), 'Restaurant') AS scope,
    CASE WHEN sm.is_active THEN 'Active' ELSE 'Suspended' END AS status,
    'staff'::TEXT AS source
  FROM public.staff_members sm
  LEFT JOIN public.profiles p ON p.user_id = sm.restaurant_owner_id
  ORDER BY role, name;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_platform_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_platform_users() TO authenticated;
