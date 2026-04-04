# QR Workflow Quick Start Guide

Get the QR payment workflow running in 15 minutes. For complete documentation, see the other guides in `/docs`.

---

## 30-Second Summary

**What is this?**
Complete QR code scanning → Menu ordering → Payment processing system. Customers scan QR on table, order food, pay via UPI or pay at counter.

**What's included?**
- QR validation
- Payment link generation (Razorpay/PhonePe)
- Manual entry fallback
- Webhook handling
- Order abandonment tracking

**Architecture:**
```
Customer scans QR → Menu loads → Places order → Selects payment method
                      ↓                              ↓
                 Backend validates              If UPI: Shows payment QR
                 table exists                   If Cashier: Notifies staff
                      ↓
                 Database records scan + order
```

---

## 5-Minute Local Setup

### Prerequisites
```bash
# Check versions
node --version    # 18+
npm --version     # 9+
docker --version  # Optional, for local Supabase
```

### Setup Steps

**1. Install & configure:**
```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local - add test Razorpay keys:
# RAZORPAY_KEY_ID=rzp_test_xxxxx
# RAZORPAY_KEY_SECRET=test_xxxxx
```

**2. Start services:**
```bash
# Terminal 1: Local Supabase
supabase start

# Terminal 2: Install & run
npm install
npm run dev
```

**3. Deploy database:**
```bash
supabase db push
supabase functions deploy qr-validate
supabase functions deploy payment-links-create
supabase functions deploy payment-webhook
```

**✅ Done!** App running on `http://localhost:5173`

---

## 5-Minute First Test

### Test QR Flow

**1. Create test restaurant & table:**
```bash
# In Supabase dashboard SQL Editor, run:
INSERT INTO restaurants (id, name, owner_id) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Test Restaurant', 'owner-uuid');

INSERT INTO tables (restaurant_id, table_number, capacity)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 5, 4);
```

**2. Navigate to menu:**
```
http://localhost:5173/menu/550e8400-e29b-41d4-a716-446655440000?table=5
```

**3. Test payment flow:**
- Add item to cart
- Click "Order"
- See PaymentMethodSelector (UPI or Cashier)
- Click "Pay Online"
- See payment QR code with countdown

**✅ If QR shows:** It's working!

---

## 10-Minute API Testing

### Test Each Endpoint

**1. QR Validation:**
```bash
curl -X POST http://localhost:5173/api/qr/validate \
  -H "Content-Type: application/json" \
  -d '{"ownerId":"550e8400-e29b-41d4-a716-446655440000","tableNumber":5}'

# Expected: { "success": true, "menuUrl": "/menu/550e..." }
```

**2. Payment Link Creation:**
```bash
curl -X POST http://localhost:5173/api/payment-links/create \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-123",
    "amount": 520.50,
    "gateway": "razorpay",
    "customerPhone": "919876543210"
  }'

# Expected: { "success": true, "paymentUrl": "https://...", "qrCode": "..." }
```

**3. Check database:**
```bash
# In Supabase SQL Editor:
SELECT * FROM qr_scan_logs LIMIT 1;
SELECT * FROM payment_link_tokens LIMIT 1;
SELECT * FROM order_abandonment_tracking LIMIT 1;
```

**✅ If all return data:** Setup complete!

---

## Key Files Reference

### What Does What

| File | Purpose | Lines |
|------|---------|-------|
| `supabase/migrations/` | Database schema & functions | 451 |
| `src/services/PaymentLinkGenerator.ts` | Payment link generation | 321 |
| `supabase/functions/qr-validate/` | QR validation backend | 101 |
| `supabase/functions/payment-links-create/` | Payment link creation | 206 |
| `supabase/functions/payment-webhook/` | Webhook handling | 281 |
| `src/components/PaymentMethodSelector.tsx` | UPI or Cashier choice | 145 |
| `src/components/PaymentLinkDisplay.tsx` | Show QR code | 236 |
| `src/hooks/useQRValidation.ts` | QR lookup hook | 70 |
| `src/hooks/usePaymentLinks.ts` | Payment link hook | 122 |
| `src/app/api/qr/validate/route.ts` | QR endpoint | 55 |
| `src/app/api/payment-links/create/route.ts` | Payment endpoint | 58 |
| `src/app/api/webhooks/payment-callback/route.ts` | Webhook endpoint | 107 |

