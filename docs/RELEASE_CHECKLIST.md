# Release Checklist

Use this together with [SUPABASE_DEPLOYMENT.md](/d:/Adruva_Resto/adruva-charm-engine/docs/SUPABASE_DEPLOYMENT.md).

## Before Release

1. Pull the latest code.
2. Run:

```sh
npm run lint
npx tsc --noEmit
npm run build
```

3. Review recent migrations in `supabase/migrations`.
4. Confirm production env values are correct.
5. Confirm `ALLOW_TEST_KITCHEN_STAFF` is disabled in production.

## Database Rollout

1. Run `supabase db push`.
2. Deploy required edge functions if changed.
3. Run the SQL checks from [post_deploy_verification.sql](/d:/Adruva_Resto/adruva-charm-engine/supabase/verification/post_deploy_verification.sql).

## App Smoke Test

1. Open owner login.
2. Open admin login.
3. Open a customer menu.
4. Test one normal item order.
5. Test one customized item order.
6. Test one combo order.
7. Test one coupon order.
8. Mark an order as served and verify stock deduction.

## Sign-Off Gates

- Public menu loads without auth.
- Owner/staff role resolution works.
- Receipt values match the stored order.
- Kitchen and cashier see new orders.
- Combo orders deduct ingredient stock correctly.
- No unexpected public table reads are reintroduced.

## Rollback Mindset

- Stop frontend rollout first if customer ordering breaks.
- Inspect latest migrations and RPCs before reverting app code.
- Prioritize restoring ordering, receipt, and owner dashboard visibility.
