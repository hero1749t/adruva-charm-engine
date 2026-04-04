# 🎯 COMPLETE SETUP GUIDE - Make Everything Work

**Read this carefully. Follow each step exactly. System will work after this!**

---

## STEP 1: Apply Database Migrations (CRITICAL!)

```bash
cd D:\Adruva_Resto\adruva-charm-engine

# Connect to Supabase (skip if already connected)
supabase link

# Apply all new migrations
supabase db push
```

**What This Does:**
- Creates all missing RPC functions (order management, payment, inventory)
- Creates inventory tracking tables
- Creates webhook event tables  
- Adds indexes for performance

**Expected Output:**
```
Applying migrations...
✓ 20260404200000_create_missing_rpc_functions.sql
✓ 20260404200500_add_order_management_rpcs.sql
✓ 20260404201000_add_inventory_and_payment_schema.sql
✓ 20260404202000_add_payment_processing_rpcs.sql

All migrations applied successfully!
```

**If Error:** 
- Run again: `supabase db push --force`
- Check status: `supabase migrations list --remote`

---

## STEP 2: Verify RPC Functions Created

```bash
# Check that all RPC functions exist
supabase functions list

# Should show availability of:
✓ create_manual_counter_order
✓ record_manual_order_payment
✓ revert_order_payment
✓ advance_order_status
✓ deduct_inventory_on_order
✓ process_order_payment
✓ check_and_confirm_payment
```

---

## STEP 3: Deploy Edge Functions

### Option A: Using Supabase Dashboard (EASIEST)
```
1. Go: https://console.supabase.com/projects
2. Select your project
3. Click: Functions (left sidebar)
4. For each function below, create it:
   - qr-validate
   - payment-links-create
   - payment-webhook

5. Copy code from:
   supabase/functions/{name}/index.ts

6. Paste in dashboard
7. Click: Deploy
8. Verify: Shows "✅ Active"
```

### Option B: Using CLI
```bash
supabase functions deploy qr-validate
supabase functions deploy payment-links-create
supabase functions deploy payment-webhook
```

**Verify:**
```bash
supabase functions list
# Should show all 3 as "ACTIVE"
```

---

## STEP 4: Frontend Already Updated

✅ **No action needed!** Frontend code is updated with:
- New working customer menu component
- Order acceptance UI
- Payment processing
- Inventory tracking

Everything is already deployed to Vercel in previous steps.

---

## STEP 5: Test Core Features

### TEST 1: Customer Places Order Via QR
```
Step-by-step:
1. Open: https://adruva-charm-engine.vercel.app
2. Navigate to restaurant (select owner)
3. Scan QR code (or manually navigate to: /?qr=test)
4. See menu with food items
5. Add items to cart
6. Click "Place Order & Pay"
7. ✅ Order created
8. ✅ See payment link QR

If fails:
- Check browser console for errors
- Check Supabase logs
- Verify owner_id passed correctly
```

### TEST 2: Kitchen Accepts Order
```
1. Go to KDS (Kitchen Display): Dashboard
   https://adruva-charm-engine.vercel.app/kitchen-display
2. Should see order in "New" column
3. Click button "Mark accepted"
4. ✅ Order moves to "Accepted" column
5. ✅ Shows "Mark preparing" button

If fails:
- advance_order_status RPC not deployed
- Run: supabase db push
- Verify RPC exists: supabase functions list
```

### TEST 3: Cashier Creates Counter Order
```
1. Go to Cashier Dashboard
   https://adruva-charm-engine.vercel.app/cashier
2. Click "Create Manual Order"
3. Fill in:
   - Restaurant
   - Table number
   - Items & quantity
4. Click "Create Order"
5. ✅ Order appears in list
6. ✅ Can record payment

If fails:
- create_manual_counter_order RPC not working
- Run: supabase db push again
- Check Supabase logs
```

### TEST 4: Payment Processing
```
1. Place order (₹500 total)
2. Click "Pay Now"
3. Get payment link
4. **To test without real payment:**
   - Manually update order status:
     UPDATE orders SET status = 'accepted' WHERE id = '{order_id}'
   - OR use Razorpay test mode (contact admin)
5. ✅ Order status changes to "accepted"
6. ✅ Appears in KDS
7. ✅ Inventory deducted

If fails:
- Check if payment gateway credentials set
- Verify webhook URL is correct
- Manually process via DB query above
```

### TEST 5: Inventory Deduction
```
1. Place order with 5× Rice (assuming 20 available)
2. After payment:
   - Query: SELECT current_stock FROM menu_items WHERE name = 'Rice'
   - Should show: 15 (not 20)
3. ✅ Inventory properly deducted

If fails:
- Check if deduct_inventory_on_order RPC works
- Verify order_items table has menu_item_id
```

