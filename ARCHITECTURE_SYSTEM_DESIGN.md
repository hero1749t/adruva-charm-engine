# 🏗️ COMPLETE SYSTEM ARCHITECTURE & DESIGN

**Status:** Comprehensive blueprint covering every flow, logic, and possibility

---

## 📊 PART 1: SYSTEM ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                     ADRUVA QR PAYMENT SYSTEM                     │
└─────────────────────────────────────────────────────────────────┘

LAYER 1: PRESENTATION (Frontend UI)
┌──────────────────────────────────────────────────────────────┐
│  Web Browser / Mobile Web                                    │
│  ├─ React Components (TSX)                                  │
│  ├─ UI State Management (useState, useContext)              │
│  └─ User Interactions (clicks, forms, navigation)           │
└──────────────────────────────────────────────────────────────┘
         ↓↑ (HTTP requests/responses)
         
LAYER 2: APPLICATION (Frontend Logic)
┌──────────────────────────────────────────────────────────────┐
│  React Hooks (TypeScript)                                    │
│  ├─ useQRValidation() - QR logic                            │
│  ├─ usePaymentLinks() - Payment logic                       │
│  ├─ useOrderAbandonment() - Order tracking                  │
│  ├─ useContext (Auth, Language)                             │
│  └─ React Query (async state + caching)                     │
└──────────────────────────────────────────────────────────────┘
         ↓↑ (fetch API calls)
         
LAYER 3: API GATEWAY (Next.js Routes)
┌──────────────────────────────────────────────────────────────┐
│  HTTP Endpoints                                              │
│  ├─ POST /api/qr/validate                                   │
│  ├─ POST /api/payment-links/create                          │
│  ├─ POST /api/webhooks/payment-callback                     │
│  ├─ GET  /api/restaurants/active                            │
│  └─ GET  /api/orders/{id}/status                            │
└──────────────────────────────────────────────────────────────┘
         ↓↑ (HTTPS + signature verification)
         
LAYER 4: BACKEND SERVICES (Edge Functions + Business Logic)
┌──────────────────────────────────────────────────────────────┐
│  Supabase Edge Functions (Deno TypeScript)                   │
│  ├─ qr-validate/index.ts        (QR validation logic)       │
│  ├─ payment-links-create/index.ts (Payment creation)        │
│  └─ payment-webhook/index.ts    (Webhook processing)        │
└──────────────────────────────────────────────────────────────┘
         ↓↑ (SQL queries)
         
LAYER 5: DATA PERSISTENCE (Database)
┌──────────────────────────────────────────────────────────────┐
│  PostgreSQL Database (Supabase)                              │
│  ├─ qr_scan_logs (360K rows possible)                        │
│  ├─ order_abandonment_tracking (10K rows possible)           │
│  ├─ payment_link_tokens (50K rows possible)                  │
│  ├─ orders (existing table)                                  │
│  ├─ restaurants (existing table)                             │
│  └─ order_items (existing table)                             │
└──────────────────────────────────────────────────────────────┘
         ↓↑ (HTTPS callbacks)
         
LAYER 6: EXTERNAL SERVICES (Third-party integrations)
┌──────────────────────────────────────────────────────────────┐
│  Payment Gateways                                            │
│  ├─ Razorpay (Primary)                                       │
│  ├─ PhonePe (Fallback 1)                                     │
│  └─ Direct UPI (Fallback 2)                                  │
│                                                              │
│  Authentication                                              │
│  ├─ Supabase Auth (JWT tokens)                               │
│  └─ RLS (Row Level Security)                                 │
└──────────────────────────────────────────────────────────────┘

LAYER 7: INFRASTRUCTURE (Deployment)
┌──────────────────────────────────────────────────────────────┐
│  Frontend Hosting: Vercel (CDN + auto-deploy)                │
│  Backend: Supabase (Managed PostgreSQL + Functions)          │
│  Webhooks: Payment gateways → /api/webhooks/...              │
│  Environment: Production (live) + Staging (test)             │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔄 PART 2: DATA FLOW ARCHITECTURE

### **ENTIRE REQUEST-RESPONSE LIFECYCLE**

```
┌─────────────────────────────────────────────────────────────┐
│  USER INITIATES ACTION                                      │
│  (Scans QR / Enters table / Places order / Pays)            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ BROWSER EVENT TRIGGERED                                     │
│ onClick() / onChange() / onSubmit()                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ REACT COMPONENT STATE UPDATED                               │
│ setState() / Hook logic executed                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ VALIDATION CHECK (CLIENT-SIDE)                              │
│ ├─ Data validation                                          │
│ ├─ Form field checks                                        │
│ ├─ Error state set (if invalid)                             │
│ └─ If valid → Continue; If invalid → Stop + show error     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ API CALL PREPARED                                           │
│ ├─ Create request object:                                   │
│ │  {                                                        │
│ │    method: "POST",                                        │
│ │    headers: { "Content-Type": "application/json" },       │
│ │    body: JSON.stringify({ ...data })                      │
│ │  }                                                        │
│ └─ Network timeout set (30 seconds default)                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ TRY BLOCK: ATTEMPT API CALL                                 │
│ fetch("/api/endpoint", { ... })                             │
│                                                             │
│ OPTION 1: SUCCESS PATH                                      │
│ ├─ Network request sent                                     │
│ ├─ API receives request                                     │
│ ├─ Validates input                                          │
│ ├─ Processes business logic                                 │
│ ├─ Returns: { success: true, data: {...} }                  │
│ └─ Response received in browser                             │
│                                                             │
│ OPTION 2: FAILURE PATH                                      │
│ ├─ Network error (no internet)                              │
│ ├─ API server offline                                       │
│ ├─ Invalid response format                                  │
│ └─ Throws error → Caught by catch block                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
                        ┌─────────┐
                        │ SUCCESS?│
                        └────┬────┘
                    YES ↙         ↘ NO
                 ┌──────────┐   ┌──────────┐
                 │Use Real  │   │CATCH    │
                 │Data      │   │BLOCK    │
                 └────┬─────┘   └────┬────┘
                      ↓              ↓
        ┌─────────────────────────────────┐
        │ CHECK: Is there mock data?      │
        ├─────────────────────────────────┤
        │ YES → Use mock data             │
        │ NO → Show error message         │
        └─────┬──────────────────────────┘
              ↓
    ┌──────────────────────┐
    │ Update React State   │
    │ ├─ data = response   │
    │ ├─ error = null      │
    │ ├─ loading = false   │
    │ └─ Component re-renders
    └────────┬─────────────┘
             ↓
    ┌──────────────────────┐
    │ Show Toast Message   │
    │ ├─ Success: "Done!"  │
    │ ├─ Test: "Test mode" │
    │ └─ Error: "Failed"   │
    └────────┬─────────────┘
             ↓
    ┌──────────────────────┐
    │ Trigger Callback     │
    │ onSuccess()          │
    │ onError()            │
    └────────┬─────────────┘
             ↓
    ┌──────────────────────┐
    │ USER SEES RESULT     │
    │ UI updates reflect   │
    │ new state            │
    └──────────────────────┘
```

