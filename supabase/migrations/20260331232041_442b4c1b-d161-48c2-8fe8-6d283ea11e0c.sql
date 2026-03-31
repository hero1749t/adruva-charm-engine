
-- Menu customization (owner's color palette + fonts for customer menu)
CREATE TABLE public.menu_customization (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  primary_color text NOT NULL DEFAULT '#FF6B00',
  secondary_color text NOT NULL DEFAULT '#1a1a2e',
  background_color text NOT NULL DEFAULT '#ffffff',
  text_color text NOT NULL DEFAULT '#1a1a2e',
  accent_color text NOT NULL DEFAULT '#FF6B00',
  font_heading text NOT NULL DEFAULT 'Inter',
  font_body text NOT NULL DEFAULT 'Inter',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id)
);

ALTER TABLE public.menu_customization ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view menu customization" ON public.menu_customization FOR SELECT TO public USING (true);
CREATE POLICY "Owners can manage their customization" ON public.menu_customization FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Item tags (per owner)
CREATE TABLE public.item_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#FF6B00',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.item_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tags" ON public.item_tags FOR SELECT TO public USING (true);
CREATE POLICY "Owners can manage their tags" ON public.item_tags FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Menu item <-> tag junction
CREATE TABLE public.menu_item_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.item_tags(id) ON DELETE CASCADE,
  UNIQUE(menu_item_id, tag_id)
);

ALTER TABLE public.menu_item_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view item tags" ON public.menu_item_tags FOR SELECT TO public USING (true);
CREATE POLICY "Owners can manage item tags" ON public.menu_item_tags FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.menu_items WHERE id = menu_item_id AND owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.menu_items WHERE id = menu_item_id AND owner_id = auth.uid())
);

-- Variant groups per menu item
CREATE TABLE public.variant_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.variant_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view variant groups" ON public.variant_groups FOR SELECT TO public USING (true);
CREATE POLICY "Owners can manage variant groups" ON public.variant_groups FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Variant options within a group
CREATE TABLE public.variant_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_group_id uuid NOT NULL REFERENCES public.variant_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.variant_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view variant options" ON public.variant_options FOR SELECT TO public USING (true);
CREATE POLICY "Owners can manage variant options" ON public.variant_options FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.variant_groups WHERE id = variant_group_id AND owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.variant_groups WHERE id = variant_group_id AND owner_id = auth.uid())
);

-- Addon groups (per owner, shareable across items)
CREATE TABLE public.addon_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  max_selections int DEFAULT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.addon_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view addon groups" ON public.addon_groups FOR SELECT TO public USING (true);
CREATE POLICY "Owners can manage addon groups" ON public.addon_groups FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Addon options
CREATE TABLE public.addon_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_group_id uuid NOT NULL REFERENCES public.addon_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.addon_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view addon options" ON public.addon_options FOR SELECT TO public USING (true);
CREATE POLICY "Owners can manage addon options" ON public.addon_options FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.addon_groups WHERE id = addon_group_id AND owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.addon_groups WHERE id = addon_group_id AND owner_id = auth.uid())
);

-- Link addon groups to menu items
CREATE TABLE public.menu_item_addon_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  addon_group_id uuid NOT NULL REFERENCES public.addon_groups(id) ON DELETE CASCADE,
  UNIQUE(menu_item_id, addon_group_id)
);

ALTER TABLE public.menu_item_addon_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view item addon links" ON public.menu_item_addon_groups FOR SELECT TO public USING (true);
CREATE POLICY "Owners can manage item addon links" ON public.menu_item_addon_groups FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.menu_items WHERE id = menu_item_id AND owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.menu_items WHERE id = menu_item_id AND owner_id = auth.uid())
);

-- Combos
CREATE TABLE public.menu_combos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  combo_price numeric NOT NULL,
  image_url text,
  is_available boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_combos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available combos" ON public.menu_combos FOR SELECT TO public USING (is_available = true);
CREATE POLICY "Owners can manage combos" ON public.menu_combos FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

-- Combo items
CREATE TABLE public.combo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id uuid NOT NULL REFERENCES public.menu_combos(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1,
  UNIQUE(combo_id, menu_item_id)
);

ALTER TABLE public.combo_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view combo items" ON public.combo_items FOR SELECT TO public USING (true);
CREATE POLICY "Owners can manage combo items" ON public.combo_items FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.menu_combos WHERE id = combo_id AND owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.menu_combos WHERE id = combo_id AND owner_id = auth.uid())
);
