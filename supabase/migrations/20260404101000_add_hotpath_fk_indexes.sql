-- Adds high-impact FK indexes for menu, billing, and coupon hot paths.

CREATE INDEX IF NOT EXISTS idx_addon_options_addon_group_id
  ON public.addon_options (addon_group_id);

CREATE INDEX IF NOT EXISTS idx_combo_items_menu_item_id
  ON public.combo_items (menu_item_id);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id
  ON public.coupon_usage (coupon_id);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_order_id
  ON public.coupon_usage (order_id);

CREATE INDEX IF NOT EXISTS idx_menu_item_addon_groups_addon_group_id
  ON public.menu_item_addon_groups (addon_group_id);

CREATE INDEX IF NOT EXISTS idx_menu_item_tags_tag_id
  ON public.menu_item_tags (tag_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'item_tags'
      AND column_name = 'restaurant_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_item_tags_restaurant_id ON public.item_tags (restaurant_id)';
  END IF;
END
$$;
