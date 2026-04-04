-- Restores missing RLS policies for menu metadata tables and hardens mutable
-- function search_path settings flagged by Supabase security advisors.
--
-- This migration is intentionally backward-compatible with both schema variants:
-- 1) New model: menu_items.owner_id + staff_members.restaurant_owner_id/user_id
-- 2) Legacy model: menu_items.restaurant_id + restaurants.owner_id

CREATE OR REPLACE FUNCTION public.can_manage_menu_owner(_owner_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_manage BOOLEAN := FALSE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  IF auth.uid() = _owner_id THEN
    RETURN TRUE;
  END IF;

  -- New schema: staff_members.user_id + staff_members.restaurant_owner_id
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'staff_members'
      AND column_name = 'restaurant_owner_id'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'staff_members'
      AND column_name = 'user_id'
  ) THEN
    EXECUTE $sql$
      SELECT EXISTS (
        SELECT 1
        FROM public.staff_members sm
        WHERE sm.restaurant_owner_id = $1
          AND sm.user_id = auth.uid()
          AND sm.is_active = true
          AND sm.role IN ('owner', 'manager')
      )
    $sql$
    INTO v_can_manage
    USING _owner_id;

    IF v_can_manage THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Legacy schema fallback cannot map staff to auth user reliably when user_id is absent.
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_menu_item(_menu_item_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- New schema: menu_items.owner_id
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'menu_items'
      AND column_name = 'owner_id'
  ) THEN
    EXECUTE $sql$
      SELECT mi.owner_id
      FROM public.menu_items mi
      WHERE mi.id = $1
    $sql$
    INTO v_owner_id
    USING _menu_item_id;

    IF v_owner_id IS NULL THEN
      RETURN FALSE;
    END IF;

    RETURN public.can_manage_menu_owner(v_owner_id);
  END IF;

  -- Legacy schema: menu_items.restaurant_id -> restaurants.owner_id
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'menu_items'
      AND column_name = 'restaurant_id'
  ) THEN
    EXECUTE $sql$
      SELECT r.owner_id
      FROM public.menu_items mi
      JOIN public.restaurants r ON r.id = mi.restaurant_id
      WHERE mi.id = $1
    $sql$
    INTO v_owner_id
    USING _menu_item_id;

    IF v_owner_id IS NULL THEN
      RETURN FALSE;
    END IF;

    RETURN public.can_manage_menu_owner(v_owner_id);
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_public_menu_item(_menu_item_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.menu_items mi
    WHERE mi.id = _menu_item_id
      AND mi.is_available = true
  );
$$;

REVOKE ALL ON FUNCTION public.can_manage_menu_owner(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_menu_item(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_public_menu_item(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.can_manage_menu_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_menu_item(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_public_menu_item(UUID) TO anon, authenticated;

ALTER TABLE public.item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addon_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addon_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_addon_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view tags linked to public menu items" ON public.item_tags;
DROP POLICY IF EXISTS "Owners can manage their tags" ON public.item_tags;
DROP POLICY IF EXISTS "Team can manage their tags" ON public.item_tags;

CREATE POLICY "Public can view tags linked to public menu items"
ON public.item_tags
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.menu_item_tags mit
    WHERE mit.tag_id = item_tags.id
      AND public.is_public_menu_item(mit.menu_item_id)
  )
);

CREATE POLICY "Team can manage their tags"
ON public.item_tags
FOR ALL
TO authenticated
USING (public.can_manage_menu_owner(item_tags.owner_id))
WITH CHECK (public.can_manage_menu_owner(item_tags.owner_id));

DROP POLICY IF EXISTS "Public can view tag links for public menu items" ON public.menu_item_tags;
DROP POLICY IF EXISTS "Owners can manage item tags" ON public.menu_item_tags;
DROP POLICY IF EXISTS "Team can manage item tags" ON public.menu_item_tags;

CREATE POLICY "Public can view tag links for public menu items"
ON public.menu_item_tags
FOR SELECT
TO public
USING (public.is_public_menu_item(menu_item_tags.menu_item_id));

CREATE POLICY "Team can manage item tags"
ON public.menu_item_tags
FOR ALL
TO authenticated
USING (public.can_manage_menu_item(menu_item_tags.menu_item_id))
WITH CHECK (public.can_manage_menu_item(menu_item_tags.menu_item_id));

DROP POLICY IF EXISTS "Public can view addon groups linked to public menu items" ON public.addon_groups;
DROP POLICY IF EXISTS "Owners can manage addon groups" ON public.addon_groups;
DROP POLICY IF EXISTS "Team can manage addon groups" ON public.addon_groups;

CREATE POLICY "Public can view addon groups linked to public menu items"
ON public.addon_groups
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.menu_item_addon_groups miag
    WHERE miag.addon_group_id = addon_groups.id
      AND public.is_public_menu_item(miag.menu_item_id)
  )
);

CREATE POLICY "Team can manage addon groups"
ON public.addon_groups
FOR ALL
TO authenticated
USING (public.can_manage_menu_owner(addon_groups.owner_id))
WITH CHECK (public.can_manage_menu_owner(addon_groups.owner_id));

DROP POLICY IF EXISTS "Public can view addon options linked to public menu items" ON public.addon_options;
DROP POLICY IF EXISTS "Owners can manage addon options" ON public.addon_options;
DROP POLICY IF EXISTS "Team can manage addon options" ON public.addon_options;

CREATE POLICY "Public can view addon options linked to public menu items"
ON public.addon_options
FOR SELECT
TO public
USING (
  addon_options.is_available = true
  AND EXISTS (
    SELECT 1
    FROM public.menu_item_addon_groups miag
    WHERE miag.addon_group_id = addon_options.addon_group_id
      AND public.is_public_menu_item(miag.menu_item_id)
  )
);

CREATE POLICY "Team can manage addon options"
ON public.addon_options
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.addon_groups ag
    WHERE ag.id = addon_options.addon_group_id
      AND public.can_manage_menu_owner(ag.owner_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.addon_groups ag
    WHERE ag.id = addon_options.addon_group_id
      AND public.can_manage_menu_owner(ag.owner_id)
  )
);

DROP POLICY IF EXISTS "Public can view addon links for public menu items" ON public.menu_item_addon_groups;
DROP POLICY IF EXISTS "Owners can manage item addon links" ON public.menu_item_addon_groups;
DROP POLICY IF EXISTS "Team can manage item addon links" ON public.menu_item_addon_groups;

CREATE POLICY "Public can view addon links for public menu items"
ON public.menu_item_addon_groups
FOR SELECT
TO public
USING (public.is_public_menu_item(menu_item_addon_groups.menu_item_id));

CREATE POLICY "Team can manage item addon links"
ON public.menu_item_addon_groups
FOR ALL
TO authenticated
USING (public.can_manage_menu_item(menu_item_addon_groups.menu_item_id))
WITH CHECK (public.can_manage_menu_item(menu_item_addon_groups.menu_item_id));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'check_staff_limit'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    EXECUTE 'ALTER FUNCTION public.check_staff_limit() SET search_path = public';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_client_on_lead_won'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    EXECUTE 'ALTER FUNCTION public.create_client_on_lead_won() SET search_path = public';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'update_updated_at_column'
      AND pg_get_function_identity_arguments(p.oid) = ''
  ) THEN
    EXECUTE 'ALTER FUNCTION public.update_updated_at_column() SET search_path = public';
  END IF;
END
$$;
