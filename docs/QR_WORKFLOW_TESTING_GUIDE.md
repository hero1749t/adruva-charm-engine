# QR Workflow Testing Guide

Complete testing guide for the QR-to-Payment workflow. This covers all test scenarios, mock data, and verification steps.

## Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [Unit Test Scenarios](#unit-test-scenarios)
3. [Integration Test Scenarios](#integration-test-scenarios)
4. [End-to-End Test Scenarios](#end-to-end-test-scenarios)
5. [Manual Testing Guide](#manual-testing-guide)
6. [Test Data & Mock Objects](#test-data--mock-objects)
7. [Troubleshooting](#troubleshooting)

---

## Test Environment Setup

### Prerequisites

```bash
# Node.js 18+
node --version

# Supabase CLI
supabase --version

# Docker (for local Supabase)
docker --version

# Git
git --version
```

### Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Start local Supabase (optional, for local testing)
supabase start

# 3. Start development server
npm run dev

# 4. Run auto-tests
npm run test

# 5. Run test script
bash scripts/test-qr-workflow.sh
```

### Environment Variables for Testing

Create `.env.local` with these values:

```env
# Required for testing
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:5173

# For Razorpay testing
RAZORPAY_KEY_ID=rzp_test_1234567890abcd
RAZORPAY_KEY_SECRET=test_secret_key_1234567890

# For PhonePe testing
PHONEPE_MERCHANT_ID=test_merchant_123
PHONEPE_API_KEY=test_api_key_123

# Webhook secret
RAZORPAY_WEBHOOK_SECRET=webhook_secret_test_123
```

---

## Unit Test Scenarios

### 1. QR Validation Function

**Test: validate_qr_scan() RPC Function**

```sql
-- Test Case 1.1: Valid table
SELECT validate_qr_scan('550e8400-e29b-41d4-a716-446655440000'::uuid, 5);
-- Expected: { success: true, tableId: 'uuid', menuUrl: '/menu/550e8400...' }

-- Test Case 1.2: Invalid table (out of range)
SELECT validate_qr_scan('550e8400-e29b-41d4-a716-446655440000'::uuid, 999);
-- Expected: { success: false, error: 'Invalid table number' }

-- Test Case 1.3: Invalid restaurant
SELECT validate_qr_scan('00000000-0000-0000-0000-000000000000'::uuid, 5);
-- Expected: { success: false, error: 'Restaurant not found' }
```

**Expected Logs:**
- qr_scan_logs table updated with scan attempt
- Log includes: restaurant_id, table_number, is_successful, ip_address, user_agent

---

### 2. Payment Link Token Creation

**Test: create_payment_link() RPC Function**

```sql
-- Test Case 2.1: Create payment link token
SELECT create_payment_link(
  'order-123'::text,
  520.50::numeric,
  'RAZORPAY'::text,
  'rzp_test_1234567890'::text,
  'rzp-123456'::text,
  'test-idempotency-key'::text
);
-- Expected: { success: true, token_id: 'uuid', status: 'pending' }

-- Test Case 2.2: Duplicate request (idempotency)
SELECT create_payment_link(
  'order-123'::text,
  520.50::numeric,
  'RAZORPAY'::text,
  'rzp_test_1234567890'::text,
  'rzp-123456'::text,
  'test-idempotency-key'::text  -- Same key
);
-- Expected: { success: true, token_id: 'same-uuid-as-2.1', status: 'pending' }

-- Test Case 2.3: Exceeds maximum number of payment links
-- (Run 11 times with same order_id but different idempotency key)
-- Expected on 11th call: { success: false, error: 'Max payment links exceeded' }
```

---

### 3. Abandonment Tracking Functions

**Test: initialize_abandonment_tracking() & mark_order_paid_from_tracking()**

```sql
-- Test Case 3.1: Initialize abandonment tracking
SELECT initialize_abandonment_tracking(
  'order-456'::text,
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'table-123'::uuid,
  'customer-456'::uuid
);
-- Expected: { success: true, tracking_id: 'uuid', status: 'active' }

-- Test Case 3.2: Mark order as paid
SELECT mark_order_paid_from_tracking(
  'order-456'::text
);
-- Expected: { success: true, time_to_payment_seconds: 45, status: 'paid' }

-- Test Case 3.3: Check abandoned orders
SELECT check_abandoned_orders(
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  30  -- 30 minute threshold
);
-- Expected: Array of orders unpaid for >30 minutes
```

---

### 4. PaymentLinkGenerator Service

**Test: TypeScript Service Methods**

```typescript
// Test Case 4.1: Generate Razorpay payment link
const generator = new PaymentLinkGenerator();
const razorpayLink = await generator.generateRazorpayLink(
  'order-123',
  520.50,
  'customer@example.com',
  '919876543210'
);
// Expected: { url, qrCode, expiresAt: Date, idempotencyKey }

// Test Case 4.2: Automatic fallback (mock Razorpay failure)
// Simulate Razorpay auth failure
const fallbackLink = await generator.generatePhonePeLink(...); // Falls back
// Expected: PhonePe link generated

// Test Case 4.3: Get payment status
const status = await generator.getPaymentLinkStatus('payment-token-123');
// Expected: { status: 'completed'|'pending'|'failed', paidAt: Date|null }
```

---

## Integration Test Scenarios

### 5. QR Validation API Route

**Test: POST /api/qr/validate**

```bash
# Test Case 5.1: Valid request
curl -X POST http://localhost:5173/api/qr/validate \
  -H "Content-Type: application/json" \
  -d '{
    "ownerId": "550e8400-e29b-41d4-a716-446655440000",
    "tableNumber": 5
  }'
# Expected Response:
# { "success": true, "menuUrl": "/menu/550e8400...", "tableId": "uuid" }

# Test Case 5.2: Invalid table
curl -X POST http://localhost:5173/api/qr/validate \
  -H "Content-Type: application/json" \
  -d '{
    "ownerId": "550e8400-e29b-41d4-a716-446655440000",
    "tableNumber": 999
  }'
# Expected Response:
# { "success": false, "error": "Invalid table number" }

# Test Case 5.3: Missing parameters
curl -X POST http://localhost:5173/api/qr/validate \
  -H "Content-Type: application/json" \
  -d '{ "ownerId": "550e8400-e29b-41d4-a716-446655440000" }'
# Expected Response:
# 400 Bad Request - { "error": "Missing tableNumber" }
```

---

### 6. Payment Link Creation API Route

**Test: POST /api/payment-links/create**

```bash
# Test Case 6.1: Create Razorpay payment link
curl -X POST http://localhost:5173/api/payment-links/create \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order-123",
    "amount": 520.50,
    "gateway": "razorpay",
    "customerPhone": "919876543210",
    "customerEmail": "customer@example.com"
  }'
# Expected Response:
# { "success": true, "paymentUrl": "https://...", "qrCode": "...", "expiresAt": "ISO-date" }

# Test Case 6.2: Fallback to PhonePe (mock Razorpay failure)
# With RAZORPAY credentials invalid
curl -X POST http://localhost:5173/api/payment-links/create \
  -H "Content-Type: application/json" \
  -d '{ "orderId": "order-124", "amount": 100, "gateway": "razorpay" }'
# Expected Response:
# { "success": true, "paymentUrl": "phonepe://...", "fallbackGateway": "phonepe" }

# Test Case 6.3: Invalid amount
curl -X POST http://localhost:5173/api/payment-links/create \
  -H "Content-Type: application/json" \
  -d '{ "orderId": "order-125", "amount": -50 }'
# Expected Response:
# 400 Bad Request - { "error": "Amount must be positive" }
```

---

### 7. Webhook Signature Verification

**Test: POST /api/webhooks/payment-callback**

```bash
# Test Case 7.1: Valid Razorpay webhook
# Razorpay sends: payload + signature (HMAC-SHA256)
curl -X POST http://localhost:5173/api/webhooks/payment-callback \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: actual-hmac-signature" \
  -d '{
    "event": "payment.authorized",
    "payload": {
      "payment": {
        "entity": {
          "id": "pay_123456",
          "amount": 52050,
          "status": "captured"
        }
      }
    }
  }'
# Expected: 200 OK - { "success": true, "message": "Payment processed" }

# Test Case 7.2: Invalid signature (tampering attempt)
curl -X POST http://localhost:5173/api/webhooks/payment-callback \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: wrong-signature" \
  -d '{ "event": "payment.authorized" }'
# Expected: 401 Unauthorized - { "error": "Invalid signature" }

# Test Case 7.3: Duplicate webhook (idempotency)
# Send same webhook twice
curl -X POST http://localhost:5173/api/webhooks/payment-callback \
  -H "X-Razorpay-Signature: valid-signature" \
  -d '{ "event": "payment.authorized", "payload": { "payment": { "entity": { "id": "pay_123456" } } } }'
# First call: 200 OK
# Second call: 200 OK (idempotent, doesn't double-charge)
```

---

## End-to-End Test Scenarios

### 8. Complete QR to Payment Flow

**Scenario: Customer scans QR, orders food, pays via UPI**

**Prerequisites:**
- Development server running: `npm run dev`
- Supabase configured and migrations deployed
- Razorpay test credentials configured

**Steps:**

1. **Navigate to Menu**
   ```
   URL: http://localhost:5173/menu/550e8400-e29b-41d4-a716-446655440000?table=5
   Expected: Customer menu loads with restaurant items
   Verify: Table number shows in top bar
   ```

2. **Add Items to Cart**
   ```
   Action: Click "Biryani" → Select quantity 2 → Click "Add to Cart"
   Expected: Item added to cart, total updates
   Verify: Cart shows "2x Biryani - ₹400"
   ```

3. **Place Order**
   ```
   Action: Click "Order" button
   Expected: Loading spinner appears briefly
   Verify: Order created successfully in database
   Alert: Order confirmation toast
   ```

4. **Select Payment Method**
   ```
   Expected: PaymentMethodSelector component appears
   Options: "Pay Online (UPI)" and "Pay at Counter (Cashier)"
   Action: Click "Pay Online"
   Expected: Loading spinner appears
   ```

5. **Verify Payment Link Generation**
   ```
   Expected: PaymentLinkDisplay component appears
   Shows:
   - QR code (from Razorpay)
   - Amount: ₹400
   - Countdown timer: 15:00
   - "Pay Now" button
   - "Copy UPI" option
   ```

6. **Verify Database Records**
   ```sql
   -- Check payment_link_tokens table
   SELECT * FROM payment_link_tokens 
   WHERE order_id = 'order-id'
   ORDER BY created_at DESC LIMIT 1;
   
   Expected columns:
   - id: UUID
   - status: "pending"
   - gateway: "RAZORPAY"
   - payment_link_id: razorpay link
   - idempotency_key: matches request
   - expires_at: 15 minutes from now
   ```

7. **Check Scan Logs**
   ```sql
   SELECT * FROM qr_scan_logs 
   WHERE owner_id = '550e8400-e29b-41d4-a716-446655440000'
   ORDER BY created_at DESC LIMIT 1;
   
   Expected:
   - is_successful: true
   - table_number: 5
   - device_type: (browser type)
   ```

---

### 9. Manual Entry Fallback Flow

**Scenario: QR code not accessible, customer uses manual entry**

**Steps:**

1. **Navigate to Fallback Form**
   ```
   URL: http://localhost:5173/qr-manual-entry
   Expected: Form appears with two fields:
   - Restaurant dropdown (auto-populated)
   - Table number input (1-99)
   ```

2. **Enter Details**
   ```
   Action: Select restaurant → Enter table 5 → Click "Confirm"
   Expected: Validation call to /api/qr/validate
   Response: Menu URL generated
   Redirect: To menu with same flow as QR scan
   ```

3. **Error Case: Invalid Table**
   ```
   Action: Enter table 999 → Click "Confirm"
   Expected: Error toast: "Invalid table number"
   Form: Stays open for correction
   ```

---

### 10. Cashier Payment Flow

**Scenario: Customer chooses to pay at counter**

**Steps:**

1. **Order Placement**
   ```
   Same as Test 8, Steps 1-3
   ```

2. **Select Payment Method**
   ```
   Action: Click "Pay at Counter"
   Expected: No payment link generation
   ```

3. **Verify Cashier Dashboard**
   ```
   Navigate to: CashierDashboard
   Expected: Order appears as "Pending Payment"
   Shows: Table 5, Biryani (2x), Amount ₹400
   ```

4. **Mark as Paid**
   ```
   Action: Cashier clicks "Payment Received"
   Expected: Order status changes to "Paid"
   Database: payment_link_tokens created with status "completed"
   Abandonment: Tracking record updated to "paid"
   ```

---

## Manual Testing Guide

### Test Checklist

- [ ] **Local Environment**
  - [ ] Node dependencies installed (`npm install`)
  - [ ] Supabase migrations deployed (`supabase db push`)
  - [ ] Edge Functions deployed (`supabase functions deploy`)
  - [ ] Environment variables configured (`.env.local`)
  - [ ] Dev server running (`npm run dev`)

- [ ] **QR Validation**
  - [ ] Valid QR scan returns menu URL
  - [ ] Invalid table shows error
  - [ ] Scan logged to qr_scan_logs table
  - [ ] Manual entry form works
  - [ ] Form validation catches invalid tables

- [ ] **Payment Link Creation**
  - [ ] Razorpay link generated with valid credentials
  - [ ] QR code displays correctly
  - [ ] Countdown timer works (15 minutes)
  - [ ] "Copy UPI" button copies string
  - [ ] "Pay Now" button opens payment

- [ ] **Webhook Handling**
  - [ ] Razorpay webhook signature verified
  - [ ] PhonePe webhook signature verified
  - [ ] Duplicate webhooks handled (idempotent)
  - [ ] Payment status updated in database
  - [ ] Order tracking updated after payment

- [ ] **Component Integration**
  - [ ] PaymentMethodSelector appears after order
  - [ ] PaymentLinkDisplay shows QR code with amount
  - [ ] Manual fallback form accessible
  - [ ] Error boundaries catch failures gracefully

- [ ] **Database Records**
  - [ ] qr_scan_logs: Entries created for each scan
  - [ ] payment_link_tokens: Entries created for each payment attempt
  - [ ] order_abandonment_tracking: Entries created for orders
  - [ ] Statuses update correctly (pending → completed)

- [ ] **Error Scenarios**
  - [ ] Network timeout handled gracefully
  - [ ] Missing credentials fall back to PhonePe
  - [ ] Expired payment links show message
  - [ ] Invalid signature rejects webhook
  - [ ] Duplicate payment attempts prevented

---

## Test Data & Mock Objects

### Mock Restaurant Data

```typescript
const mockRestaurant = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Test Restaurant",
  owner_id: "550e8400-e29b-41d4-a716-446655440001",
  table_count: 20,
  is_active: true,
  created_at: new Date().toISOString()
};

