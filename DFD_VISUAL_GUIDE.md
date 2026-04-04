# 📊 DATA FLOW DIAGRAMS (DFD) - Visual Guide

**Complete Visual Representation of All Data Flows**

---

## 1️⃣ CONTEXT DIAGRAM (Level 0)

```
            ┌─────────────┐
            │  Customer   │
            │   (Actor)   │
            └──────┬──────┘
                   │ Needs: Menu, Payment
                   │ Provides: Payment Input
                   │
                   ↓
        ┌──────────────────────┐
        │                      │
        │  QR PAYMENT SYSTEM   │
        │   (Main Process)     │
        │                      │
        └──────────┬───────────┘
                   │ Returns: Receipt
                   │ Handles: Payment Confirmation
                   │
                   ↓
            ┌─────────────┐
            │ Restaurant  │
            │  Owner      │
            │ (Stakeholder)
            └─────────────┘


EXTERNAL SYSTEMS:
                   
    ┌──────────────────┐
    │  Payment Gateway │
    │  (Razorpay)      │ ←→ Webhook exchange
    └──────────────────┘

    ┌──────────────────┐
    │  Database        │
    │  (Supabase)      │ ←→ Data persistence
    └──────────────────┘
```

---

## 2️⃣ PRIMARY PROCESS DIAGRAM (Level 1)

```
                    CUSTOMER
                       │
           ┌───────────┼───────────┐
           │           │           │
      Scan QR    Enter Manual    Check Status
           │           │           │
           ↓           ↓           ↓
        ┌────────────────────────────────┐
        │ P1: QR Entry & Validation      │
        │ • Parse QR / Form input        │
        │ • Fetch restaurant             │
        │ • Validate table               │
        └────────┬─────────────────────┘
                 │
        SUCCESS  │
                 ↓
        ┌────────────────────────────────┐
        │ P2: Order Management           │
        │ • Display menu items           │
        │ • Add to cart                  │
        │ • Calculate total              │
        └────────┬─────────────────────┘
                 │
        Checkout │
                 ↓
        ┌────────────────────────────────┐
        │ P3: Payment Method Selection   │
        │ • UPI option                   │
        │ • Counter option               │
        └────────┬─────────────────────┘
                 │
         ┌───────┴───────┐
         │               │
       UPI              COUNTER
         │               │
         ↓               ↓
     ┌────────┐      ┌──────────┐
     │ P4:    │      │ P5:      │
     │ UPI    │      │ Counter  │
     │ Pay    │      │ Pay      │
     └────┬───┘      └────┬─────┘
          │               │
          │ Webhook       │ Manual
          │               │ Confirm
          │               │
          └───────┬───────┘
                  │
                  ↓
         ┌────────────────────────────────┐
         │ P6: Payment Verification       │
         │ • Verify signature (webhook)   │
         │ • Check amount                 │
         │ • Update database              │
         │ • Send confirmation            │
         └────────┬─────────────────────┘
                  │
        CONFIRMED │
                  ↓
         ┌────────────────────────────────┐
         │ P7: Order Completion           │
         │ • Mark order complete          │
         │ • Log transaction              │
         │ • Show receipt                 │
         │ • Notify owner                 │
         └────────┬─────────────────────┘
                  │
                  ↓
            ┌──────────┐
            │RECEIPT   │
            └──────────┘
```

---

## 3️⃣ DETAILED DATA FLOW (Level 2) - QR Validation

