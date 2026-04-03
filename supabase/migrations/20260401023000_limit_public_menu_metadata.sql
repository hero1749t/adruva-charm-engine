DROP POLICY IF EXISTS "Anyone can view menu customization" ON public.menu_customization;
DROP POLICY IF EXISTS "Anyone can view tags" ON public.item_tags;
DROP POLICY IF EXISTS "Anyone can view item tags" ON public.menu_item_tags;
DROP POLICY IF EXISTS "Anyone can view variant groups" ON public.variant_groups;
DROP POLICY IF EXISTS "Anyone can view variant options" ON public.variant_options;
DROP POLICY IF EXISTS "Anyone can view addon groups" ON public.addon_groups;
DROP POLICY IF EXISTS "Anyone can view addon options" ON public.addon_options;
DROP POLICY IF EXISTS "Anyone can view item addon links" ON public.menu_item_addon_groups;
DROP POLICY IF EXISTS "Anyone can view combo items" ON public.combo_items;

CREATE OR REPLACE FUNCTION public.get_public_menu_customization(_owner_id UUID)
RETURNS TABLE (
  primary_color TEXT,
  secondary_color TEXT,
  background_color TEXT,
  text_color TEXT,
  accent_color TEXT,
  font_heading TEXT,
  font_body TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    mc.primary_color,
    mc.secondary_color,
    mc.background_color,
    mc.text_color,
    mc.accent_color,
    mc.font_heading,
    mc.font_body
  FROM public.menu_customization mc
  WHERE mc.owner_id = _owner_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_menu_customization(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_menu_customization(UUID) TO anon, authenticated;

CREATE POLICY "Public can view tags linked to public menu items"
ON public.item_tags
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.menu_item_tags mit
    JOIN public.menu_items mi ON mi.id = mit.menu_item_id
    WHERE mit.tag_id = item_tags.id
      AND mi.is_available = true
  )
);

CREATE POLICY "Public can view tag links for public menu items"
ON public.menu_item_tags
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.menu_items mi
    WHERE mi.id = menu_item_tags.menu_item_id
      AND mi.is_available = true
  )
);

CREATE POLICY "Public can view variant groups for public menu items"
ON public.variant_groups
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.menu_items mi
    WHERE mi.id = variant_groups.menu_item_id
      AND mi.is_available = true
  )
);

CREATE POLICY "Public can view variant options for public menu items"
ON public.variant_options
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.variant_groups vg
    JOIN public.menu_items mi ON mi.id = vg.menu_item_id
    WHERE vg.id = variant_options.variant_group_id
      AND mi.is_available = true
  )
);

CREATE POLICY "Public can view addon groups linked to public menu items"
ON public.addon_groups
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.menu_item_addon_groups miag
    JOIN public.menu_items mi ON mi.id = miag.menu_item_id
    WHERE miag.addon_group_id = addon_groups.id
      AND mi.is_available = true
  )
);

CREATE POLICY "Public can view addon options linked to public menu items"
ON public.addon_options
FOR SELECT
TO public
USING (
  addon_options.is_available = true
  AND EXISTS (
    SELECT 1
    FROM public.addon_groups ag
    JOIN public.menu_item_addon_groups miag ON miag.addon_group_id = ag.id
    JOIN public.menu_items mi ON mi.id = miag.menu_item_id
    WHERE ag.id = addon_options.addon_group_id
      AND mi.is_available = true
  )
);

CREATE POLICY "Public can view addon links for public menu items"
ON public.menu_item_addon_groups
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.menu_items mi
    WHERE mi.id = menu_item_addon_groups.menu_item_id
      AND mi.is_available = true
  )
);

CREATE POLICY "Public can view combo items for available combos"
ON public.combo_items
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.menu_combos mc
    WHERE mc.id = combo_items.combo_id
      AND mc.is_available = true
  )
  AND EXISTS (
    SELECT 1
    FROM public.menu_items mi
    WHERE mi.id = combo_items.menu_item_id
      AND mi.is_available = true
  )
);