---

## 🎯 PART 3: COMPLETE USER JOURNEY FLOWS

### **FLOW A: QR CODE SCANNING JOURNEY**

```
START: Customer at table with phone
         ↓
    ┌────────────────────┐
    │ Scans QR Code      │
    │ QR contains:       │
    │ - restaurantId     │
    │ - tableNumber      │
    └────────┬───────────┘
             ↓
    ┌────────────────────────────────────────────┐
    │ BROWSER RECEIVES (deeplink or parameter):  │
    │ /qr-entry?ownerId=xxx&table=5 (OR)         │
    │ http://app.local/qr?ownerId&table          │
    │ Shows: ManualEntryForm pre-filled          │
    └────────┬───────────────────────────────────┘
             ↓
    ┌────────────────────────────────────────────┐
    │ VALIDATE (CLIENT-SIDE CHECK)               │
    │ ├─ ownerId provided? YES                    │
    │ ├─ tableNumber in range (1-99)? YES        │
    │ └─ Proceed to API validation                │
    └────────┬───────────────────────────────────┘
             ↓
    ┌────────────────────────────────────────────┐
    │ CALL: POST /api/qr/validate                │
    │                                             │
    │ {                                          │
    │   "ownerId": "550e8400-e29b...",          │
    │   "tableNumber": 5                         │
    │ }                                          │
    └────────┬───────────────────────────────────┘
             ↓
    ┌────────────────────────────────────────────┐
    │ API RECEIVED - PROCESS:                    │
    │                                             │
    │ STEP 1: Verify ownerId is valid restauarant│
    │ STEP 2: Check tableNumber exists           │
    │ STEP 3: Get menu URL                       │
    │ STEP 4: Create qr_scan_logs record         │
    │ STEP 5: Return success response            │
    └────────┬───────────────────────────────────┘
             ↓
   ┌─────────────────────────┐
   │ RESPONSE OPTIONS        │
   └────────┬────────────────┘
       YES ↙            ↘ NO
   ┌──────────┐    ┌────────────┐
   │SUCCESS   │    │MOCK DATA   │
   └────┬─────┘    └─────┬──────┘
        ↓                 ↓
   {success:true}   {success:true}
   menuUrl valid    mock menuUrl
   Real data        Test Mode
        ↓                 ↓
        └────────┬────────┘
                 ↓
    ┌────────────────────────┐
    │ BROWSER REDIRECTS      │
    │ navigate("/menu/...?   │
    │   table=5")            │
    └────────┬───────────────┘
             ↓
    ┌────────────────────────┐
    │ CUSTOMERPAGE LOADS     │
    │ ├─ Fetch menu items    │
    │ ├─ Get table info      │
    │ └─ Show UI             │
    └────────┬───────────────┘
             ↓
    END: Customer sees menu, can order
```

---

### **FLOW B: MANUAL TABLE ENTRY JOURNEY**

```
START: Customer at "/manual-entry" page
         ↓
    ┌────────────────────────────────────┐
    │ RESTAURANT DROPDOWN LOAD:          │
    │ fetch("/api/restaurants/active")   │
    └────────┬─────────────────────────────┘
             ↓
   ┌────────────────────────────────────────┐
   │ API RESPONSE CHECK                     │
   └────┬──────────────────────────┬────────┘
    YES ↓                          ↓ NO
   Real    ┌─────────────┐   ┌──────────────┐
   Data    │Show real    │   │Fall back to  │
           │restaurants  │   │MOCK_RESTAU   │
           │from API     │   │RANTS array   │
           └────┬────────┘   └──────┬───────┘
                ↓                    ↓
           State update          State update
           restaurants = [...]   restaurants = MOCK
           isUsingMockData=false  isUsingMockData=true
                ↓                    ↓
                └────────┬───────────┘
                         ↓
    ┌────────────────────────────────────┐
    │ UI RENDERS:                        │
    │ ├─ Dropdown shows restaurants      │
    │ ├─ "Connected" badge (real)        │
    │ ├─ OR "Test Mode" badge (mock)     │
    │ └─ Table number input field        │
    └────────┬────────────────────────────┘
             ↓
    ┌────────────────────────────────────┐
    │ USER SELECTS RESTAURANT            │
    │ onChange() → restaurantId state    │
    └────────┬────────────────────────────┘
             ↓
    ┌────────────────────────────────────┐
    │ USER ENTERS TABLE NUMBER           │
    │ onChange() → tableNumber state     │
    │ VALIDATION:                        │
    │ ├─ Must be 1-99                    │
    │ ├─ Must be number                  │
    │ ├─ No leading zeros                │
    │ └─ If invalid: error message       │
    └────────┬────────────────────────────┘
             ↓
    ┌────────────────────────────────────┐
    │ USER CLICKS "LOAD MENU"            │
    │ onClick() → handleSubmit()          │
    └────────┬────────────────────────────┘
             ↓
    ┌────────────────────────────────────┐
    │ CLIENT-SIDE VALIDATION:            │
    │ if (!restaurantId) error           │
    │ if (!tableNumber) error            │
    │ if (invalid range) error           │
    │ If any error: show inline + stop   │
    └────────┬────────────────────────────┘
             ↓ (All valid)
    ┌────────────────────────────────────┐
    │ SUBMIT TO BACKEND                  │
    │ POST /api/qr/validate {            │
    │   ownerId: restaurantId,           │
    │   tableNumber: parseInt(...)       │
    │ }                                  │
    └────────┬────────────────────────────┘
             ↓
    ┌────────────────────────────────────┐
    │ API PROCESSING:                    │
    │ (same as QR flow)                  │
    │ ├─ Validate restaurant             │
    │ ├─ Validate table                  │
    │ ├─ Get menu URL                    │
    │ └─ Log scan attempt                │
    └────────┬────────────────────────────┘
             ↓
   ┌─────────────────────────────────────┐
   │ RESPONSE                            │
   └────┬──────────────────────┬─────────┘
    YES ↓                      ↓ NO
       Real              Fallback
       data              Mock
        ↓                 ↓
        └────────┬────────┘
                 ↓
    ┌────────────────────────────────────┐
    │ SUCCESS PATH:                      │
    │ ├─ onSuccess(restaurantId, table)  │
    │ ├─ navigate("/menu/rest/...")      │
    │ └─ Clear form                      │
    └────────┬────────────────────────────┘
             ↓
    END: Customer sees menu, can order
```