### Where Code Lives

```
src/
├── components/
│   ├── PaymentMethodSelector.tsx    ← After order, choose UPI vs Cashier
│   ├── PaymentLinkDisplay.tsx       ← Shows QR code
│   └── ManualEntryForm.tsx          ← QR fallback
├── hooks/
│   ├── useQRValidation.ts           ← Validate table
│   ├── usePaymentLinks.ts           ← Generate payment link
│   └── useOrderAbandonment.ts       ← Track unpaid orders
├── services/
│   └── PaymentLinkGenerator.ts      ← Call Razorpay/PhonePe
└── app/api/
    ├── qr/validate/route.ts         ← POST /api/qr/validate
    ├── payment-links/create/route.ts ← POST /api/payment-links/create
    └── webhooks/payment-callback/   ← POST /api/webhooks/payment-callback

supabase/
├── migrations/                      ← Database schema
├── functions/
│   ├── qr-validate/                 ← Validate QR
│   ├── payment-links-create/        ← Create payment link
│   └── payment-webhook/             ← Handle webhooks
```

---

## Common Tasks

### Add a New Restaurant

```bash
# In Supabase SQL Editor:
INSERT INTO restaurants 
  (id, name, owner_id, table_count) 
VALUES 
  ('your-uuid', 'Restaurant Name', 'owner-uuid', 20)
RETURNING id;
```

### Add Tables to Restaurant

```bash
INSERT INTO tables (restaurant_id, table_number, capacity) 
VALUES 
  ('restaurant-id', 1, 4),
  ('restaurant-id', 2, 4),
  ('restaurant-id', 3, 8);
```

### View Payment Attempts

```sql
-- Recent payments
SELECT * FROM payment_link_tokens 
ORDER BY created_at DESC LIMIT 10;

-- By status
SELECT status, COUNT(*) FROM payment_link_tokens 
GROUP BY status;
```

### Check Abandoned Orders

```sql
-- Unpaid orders from >30 minutes ago
SELECT * FROM order_abandonment_tracking 
WHERE status = 'active' 
AND EXTRACT(EPOCH FROM (NOW() - created_at)) > 1800;
```

### View QR Scan Logs

```sql
-- Recent scans
SELECT * FROM qr_scan_logs 
ORDER BY created_at DESC LIMIT 20;

-- Failed scans
SELECT * FROM qr_scan_logs 
WHERE is_successful = false 
ORDER BY created_at DESC;
```

---

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| "Cannot find module" | Run `npm install` |
| "Supabase connection failed" | Run `supabase start` |
| "Table doesn't exist" | Run `supabase db push` |
| "QR code not scanning" | Check internet connection, try refreshing |
| "Payment link not generating" | Verify Razorpay credentials in .env.local |
| "Webhook not working" | Check webhook secret matches |
| "Components not showing" | Clear cache: `npm run dev` after changes |

---

## Check Implementation Status

Run this to verify everything is set up:

```bash
# 1. Database tables
supabase db query "SELECT table_name FROM information_schema.tables 
  WHERE table_name IN ('qr_scan_logs', 'order_abandonment_tracking', 'payment_link_tokens')"

# Should output: 3 rows (tables exist)

# 2. Edge functions
supabase functions list

# Should output: 3 functions (qr-validate, payment-links-create, payment-webhook)

# 3. React components
ls src/components/Payment* src/components/ManualEntry*

# Should output: 3 files exist

# 4. Hooks
ls src/hooks/use*Validation.ts src/hooks/usePayment*.ts

# Should output: 3 files exist

# 5. API routes
ls src/app/api/qr src/app/api/payment-links src/app/api/webhooks

# Should exist: 3 route directories
```

**If all ✅ exist:** Fully deployed!

---

## Running Tests

```bash
# Run test script
bash scripts/test-qr-workflow.sh

# Run specific test
bash scripts/test-qr-workflow.sh qr        # QR validation
bash scripts/test-qr-workflow.sh payment   # Payment links
bash scripts/test-qr-workflow.sh webhook   # Webhooks
bash scripts/test-qr-workflow.sh flow      # Full flow
```

