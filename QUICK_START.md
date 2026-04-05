# ⚡ QUICK START CHEAT SHEET - DO THIS NOW

**Time to live system:** 30 minutes  
**Difficulty:** Easy (just copy-paste)  
**You are here:** Step 0 of 6

---

## 🎯 WHAT TO DO RIGHT NOW

### OPEN THESE 3 THINGS IN DIFFERENT TABS

**Tab 1:** Your Supabase SQL Editor
```
https://console.supabase.com/projects/vppaelgxovnqkqdegajb/sql/new
```

**Tab 2:** Copy-Paste Guide (detailed steps)
```
Open: COPY_PASTE_DEPLOYMENT_GUIDE.md
```

**Tab 3:** Supabase Functions Dashboard
```
https://console.supabase.com/projects/vppaelgxovnqkqdegajb/functions
```

---

## ✅ 6 STEPS TO LIVE SYSTEM

### Step 1: Run Migration 1 (2 min)
1. Go to Tab 2: `COPY_PASTE_DEPLOYMENT_GUIDE.md`
2. Find section: "STEP 1: PASTE MIGRATION 1"
3. Copy ALL the SQL code
4. Paste into Tab 1 (Supabase SQL Editor)
5. Click: `Run` button (top right)
6. **Expected:** ✅ Green success message

---

### Step 2: Run Migrations 2-4 (5 min)
1. Go to Tab 2: `COPY_PASTE_DEPLOYMENT_GUIDE.md`
2. Find: "STEP 2: GET REMAINING MIGRATIONS"
3. Open these files in VS Code:
   - `supabase/migrations/20260404200500_add_order_management_rpcs.sql`
   - `supabase/migrations/20260404201000_add_inventory_and_payment_schema.sql`
   - `supabase/migrations/20260404202000_add_payment_processing_rpcs.sql`
4. For each file:
   - Ctrl+A (select all)
   - Ctrl+C (copy)
   - Paste into Tab 1
   - Click Run
   - Repeat for next file

---

### Step 3: Deploy Edge Function 1 (3 min)
1. Go to Tab 3: Supabase Functions Dashboard
2. Click: `Create New Function`
3. Enter name: `payment-webhook`
4. Click: `Create`
5. Go to Tab 2: Find "STEP 3: DEPLOY EDGE FUNCTION 1"
6. Copy the TypeScript code
7. Paste into the new function
8. Click: `Deploy`
9. **Expected:** ✅ Shows "Active" (green)

---

### Step 4: Deploy Edge Functions 2 & 3 (6 min)
1. Repeat Step 3 two more times for:
   - `qr-validate`
   - `payment-links-create`
2. Each takes ~3 minutes
3. Copy code from:
   - `supabase/functions/qr-validate/index.ts`
   - `supabase/functions/payment-links-create/index.ts`

---

### Step 5: Set Environment Variables (2 min)
1. Open VS Code
2. Go to: `D:\Adruva_Resto\adruva-charm-engine`
3. Create new file: `.env.production`
4. Paste these 2 lines:
   ```
   VITE_SUPABASE_URL=https://vppaelgxovnqkqdegajb.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_KEY_HERE
   ```
5. Get ANON_KEY from:
   ```
   https://console.supabase.com/projects/vppaelgxovnqkqdegajb/settings/api
   ```
   - Section: "Project API keys"
   - Copy: "anon public" value
6. Replace `YOUR_KEY_HERE` with the copied key
7. Save file

---

### Step 6: Redeploy Frontend (2 min)
Open terminal in VS Code and run:
```bash
git add -A
git commit -m "Update environment variables"
git push origin main
```

Wait 2-3 minutes for Vercel to redeploy (you'll get an email).

---

## ✅ THAT'S IT!

Your system should now be **LIVE**. Test with:

1. **Place QR Order:** Scan QR → Add item → Order → Pay
2. **Accept in KDS:** See order → Click Accept → Status changes
3. **Check Inventory:** Should go down after order

---

## 📊 PROGRESS TRACKER

```
Migration 1          [ ] 2 min      ✅ Done / ⏳ Working
Migration 2-4        [ ] 5 min      ✅ Done / ⏳ Working
Edge Func 1          [ ] 3 min      ✅ Done / ⏳ Working
Edge Func 2-3        [ ] 6 min      ✅ Done / ⏳ Working
Environment Setup    [ ] 2 min      ✅ Done / ⏳ Working
Frontend Redeploy    [ ] 2 min      ✅ Done / ⏳ Working

TOTAL: ~20 MINUTES
```

---

## 🆘 QUICK FIXES

**Panic button - something failed?**

**Solution 1:** Chrome cache issues
```
Ctrl+Shift+Delete → Clear cache → Retry
```

**Solution 2:** Re-run the last migration/function
- Don't worry, they're safe to run twice
- Nothing will break

**Solution 3:** Check this checklist
- Did you follow every step?
- Did you copy-paste exactly (no typos)?
- Did you click Run/Deploy?

---

## 🚀 YOU'VE GOT THIS!

All the hard part is done. You just need to:
1. Copy-paste
2. Click buttons
3. Check boxes

**Start with Step 1 now.** Open the first migration and paste it.

**You'll be done in 20 minutes. 🎉**

---

## 📞 FULL GUIDES (IF YOU GET LOST)

- **Detailed steps:** `COPY_PASTE_DEPLOYMENT_GUIDE.md`
- **Comprehensive plan:** `DEPLOYMENT_ACTION_PLAN.md`
- **Progress tracker:** `DEPLOYMENT_TRACKER.md`
- **System overview:** `SYSTEM_STATUS_FINAL.md`

---

**Status:** Ready to deploy RIGHT NOW  
**Next action:** Copy Migration 1 SQL from COPY_PASTE_DEPLOYMENT_GUIDE.md