---

### **FLOW C: ORDER PLACEMENT & PAYMENT SELECTION**

```
START: Customer viewing menu with items added
         ↓
    ┌────────────────────────────────────┐
    │ USER CLICKS "PLACE ORDER"          │
    │ onClick() on submit button         │
    └────────┬────────────────────────────┘
             ↓
    ┌────────────────────────────────────┐
    │ BACKEND RECEIVES ORDER             │
    │ (from existing system)             │
    │ ├─ Creates order record            │
    │ ├─ Calculates total                │
    │ ├─ Returns: orderId, total         │
    │ └─ Order status = "pending"        │
    └────────┬────────────────────────────┘
             ↓
    ┌────────────────────────────────────┐
    │ COMPONENT STATE UPDATE:            │
    │ selectedOrder = orderId            │
    │ orderTotal = totalAmount           │
    │ showPaymentSelector = true         │
    │ paymentMethodSelected = null       │
    └────────┬────────────────────────────┘
             ↓
    ┌────────────────────────────────────┐
    │ UI RENDERS:                        │
    │ PaymentMethodSelector component    │
    │ Shows:                             │
    │ ├─ Button: "Pay with UPI"          │
    │ ├─ Button: "Pay at Counter"        │
    │ ├─ Order total display             │
    │ └─ Info message                    │
    └────────┬────────────────────────────┘
             ↓
    ┌────────────────────────────────────┐
    │ USER CHOOSES PAYMENT METHOD        │
    └────┬──────────────────────┬────────┘
    YES ↓ UPI                   ↓ Counter
        │                      │
    (See FLOW D)           ┌───────────┐
                           │FLOW E     │
                           └───────────┘
```

---

### **FLOW D: UPI PAYMENT WITH QR CODE**

```
START: User clicks "Pay with UPI"
         ↓
    ┌────────────────────────────────────┐
    │ STATE UPDATE:                      │
    │ selectedMethod = "upi"             │
    │ isProcessing = true                │
    │ (Show loading spinner)             │
    └────────┬────────────────────────────┘
             ↓
    ┌────────────────────────────────────┐
    │ API CALL:                          │
    │ POST /api/payment-links/create     │
    │ {                                  │
    │   orderId: "order_123",            │
    │   amount: 500,                     │
    │   gateway: "razorpay",             │
    │   customerPhone: "9876543210"      │
    │ }                                  │
    └────────┬────────────────────────────┘
             ↓
    ┌────────────────────────────────────┐
    │ BACKEND LOGIC:                     │
    │ (in /api/payment-links/create)     │
    │                                    │
    │ STEP 1: Receive request            │
    │ STEP 2: Validate payment request   │
    │ STEP 3: Call Razorpay API          │
    │         (create payment link)      │
    │ STEP 4: Get QR code from Razorpay  │
    │ STEP 5: Store in DB                │
    │ STEP 6: Return link + QR           │
    └────────┬────────────────────────────┘
             ↓
   ┌─────────────────────────────────────┐
   │ RESPONSE OPTIONS                    │
   └────┬──────────────────────┬─────────┘
    YES ↓ SUCCESS              ↓ FAIL
   ┌──────────────────┐ ┌──────────────────┐
   │Real payment link │ │CATCH ERROR       │
   │Real QR code      │ │Generate mock link│
   │status: active    │ │status: active    │
   └────────┬─────────┘ └────────┬─────────┘
            ↓                    ↓
    ┌────────────────────────────────────┐
    │ RESPONSE PROCESSED:                │
    │ ├─ paymentLinkUrl = url            │
    │ ├─ paymentMethodSelected = "upi"   │
    │ ├─ showPaymentLink = true          │
    │ ├─ isProcessing = false            │
    │ └─ Component re-renders            │
    └────────┬────────────────────────────┘
             ↓
    ┌────────────────────────────────────┐
    │ RENDER: PaymentLinkDisplay         │
    │ Shows:                             │
    │ ├─ QR Code (SVG)                   │
    │ ├─ UPI Address (copyable)          │
    │ ├─ 15-minute timer                 │
    │ ├─ "Pay Now" button                │
    │ ├─ "Check Status" button           │
    │ └─ "Download QR" button            │
    └────────┬────────────────────────────┘
             ↓
    ┌────────────────────────────────────┐
    │ USER SCANS QR WITH PAYMENT APP     │
    │ ├─ Opens payment app               │
    │ ├─ Scans QR code                   │
    │ ├─ Enters payment confirmation     │
    │ └─ Payment gateway processes it    │
    └────────┬────────────────────────────┘
             ↓
    ┌────────────────────────────────────┐
    │ WEBHOOK RECEIVED:                  │
    │ Razorpay → POST /api/webhooks/...  │
    │ {                                  │
    │   event: "order.paid",             │
    │   orderId: "order_123",            │
    │   status: "captured",              │
    │   amount: 50000                    │
    │ }                                  │
    └────────┬────────────────────────────┘
             ↓
    ┌────────────────────────────────────┐
    │ WEBHOOK PROCESSING:                │
    │ ├─ Verify HMAC signature           │
    │ ├─ If invalid: Return 401          │
    │ ├─ If valid: Continue              │
    │ ├─ Extract orderId, amount, status │
    │ ├─ Update database:                │
    │ │  - Order status = "paid"         │
    │ │  - payment_link_tokens update    │
    │ │  - qr_scan_logs record created   │
    │ └─ Return 200 OK                   │
    └────────┬────────────────────────────┘
             ↓
    ┌────────────────────────────────────┐
    │ UI UPDATE (Real-time):             │
    │ ├─ Customer sees success screen    │
    │ ├─ "Order Paid!" message           │
    │ ├─ Order confirmation details      │
    │ └─ "Order More" or "Exit" buttons  │
    └────────┬────────────────────────────┘
             ↓
    END: Payment complete, order ready for preparation
```