const mockTables = [
  { id: "uuid-1", restaurant_id: mockRestaurant.id, table_number: 1, is_active: true, capacity: 4 },
  { id: "uuid-5", restaurant_id: mockRestaurant.id, table_number: 5, is_active: true, capacity: 4 },
  { id: "uuid-20", restaurant_id: mockRestaurant.id, table_number: 20, is_active: true, capacity: 8 }
];
```

### Mock Order Data

```typescript
const mockOrder = {
  id: "order-123",
  restaurant_id: "550e8400-e29b-41d4-a716-446655440000",
  table_id: "uuid-5",
  customer_id: "customer-uuid",
  items: [
    { name: "Biryani", quantity: 2, price: 200, total: 400 }
  ],
  total_amount: 400,
  tax: 72,
  grand_total: 472
};

const mockPaymentLink = {
  id: "link-123",
  order_id: "order-123",
  amount: 47200, // paise
  gateway: "RAZORPAY",
  payment_link_id: "plink_1234567890",
  upi_string: "upi://pay?pa=merchant@okhdfcbank&pn=Restaurant&am=472&tr=order-123",
  status: "pending",
  expires_at: new Date(Date.now() + 15 * 60000).toISOString()
};
```

### Mock Webhook Payloads

**Razorpay:**
```json
{
  "event": "payment.authorized",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_1234567890abcd",
        "entity": "payment",
        "amount": 52050,
        "currency": "INR",
        "status": "captured",
        "method": "upi",
        "description": "Payment for order-123",
        "notes": {
          "order_id": "order-123",
          "restaurant_id": "550e8400-e29b-41d4-a716-446655440000"
        }
      }
    }
  }
}
```

**PhonePe:**
```json
{
  "success": true,
  "code": "PAYMENT_SUCCESS",
  "message": "Your payment is successful",
  "data": {
    "merchantId": "MERCHANT_ID",
    "merchantTransactionId": "order-123",
    "transactionId": "phonepe_12345",
    "amount": 52050,
    "state": "COMPLETED",
    "responseCode": "Success",
    "paymentState": "SUCCESS"
  }
}
```

---

## Troubleshooting

### Issue: "Could not connect to Supabase"

**Solution:**
```bash
# Verify Supabase URL and key
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Check if local Supabase is running
supabase status