---

## Environment Variables Quick Reference

```env
# Razorpay (test keys for development)
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=test_xxxxx
RAZORPAY_WEBHOOK_SECRET=test_webhook_secret

# Supabase
VITE_SUPABASE_URL=http://localhost:54321  # Local
VITE_SUPABASE_ANON_KEY=eyJ...

# Optional: PhonePe
PHONEPE_MERCHANT_ID=your_merchant_id
PHONEPE_API_KEY=your_api_key

# Base URL for menu links
NEXT_PUBLIC_BASE_URL=http://localhost:5173
```

For production, update with LIVE keys from dashboards.

---

## Deployment Shortcuts

### Deploy to Staging
```bash
supabase db push --linked
supabase functions deploy qr-validate payment-links-create payment-webhook
vercel deploy --env=staging
bash scripts/test-qr-workflow.sh all
```

### Deploy to Production
```bash
supabase db push --linked
supabase functions deploy qr-validate payment-links-create payment-webhook
vercel deploy --prod
# Then configure webhooks in Razorpay/PhonePe dashboards
```

See `docs/QR_WORKFLOW_PRODUCTION_DEPLOYMENT.md` for detailed steps.

---

## Documentation Map

| Guide | When to Use |
|-------|------------|
| `QR_WORKFLOW_TECHNICAL_GUIDE.md` | Understand architecture |
| `QR_WORKFLOW_TESTING_GUIDE.md` | Test before deployment |
| `QR_WORKFLOW_PRODUCTION_DEPLOYMENT.md` | Deploy to production |
| `QR_WORKFLOW_TROUBLESHOOTING.md` | Something broke |
| `QR_WORKFLOW_INTEGRATION_CHECKLIST.md` | Verify everything works |

**Start here:** Read technical guide, then follow testing guide, then deploy.

---

## Next Steps

**Immediate (Today):**
1. ✅ Clone repo and install dependencies
2. ✅ Set up `.env.local` with test credentials
3. ✅ Run `supabase db push` to deploy database
4. ✅ Test QR validation flow locally
5. ✅ Test payment link generation

**short-term (This Week):**
1. ✅ Test complete end-to-end flow
2. ✅ Test with real payment gateway (test mode)
3. ✅ Deploy to staging
4. ✅ Get team to test on staging
5. ✅ Fix any issues found

**Production (Next Week):**
1. ✅ Deploy to production
2. ✅ Configure webhooks in Razorpay/PhonePe
3. ✅ Monitor first 24 hours
4. ✅ Optimize based on metrics
5. ✅ Plan enhancements

---

## Getting Help

**Issue not in Quick Fixes above?**
1. Check `QR_WORKFLOW_TROUBLESHOOTING.md` for your specific error
2. Check `/memories/session/` for notes from previous debugging
3. Review logs: `supabase functions logs payment-webhook`
4. Ask team/check previous conversations

**Still stuck?**
- Post error message + steps to reproduce
- Include environment details (local/staging/production)
- Include which component failing (QR, payment, webhook)

---

## Success Indicators

You'll know it's working when:

✅ QR validation returns menu URL  
✅ Payment link generates with QR code  
✅ Manual entry form validates tables  
✅ Webhook signatures verify correctly  
✅ Orders recorded in database  
✅ PaymentMethodSelector appears after order  
✅ PaymentLinkDisplay shows countdown  
✅ Abandonment tracking records unpaid orders  

All ✅ = Production ready!

---

## 1-Minute Checklist

Before declaring "working":

- [ ] Local server running: `npm run dev`
- [ ] Supabase running: `supabase start`
- [ ] Database deployed: `supabase db push`
- [ ] Functions deployed: `supabase functions deploy qr-validate ...`
- [ ] Menu page loads: http://localhost:5173/menu/[uuid]?table=5
- [ ] Order flow works: Add item → Order → See PaymentMethodSelector
- [ ] QR code displays: Click "Pay Online" → See QR + countdown

**All ✅ = Ready!** Proceed to testing guide for detailed verification.