---

### **FLOW E: COUNTER PAYMENT FALLBACK**

```
START: User clicks "Pay at Counter"
         ↓
    ┌────────────────────────────────────┐
    │ STATE UPDATE:                      │
    │ selectedMethod = "cashier"         │
    │ paymentMethodSelected = "cashier"  │
    │ showPaymentSelector = false        │
    └────────┬────────────────────────────┘
             ↓
    ┌────────────────────────────────────┐
    │ BACKEND CALL (optional):           │
    │ Notify staff that order waiting    │
    │ POST /api/orders/{id}/notify       │
    │ {                                  │
    │   status: "awaiting_payment",      │
    │   paymentMethod: "cash"            │
    │ }                                  │
    └────────┬────────────────────────────┘
             ↓
    ┌────────────────────────────────────┐
    │ UI UPDATES:                        │
    │ ├─ Hide payment selector           │
    │ ├─ Show message:                   │
    │ │  "Please pay at the counter"     │
    │ ├─ Staff has been notified         │
    │ ├─ Show order summary              │
    │ └─ "Order More" button visible     │
    └────────┬────────────────────────────┘
             ↓
    ┌────────────────────────────────────┐
    │ CUSTOMER AT COUNTER:               │
    │ ├─ Staff sees pending order        │
    │ ├─ Customer pays cash/card         │
    │ ├─ Staff marks paid on POS         │
    │ └─ Order status → "paid"           │
    └────────┬────────────────────────────┘
             ↓
    ┌────────────────────────────────────┐
    │ PAYMENT CONFIRMATION:              │
    │ ├─ Database updated               │
    │ ├─ Customer app sees update       │
    │ ├─ "Order Paid!" message          │
    │ └─ Kitchen receives order         │
    └────────┬────────────────────────────┘
             ↓
    ┌────────────────────────────────────┐
    │ CUSTOMER CAN:                      │
    │ ├─ Click "Order More" (restart)   │
    │ ├─ Click "Exit" (leave)           │
    │ └─ View order status              │
    └────────┬────────────────────────────┘
             ↓
    END: Order paid, ready for preparation
```

---

## 💾 PART 4: DATA STRUCTURE & STATE MANAGEMENT

### **COMPONENT STATE HIERARCHY**

```
ROOT: App Component
│
├─ AuthContext
│  ├─ currentUser
│  ├─ userRole (owner/customer/staff/admin)
│  ├─ restaurantId
│  └─ token
│
├─ LanguageContext
│  └─ language (en/hi/ur)
│
└─ CustomerMenu Component
   ├─ cartItems: OrderItem[]
   │  └─ [
   │      { itemId, name, quantity, price, total },
   │      ...
   │    ]
   │
   ├─ selectedOrder: string (orderId)
   │
   ├─ orderTotal: number (amount in rupees)
   │
   ├─ showPaymentSelector: boolean
   │
   ├─ paymentMethodSelected: "upi" | "cashier" | null
   │
   ├─ showPaymentLink: boolean
   │
   ├─ paymentLinkUrl: string | null
   │
   └─ useQRValidation Hook State
      ├─ isLoading: boolean
      ├─ error: string | null
      ├─ hasBackendError: boolean
      └─ validateQR: async function
      
   └─ usePaymentLinks Hook State
      ├─ isGenerating: boolean
      ├─ isError: boolean
      ├─ error: Error | null
      ├─ data: PaymentLink | null
      └─ generatePaymentLink: function
```

### **DATABASE SCHEMA**

```
Table: qr_scan_logs
├─ id: uuid (primary key)
├─ owner_id: uuid (FK → restaurants.user_id)
├─ table_id: varchar (e.g., "table_5")
├─ table_number: integer (1-99)
├─ scan_timestamp: timestamp
├─ validation_result: "success" | "failed" | "invalid_table"
├─ device_info: jsonb { userAgent, ip, browser }
├─ status: "new" | "converted_to_order" | "abandoned"
└─ Indexes: owner_id, table_number, scan_timestamp

Table: order_abandonment_tracking
├─ id: uuid
├─ order_id: uuid (FK → orders.id)
├─ owner_id: uuid
├─ table_number: integer
├─ total_amount: numeric
├─ created_at: timestamp
├─ payment_initiated_at: timestamp | null
├─ marked_abandoned_at: timestamp | null
├─ recovery_status: "tracking" | "recovered" | "lost"
└─ Indexes: owner_id, created_at, recovery_status

Table: payment_link_tokens
├─ id: uuid
├─ order_id: uuid (unique, prevents duplicates)
├─ owner_id: uuid
├─ payment_link: varchar
├─ qr_code: text
├─ gateway: "razorpay" | "phonepe" | "upi"
├─ status: "active" | "completed" | "failed" | "expired"
├─ generated_at: timestamp
├─ expires_at: timestamp (15 mins from generated)
├─ payment_confirmed_at: timestamp | null
├─ webhook_received_at: timestamp | null
└─ Indexes: order_id, owner_id, status, expires_at
```