---

## STEP 6: (Optional) Full Payment Gateway Setup

### Configure Razorpay Webhook
```
1. Go: https://dashboard.razorpay.com/settings/webhooks
2. Click: "Add New Webhook"
3. Fill in:
   URL: https://adruva-charm-engine.vercel.app/api/webhooks/payment-callback
   Events: payment.authorized, payment.captured, payment.failed
   Active: YES
4. Save
5. Copy Webhook Secret
6. Add to Vercel Env Vars:
   RAZORPAY_WEBHOOK_SECRET = {secret}
```

### Configure PhonePe Webhook
```
1. Go: https://dashboard.phonepe.com
2. Navigate: Settings → Webhooks
3. Add Webhook:
   URL: https://adruva-charm-engine.vercel.app/api/webhooks/payment-callback
   Events: transaction.success, transaction.failure
   Active: YES
4. Save
5. Copy API Key
6. Add to Vercel Env Vars:
   PHONEPE_API_KEY = {key}
```

---

## STEP 7: Monitor Errors

### Check Supabase Logs
```bash
supabase functions list # Show function status

# Check specific function logs
supabase functions logs qr-validate
supabase functions logs payment-links-create  
supabase functions logs payment-webhook
```

### Check Vercel Logs
```
1. Go: https://vercel.com/hero1749t/adruva-charm-engine
2. Click: Functions (top right)
3. Select: payment-links/create or qr/validate
4. See: Real-time logs
```

### Check Browser Console
```
1. Open: https://adruva-charm-engine.vercel.app
2. Press: F12 (Developer Tools)
3. Go to: Console tab
4. Look for: Errors or warnings
5. Check: Network tab for failed API calls
```

---

## TROUBLESHOOTING

### "Order not created" Error

**Check:**
1. Is owner_id correct? (UUID format)
2. Do menu items exist?
3. Is database connection working?

**Fix:**
```bash
# Verify database connection
supabase db list # Should show tables

# Check menu items exist
supabase db query "SELECT COUNT(*) FROM menu_items"
# Should return > 0
```

---

### "RPC does not exist" Error

**Check:**
1. Did migrations apply? `supabase migrations list --remote`
2. Are all new migrations shown?

**Fix:**
```bash
supabase db push --force
supabase db refresh
```

---

### "Payment link timeout" Error  

**This is FIXED in latest code (8 second timeout)**

But if still occurring:
```
1. Check internet connection
2. Check Razorpay API status
3. Try again (sometimes just slow)
4. Logs: supabase functions logs payment-links-create
```

---

### "Webhook not received" Error

**Check:**
1. Is webhook URL correct?
   - Should be: `https://adruva-charm-engine.vercel.app/api/webhooks/payment-callback`
2. Is payment gateway configured?
3. Did payment actually complete?

**Fix:**
```bash
# Manually test webhook
curl -X POST https://adruva-charm-engine.vercel.app/api/webhooks/payment-callback \
  -H "Content-Type: application/json" \
  -d '{
    "event": "payment.authorized",
    "payload": {
      "orderId": "order-123",
      "amount": 50000
    }
  }'

# Should return: 200 OK
```

---

## ✅ COMPLETION CHECKLIST

Mark as you complete:

- [ ] **STEP 1:** Migrations applied `supabase db push`
- [ ] **STEP 2:** RPC functions visible `supabase functions list`
- [ ] **STEP 3:** Edge Functions deployed (qr, payment-links, payment-webhook)
- [ ] **STEP 4:** Frontend automatically updated
- [ ] **STEP 5a:** Customer can place QR order
- [ ] **STEP 5b:** Kitchen can accept order (status changes)
- [ ] **STEP 5c:** Cashier dashboard works
- [ ] **STEP 5d:** Payment integrates (manual or full)
- [ ] **STEP 5e:** Inventory properly deducted
- [ ] **STEP 6:** (Optional) Payment webhooks configured
- [ ] **STEP 7:** Error monitoring working

---

## 🎉 DONE!

When all checkboxes above are checked, your system is **FULLY WORKING**:

✅ Customers can order via QR  
✅ Orders appear in kitchen  
✅ Kitchen accepts orders  
✅ Payments processed  
✅ Inventory tracked  
✅ Cashier orders work  

**You're LIVE!** 🚀

---

## NEED HELP?

Check these files for more details:
1. `CRITICAL_FIXES_APPLIED.md` - What was fixed and why
2. `FAST_DEPLOYMENT_20MIN_GUIDE.md` - Deployment steps
3. `FEATURE_VERIFICATION_CHECKLIST.md` - Detailed testing

---

**Start with STEP 1 → STEP 7 in order. Don't skip!**

Go! 🚀
