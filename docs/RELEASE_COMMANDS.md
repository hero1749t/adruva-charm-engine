# Release Commands

Use these commands in order for a standard production release.

## 1. Local code verification

```sh
npm run lint
npx tsc --noEmit
npm run build
```

## 2. Review pending database state

```sh
supabase migration list
supabase db diff
```

## 3. Apply database migrations

```sh
supabase db push
```

## 4. Deploy hardened edge functions if needed

```sh
supabase functions deploy analyze-website
supabase functions deploy create-test-kitchen-staff
```

## 5. Run post-deploy SQL verification

Open Supabase SQL editor and run:

```sql
\i supabase/verification/post_deploy_verification.sql
```

If your SQL editor does not support `\i`, paste the file contents manually.

## 6. Manual smoke checks

Follow:

- [SUPABASE_DEPLOYMENT.md](/d:/Adruva_Resto/adruva-charm-engine/docs/SUPABASE_DEPLOYMENT.md)
- [RELEASE_CHECKLIST.md](/d:/Adruva_Resto/adruva-charm-engine/docs/RELEASE_CHECKLIST.md)

## Fast Path

If you have already reviewed migrations and only need the critical path:

```sh
npm run lint
npx tsc --noEmit
npm run build
supabase db push
supabase functions deploy analyze-website
supabase functions deploy create-test-kitchen-staff
```