---

## 🔌 PART 5: API ENDPOINT SPECIFICATIONS

### **ENDPOINT 1: POST /api/qr/validate**

```
PURPOSE: Validate QR scan or manual table entry
CALLED BY: ManualEntryForm component
AUTHENTICATED: Optional (can work unauthenticated for customers)

REQUEST:
{
  "ownerId": "550e8400-e29b-41d4-a716-446655440000",
  "tableNumber": 5
}

PROCESSING LOGIC:
1. Receive and parse request
2. Validate ownerId is UUIDv4 format
3. Validate tableNumber is 1-99
4. Query database:
   SELECT * FROM restaurants 
   WHERE user_id = ownerId
5. If not found:
   RETURN { success: false, error: "Restaurant not found" }
6. Check if tableNumber exists in restaurant
7. Query qr_scan_logs table:
   INSERT INTO qr_scan_logs (
     owner_id, table_number, scan_timestamp,
     validation_result, device_info, status
   )
8. Call Edge Function: qr-validate
9. Return response

RESPONSE SUCCESS:
{
  "success": true,
  "tableId": "table_5",
  "menuUrl": "/menu/550e8400-e29b-41d4-a716-446655440000?table=5",
  "restaurantName": "Taj Restaurant"
}

RESPONSE ERROR:
{
  "success": false,
  "error": "Invalid table number 150",
  "code": "INVALID_TABLE"
}

ERROR HANDLING:
├─ Invalid format → 400 Bad Request
├─ Table not found → 404 Not Found
├─ Restaurant offline → 503 Service Unavailable
└─ Database error → 500 Internal Server Error

FALLBACK (in Browser):
├─ If API fails → Use mock validation
├─ If network error → Show "Test Mode" toast
└─ Still return valid menuUrl
```

---

### **ENDPOINT 2: POST /api/payment-links/create**

```
PURPOSE: Generate payment link with QR code
CALLED BY: PaymentMethodSelector component via usePaymentLinks hook
AUTHENTICATED: Optional

REQUEST:
{
  "orderId": "order_123456",
  "amount": 50000,
  "gateway": "razorpay",
  "customerPhone": "9876543210",
  "customerEmail": "customer@example.com"
}

PROCESSING LOGIC:
1. Validate amount > 0
2. Validate orderId exists in database
3. Check if payment link already exists:
   SELECT * FROM payment_link_tokens
   WHERE order_id = orderId AND status = 'active'
   → If exists, return existing link (idempotent)
4. Call Razorpay API:
   POST https://api.razorpay.com/v1/payments/create
   ├─ Create order
   ├─ Generate payment link
   └─ Get QR code
5. If Razorpay fails:
   → Try PhonePe API
6. If PhonePe fails:
   → Generate direct UPI link
7. Store in database:
   INSERT INTO payment_link_tokens (
     order_id, payment_link, qr_code,
     gateway, status, expires_at
   )
8. Return response

RESPONSE SUCCESS:
{
  "success": true,
  "link": {
    "id": "link_1712345678",
    "url": "https://rzp.io/i/abc123def456",
    "qrCode": "<svg>...</svg>",
    "expiresAt": "2026-04-05T10:30:00Z",
    "gateway": "razorpay",
    "status": "active",
    "upiString": "upi://pay?pa=merchant@hdfc&pn=Restaurant&am=50000&tr=order_123456"
  }
}

RESPONSE FALLBACK (Mock):
{
  "success": true,
  "link": {
    "id": "link_1712367890",
    "url": "https://rzp.io/demo",
    "qrCode": "upi://pay?pa=merchant@hdfc&pn=Restaurant&am=50000&tr=order_123456",
    "expiresAt": "2026-04-05T10:45:00Z",
    "gateway": "razorpay",
    "status": "active",
    "upiString": "upi://pay?pa=merchant@hdfc&pn=Restaurant&am=50000&tr=order_123456"
  }
}

ERROR HANDLING:
├─ Invalid amount → 400 Bad Request
├─ Order not found → 404 Not Found
├─ Razorpay API down → Use PhonePe → Use Direct UPI
├─ All gateways down → Return mock link
└─ Database error → 500 Internal Server Error

GATEWAY FALLBACK CHAIN:
1. Try Razorpay (primary) - 2 second timeout
   ↓ Success → Return
   ↓ Fail
2. Try PhonePe (fallback) - 2 second timeout
   ↓ Success → Return
   ↓ Fail
3. Generate Direct UPI (ultimate fallback)
   ↓ Always succeeds
   ↓ Return UPI string
```

---

### **ENDPOINT 3: POST /api/webhooks/payment-callback**

