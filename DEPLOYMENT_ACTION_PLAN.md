# 🚀 DEPLOYMENT ACTION PLAN - MAKE SYSTEM LIVE

**Project ID:** `vppaelgxovnqkqdegajb`  
**Status:** Ready to deploy  
**Time Required:** 20 minutes  
**Level:** Easy - just follow these 5 steps

---

## ⚡ QUICK START (3 STEPS)

### STEP 1️⃣: Apply Database Migrations (CRITICAL!)

**Go to this URL in your browser:**
```
https://console.supabase.com/projects/vppaelgxovnqkqdegajb/sql/new
```

**Copy-paste each SQL file and RUN (in this order):**

#### Migration 1: Copy & Run
File: `supabase/migrations/20260404200000_create_missing_rpc_functions.sql`

**Then click:** `RUN` (wait for ✅ success)

---

#### Migration 2: Copy & Run
File: `supabase/migrations/20260404200500_add_order_management_rpcs.sql`

**Then click:** `RUN` (wait for ✅ success)

---

#### Migration 3: Copy & Run
File: `supabase/migrations/20260404201000_add_inventory_and_payment_schema.sql`

**Then click:** `RUN` (wait for ✅ success)

---

#### Migration 4: Copy & Run
File: `supabase/migrations/20260404202000_add_payment_processing_rpcs.sql`

**Then click:** `RUN` (wait for ✅ success)

---

**After all 4 run successfully:**
```
✅ Migration 1 Complete
✅ Migration 2 Complete
✅ Migration 3 Complete
✅ Migration 4 Complete

All RPC functions now available!
```

---

### STEP 2️⃣: Deploy Edge Functions

**Go to:**
```
https://console.supabase.com/projects/vppaelgxovnqkqdegajb/functions
```

**Click: `Create New Function`**

**Then deploy 3 functions (copy-paste from files):**

#### Function 1: `payment-webhook`
- **File:** `supabase/functions/payment-webhook/index.ts`
- **Name:** `payment-webhook`
- **Copy entire code** → Paste in dashboard
- **Click:** Deploy
- **Expected:** ✅ Active

#### Function 2: `payment-links-create`
- **File:** `supabase/functions/payment-links-create/index.ts`
- **Name:** `payment-links-create`
- **Copy entire code** → Paste in dashboard
- **Click:** Deploy
- **Expected:** ✅ Active

#### Function 3: `qr-validate`
- **File:** `supabase/functions/qr-validate/index.ts`
- **Name:** `qr-validate`
- **Copy entire code** → Paste in dashboard
- **Click:** Deploy
- **Expected:** ✅ Active

---

**Verify All 3 Deployed:**
```
https://console.supabase.com/projects/vppaelgxovnqkqdegajb/functions

Should show:
✅ payment-webhook (ACTIVE)
✅ payment-links-create (ACTIVE)
✅ qr-validate (ACTIVE)
```

---

### STEP 3️⃣: Set Environment Variables

**Your frontend needs 2 environment variables. Add to `.env.production`:**

```bash
VITE_SUPABASE_URL=https://vppaelgxovnqkqdegajb.supabase.co
VITE_SUPABASE_ANON_KEY=<GET THIS FROM SUPABASE>
```

**How to get ANON_KEY:**
1. Go: `https://console.supabase.com/projects/vppaelgxovnqkqdegajb/settings/api`
2. Under "Project API keys"
3. Copy: `anon public` key
4. Paste into `.env.production`

**Then save and redeploy on Vercel (or github push auto-deploys)**

---

## ✅ VERIFICATION - Test Everything Works

### ✅ Test 1: Customer Can Order via QR

1. Go to your restaurant QR URL
2. Scan QR code
3. Should see menu (categories + items)
4. Click item → Add to cart
5. Click "Place Order"
6. Enter customer name/phone
7. Click "Get Payment Link"
8. **Expected:** Payment QR link generated ✅

---

### ✅ Test 2: Kitchen Can Accept Orders

