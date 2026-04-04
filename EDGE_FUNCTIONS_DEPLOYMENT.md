# 📋 EDGE FUNCTIONS DEPLOYMENT INSTRUCTIONS

## Install Supabase CLI (Choose One)

### Option A: Using Homebrew (macOS/Linux)
```bash
brew install supabase/tap/supabase
```

### Option B: Using Windows Installer
```powershell
# Download and run from: https://github.com/supabase/cli/releases
# Or use Chocolatey
choco install supabase-cli
```

### Option C: Using npm with proper setup
```bash
npm install -g supabase@latest
```

### Option D: Using Docker (No installation needed)
```bash
docker run -it supabase/supabase exec supabase functions deploy
```

---

## After CLI Installation: Deploy Edge Functions

### Step 1: Login to Supabase
```bash
supabase login
# Paste your Supabase access token when prompted
# Get token from: https://app.supabase.com/account/tokens
```

### Step 2: Deploy Each Function

```bash
# Function 1: QR Validation
supabase functions deploy qr-validate

# Function 2: Payment Links Creation
supabase functions deploy payment-links-create

# Function 3: Payment Webhooks
supabase functions deploy payment-webhook
```

### Step 3: Verify Deployment
```bash
supabase functions list
# Should show:
# qr-validate
# payment-links-create
# payment-webhook
```

---

## Alternative: Deploy via Supabase Dashboard (NO CLI NEEDED)

### For Each Function (qr-validate, payment-links-create, payment-webhook):

1. Go to: https://console.supabase.com/project/YOUR_PROJECT_ID/functions
2. Click "+ Create a new function"
3. Name: `qr-validate` (or other names)
4. Copy code from workspace:
   - `supabase/functions/qr-validate/index.ts`
   - `supabase/functions/payment-links-create/index.ts`
   - `supabase/functions/payment-webhook/index.ts`
5. Paste into editor
6. Click "Deploy"
7. Verify: Should show "✅ Deployed"

---

## Edge Functions to Deploy

### 1️⃣ QR Validation Function

**File:** `supabase/functions/qr-validate/index.ts`

**Purpose:** Validate QR scans with owner ID and table number

**Deploy:**
```bash
supabase functions deploy qr-validate
```

**Test:**
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/qr-validate \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "ownerId": "test-uuid",
    "tableNumber": 5
  }'
```

---

### 2️⃣ Payment Links Creation Function

**File:** `supabase/functions/payment-links-create/index.ts`

**Purpose:** Create payment links with Razorpay/PhonePe

**Deploy:**
```bash
supabase functions deploy payment-links-create
```

**Test:**
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/payment-links-create \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order_123",
    "amount": 500,
    "customerPhone": "9876543210",
    "customerEmail": "test@gmail.com"
  }'
```

---

### 3️⃣ Payment Webhook Function

**File:** `supabase/functions/payment-webhook/index.ts`

**Purpose:** Handle payment webhooks from Razorpay/PhonePe

**Deploy:**
```bash
supabase functions deploy payment-webhook
```

**Webhook Configuration:**
```
Razorpay Webhook URL: https://YOUR_PROJECT.supabase.co/functions/v1/payment-webhook
PhonePe Webhook URL: https://YOUR_PROJECT.supabase.co/functions/v1/payment-webhook
```

---

## Environment Variables for Edge Functions

Edge Functions need access to secrets. Set these:

```bash
# For each Edge Function
supabase secrets set RAZORPAY_KEY_SECRET="your-secret"
supabase secrets set RAZORPAY_WEBHOOK_SECRET="your-webhook-secret"
supabase secrets set PHONEPE_API_KEY="your-api-key"
```

Or via Dashboard:
1. Go to Settings → Functions
2. Click "Secrets"
3. Add each secret key-value pair
4. Functions auto-reload with new secrets

---

## Files to Deploy

Location in workspace:
```
supabase/functions/
├── _shared/
│   └── edge-helpers.ts           (Shared utilities)
├── qr-validate/
│   └── index.ts                  (✅ Deploy this)
├── payment-links-create/
│   └── index.ts                  (✅ Deploy this)
└── payment-webhook/
    └── index.ts                  (✅ Deploy this)
```

---

## Troubleshooting

### Issue: "Command not found: supabase"
**Solution:**
- Install Supabase CLI from: https://github.com/supabase/cli#install-the-cli
- Or use Docker approach
- Or use Dashboard deployment

### Issue: "Authentication failed"
**Solution:**
```bash
supabase logout
supabase login
# Follow the prompt to generate new token
```

### Issue: "Function deploy failed"
**Solution:**
- Check syntax errors: `npm run test`
- Check dependencies are imported correctly
- Verify Deno imports (Edge Functions use Deno, not Node)

### Issue: "Timeout when calling function"
**Solution:**
- Function might be too slow
- Check logs: `supabase functions delete qr-validate` then redeploy
- Optimize queries

---

## After Deployment: Verify Functions

### Check Functions Dashboard
```
https://console.supabase.com/project/YOUR_PROJECT/functions
```

Should list:
- ✅ qr-validate
- ✅ payment-links-create
- ✅ payment-webhook

All showing "✅ ACTIVE"

### Test Each Function
```bash
# Test qr-validate
curl https://YOUR_PROJECT.supabase.co/functions/v1/qr-validate \
  -X POST \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Should return: 200 OK

# Test payment-links-create  
curl https://YOUR_PROJECT.supabase.co/functions/v1/payment-links-create \
  -X POST \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Should return: 200 OK (with payment URL)

# Test payment-webhook
curl https://YOUR_PROJECT.supabase.co/functions/v1/payment-webhook \
  -X POST \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Should return: 200 OK
```

---

## Next: API Routes Using Edge Functions

After Edge Functions deployed, API routes in Vercel will call:

```typescript
// Example API route calling Edge Function
async function createPaymentLink(req) {
  const response = await fetch(
    `${process.env.VITE_SUPABASE_URL}/functions/v1/payment-links-create`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    }
  );
  
  return response.json();
}
```

This creates a 2-layer system:
1. **Vercel API Route** (fast, handles requests)
2. **Supabase Edge Function** (handles business logic)

---

## Status Tracking

After each deployment:
- [ ] qr-validate deployed ✅
- [ ] payment-links-create deployed ✅
- [ ] payment-webhook deployed ✅
- [ ] Environment variables set ✅
- [ ] Functions callable from API ✅
- [ ] Tests passing ✅

---

**Ready to deploy? Choose CLI or Dashboard method above!** 🚀
