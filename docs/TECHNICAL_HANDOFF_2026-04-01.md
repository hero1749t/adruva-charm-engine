# Technical Handoff - 2026-04-01

## Main Architectural Changes

- Public customer-facing data access was moved away from broad RLS reads and into narrow RPCs.
- Public order creation was moved away from direct table inserts and into a server-side validated RPC.
- `order_items` now supports both direct menu items and combos through `menu_item_id` or `combo_id`.
- Customer receipt rendering now hydrates from server-stored order data instead of only local cart state.

## Public RPCs Introduced

- `get_public_restaurant_profile(...)`
- `get_public_menu_customization(...)`
- `get_public_order_tracking(...)`
- `get_public_order_receipt(...)`
- `validate_public_coupon(...)`
- `place_public_order(...)`
- `claim_staff_invitation(...)`

## Database Areas Most Recently Changed

- `profiles`
- `orders`
- `order_items`
- `discount_coupons`
- `coupon_usage`
- `menu_customization`
- `item_tags`
- `menu_item_tags`
- `variant_groups`
- `variant_options`
- `addon_groups`
- `addon_options`
- `menu_item_addon_groups`
- `combo_items`
- `staff_invitations`

## Important Assumptions

- Frontend release depends on the latest migrations being applied first.
- Combo order lines are now represented using `order_items.combo_id`.
- Inventory deduction logic now expands combo contents through `combo_items`.
- Coupon usage is intended to be recorded only through validated order creation flow.

## Files To Review First For Future Changes

- [CustomerMenu.tsx](/d:/Adruva_Resto/adruva-charm-engine/src/pages/CustomerMenu.tsx)
- [AuthContext.tsx](/d:/Adruva_Resto/adruva-charm-engine/src/contexts/AuthContext.tsx)
- [types.ts](/d:/Adruva_Resto/adruva-charm-engine/src/integrations/supabase/types.ts)
- [SUPABASE_DEPLOYMENT.md](/d:/Adruva_Resto/adruva-charm-engine/docs/SUPABASE_DEPLOYMENT.md)
- [post_deploy_verification.sql](/d:/Adruva_Resto/adruva-charm-engine/supabase/verification/post_deploy_verification.sql)

## High-Value Future Work

- Apply migrations in the target Supabase project and complete end-to-end smoke testing.
- Add automated integration coverage for public order creation and coupon validation.
- Add rate-limiting or abuse monitoring around anonymous ordering flows if traffic grows.
- Review kitchen, analytics, and reporting UX with real combo-order data after deployment.