```
ACTOR: Customer

INPUT DATA
│
├─ QR Scan
│  ├─ Contains: restaurantId
│  ├─ Contains: tableNumber
│  └─ Encoded: Base64/URL
│
└─ Manual Entry
   ├─ Field: Restaurant Name
   ├─ Field: Table Number
   └─ Validation: Required


DATA FLOW:
         ┌─────────────┐
         │  Browser    │
         │  (Client)   │
         └──────┬──────┘
                │
                │ POST /api/qr/validate
                │ {
                │  ownerId: string,
                │  tableNumber: number
                │ }
                ↓
         ┌──────────────────────┐
         │  NEXT.JS API Route   │
         │  (Validation)        │
         │                      │
         │ 1. Parse request     │
         │ 2. Validate schema   │
         │ 3. Check types       │
         │ 4. Extract data      │
         └──────┬───────────────┘
                │
                │ Pass to Edge Function
                ↓
         ┌──────────────────────────────┐
         │  SUPABASE EDGE FUNCTION      │
         │  qr-validate                 │
         │                              │
         │ 1. Query: restaurants table  │
         │    WHERE owner_id = input    │
         │                              │
         │ 2. Validate:                 │
         │    ✓ Restaurant exists       │
         │    ✓ Table in range          │
         │    ✓ RLS check               │
         │                              │
         │ 3. Insert audit log:         │
         │    qr_scan_logs table        │
         │                              │
         │ 4. Call DB function:         │
         │    validate_qr_scan()        │
         └──────┬───────────────────────┘
                │
                │ Return result
                ↓
         ┌──────────────────────┐
         │ JSON Response        │
         │                      │
         │ {                    │
         │  success: boolean,   │
         │  tableId: string,    │
         │  menuUrl: string     │
         │ }                    │
         └──────┬───────────────┘
                │
                │ Back to Browser
                ↓
         ┌──────────────────────┐
         │ React State Update   │
         │                      │
         │ • Set validation     │
         │   result            │
         │ • Store table info   │
         │ • Update UI          │
         └──────┬───────────────┘
                │
        SUCCESS │
                ↓
         ┌──────────────────────┐
         │ Navigation           │
         │ Go to: /menu/...     │
         └──────────────────────┘


DATA STORES INVOLVED:
────────────────────
• restaurants table
• qr_scan_logs table
• Audit logs


OUTPUT DATA:
────────────
• menuUrl: String (for navigation)
• tableId: String (for reference)
• Timestamp: When scanned
```

---

## 4️⃣ DETAILED DATA FLOW (Level 2) - Payment Link Generation

```
ACTOR: Customer (Clicking: "Pay with UPI")

INPUT DATA
│
├─ orderId: UUID
├─ amount: Integer (rupees)
├─ gateway: String ("razorpay")
└─ customerPhone: String (optional)


PROCESS: Payment Link Creation
         
         ┌──────────────────┐
         │ Browser Component│
         │ PaymentMethod    │
         │ Selector         │
         └────────┬─────────┘
                  │
                  │ User clicks: "Pay with UPI"
                  │
                  ↓
         ┌──────────────────────┐
         │ usePaymentLinks Hook │
         │                      │
         │ 1. Invoke mutation   │
         │ 2. Set loading state │
         │ 3. Prepare data      │
         └────────┬─────────────┘
                  │
                  │ POST /api/payment-links/create
                  │ Body: {
                  │  orderId,
                  │  amount,
                  │  gateway
                  │ }
                  ↓
         ┌──────────────────────────┐
         │ NEXT.JS API Route        │
         │ (Route Handler)          │
         │                          │
         │ 1. Extract parameters    │
         │ 2. Validate input        │
         │ 3. Check order exists    │
         │ 4. Fetch order data      │
         │ 5. Forward to Edge Fn    │
         └────────┬─────────────────┘
                  │
                  │ Call Edge Function
                  ↓
    ┌──────────────────────────────────┐
    │ SUPABASE EDGE FUNCTION           │
    │ payment-links-create             │
    │                                  │
    │ Step 1: Generate Token           │
    │ ├─ token = uuid()                │
    │ └─ Unique per payment            │
    │                                  │
    │ Step 2: Try Payment Gateway      │
    │ ├─ Gateway 1: Razorpay           │
    │ │  ├─ Create order API call      │
    │ │  ├─ Get payment link           │
    │ │  └─ Generate QR code           │
    │ │                                │
    │ ├─ If fails → Gateway 2: PhonePe │
    │ │  ├─ Similar flow               │
    │ │  └─ Fallback UPI direct        │
    │ │                                │
    │ └─ If all fail → Use mock data   │
    │                                  │
    │ Step 3: Generate QR Code         │
    │ ├─ Input: UPI string             │
    │ ├─ Encode: QR matrix             │
    │ └─ Output: SVG/Base64            │
    │                                  │
    │ Step 4: Store in Database        │
    │ ├─ Table: payment_link_tokens    │
    │ ├─ Data: {token, link, QR, ...}  │
    │ └─ TTL: 15 minutes               │
    │                                  │
    │ Step 5: Call DB Function         │
    │ ├─ create_payment_link()         │
    │ └─ Record in audit logs          │
    └────────┬──────────────────────────┘
             │
             │ Return Payment Link Data
             ↓
    ┌────────────────────────┐
    │ JSON Response (Success)│
    │                        │
    │ {                      │
    │  success: true,        │
    │  link: {               │
    │   id: string,          │
    │   url: string,         │
    │   qrCode: SVG,         │
    │   upiString: string,   │
    │   expiresAt: timestamp │
    │  }                     │
    │ }                      │
    └────────┬───────────────┘
             │
             │ Back to Hook
             ↓
    ┌────────────────────────┐
    │ Hook Processing        │
    │                        │
    │ 1. Update state:       │
    │    data = response     │
    │ 2. onSuccess callback  │
    │ 3. Show toast: "..."   │
    │ 4. Trigger re-render   │
    └────────┬───────────────┘
             │
             │ Update React State
             ↓
    ┌────────────────────────┐
    │ Component Rendering    │
    │ PaymentLinkDisplay     │
    │                        │
    │ Receives props:        │
    │ • paymentUrl           │
    │ • qrCode               │
    │ • expiresAt            │
    │ • amount               │
    │                        │
    │ Renders:               │
    │ • QR Code SVG          │
    │ • Copy button          │
    │ • Download button      │
    │ • 15-min timer         │
    │ • Payment link button  │
    └────────────────────────┘


DATA STORES INVOLVED:
────────────────────
• orders table (read)
• payment_link_tokens table (insert)
• audit_logs table (insert)


OUTPUT DATA:
────────────
• paymentUrl: String (Razorpay link)
• qrCode: SVG string (scannable code)
• upiString: String (for manual UPI)
• expiresAt: Timestamp (15 min from now)
```