```
PURPOSE: Receive and process payment confirmations
SOURCE: Razorpay / PhonePe payment gateways
AUTHENTICATED: Via HMAC signature verification

REQUEST FROM RAZORPAY:
{
  "event": "order.paid",
  "created_at": 1712345678,
  "entity": {
    "id": "order_123456",
    "entity": "order",
    "amount": 50000,
    "status": "paid",
    "payment": {
      "id": "pay_123456",
      "entity": "payment",
      "status": "captured"
    }
  },
  "payload": { ... }
}

HEADER SECURITY:
X-Razorpay-Signature: <HMAC-SHA256 hash>

PROCESSING LOGIC:
1. Extract signature from header
2. Get raw body (before parsing)
3. Recreate HMAC:
   hmac = HMAC-SHA256(body, WEBHOOK_SECRET)
4. Compare with header signature
5. If mismatch:
   → RETURN 401 Unauthorized
   → Webhook rejected
6. Parse JSON body
7. Extract payment data:
   orderId = entity.id
   amount = entity.amount
   status = entity.status
   paymentId = entity.payment.id
8. Check for duplicate:
   SELECT * FROM payment_link_tokens
   WHERE order_id = orderId AND status = 'completed'
   → If exists, RETURN 200 (idempotent)
9. Update database:
   UPDATE payment_link_tokens
   SET status = 'completed',
       payment_confirmed_at = NOW(),
       webhook_received_at = NOW()
   WHERE order_id = orderId
10. Update order:
    UPDATE orders
    SET status = 'paid',
        paid_at = NOW()
    WHERE id = orderId
11. Update abandonment tracking:
    UPDATE order_abandonment_tracking
    SET recovery_status = 'recovered',
        marked_abandoned_at = NULL
    WHERE order_id = orderId
12. Call Edge Function: payment-webhook
13. Send notification to customer app (WebSocket/Polling)
14. RETURN 200 OK

RESPONSE:
{
  "status": "received",
  "orderId": "order_123456",
  "timestamp": "2026-04-04T17:59:00Z"
}

ERROR SCENARIOS & HANDLING:
├─ Invalid signature → 401
├─ Malformed JSON → 400
├─ Missing orderId → 422 Unprocessable
├─ Order not found → 404 (still return 200 to gateway)
├─ Database error → 500 (retry webhook)
└─ Duplicate request → 200 (idempotent)

IMPORTANT: Always return 200 to gateway even if processing fails
→ Otherwise gateway retries indefinitely
→ Process errors logged for manual review
```

---

## 🔀 PART 6: CONDITIONAL LOGIC & DECISION TREES

### **DECISION TREE 1: Restaurant & Table Validation**

```
VALIDATE_QR_SCAN(ownerId, tableNumber):
│
├─ CHECK: ownerId provided?
│  ├─ YES → Continue
│  └─ NO → RETURN error "Owner ID required", Status 400
│
├─ CHECK: Is ownerId valid UUID?
│  ├─ YES → Continue
│  └─ NO → RETURN error "Invalid owner ID format", Status 400
│
├─ CHECK: tableNumber provided?
│  ├─ YES → Continue
│  └─ NO → RETURN error "Table number required", Status 400
│
├─ CHECK: Is tableNumber integer?
│  ├─ YES → Continue
│  └─ NO → RETURN error "Table must be a number", Status 400
│
├─ CHECK: tableNumber in range 1-99?
│  ├─ YES → Continue
│  └─ NO → RETURN error "Table 1-99 only", Status 400
│
├─ DATABASE QUERY: SELECT restaurant WHERE user_id = ownerId
│  ├─ FOUND → Continue with restaurant data
│  └─ NOT FOUND → RETURN error "Restaurant not found", Status 404
│
├─ CHECK: Restaurant online?
│  ├─ YES → Continue
│  └─ NO → RETURN error "Restaurant offline", Status 503
│
├─ CHECK: Table exists in restaurant?
│  ├─ YES → Continue
│  └─ NO → RETURN error "Invalid table number", Status 404
│
├─ LOG QR SCAN: INSERT into qr_scan_logs
│  ├─ SUCCESS → Continue
│  └─ FAILED → Log error but continue
│
└─ RETURN success with menuUrl
```

---

### **DECISION TREE 2: Payment Gateway Selection**

```
GENERATE_PAYMENT_LINK(orderId, amount, gateway):
│
├─ CHECK: amount > 0?
│  ├─ YES → Continue
│  └─ NO → RETURN error "Invalid amount", Status 400
│
├─ CHECK: orderId exists in DB?
│  ├─ YES → Continue
│  └─ NO → RETURN error "Order not found", Status 404
│
├─ CHECK: Payment link already exists for this order?
│  ├─ YES, Active → RETURN existing link (idempotent)
│  └─ NO → Continue
│
├─ SELECT Primary Gateway
│  ├─ IF gateway = "razorpay" → Use Razorpay
│  ├─ IF gateway = "phonepe" → Use PhonePe
│  └─ ELSE → Use Razorpay (default)
│
├─ TRY RAZORPAY (2 sec timeout):
│  ├─ API Request → Create order & get QR
│  ├─ SUCCESS → Store in DB, RETURN response
│  ├─ TIMEOUT → Continue to fallback
│  └─ ERROR → Continue to fallback
│     (Only if primary is Razorpay)
│
├─ TRY PHONEPE (2 sec timeout):
│  ├─ API Request → Create order & get QR
│  ├─ SUCCESS → Store in DB, RETURN response
│  ├─ TIMEOUT → Continue to fallback
│  └─ ERROR → Continue to fallback
│     (Only if secondary hasn't been tried)
│
├─ FALLBACK: Direct UPI Link
│  ├─ Generate UPI string
│  ├─ Generate QR from UPI string
│  ├─ Store in DB
│  └─ RETURN response (always succeeds)
│
└─ ALL PATHS RETURN valid payment link
   (Never fails to customer - always returns something)
```

---

### **DECISION TREE 3: Payment Status Update**

```
WEBHOOK_CALLBACK(paymentData):
│
├─ VERIFY SIGNATURE:
│  ├─ Extract signature from header
│  ├─ Compute expected signature
│  ├─ MATCH? → Continue
│  └─ NO MATCH? → RETURN 401 (reject webhook)
│
├─ PARSE JSON:
│  ├─ SUCCESS → Extract data
│  └─ ERROR → RETURN 400 (malformed)
│
├─ EXTRACT: orderId, amount, status, paymentId
│  ├─ ALL PRESENT? → Continue
│  └─ MISSING? → RETURN 422 (incomplete)
│
├─ CHECK FOR DUPLICATE:
│  ├─ Query: SELECT * from payment_link_tokens
│  │         WHERE order_id = orderId AND status = 'completed'
│  ├─ FOUND (duplicate)? → RETURN 200 (idempotent, don't process again)
│  └─ NOT FOUND? → Continue to update
│
├─ CHECK AMOUNT MATCHES:
│  ├─ MATCHES? → Continue
│  └─ MISMATCH? → Log alert but continue
│           (Might be promotional discount)
│
├─ UPDATE DATABASE:
│  ├─ payment_link_tokens: status = completed
│  │  ├─ SUCCESS → Continue
│  │  └─ ERROR → Log for manual review, but continue
│  ├─ orders: status = paid
│  │  ├─ SUCCESS → Continue
│  │  └─ ERROR → Log for manual review, but continue
│  └─ order_abandonment_tracking: recovery_status = recovered
│     ├─ SUCCESS → Continue
│     └─ ERROR → Not critical, continue
│
├─ NOTIFY SYSTEMS:
│  ├─ Send to Edge Function: payment-webhook
│  ├─ Notify Customer App (via WebSocket if available)
│  └─ Notify Kitchen (via WebSocket/Polling)
│
└─ ALWAYS RETURN 200 OK to gateway
   (Successful response = gateway stops retrying)
```