# Start local Supabase if stopped
supabase start
```

### Issue: "Migration: relation 'qr_scan_logs' does not exist"

**Solution:**
```bash
# Deploy migrations
supabase db push

# Verify table exists
supabase db query "SELECT * FROM qr_scan_logs LIMIT 1"
```

### Issue: "Edge Function deployment failed"

**Solution:**
```bash
# Check function files exist
ls -la supabase/functions/

# Deploy individually
supabase functions deploy qr-validate
supabase functions deploy payment-links-create
supabase functions deploy payment-webhook

# Check logs
supabase functions delete qr-validate --force
supabase functions deploy qr-validate
```

### Issue: "Invalid Razorpay signature"

**Solution:**
```bash
# Verify webhook secret
echo $RAZORPAY_WEBHOOK_SECRET

# Check webhook configuration in Razorpay dashboard
# Settings → Webhooks → Verify URL and Events
```

### Issue: "Components not rendering"

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### Issue: "Payment link generation timeout"

**Solution:**
```
# Check network connectivity
# Verify Razorpay credentials are valid
# Check Edge Function logs:
supabase functions delete payment-links-create
supabase functions deploy payment-links-create
```

---

## Testing Commands

Run the entire test suite:

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e

# Run QR workflow test script
bash scripts/test-qr-workflow.sh all

# Run specific test
bash scripts/test-qr-workflow.sh qr      # QR validation
bash scripts/test-qr-workflow.sh payment # Payment links
bash scripts/test-qr-workflow.sh webhook # Webhooks
bash scripts/test-qr-workflow.sh flow    # Full flow
```

---

## Test Report Template

Save test results to document coverage:

```markdown
# QR Workflow Test Report
**Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** Local | Staging | Production

## Test Coverage
- [ ] Unit Tests: X/X passed
- [ ] Integration Tests: X/X passed
- [ ] E2E Tests: X/X passed
- [ ] Manual Tests: X/X passed

## Issues Found
1. [Issue description]
   - Steps: [Reproduction steps]
   - Expected: [Expected behavior]
   - Actual: [Actual behavior]
   - Severity: Critical | High | Medium | Low

## Sign-off
- [ ] Ready for deployment
- [ ] Needs fixes
- [ ] Blocked on: [Issues]
```

---

## Next Steps

1. **Run all tests locally** to verify deployment
2. **Document any issues** found during testing
3. **Fix critical issues** before production deployment
4. **Test on staging** before production release
5. **Monitor production** for first 24 hours after deployment