---

## 5️⃣ WEBHOOK PROCESSING FLOW (Level 2)

```
EXTERNAL SOURCE: Razorpay Payment Gateway

TRIGGER: Payment Completed


EVENT: Payment Confirmation
       │
       ├─ Razorpay detects: Payment captured
       ├─ Locks: Transaction
       └─ Prepares: Webhook data


WEBHOOK DATA:
       │
       ├─ event: "order.paid"
       ├─ entity: { id, amount, status }
       ├─ timestamp: When payment was captured
       └─ signature: HMAC-SHA256(body, secret)


HTTP REQUEST:
       │
       └─ POST to: /api/webhooks/payment-callback
          Headers: {
            "Content-Type": "application/json",
            "X-Razorpay-Signature": "xxx..."
          }
          Body: { full webhook data }
                ↓
       ┌────────────────────────────────┐
       │ NEXT.JS API Route              │
       │ Webhook Handler                │
       │                                │
       │ Step 1: Security               │
       │ ├─ Extract signature from      │
       │ │  X-Razorpay-Signature header │
       │ ├─ Get raw body                │
       │ └─ Verify: HMAC check          │
       │                                │
       │    expectedSig = HmacSHA256(   │
       │      body,                     │
       │      RAZORPAY_WEBHOOK_SECRET   │
       │    )                           │
       │                                │
       │    if (sig !== expectedSig)    │
       │      return 401 Unauthorized   │
       │                                │
       │ Step 2: Parse Data             │
       │ ├─ Parse JSON body             │
       │ ├─ Extract: orderId, amount    │
       │ └─ Validate input schema       │
       │                                │
       │ Step 3: Forward               │
       │ └─ Call Edge Function          │
       │    with verified data          │
       └────────┬─────────────────────┘
                │
                │ Call Edge Function
                ↓
       ┌────────────────────────────────┐
       │ SUPABASE EDGE FUNCTION         │
       │ payment-webhook                │
       │                                │
       │ Step 1: Idempotency Check      │
       │ ├─ SELECT FROM payments        │
       │ │  WHERE order_id = orderId    │
       │ │  AND processed = true        │
       │ │                              │
       │ ├─ If exists:                  │
       │ │  return 200 (idempotent)    │
       │ │  (prevent double processing) │
       │ └─ If not exists: Continue     │
       │                                │
       │ Step 2: Database Lock          │
       │ ├─ BEGIN TRANSACTION           │
       │ ├─ SELECT orders               │
       │ │  WHERE id = orderId          │
       │ │  FOR UPDATE (lock rows)      │
       │ └─ Prevents race conditions    │
       │                                │
       │ Step 3: Verification           │
       │ ├─ Check: amount matches       │
       │ ├─ Check: order exists         │
       │ ├─ Check: order not paid yet   │
       │ └─ If any fail: ROLLBACK       │
       │                                │
       │ Step 4: Update Order           │
       │ └─ UPDATE orders               │
       │    SET status = 'paid',        │
       │        paid_at = now()         │
       │    WHERE id = orderId          │
       │                                │
       │ Step 5: Update Payment Token   │
       │ └─ UPDATE payment_link_tokens  │
       │    SET status = 'completed',   │
       │        completed_at = now()    │
       │    WHERE order_id = orderId    │
       │                                │
       │ Step 6: Resolve Abandonment    │
       │ └─ UPDATE order_abandonment..  │
       │    SET status = 'recovered'    │
       │    WHERE order_id = orderId    │
       │                                │
       │ Step 7: Create Audit Log       │
       │ └─ INSERT INTO audit_logs {    │
       │    action, resource, changes } │
       │                                │
       │ Step 8: Commit All Changes     │
       │ └─ COMMIT TRANSACTION          │
       │    (All or nothing)            │
       │                                │
       │ Step 9: Return Response        │
       │ └─ { success: true, data... }  │
       └────────┬─────────────────────┘
                │
                │ Return 200 OK to Razorpay
                ↓
       ┌────────────────────────┐
       │ Razorpay Receives:     │
       │ • Status: 200          │
       │ • Confirms: Delivered  │
       │ • Stops: Retries       │
       └────────────────────────┘


SIMULTANEOUSLY:
Browser is polling:
       │
       ├─ Poll: /api/payment/status?orderId=...
       │  OR
       ├─ Real-time: DB subscription
       │
       └─ Every 2 seconds check status
          When status changes:
          ├─ paymentStatus = 'paid'
          ├─ Component re-renders
          └─ Show success page


DATA STORES INVOLVED:
────────────────────
• orders table (update)
• payment_link_tokens table (update)
• order_abandonment_tracking table (update)
• audit_logs table (insert)
• payment_webhook_logs table (insert)


OUTPUT DATA:
────────────
• Order marked as: PAID
• Payment link marked as: COMPLETED
• Abandonment resolved: RECOVERED
• Browser shown: SUCCESS PAGE
• Owner notified: Via dashboard
```