---

## 🎯 PART 7: ERROR HANDLING & FALLBACK CHAINS

### **ERROR RECOVERY AT EACH LAYER**

```
LAYER: Browser/React Component
├─ Error: Network unreachable
├─ Detection: fetch() timeout or error
├─ Recovery: Catch block → Use mock data
├─ Fallback: Show "Test Mode" toast + continue with mock
└─ Result: User sees demo data, flow proceeds

LAYER: API Route (Next.js)
├─ Error: Edge Function unreachable
├─ Detection: fetch() to Supabase fails
├─ Recovery: Catch block → Generate mock response
├─ Fallback: Return mock payment link / validation result
└─ Result: Browser sees valid response, proceeds

LAYER: Edge Function (Supabase)
├─ Error: Database unreachable
├─ Detection: SQL query fails
├─ Recovery: Try-catch → Return error response
├─ Fallback: API route catches and uses mock
└─ Result: Graceful degradation at multiple levels

LAYER: Payment Gateway
├─ Error: Razorpay API down
├─ Detection: fetch() timeout or 5xx response
├─ Recovery: Catch block → Try PhonePe
├─ Fallback 1: PhonePe API → Try direct UPI
├─ Fallback 2: Direct UPI → Generate UPI string
├─ Fallback 3: Direct UPI success → Return to user
└─ Result: Always returns a valid payment link

LAYER: Webhook
├─ Error: Payment gateway unreachable
├─ Detection: Webhook endpoint returns 5xx
├─ Recovery: Gateway retries (exponential backoff)
├─ Fallback: Manual webhook replay via dashboard
└─ Result: Payment is eventually confirmed

LAYER: Database (Concurrent Updates)
├─ Error: Race condition during webhook processing
├─ Detection: Two webhooks for same order simultaneously
├─ Recovery: Unique constraint on (order_id, status)
├─ Fallback: Second update fails, but check exists so idempotent
└─ Result: Order processed only once, no double payment
```

---

## 📡 PART 8: REAL-TIME DATA FLOW

### **Timeline of Payment Completion**

```
TIME    ACTOR              ACTION                  STATE
────────────────────────────────────────────────────────
T+0s    Customer          Clicks "Pay with UPI"   
        Browser           State: isProcessing=true
        API Route         Receives request
        
T+1s    Payment API       Calls Razorpay          
        Razorpay API      Creates order & link
        
T+2s    Database          Stores payment_link     State: link created
        Browser           Receives response
        Browser           Updates state           State: showPaymentLink=true
        Component         Re-renders              UI: Shows QR code
        
T+3s    Customer          Scans QR with app
        Payment App       Processes payment
        Payment Gateway   Takes payment
        
T+5s    Payment Gateway   Success!
        Webhook Service   Prepares callback
        
T+6s    Webhook Service   POST to /api/webhooks...
        API Route         Receives webhook
        API Route         Verifies signature
        
T+7s    Edge Function     Processes payment
        Database          Updates payment status  State: status=paid
        Database          Updates order status    State: order=paid
        Edge Function     Returns success
        
T+8s    API Route         Sends response to gateway
        Webhook Service   Confirms delivery
        Customer App      Polls for status (or receives WebSocket)
        
T+10s   Component         Detects payment=paid
        Component         Re-renders             UI: Success screen
        Customer          Sees "Order Paid!"
        Kitchen           Sees order in queue

Most likely: T+5-10 seconds total from scan to confirmation
```

---

## 🚨 PART 9: EDGE CASES & SPECIAL SCENARIOS

### **SCENARIO 1: Customer closes app during payment**

```
TIMELINE:
T+0s   Payment link shown, customer opens payment app
T+1s   Customer closes browser (app minimized/closed)
T+3s   Customer pays in payment app
T+5s   Payment gateway sends webhook
─────────────── APP IS CLOSED ──────────────
T+6s   Webhook received, database updated
T+10s  Customer reopens app
       ├─ App queries order status from DB
       ├─ Sees order = "paid"
       ├─ Shows "Order Paid!" screen
       └─ Everything recovered correctly

LOGIC:
├─ Payment status doesn't depend on client connection
├─ Webhook updates database regardless of app state
├─ Next time app loads, it queries current state
└─ No data loss, recovery automatic
```

---

### **SCENARIO 2: Network fails mid-payment**

```
RESPONSE OPTIONS:

OPTION A: Network fails BEFORE payment link created
├─ Browser tries API call
├─ Network error caught
├─ Falls back to mock payment link
├─ Customer proceeds with test/mock UPI
├─ Later can retry with real gateway

OPTION B: Network fails AFTER payment link created, BEFORE webhook
├─ Payment link successfully stored in DB
├─ Customer scans QR and pays
├─ Payment gateway has record
├─ Webhook eventually delivered (retry logic)
├─ Order marked paid when webhook arrives
├─ No data loss

OPTION C: Network fails during webhook delivery
├─ Database update might be partial
├─ Webhook retry queue in gateway
├─ Eventually delivers successfully
├─ Manual webhook replay available in dashboard
├─ No orders double-charged (unique constraints)
```

---

### **SCENARIO 3: Duplicate webhook received**

