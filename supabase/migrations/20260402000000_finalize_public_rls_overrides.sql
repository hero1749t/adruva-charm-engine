DROP POLICY IF EXISTS "Public can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view restaurant public info" ON public.profiles;

DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.discount_coupons;
DROP POLICY IF EXISTS "Anyone can read coupon usage for validation" ON public.coupon_usage;
DROP POLICY IF EXISTS "Anyone can insert coupon usage" ON public.coupon_usage;
DROP POLICY IF EXISTS "Anyone can insert validated coupon usage" ON public.coupon_usage;

DROP POLICY IF EXISTS "Anyone can view menu customization" ON public.menu_customization;
DROP POLICY IF EXISTS "Anyone can view tags" ON public.item_tags;
DROP POLICY IF EXISTS "Anyone can view item tags" ON public.menu_item_tags;
DROP POLICY IF EXISTS "Anyone can view variant groups" ON public.variant_groups;
DROP POLICY IF EXISTS "Anyone can view variant options" ON public.variant_options;
DROP POLICY IF EXISTS "Anyone can view addon groups" ON public.addon_groups;
DROP POLICY IF EXISTS "Anyone can view addon options" ON public.addon_options;
DROP POLICY IF EXISTS "Anyone can view item addon links" ON public.menu_item_addon_groups;
DROP POLICY IF EXISTS "Anyone can view combo items" ON public.combo_items;

DROP POLICY IF EXISTS "Anyone can view their order by id" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders with valid owner" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can create order items for existing orders" ON public.order_items;

COMMENT ON FUNCTION public.get_public_restaurant_profile(UUID)
IS 'Public-safe restaurant profile fields only. Added as replacement for broad profiles SELECT policies.';

COMMENT ON FUNCTION public.get_public_menu_customization(UUID)
IS 'Public-safe menu theme fields only. Added as replacement for broad menu_customization SELECT policy.';

COMMENT ON FUNCTION public.get_public_order_tracking(UUID)
IS 'Public-safe order tracking fields only. Added as replacement for broad orders SELECT policy.';

COMMENT ON FUNCTION public.validate_public_coupon(UUID, TEXT, TEXT, NUMERIC)
IS 'Public-safe coupon validation. Added as replacement for broad coupon and coupon_usage SELECT policies.';

COMMENT ON FUNCTION public.place_public_order(UUID, INTEGER, TEXT, TEXT, JSONB, UUID)
IS 'Public order placement with server-side validation. Added as replacement for direct public INSERT policies.';