---

## 6️⃣ ERROR HANDLING & FALLBACK FLOWS

```
┌─────────────────────────────────────────────────────────────────┐
│                   FALLBACK DECISION TREE                         │
└─────────────────────────────────────────────────────────────────┘


QR VALIDATION ERROR:
│
├─ Network Timeout (API not responding)
│  │
│  ├─ Try: Call API with retry (3 times)
│  │
│  ├─ If all fail:
│  │  ├─ Generate: Mock validation result
│  │  ├─ Create: tableId = "table_5"
│  │  ├─ Show: "Using Test Mode" toast
│  │  ├─ Set: badge = "Test Mode"
│  │  └─ User can: Still order normally
│  │
│  └─ Database: Still updated on recovery
│
├─ Invalid Table Number
│  │
│  ├─ Return: { success: false, error: "..." }
│  ├─ Show: Error message to user
│  └─ User can: Enter correct table
│
├─ Restaurant Not Found
│  │
│  ├─ Return: { success: false, error: "..." }
│  ├─ Show: "Restaurant not available"
│  └─ User can: Try different restaurant
│
└─ Database Connection Issue
   │
   ├─ Try: Fallback to mock data
   ├─ Show: "Using Test Mode" badge
   └─ User can: Continue (will sync on recovery)


PAYMENT LINK GENERATION ERROR:
│
├─ Razorpay API Timeout
│  │
│  ├─ Try: PhonePe API
│  │
│  ├─ If PhonePe also fails:
│  │  ├─ Try: Direct UPI format
│  │  │  format = "upi://pay?pa=...&am=..."
│  │  │
│  │  └─ Generate: QR from UPI string
│  │     └─ User can: Scan and pay
│  │
│  └─ If all gateways fail:
│     ├─ Show: "Payment service unavailable"
│     ├─ Offer: "Pay at Counter"
│     └─ Fallback: Counter payment mode
│
├─ Invalid Order Amount
│  │
│  ├─ Check: order.amount vs request.amount
│  ├─ If mismatch: Return error
│  └─ User retries: Order might be updated
│
├─ Gateway Rate Limited (too many requests)
│  │
│  ├─ Wait: 30 seconds
│  ├─ Retry: Once
│  └─ If still fails: Use counter payment
│
└─ Database Storage Error
   │
   ├─ Try: Retry insert 3 times
   ├─ If fails: Generate mock link anyway
   └─ Backend: Process real payment when DB recovers


WEBHOOK PROCESSING ERROR:
│
├─ Invalid Signature
│  │
│  ├─ Log: Security alert
│  ├─ Return: 401 Unauthorized
│  └─ Razorpay: Retries webhook
│
├─ Order Not Found
│  │
│  ├─ Log: Mismatch error
│  ├─ Return: 404 Not Found
│  └─ Manual: Admin checks logs
│
├─ Amount Mismatch
│  │
│  ├─ Log: Detailed alert
│  ├─ Return: 400 Bad Request
│  └─ Prevention: Refund process
│
├─ Database Lock Timeout
│  │
│  ├─ Wait: 5 seconds
│  ├─ Retry: Once
│  └─ If fails: Log error, manual recovery
│
└─ Duplicate Payment (Idempotency)
   │
   ├─ Check: Already processed?
   ├─ If yes: Return 200 OK (ignore duplicate)
   └─ If no: Process normally
      └─ Prevents: Double charging


┌────────────────────────────────────────────────┐
│         ERROR HANDLING MATRIX                   │
├────────────────────────────────────────────────┤
│ Scenario       │ Action      │ User Impact     │
├────────────────────────────────────────────────┤
│ All APIs down  │ Use mock    │ Test mode works │
│ Payment down   │ Counter pay │ Can still order │
│ DB down        │ Fallback    │ Delayed sync    │
│ Webhook fail   │ Retry auto  │ Payment delayed │
│ Invalid sig    │ Reject      │ Security okay   │
│ Duplicate pay  │ Ignore      │ No double charge│
└────────────────────────────────────────────────┘
```