```
SITUATION: Payment gateway sends webhook twice for same payment

FIRST WEBHOOK:
├─ Signature verified ✓
├─ Check for duplicate: SELECT * WHERE order_id=X AND status='completed'
├─ Result: Not found
├─ Update database: INSERT/UPDATE records
├─ Return 200 OK

SECOND WEBHOOK (5 seconds later):
├─ Signature verified ✓
├─ Check for duplicate: SELECT * WHERE order_id=X AND status='completed'
├─ Result: FOUND (it's a duplicate!)
├─ Don't process again (idempotent)
├─ Return 200 OK (tell gateway we got it)
└─ No double charge!

KEY: Unique constraint prevents duplicate writes
```

---

### **SCENARIO 4: Restaurant offline, customer at table**

```
WHEN OFFLINE:

STEP 1: Customer tries to validate table
├─ API: fetch("/api/qr/validate")
├─ Result: Network error (no connection)
├─ Falls back to mock validation
├─ Returns mock menu URL
├─ Shows "Test Mode" badge

STEP 2: Customer browses menu (local, pre-cached)
├─ Menu might be cached from previous visit
├─ Or test menu items shown
├─ Continues shopping

STEP 3: Customer tries to order
├─ Order submission attempts API call
├─ Network error → Falls back
├─ Order might queue locally
├─ Shows "Will send when online"

STEP 4: Payment happens
├─ If offline: Can't reach payment gateway
├─ Falls back to "Pay at Counter"
├─ Customer pays at counter
├─ Order syncs when connection restored

LOGIC: The system gracefully degrades, always shows something useful
```

---

## 🔐 PART 10: SECURITY & VALIDATION

### **INPUT VALIDATION AT EACH POINT**

```
CLIENT-SIDE (Browser):
├─ ownerId: Must be UUID format
├─ tableNumber: Must be integer 1-99
├─ amount: Must be > 0
├─ orderId: Must match existing order
└─ Show error to user if invalid

API-SIDE (Next.js):
├─ Repeat all client-side validation
├─ Additional: Check userId matches restaurant
├─ Additional: Verify phone number format
├─ Additional: Check order belongs to restaurant
└─ Return 400 if validation fails

DATABASE-SIDE (PostgreSQL):
├─ Column constraints: NOT NULL, CHECK, UNIQUE
├─ Foreign key constraints
├─ RLS (Row Level Security) policies
├─ Type checking (UUID, integer, numeric)
└─ Triggers for audit logging

PAYMENT GATEWAY (External):
├─ HMAC signature verification (critical!)
├─ Amount validation (matches database)
├─ Timestamp validation (not too old)
├─ Order ID cross-reference
└─ Reject if any check fails
```

---

### **RLS POLICIES**

```
Table: qr_scan_logs
├─ Policy: owner_view_own_data
│  └─ Only restaurant owners can see their own QR scans
│
├─ Policy: staff_manage_own_restaurant_data
│  └─ Staff can view scans for their restaurant
│
└─ Policy: customer_cannot_access
   └─ Customers (row_level_security_user != owner) can't see

Table: payment_link_tokens
├─ Policy: owner_view_own_payments
│  └─ Only see payments for their restaurant
│
└─ Policy: webhook_service_update_only
   └─ Only Edge Functions can update from webhooks

These policies ensure:
├─ Multi-tenancy safety
├─ No data leakage between restaurants
└─ Secure webhook processing
```

---

## ✅ PART 11: VALIDATION CHECKLIST

### **Before Production Deployment**

```
LOGIC VALIDATION:
☐ All 5 user flows tested
☐ All error paths tested
☐ All fallback mechanisms working
☐ Duplicate webhook handled correctly
☐ Race conditions tested
☐ Network disconnection tested
☐ Payment cancellation handled

DATA VALIDATION:
☐ No data loss scenarios
☐ All database constraints working
☐ RLS policies preventing unauthorized access
☐ HMAC signature verification working
☐ Idempotent operations confirmed

SECURITY VALIDATION:
☐ No SQL injection possible
☐ No XSS vulnerabilities
☐ CSRF tokens if applicable
☐ signature verification mandatory
☐ Webhook replay protection

PERFORMANCE VALIDATION:
☐ API response time < 500ms
☐ Webhook processing < 2s
☐ Database queries optimized
☐ Proper indexing on all FK columns
☐ No N+1 query problems

DOCUMENTATION VALIDATION:
☐ All flows documented
☐ All edge cases documented
☐ Error messages user-friendly
☐ Troubleshooting guide complete

TESTING VALIDATION:
☐ Unit tests for each hook
☐ Integration tests for flows
☐ E2E tests in production-like environment
☐ Load testing (100+ concurrent orders)
☐ Chaos testing (random failures)
```

---

## 📊 SUMMARY TABLE

| Component | Purpose | State | Data In | Data Out | Fallback |
|-----------|---------|-------|---------|----------|----------|
| QRValidation | Validate table | UseState | ownerId, table# | menuUrl | Mock data |
| PaymentLinks | Generate link | UseQuery | orderId, amount | QR code | Mock link |
| ManualForm | Table input | UseState | selection | validation | MOCK_RESTAURANTS |
| PaymentSelector | Choose method | UseState | none | selectedMethod | Counter |
| PaymentDisplay | Show QR | UseState | paymentUrl | timer | "Check Status" |
| API Routes | Bridge gap | Handlers | request | response | error handling |
| Database | Persist | RLS | INSERT/SELECT | data | referential integrity |
| Webhooks | Payment update | Event | payment data | status update | retry queue |

---

## 🎓 KEY INSIGHTS

1. **Every flow has a fallback** - No dead ends for users
2. **Database is single source of truth** - Not browser state
3. **Idempotent operations** - Safe to retry without side effects
4. **Graceful degradation** - Works with or without backend
5. **Real-time synchronization** - Webhooks keep systems in sync
6. **Multi-tenancy safe** - RLS ensures data isolation
7. **Security at multiple layers** - Defense in depth approach

---

**This architecture ensures:** Reliable | Scalable | Secure | Recoverable | User-friendly

File saved: `ARCHITECTURE_SYSTEM_DESIGN.md`
