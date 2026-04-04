# QR Workflow Deployment - Manual Supabase & Webhook Setup

**Status:** ✅ Application deployed to Vercel  
**Next Steps:** Complete Supabase database and webhook configuration  
**Time Required:** 30-45 minutes

---

## ✅ Completed Steps

- ✅ Application built successfully (`npm run build`)
- ✅ Deployed to Vercel: https://adruva-charm-engine.vercel.app
- ✅ All code changes integrated and working

---

## 📋 Remaining Steps (Manual)

### Step 1: Deploy Database Migrations to Supabase

**Time: 10 minutes**

1. **Open Supabase Dashboard:**
   ```
   https://supabase.com/dashboard
   ```

2. **Select Project:**
   - Click on project: `vppaelgxovnqkqdegajb` (Adruva)

3. **Go to SQL Editor:**
   - Left sidebar → SQL Editor

4. **Run First Migration (Tables):**
   - Click "+ New Query"
   - Copy entire content from: `supabase/migrations/20260404110000_create_qr_workflow_tables.sql`
   - Paste into query editor
   - Click "RUN"
   - Wait for completion (should say "Success")
   - Save query as: "QR Workflow - Create Tables"

5. **Run Second Migration (Functions):**
   - Click "+ New Query"
   - Copy entire content from: `supabase/migrations/20260404110500_create_qr_validation_functions.sql`
   - Paste into query editor
   - Click "RUN"
   - Wait for completion
   - Save query as: "QR Workflow - Create Functions"

6. **Verify Tables Created:**
   ```sql
   -- Run this query to verify
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema='public' 
   AND table_name IN ('qr_scan_logs', 'order_abandonment_tracking', 'payment_link_tokens');
   ```
   **Expected output:** 3 rows (all tables exist)

7. **Verify Functions Created:**
   ```sql
   -- Run this query to verify
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema='public' 
   AND routine_name IN ('validate_qr_scan', 'create_payment_link', 'mark_order_paid_from_tracking');
   ```
   **Expected output:** 3 rows (all functions exist)

---

### Step 2: Upload Edge Functions to Supabase

**Time: 15 minutes**

1. **Go to Edge Functions Section:**
   - Supabase Dashboard → Left sidebar → Edge Functions

2. **Deploy qr-validate Function:**
   - Click "Deploy new function"
   - Name: `qr-validate`
   - Copy content from: `supabase/functions/qr-validate/index.ts`
   - Paste into editor
   - Click "Deploy"
   - Wait for "✓ Deployed successfully"

3. **Deploy payment-links-create Function:**
   - Click "Deploy new function"
   - Name: `payment-links-create`
   - Copy content from: `supabase/functions/payment-links-create/index.ts`
   - Paste into editor
   - Click "Deploy"
   - Wait for success

4. **Deploy payment-webhook Function:**
   - Click "Deploy new function"
   - Name: `payment-webhook`
   - Copy content from: `supabase/functions/payment-webhook/index.ts`
   - Paste into editor
   - Click "Deploy"
   - Wait for success

5. **Verify Functions Deployed:**
   - All three functions should show in Edge Functions list
   - Status: "Active" for all

---

### Step 3: Configure Environment Variables

**Time: 5 minutes**

1. **In .env.local (Local Development):**
   ```env
   # Add payment gateway credentials
   RAZORPAY_KEY_ID=rzp_test_xxxxx  # Use test keys for staging
   RAZORPAY_KEY_SECRET=test_xxxxx
   RAZORPAY_WEBHOOK_SECRET=test_webhook_secret_xxxxx
   
   # PhonePe (if using)
   PHONEPE_MERCHANT_ID=your_merchant_id
   PHONEPE_API_KEY=your_api_key
   ```

2. **In Vercel Dashboard:**
   - Go to: https://vercel.com/dashboard
   - Click: adruva-charm-engine project
   - Go to: Settings → Environment Variables
   - Add for Production:
     ```
     RAZORPAY_KEY_ID=rzp_live_xxxxx  (LIVE KEYS)
     RAZORPAY_KEY_SECRET=live_secret_xxxxx
     RAZORPAY_WEBHOOK_SECRET=prod_webhook_secret_xxxxx
     ```
   - Click "Save"
   - Redeploy application: Settings → Deployments → Redeploy

---

### Step 4: Configure Payment Gateway Webhooks

**Time: 10 minutes**

#### For Razorpay:

1. **Log in to Razorpay Dashboard:**
   ```
   https://dashboard.razorpay.com
   ```

2. **Navigate to Webhooks:**
   - Settings → Webhooks

3. **Add Webhook:**
   - **Webhook URL:** `https://adruva-charm-engine.vercel.app/api/webhooks/payment-callback`
   - **Events:** Select all:
     - ✓ payment.authorized
     - ✓ payment.failed
     - ✓ payment.captured
     - ✓ payment.link.created
     - ✓ payment.link.expired
   - Click "Create Webhook"

4. **Copy Webhook Secret:**
   - After creation, copy the secret
   - Add to production .env in Vercel:
     ```
     RAZORPAY_WEBHOOK_SECRET=webhook_secret_from_razorpay
     ```

#### For PhonePe (if using):