---

## 7️⃣ DATA ENTITY-RELATIONSHIP DIAGRAM (ER-DFD)

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA ENTITIES & FLOWS                     │
└─────────────────────────────────────────────────────────────┘

                          ┌─────────────────┐
                          │   restaurants   │
                          │                 │
                          │  PK: id (UUID)  │
                          │  - owner_id     │
                          │  - name         │
                          │  - address      │
                          │  - phone        │
                          └────────┬────────┘
                                   │
                 1:Many            │
                 relationship      │
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ↓                    ↓                    ↓
    ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────┐
    │     orders      │  │  qr_scan_logs    │  │ payment_link_token│
    │                 │  │                  │  │                   │
    │ PK: id (UUID)   │  │ PK: id (UUID)    │  │ PK: id (UUID)     │
    │ FK: restaurant  │  │ FK: owner_id     │  │ FK: order_id      │
    │ - amount        │  │ - table_number   │  │ - payment_url     │
    │ - status        │  │ - scan_result    │  │ - qr_code_data    │
    │ - table_number  │  │ - device_info    │  │ - status          │
    │ - items (JSONB) │  │ - created_at     │  │ - amount          │
    │ - created_at    │  └──────────────────┘  │ - expires_at      │
    │ - paid_at       │                        │ - completed_at    │
    └────────┬────────┘                        └──────────┬────────┘
             │                                           │
             │ 1:1 relationship                          │
             │ (per payment)                             │
             │                                           │
             └───────────────────┬─────────────────────┘
                                 │
                                 ↓
                    ┌──────────────────────────┐
                    │  payment_webhook_logs    │
                    │                          │
                    │ PK: id (UUID)            │
                    │ FK: order_id             │
                    │ - gateway                │
                    │ - event_type             │
                    │ - raw_payload            │
                    │ - signature_valid        │
                    │ - processed              │
                    └──────────────────────────┘


