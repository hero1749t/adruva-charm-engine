# Supabase Deployment Runbook

This project now depends on several security and order-flow migrations that must be applied together.

## Prerequisites

- Supabase CLI installed and authenticated
- Access to project `vppaelgxovnqkqdegajb`
- Latest app code checked out locally

## Local Verification

Run these before touching the database:

```sh
npm run lint
npx tsc --noEmit
npm run build
```

## Critical Migrations

Apply all recent migrations, especially these:

- `20260401013000_add_staff_invitations.sql`
- `20260401014500_limit_public_profile_access.sql`
- `20260401020000_limit_public_order_reads.sql`
- `20260401021500_secure_public_coupon_validation.sql`
- `20260401023000_limit_public_menu_metadata.sql`
- `20260401024500_secure_public_order_creation.sql`
- `20260401030000_handle_combo_inventory_deduction.sql`
- `20260402000000_finalize_public_rls_overrides.sql`
- `20260402003000_add_public_order_receipt_rpc.sql`

Recommended command:

```sh
supabase db push
```

If you prefer reviewing first:

```sh
supabase migration list
supabase db diff
```

## Edge Functions To Review

These were hardened and should be deployed together with DB changes when relevant:

- `supabase/functions/analyze-website`
- `supabase/functions/create-test-kitchen-staff`

Example:

```sh
supabase functions deploy analyze-website
supabase functions deploy create-test-kitchen-staff
```

## Environment Checks

Confirm these before release:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `ALLOW_TEST_KITCHEN_STAFF` is unset or `false` in production

## Smoke Test Checklist

### Public customer flow

1. Open a live customer menu URL.
2. Confirm restaurant name, branding, and menu load correctly.
3. Confirm customization modal loads for items with variants/addons.
4. Apply a valid coupon and confirm it succeeds.
5. Apply an invalid or exhausted coupon and confirm it fails cleanly.
6. Place a normal menu-item order.
7. Place a customized item order.
8. Place a combo order.
9. Confirm receipt details match the server-created order.
10. Confirm order tracking still updates status.

### Staff and owner flow

1. Owner login works.
2. Staff invite creation works.
3. Invited staff account claims invite on login/signup.
4. Owner dashboard, cashier, and kitchen screens show the new order correctly.

### Inventory flow

1. Serve a direct menu-item order and confirm stock deducts.
2. Serve a combo order and confirm underlying recipe ingredients deduct.
3. Confirm `stock_movements` entries are created.

### Access-control checks

1. Anonymous users cannot directly browse profile/coupon/order internals outside approved flows.
2. Customer menu still works using public RPC-backed reads.
3. Owner-only settings remain editable only for the owner.

## Known Intentional Changes

- Public reads now go through narrowly scoped RPCs instead of broad RLS policies.
- Public order creation now uses `place_public_order(...)` instead of direct inserts.
- Receipts are now hydrated from server-authored order data.
- Combo orders are now represented in `order_items` using `combo_id`.

## Rollout Advice

- Deploy during a low-traffic window if possible.
- Apply DB migrations before deploying the frontend.
- If anything breaks, stop new frontend rollout first, then inspect recent migrations and RPC execution paths.
