# Release Notes - 2026-04-01

## Summary

This release focuses on production hardening, access-control cleanup, secure public ordering, and performance improvements.

## Key Improvements

- Fixed owner vs staff data resolution across dashboards and protected flows.
- Corrected customer menu schema usage to match the real Supabase data model.
- Reduced first-load bundle cost through route-level and feature-level lazy loading.
- Replaced broad public database access with narrowly scoped public RPCs.
- Replaced direct public order creation with server-side validated order creation.
- Added safer staff invitation and claim flow.
- Hardened edge functions and environment handling.

## Security and Access Control

- Public restaurant profile access now uses `get_public_restaurant_profile(...)`.
- Public menu customization now uses `get_public_menu_customization(...)`.
- Public coupon validation now uses `validate_public_coupon(...)`.
- Public order tracking now uses `get_public_order_tracking(...)`.
- Public receipt hydration now uses `get_public_order_receipt(...)`.
- Public order creation now uses `place_public_order(...)`.
- Broad anonymous read policies on sensitive tables were removed and replaced with scoped policies or RPCs.
- Staff role resolution no longer misclassifies owners due to broken self-referential staff rows.

## Ordering and Menu Flow

- Customer menu now reads public-safe restaurant and menu metadata.
- Promo code validation is server-authoritative.
- Order totals and receipt details are server-authoritative.
- Combo orders are stored safely using `order_items.combo_id`.
- Combo orders now deduct underlying recipe ingredient stock correctly when served.

## Staff and Auth

- Added `staff_invitations` support with claim flow.
- Login flow can auto-claim pending staff invitations.
- Auth guards now provide clearer reason-based redirects for unauthorized access.

## Performance

- App routes are lazy loaded.
- Customer menu heavy components are lazy loaded.
- PDF receipt dependencies load on demand.
- Analytics chart modules are split into lazy chunks.
- Vendor chunking was refined for more predictable production bundles.

## Operational Additions

- Added deployment runbook:
  - [SUPABASE_DEPLOYMENT.md](/d:/Adruva_Resto/adruva-charm-engine/docs/SUPABASE_DEPLOYMENT.md)
- Added release checklist:
  - [RELEASE_CHECKLIST.md](/d:/Adruva_Resto/adruva-charm-engine/docs/RELEASE_CHECKLIST.md)
- Added release command guide:
  - [RELEASE_COMMANDS.md](/d:/Adruva_Resto/adruva-charm-engine/docs/RELEASE_COMMANDS.md)
- Added post-deploy SQL verification:
  - [post_deploy_verification.sql](/d:/Adruva_Resto/adruva-charm-engine/supabase/verification/post_deploy_verification.sql)

## Verification Status

- `npm run lint` passes
- `npx tsc --noEmit` passes
- `npm run build` passes

## Release Note

Database migrations must be applied before the frontend release for the new public RPC flows and order pipeline to work correctly.