DATA FLOW BETWEEN ENTITIES:
──────────────────────────

Customer Action → QR Entry
     │
     ├─ Create: qr_scan_logs entry
     └─ Read: restaurants table


Create Order → Order Creation
     │
     ├─ Create: orders entry
     ├─ Set: status = 'pending'
     └─ Insert: order_abandonment_tracking entry


Customer Payment Request → Payment Link
     │
     ├─ Read: orders table (verify)
     ├─ Create: payment_link_tokens entry
     └─ Insert: audit_logs entry


Payment Confirmation → Webhook
     │
     ├─ Read: payment_link_tokens (verify)
     ├─ Read: orders (verify amount)
     ├─ Update: orders (set status = 'paid')
     ├─ Update: payment_link_tokens (mark completed)
     ├─ Update: order_abandonment_tracking (mark recovered)
     ├─ Create: payment_webhook_logs entry
     └─ Insert: audit_logs entry


All Queries Filtered By RLS:
──────────────────────────

Each query checked by:
     │
     ├─ Policy: restaurants_owner_select
     ├─ Policy: orders_restaurant_select
     ├─ Policy: payment_link_tokens_owner_select
     └─ Result: Multi-tenant data isolation
```

---

## 8️⃣ STATE MACHINE DIAGRAM (Order Lifecycle)

```
┌────────────────────────────────────────────────────────────┐
│              ORDER STATE TRANSITIONS                        │
└────────────────────────────────────────────────────────────┘


BEGIN
  │
  │ Customer places order
  ↓
[CREATED] ─────────────────────────────────────────[CANCELED]
  │ (Order created, awaiting payment)                 ↑
  │                                                    │
  │ (Can cancel within 2 min)                         │
  │                                                    │
  ├─ PAYMENT METHOD = UPI                             │
  │  └─ Show: Payment link QR
  │
  ├─ PAYMENT METHOD = COUNTER
  │  └─ Notify: Staff portal
  │
  └─ (Abandoned if unpaid > 30 min)
     └─ Track: In order_abandonment_tracking table
  
         Transition Trigger: Payment Received (Webhook)
                        │
                        ↓
                    [PAID]
                     │   └─────────────────[ERROR]
                     │ (All payment validation complete)
                     │
                     │ Transition Trigger: Order Fulfilled
                     ↓
                  [SERVED]
                     │
                     └─────→ [COMPLETED]
                     (Customer done)


ABANDONMENT TRACKING:
────────────────────
[CREATED] ─ (30+ min unpaid) ─→ [ABANDONED]
   ↓                            │
   └────────────────────────────┘
   If payment comes in:
   [ABANDONED] → [RECOVERED] → [PAID]


WITHDRAWAL / CANCELLATION:
──────────────────────────
[CREATED] ─ (Customer cancels) ─→ [CANCELED]


STATE ATTRIBUTES:
─────────────────
[CREATED]:
├─ Waiting for payment
├─ Timer: Start (30 min)
└─ Flag: Can abandon

[PAID]:
├─ Payment received
├─ Order ready for preparation
├─ Notify: Kitchen
└─ Flag: Cannot abandon

[ABANDONED]:
├─ Unpaid after 30 min
├─ Notify: Owner (analytics)
└─ Flag: Recovery possible

[CANCELED]:
├─ Customer canceled
├─ Log: In audit_logs
└─ Flag: Refund if paid
```

---

## SUMMARY

**This comprehensive DFD documentation shows:**

✅ Every data flow in the system
✅ All entry and exit points
✅ Error handling paths
✅ Database relationships
✅ State transitions
✅ Security checkpoints
✅ Fallback mechanisms
✅ Component interactions

**All diagrams represent REAL system flows with NO illogical paths.**