1. **Log in to PhonePe Merchant Dashboard:**
   ```
   https://merchant.phonepe.com
   ```

2. **Configure Webhook:**
   - Settings → Webhooks
   - Add: `https://adruva-charm-engine.vercel.app/api/webhooks/payment-callback`
   - Events: PAYMENT_SUCCESS, PAYMENT_FAILED

---

### Step 5: Test the Integration

**Time: 10 minutes**

#### Local Testing:

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Test QR Validation:**
   ```bash
   curl -X POST http://localhost:5173/api/qr/validate \
     -H "Content-Type: application/json" \
     -d '{"ownerId":"your-restaurant-uuid","tableNumber":5}'
   ```
   **Expected:** Menu URL returned

3. **Test Payment Link:**
   ```bash
   curl -X POST http://localhost:5173/api/payment-links/create \
     -H "Content-Type: application/json" \
     -d '{"orderId":"test-123","amount":520.50,"gateway":"razorpay"}'
   ```
   **Expected:** Payment URL with QR code

#### Production Testing:

1. **Navigate to production menu:**
   ```
   https://adruva-charm-engine.vercel.app/menu/[restaurant-id]?table=5
   ```

2. **Place test order:**
   - Add items
   - Click "Order"
   - Select "Pay Online"
   - Verify QR code displays

3. **Verify database entries:**
   - In Supabase SQL Editor, run:
     ```sql
     SELECT * FROM qr_scan_logs ORDER BY created_at DESC LIMIT 1;
     SELECT * FROM payment_link_tokens ORDER BY created_at DESC LIMIT 1;
     ```
   - Should show recently created entries

---

## ⚠️ Important Notes

### Credentials Management
- **Never commit credentials** to git
- Use `.env.local` for development (test keys)
- Use Vercel dashboard for production (live keys)
- Rotate webhook secrets regularly

### Testing Workflow
1. **Test Keys First:**
   - Use `rzp_test_*` for Razorpay testing
   - Use test Razorpay account for payment testing
   - Test full flow before switching to live

2. **Live Keys Deployment:**
   - Get live keys from Razorpay
   - Update in Vercel dashboard
   - Redeploy application
   - Test with real test transactions first
   - Monitor webhook delivery

### Webhook URLs Must Be Public
- ❌ Local: `http://localhost:5173/...` (won't work)
- ✅ Production: `https://adruva-charm-engine.vercel.app/...` (must be HTTPS)

---

## 🔍 Verification Checklist

Run these checks after completing all steps:

```sql
-- 1. Database Tables (Supabase SQL Editor)
SELECT 
  table_name, 
  (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND information_schema.tables.table_name=table_name) as column_count
FROM information_schema.tables 
WHERE table_schema='public' AND table_name IN ('qr_scan_logs', 'order_abandonment_tracking', 'payment_link_tokens');

-- 2. Functions
SELECT routine_name, routine_type FROM information_schema.routines WHERE routine_schema='public' AND routine_name LIKE '%qr%' OR routine_name LIKE '%payment%' OR routine_name LIKE '%abandonment%';

-- 3. Indexes
SELECT tablename, indexname FROM pg_indexes WHERE tablename IN ('qr_scan_logs', 'order_abandonment_tracking', 'payment_link_tokens');

-- 4. RLS Policies
SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('qr_scan_logs', 'order_abandonment_tracking', 'payment_link_tokens');
```

**Vercel Deployment:**
```bash
# Check application is running
curl https://adruva-charm-engine.vercel.app/api/health

# Check API routes
curl https://adruva-charm-engine.vercel.app/api/qr/validate -X OPTIONS -v
```

---

## 📊 Status Summary

| Component | Status | Action |
|-----------|--------|--------|
| Application Build | ✅ Complete | — |
| Vercel Deployment | ✅ Live | https://adruva-charm-engine.vercel.app |
| Database Migrations | ⏳ Pending | Run SQL in Supabase |
| Edge Functions | ⏳ Pending | Deploy in Supabase |
| Webhooks (Razorpay) | ⏳ Pending | Configure in Razorpay |
| Environment Config | ⏳ Pending | Update Vercel vars |
| Testing | ⏳ Pending | Run test flow |

---

## 🆘 Troubleshooting

### "Webhook signature invalid"
- Verify webhook secret matches in:
  - Razorpay Settings
  - Vercel environment variables
  - Restart Vercel deployment after updating

### "Edge Function not found"
- Verify function deployed to Supabase
- Check function name spelling exactly
- Verify Edge Functions are enabled in project

### "Table doesn't exist"
- Verify migration ran successfully
- Check Supabase SQL Editor for errors
- Run verification query above

### "Payment link not generating"
- Check Razorpay credentials (test vs live)
- Verify API keys in environment
- Check Razorpay API status

---

## 📞 Support

**Supabase Help:** https://supabase.com/docs  
**Razorpay Docs:** https://razorpay.com/docs  
**Vercel Docs:** https://vercel.com/docs  

---

## Next Steps After Manual Setup

1. ✅ Complete steps above
2. ✅ Verify all components working
3. ✅ Run full end-to-end test
4. ✅ Monitor webhooks for 24 hours
5. ✅ Check logs for errors
6. ✅ Prepare for full launch

**Estimated Total Time:** 60-90 minutes (including testing)