1. Go to Kitchen Dashboard (KDS)
2. Should see "New Orders" column with items
3. Click order → Should see "Mark as Accepted" button
4. Click button
5. **Expected:** Order moves to "Accepting" status ✅

---

### ✅ Test 3: Payment Webhook Works

1. Complete Test 1 (generate payment link)
2. Scan payment QR
3. Process payment (Razorpay/PhonePe test mode)
4. Check kitchen dashboard
5. **Expected:** Order status auto-updates to "paid" ✅

---

### ✅ Test 4: Inventory Deducted

1. Before Test 1: Check inventory for item (e.g., 50 items)
2. Order 5 items from QR
3. After order payment: Check inventory
4. **Expected:** Now shows 45 items ✅

---

### ✅ Test 5: Cashier Order Creation

1. Go to Cashier Dashboard
2. Click "Create Manual Order"
3. Select items
4. Click "Create Order"
5. **Expected:** Order created + marked paid ✅

---

## 🔧 TROUBLESHOOTING

### Problem: "Function not found" error
**Solution:**
- Make sure you deployed all 3 Edge Functions
- Go to dashboard → Functions → Verify all 3 show "ACTIVE"

### Problem: "Migration already exists"
**Solution:**
- You already ran it! That's OK - skip it and move to next
- Check Supabase dashboard → SQL Editor → Migrations tab

### Problem: "Webhook not triggering"
**Solution:**
- Webhook functions need to be called from payment gateway
- For testing: Use Razorpay/PhonePe test mode webhook tester

### Problem: "Order not appearing in KDS"
**Solution:**
- Make sure customer actually placed order (check Orders table)
- Refresh KDS page
- Check if you're logged in with correct restaurant

---

## 📋 CHECKLIST - Mark As You Go

```
STEP 1: Apply Migrations
  [ ] Migration 1 (RPC functions) ✅
  [ ] Migration 2 (Order management) ✅
  [ ] Migration 3 (Inventory + schema) ✅
  [ ] Migration 4 (Payment RPCs) ✅

STEP 2: Deploy Edge Functions
  [ ] payment-webhook ✅
  [ ] payment-links-create ✅
  [ ] qr-validate ✅

STEP 3: Environment Variables
  [ ] VITE_SUPABASE_URL set ✅
  [ ] VITE_SUPABASE_ANON_KEY set ✅
  [ ] Vercel redeployed ✅

VERIFICATION: Test All Features
  [ ] Test 1: Customer QR order ✅
  [ ] Test 2: Kitchen accept ✅
  [ ] Test 3: Payment webhook ✅
  [ ] Test 4: Inventory update ✅
  [ ] Test 5: Cashier order ✅

🎉 SYSTEM LIVE!
```

---

## 📊 EXPECTED RESULTS

After completing all 5 steps:

| Feature | Before | After |
|---------|--------|-------|
| Customer orders via QR | ❌ Broken | ✅ Working |
| Kitchen accepts orders | ❌ No button | ✅ Full workflow |
| Payment processes | ❌ Timeout | ✅ Reliable |
| Inventory updates | ❌ Ignored | ✅ Automatic |
| Cashier creates orders | ❌ Error | ✅ Complete |

---

## ⏱️ TIME ESTIMATE

| Step | Time | Difficulty |
|------|------|------------|
| Step 1: Migrations | 5 min | Easy (copy-paste-run) |
| Step 2: Edge Functions | 10 min | Easy (copy-paste-deploy) |
| Step 3: Environment Variables | 2 min | Very Easy |
| Step 4: Verification | 5 min | Easy (test features) |
| **Total** | **~20 min** | **Easy** |

---

## 🚀 READY?

**Start with STEP 1 and follow each instruction exactly.**

**Questions?** Check TROUBLESHOOTING section.

**Done?** Update this checklist and celebrate! 🎉

---

*Generated: April 5, 2026*  
*Project ID: vppaelgxovnqkqdegajb*  
*Status: Ready to Deploy*
