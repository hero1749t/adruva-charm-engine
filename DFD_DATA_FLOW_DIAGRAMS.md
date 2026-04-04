# 📊 DETAILED DATA FLOW DIAGRAMS (DFD) - Visual Guide

**Comprehensive visual representation of all data flows in the system**

---

## 🎯 DFD LEVEL 0: System Context Diagram

```
                    ┌─────────────────────────────┐
                    │   EXTERNAL SYSTEMS          │
                    ├─────────────────────────────┤
                    │ • Razorpay API              │
                    │ • PhonePe API               │
                    │ • Email Service (optional)  │
                    │ • SMS Service (optional)    │
                    └──────────────┬──────────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
                │                  │                  │
         ┌──────▼────────┐   ┌──────▼────────┐  ┌──────▼────────┐
         │  RESTAURANT   │   │   CUSTOMER    │  │     STAFF     │
         │   OWNER       │   │  (Mobile Web) │  │  (POS System) │
         └──────┬────────┘   └──────┬────────┘  └──────┬────────┘
                │                   │                   │
                └───────────────────┼───────────────────┘
                                    │
                      ┌─────────────▼──────────────┐
                      │  ADRUVA QR PAYMENT SYSTEM  │
                      │                            │
                      │ ┌──────────────────────┐   │
                      │ │ Frontend (React)     │   │
                      │ │ - Components         │   │
                      │ │ - Hooks              │   │
                      │ │ - State Management   │   │
                      │ └──────────────────────┘   │
                      │                            │
                      │ ┌──────────────────────┐   │
                      │ │ API Routes (Next.js) │   │
                      │ │ - Validation         │   │
                      │ │ - Processing         │   │
                      │ │ - Forwarding         │   │
                      │ └──────────────────────┘   │
                      │                            │
                      │ ┌──────────────────────┐   │
                      │ │ Database             │   │
                      │ │ (PostgreSQL)         │   │
                      │ │ - Tables             │   │
                      │ │ - RLS Policies       │   │
                      │ └──────────────────────┘   │
                      │                            │
                      │ ┌──────────────────────┐   │
                      │ │ Edge Functions       │   │
                      │ │ (Supabase)           │   │
                      │ │ - QR Validation      │   │
                      │ │ - Payment Processing │   │
                      │ │ - Webhook Handling   │   │
                      │ └──────────────────────┘   │
                      │                            │
                      └────────────────────────────┘
                                    │
                    ┌───────────────┴────────────────┐
                    │                                │
            ┌───────▼─────────┐         ┌───────────▼────────┐
            │ Payments Gateways│        │ Database Backups   │
            │ • Razorpay       │        │ • Daily snapshots  │
            │ • PhonePe        │        │ • Monthly archives │
            └──────────────────┘        └────────────────────┘
```

---

## 📈 DFD LEVEL 1: Main System Processes

```
        ┌────────────────────────────────────────────────────────────┐
        │                  ADRUVA QR PAYMENT SYSTEM                  │
        │                    LEVEL 1 PROCESSES                       │
        └────────────────────────────────────────────────────────────┘

                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼

    ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
    │ 1.0                  │ │ 2.0                  │ │ 3.0                  │
    │ QR VALIDATION PROCESS│ │ PAYMENT PROCESSING   │ │ WEBHOOK PROCESSING   │
    ├──────────────────────┤ ├──────────────────────┤ ├──────────────────────┤
    │ • Receive QR data    │ │ • Receive order      │ │ • Receive webhook    │
    │ • Validate table     │ │ • Create payment link│ │ • Verify signature   │
    │ • Return menu URL    │ │ • Call gateway API   │ │ • Update database    │
    │ • Log QR scan        │ │ • Store link in DB   │ │ • Notify systems     │
    └──────────────────────┘ └──────────────────────┘ └──────────────────────┘
              │                        │                        │
              │                        │                        │
        (QR Source)            (Payment Source)          (Gateway Source)
              │                        │                        │
              ▼                        ▼                        ▼

    ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
    │ 4.0                  │ │ 5.0                  │ │ 6.0                  │
    │ FALLBACK MECHANISM   │ │ DATA PERSISTENCE     │ │ ERROR HANDLING       │
    ├──────────────────────┤ ├──────────────────────┤ ├──────────────────────┤
    │ • Mock data gen      │ │ • Store in DB        │ │ • Validate input     │
    │ • Gateway fallback   │ │ • Apply RLS          │ │ • Catch exceptions   │
    │ • Counter payment    │ │ • Create indexes     │ │ • Retry logic        │
    └──────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

---

## 🔄 DFD LEVEL 2: QR Validation Process (1.0)

```
INPUT: { ownerId: UUID, tableNumber: 1-99 }

    ┌─────────────────────────────────────────────────────┐
    │ Process 1.1: Input Validation                       │
    ├─────────────────────────────────────────────────────┤
    │ • Check ownerId format (UUID)         ────► OK?     │
    │ • Check tableNumber range (1-99)      ────► OK?     │
    │ • Check required fields               ────► OK?     │
    │ • Trim whitespace                             │     │
    └──────────────────────────┬────────────────────┘     │
                               │                          │
                               YES                        NO
                               │                          │
                    ┌──────────▼──────────┐    ┌─────────▼──────────┐
                    │   Continue          │    │  Error Response    │
                    │   Processing        │    │  Status: 400       │
                    └──────────┬──────────┘    └────────────────────┘
                               │
    ┌──────────────────────────▼─────────────────────────┐
    │ Process 1.2: Database Query                       │
    ├──────────────────────────────────────────────────┤
    │ Query: SELECT * FROM restaurants                │
    │        WHERE user_id = ownerId                  │
    │                                                 │
    │ Result: FOUND? ────► Restaurant Data           │
    │         NOT FOUND? ────► Error 404             │
    │         ERROR? ────► Error 500                 │
    └──────────────────────────┬──────────────────────┘
                               │
                      Restaurant Data
                               │
    ┌──────────────────────────▼─────────────────────────┐
    │ Process 1.3: Table Existence Check                │
    ├──────────────────────────────────────────────────┤
    │ • Get: restaurant.tables (array or count)        │
    │ • Check: tableNumber in range                    │
    │ • Check: Table not marked as deleted             │
    │                                                 │
    │ Result: VALID? ────► Continue                   │
    │         INVALID? ────► Error 404                │
    └──────────────────────────┬──────────────────────┘
                               │
    ┌──────────────────────────▼─────────────────────────┐
    │ Process 1.4: Scan Logging                         │
    ├──────────────────────────────────────────────────┤
    │ INSERT INTO qr_scan_logs (                       │
    │   owner_id = ownerId,                           │
    │   table_number = tableNumber,                   │
    │   scan_timestamp = NOW(),                       │
    │   validation_result = 'success',                │
    │   device_info = { userAgent, IP, browser },     │
    │   status = 'new'                                │
    │ )                                               │
    │                                                 │
    │ Result: SUCCESS? ────► Continue                 │
    │         FAILED? ────► Log error, but continue   │
    └──────────────────────────┬──────────────────────┘
                               │
    ┌──────────────────────────▼─────────────────────────┐
    │ Process 1.5: Response Generation                  │
    ├──────────────────────────────────────────────────┤
    │ RESPONSE = {                                    │
    │   success: true,                                │
    │   tableId: `table_${tableNumber}`,              │
    │   menuUrl: `/menu/${ownerId}?table=${tableNum}`,│
    │   restaurantName: restaurant.name               │
    │ }                                               │
    │                                                 │
    │ Status: 200 OK                                  │
    └─────────────────────────┬───────────────────────┘
                              │
OUTPUT: menuUrl sent to browser, customer redirected to menu
```

---

## 💳 DFD LEVEL 2: Payment Link Creation (2.0)

```
INPUT: { orderId, amount, gateway, customerPhone, customerEmail }

    ┌─────────────────────────────────────────────────────┐
    │ Process 2.1: Request Validation                     │
    ├─────────────────────────────────────────────────────┤
    │ • Check orderId exists in DB        ────► OK?      │
    │ • Check amount > 0                  ────► OK?      │
    │ • Check phone format                ────► OK?      │
    │ • Check email format                ────► OK?      │
    │ • Check gateway is valid            ────► OK?      │
    └──────────────────────────┬──────────────────────────┘
                               │
                               YES
                               │
    ┌──────────────────────────▼─────────────────────────┐
    │ Process 2.2: Existing Link Check (Idempotent)      │
    ├──────────────────────────────────────────────────┤
    │ Query: SELECT * FROM payment_link_tokens         │
    │        WHERE order_id = orderId                  │
    │        AND status = 'active'                     │
    │        AND expires_at > NOW()                    │
    │                                                 │
    │ Found? ────► RETURN existing link               │
    │ Not Found? ────► Continue to create new         │
    └──────────────────────────┬──────────────────────┘
                               │
    ┌──────────────────────────▼─────────────────────────┐
    │ Process 2.3: Gateway Selection & API Call          │
    ├──────────────────────────────────────────────────┤
    │                                                 │
    │ PRIMARY: Razorpay API                           │
    │ ├─ fetch() POST with 2 sec timeout              │
    │ ├─ SUCCESS? ────► Store & return response       │
    │ ├─ FAIL? ────► Try fallback                     │
    │ └─ TIMEOUT? ────► Try fallback                  │
    │                                                 │
    │ FALLBACK 1: PhonePe API                         │
    │ ├─ fetch() POST with 2 sec timeout              │
    │ ├─ SUCCESS? ────► Store & return response       │
    │ ├─ FAIL? ────► Try fallback                     │
    │ └─ TIMEOUT? ────► Try fallback                  │
    │                                                 │
    │ FALLBACK 2: Direct UPI                          │
    │ ├─ Generate UPI string locally                  │
    │ ├─ Generate QR from UPI                         │
    │ └─ ALWAYS SUCCESS ────► Store & return          │
    │                                                 │
    └──────────────────────────┬──────────────────────┘
                               │
    ┌──────────────────────────▼─────────────────────────┐
    │ Process 2.4: Link Storage                          │
    ├──────────────────────────────────────────────────┤
    │ INSERT INTO payment_link_tokens (                │
    │   id = uuid_generate(),                         │
    │   order_id = orderId (UNIQUE),                  │
    │   payment_link = linkUrl,                       │
    │   qr_code = qrCodeData,                         │
    │   gateway = gatewayUsed,                        │
    │   status = 'active',                            │
    │   generated_at = NOW(),                         │
    │   expires_at = NOW() + 15 MINUTES               │
    │ )                                               │
    │                                                 │
    │ Result: SUCCESS? ────► Return link              │
    │         FAIL? ────► Use mock data               │
    └──────────────────────────┬──────────────────────┘
                               │
    ┌──────────────────────────▼─────────────────────────┐
    │ Process 2.5: Response Formatting                   │
    ├──────────────────────────────────────────────────┤
    │ RESPONSE = {                                    │
    │   success: true,                                │
    │   link: {                                       │
    │     id: tokenId,                                │
    │     url: paymentGatewayUrl,                     │
    │     qrCode: qrCodeSVG,                          │
    │     expiresAt: expirationTime,                  │
    │     gateway: gatewayUsed,                       │
    │     status: 'active',                           │
    │     upiString: upiDirectLink                    │
    │   }                                             │
    │ }                                               │
    └─────────────────────────┬───────────────────────┘
                              │
OUTPUT: Payment link + QR sent to browser, customer scans & pays
```

---

## 🔗 DFD LEVEL 2: Webhook Processing (3.0)

```
INPUT (from Payment Gateway): { event, orderId, amount, status, paymentId }

    ┌─────────────────────────────────────────────────────┐
    │ Process 3.1: Signature Verification                 │
    ├─────────────────────────────────────────────────────┤
    │ • Extract X-Razorpay-Signature from header         │
    │ • Get raw request body (before parsing)            │
    │ • Compute: HMAC-SHA256(body, WEBHOOK_SECRET)       │
    │ • Compare computed vs header signature             │
    │                                                    │
    │ Match? ────► Continue to step 3.2                  │
    │ No Match? ────► Return 401 Unauthorized            │
    │ (Stop processing, don't trust webhook)             │
    └──────────────────────────┬──────────────────────────┘
                               │
    ┌──────────────────────────▼─────────────────────────┐
    │ Process 3.2: Webhook Parsing                       │
    ├──────────────────────────────────────────────────┤
    │ Parse JSON body                                 │
    │                                                 │
    │ Malformed? ────► Return 400 Bad Request         │
    │ Valid? ────► Extract fields                     │
    │                                                 │
    │ Extract:                                        │
    │ • orderId from event.entity.id (or payload)    │
    │ • amount from event.entity.amount              │
    │ • status from event.entity.status              │
    │ • paymentId from payload.payment.id            │
    │ • timestamp from event.created_at              │
    │                                                 │
    │ All present? ────► Continue                     │
    │ Missing? ────► Return 422 Unprocessable Entity │
    └──────────────────────────┬──────────────────────┘
                               │
    ┌──────────────────────────▼─────────────────────────┐
    │ Process 3.3: Duplicate Check (Idempotent)          │
    ├──────────────────────────────────────────────────┤
    │ Query: SELECT COUNT(*) FROM payment_link_tokens │
    │        WHERE order_id = orderId                 │
    │        AND status = 'completed'                 │
    │        AND webhook_received_at IS NOT NULL     │
    │                                                 │
    │ Count > 0? (Duplicate detected)                 │
    │ ├─ YES ────► Return 200 OK (tell gateway OK)   │
    │ │           (Don't process again!)              │
    │ └─ NO ────► Continue to step 3.4               │
    │                                                 │
    │ Important: Always return 200 to gateway!        │
    │ (Even if we reject it, tell gateway "OK")       │
    └──────────────────────────┬──────────────────────┘
                               │
    ┌──────────────────────────▼─────────────────────────┐
    │ Process 3.4: Amount Verification                   │
    ├──────────────────────────────────────────────────┤
    │ Query: SELECT amount FROM orders WHERE id = id │
    │                                                 │
    │ Expected amount == webhook amount?              │
    │ ├─ YES ────► Continue to step 3.5               │
    │ ├─ NO ────► Log alert, but continue anyway      │
    │ │           (Might be promotional discount)    │
    │ └─ NOT FOUND ────► Return 404 (but 200 to gw)  │
    └──────────────────────────┬──────────────────────┘
                               │
    ┌──────────────────────────▼─────────────────────────┐
    │ Process 3.5: Database Updates (Multiple)            │
    ├──────────────────────────────────────────────────┤
    │                                                 │
    │ UPDATE 1: payment_link_tokens table             │
    │ ├─ SET status = 'completed'                     │
    │ ├─ SET payment_confirmed_at = NOW()             │
    │ ├─ SET webhook_received_at = NOW()              │
    │ ├─ WHERE order_id = orderId                     │
    │ └─ Result: SUCCESS? → Continue : Log error      │
    │                                                 │
    │ UPDATE 2: orders table                          │
    │ ├─ SET status = 'paid'                          │
    │ ├─ SET paid_at = NOW()                          │
    │ ├─ WHERE id = orderId                           │
    │ └─ Result: SUCCESS? → Continue : Log error      │
    │                                                 │
    │ UPDATE 3: order_abandonment_tracking table      │
    │ ├─ SET recovery_status = 'recovered'            │
    │ ├─ SET marked_abandoned_at = NULL               │
    │ ├─ WHERE order_id = orderId                     │
    │ └─ Result: SUCCESS? → Continue : Not critical   │
    │                                                 │
    │ Note: If any update fails, log but continue     │
    │ (Process errors captured for manual review)     │
    └──────────────────────────┬──────────────────────┘
                               │
    ┌──────────────────────────▼─────────────────────────┐
    │ Process 3.6: System Notifications                  │
    ├──────────────────────────────────────────────────┤
    │ • Call Edge Function: payment-webhook           │
    │   (Additional processing if needed)              │
    │                                                 │
    │ • Notify Customer App                           │
    │   ├─ WebSocket if available                     │
    │   ├─ Or Polling next time app queries           │
    │   └─ Sends: "Payment received"                  │
    │                                                 │
    │ • Notify Kitchen POS                            │
    │   ├─ New order received                         │
    │   ├─ Order ready for preparation                │
    │   └─ Priority based on time paid                │
    │                                                 │
    │ • Optionally notify via Email/SMS               │
    │   └─ Confirmation to customer                   │
    └──────────────────────────┬──────────────────────┘
                               │
    ┌──────────────────────────▼─────────────────────────┐
    │ Process 3.7: Response to Gateway                   │
    ├──────────────────────────────────────────────────┤
    │ RESPONSE = {                                    │
    │   status: "received",                           │
    │   orderId: orderId,                             │
    │   processedAt: NOW()                            │
    │ }                                               │
    │                                                 │
    │ HTTP Status: 200 OK                             │
    │                                                 │
    │ Important: Always return 200!                   │
    │ Tells gateway: "Stop retrying, we got it"       │
    └──────────────────────────┬──────────────────────┘
                               │
OUTPUT: Gateway stops retrying, database updated, systems notified
```

---

## 🌐 DFD LEVEL 2: Data Flow Between Systems

```
                    BROWSER/REACT              API ROUTES (Next.js)         SUPABASE
                    ──────────                 ──────────────────────         ────────

Customer                                                                       
Scans QR                                                                       
    │                                                                         
    ├─ QR contains: ownerId + tableNumber                                     
    │                                                                         
    ├─ Route: /qr-entry?ownerId=xxx&table=5                                  
    │                                                                         
    ├─ Shows ManualEntryForm with pre-fill                                    
    │                                                                         
    ├─ User clicks "Load Menu"                                               
    │                                                                         
    └──► fetch POST /api/qr/validate                                         
         {ownerId, tableNumber}                                              
             │                                                                
             │                         API receives request                   
             │                         │                                      
             │                         ├─ Validate input                      
             │                         │                                      
             │                         └──► Call Edge Function                
             │                              qr-validate/index.ts             
             │                              │                                
             │                              ├─ Query DB: restaurant          
             │                              │  SELECT * FROM restaurants     
             │                              │  WHERE user_id = ownerId       
             │                              │                                
             │                              ├─ Validate table exist          
             │                              │                                
             │                              ├─ INSERT scan log               
             │                              │  INSERT INTO qr_scan_logs      
             │                              │                                
             │                              └─ Return result                 
             │                                 { success, menuUrl }          
             │                         │                                      
             │────────── RESPONSE ◄────┤                                      
             │ {success, menuUrl,       │
             │  restaurantName}         │
             │                          │                                     
    ┌────────▼────────┐                 │                                     
    │ Browser receives│              Database    
    │ response        │              updated:    
    │                 │              • qr_scan_logs updated
    │ Update state:   │
    │ • menuUrl set   │                 
    │ • error cleared │                 
    │ • loading = false                │
    │                 │                 
    └────────┬────────┘                 
             │                          
    ┌────────▼────────┐                 
    │ Navigate to:    │                 
    │ /menu/{ownerId} │                 
    │ ?table=5        │                 
    │                 │                 
    │ Component loads │                 
    │ menu items      │                 
    └─────────────────┘
```

---

## 💰 DFD: Payment Flow Data Movement

```
CUSTOMER APP                    BACKEND                      PAYMENT GATEWAY
────────────                    ───────                      ────────────────

Customer
adds items
to cart
    │
    ├─ Clicks "Order"
    │
    └──► API creates order
         (existing flow)
         
Order
created
    │
    ├─ Shows Payment     API receives:
    │ Selector          POST /api/payment-links/create
    │                   {orderId, amount, gateway}
    │                        │
    │                        ├─ Validate amount
    │                        │
    └───────────────────────►├─ Check for existing link
    User clicks               │
    "Pay with UPI"           ├─ Call Razorpay API
                             │  ├─ Create order
                             │  ├─ Generate link
                             │  └─ Get QR code
                             │
                        ┌────▼──────┐
                        │ Response   │
                        │ {success,  │
                        │  link,     │
                        │  qrCode}   │
                        └────┬──────┘
    ◄───────────────────────┤
    Component receives      │
    payment link            │
                           │
    ┌──────────────────────────────────────────┐
    │                                          │
    │ Display PaymentLinkDisplay component     │
    │ ├─ QR code SVG rendered                  │
    │ ├─ UPI address shown                     │
    │ ├─ Timer counting 15 minutes             │
    │ └─ Payment app button                    │
    │                                          │
    │ User scans and pays                      │
    │                                          │
    │ (Payment app handles payment)            │
    │       │                                  │
    │       └──► RAZORPAY ◄──┐                │
    │            │            │                │
    │            ├─ Process payment           │
    │            │                            │
    │            └──► Webhook callback ────►  │
    │                 POST /api/webhooks/    │
    │                 payment-callback       │
    │                 {orderId, amount,      │
    │                  status, signature}   │
    │                       │                │
    │                       ├─ Verify sig   │
    │                       │               │
    │                       ├─ Update DB   │
    │                       │               │
    │                       └─ Notify app   │
    │                       
    │ App polls for status
    │ (or WebSocket update)
    │
    │ UI updates: "Order Paid!"
    │
    └──────────────────────────────────────────┘
```

---

## 🗄️ DFD: Data Storage & Retrieval

```
┌─────────────────────────────────────────────────────────┐
│               DATABASE (PostgreSQL)                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────┐      │
│  │ qr_scan_logs                                 │      │
│  ├──────────────────────────────────────────────┤      │
│  │ • Inserted on every QR scan attempt          │      │
│  │ • owner_id: Filter by restaurant             │      │
│  │ • scan_timestamp: Track time patterns        │      │
│  │ • validation_result: success/failed/invalid  │      │
│  │ • device_info: User agent, IP, browser       │      │
│  │ • status: new/converted/abandoned            │      │
│  │                                              │      │
│  │ Indexes:                                     │      │
│  │ • (owner_id)                                 │      │
│  │ • (table_number)                             │      │
│  │ • (scan_timestamp)                           │      │
│  │ • (status)                                   │      │
│  │                                              │      │
│  │ RLS: Only restaurant owners see own data    │      │
│  └──────────────────────────────────────────────┘      │
│                      ▲                                  │
│                      │ SELECT query from useQRValidation
│                      │ INSERT on scan                  │
│                                                         │
│  ┌──────────────────────────────────────────────┐      │
│  │ payment_link_tokens                          │      │
│  ├──────────────────────────────────────────────┤      │
│  │ • Unique on (order_id) - prevents duplicates │      │
│  │ • order_id: Link to orders table             │      │
│  │ • payment_link: URL from gateway             │      │
│  │ • qr_code: QR code SVG or image             │      │
│  │ • gateway: razorpay/phonepe/upi              │      │
│  │ • status: active/completed/failed/expired    │      │
│  │ • expires_at: 15 minutes from creation       │      │
│  │ • webhook_received_at: When payment confirmed│      │
│  │                                              │      │
│  │ Indexes:                                     │      │
│  │ • (order_id) UNIQUE                          │      │
│  │ • (status)                                   │      │
│  │ • (expires_at)                               │      │
│  │                                              │      │
│  │ RLS: Edge Functions update via webhooks     │      │
│  └──────────────────────────────────────────────┘      │
│                      ▲                                  │
│                      │ UPDATE from webhook processor   │
│                      │ SELECT from payment status check│
│                                                         │
│  ┌──────────────────────────────────────────────┐      │
│  │ order_abandonment_tracking                   │      │
│  ├──────────────────────────────────────────────┤      │
│  │ • Tracks unpaid orders > 30 minutes          │      │
│  │ • order_id: Reference to orders              │      │
│  │ • total_amount: Amount unpaid                │      │
│  │ • created_at: Order creation time            │      │
│  │ • payment_initiated_at: When QR showed       │      │
│  │ • marked_abandoned_at: When marked lost      │      │
│  │ • recovery_status: tracking/recovered/lost   │      │
│  │                                              │      │
│  │ Indexes:                                     │      │
│  │ • (owner_id)                                 │      │
│  │ • (created_at)                               │      │
│  │ • (recovery_status)                          │      │
│  │                                              │      │
│  │ RLS: Only owner can view own tracking        │      │
│  └──────────────────────────────────────────────┘      │
│                      ▲                                  │
│                      │ INSERT on order placed          │
│                      │ UPDATE on payment received      │
│                      │ SELECT for owner dashboard      │
│                                                         │
│  ┌──────────────────────────────────────────────┐      │
│  │ [Existing Tables]                            │      │
│  ├──────────────────────────────────────────────┤      │
│  │ • restaurants: owner info, table count       │      │
│  │ • orders: order details, items, totals       │      │
│  │ • order_items: individual food items         │      │
│  │ • menu_items: restaurant menu                │      │
│  │ • auth.users: customer/staff authentication  │      │
│  │                                              │      │
│  │ Connections:                                 │      │
│  │ • qr_scan_logs.owner_id → restaurants.id    │      │
│  │ • payment_link_tokens.order_id → orders.id  │      │
│  │ • order_abandonment.order_id → orders.id    │      │
│  └──────────────────────────────────────────────┘      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔀 DFD: Error Recovery Flows

```
┌─────────────────────────────────────────────────────────────┐
│                    ERROR DETECTION POINT                    │
│                                                             │
│  "API call failed" OR "Response invalid" OR "Timeout"       │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────▼──────────────┐
          │ Error Type Assessment       │
          └──────────────┬──────────────┘
                         │
        ┌────────┬───────┴────────┬────────┐
        │        │                │        │
        ▼        ▼                ▼        ▼
    Network   Validation    Gateway    Database
    Timeout   Error         Error       Error
        │        │            │          │
        ▼        ▼            ▼          ▼
    
   RECOVERY 1: Network Timeout
   ├─ Condition: fetch() times out
   ├─ Check: Is this critical API or fallback-capable?
   ├─ If fallback-capable:
   │  ├─ Use mock data
   │  ├─ Show "Test Mode" toast
   │  └─ User continues with mock
   └─ If critical:
      ├─ Retry 3 times
      ├─ Exponential backoff (100ms, 200ms, 400ms)
      └─ If all fail: Show error, stop flow

   RECOVERY 2: Validation Error
   ├─ Condition: Client-side or server validation fails
   ├─ Show inline error message
   ├─ Highlight invalid field
   ├─ Clear error when field changed
   └─ User corrects and retries

   RECOVERY 3: Gateway Error (Payment)
   ├─ Condition: Razorpay/PhonePe API returns error
   ├─ Log error with gateway name
   ├─ Try fallback gateway (if available)
   ├─ If fallback fails: Try direct UPI
   └─ Always return valid payment link to user

   RECOVERY 4: Database Error
   ├─ Condition: SQL query fails or constraint violated
   ├─ Log full error for debugging
   ├─ Retry if transient (deadlock, timeout)
   ├─ Show user appropriate message
   ├─ If critical: Escalate to manual review
   └─ Never leak database error to user

   RECOVERY 5: Partial Failure (e.g., webhook processing)
   ├─ Condition: Some updates succeed, some fail
   ├─ Mark transaction for manual review
   ├─ Ensure payment is safe (no double-charging)
   ├─ Send alert to admin
   ├─ Implement retry logic for failed updates
   └─ Data eventually consistent
```

---

## 📊 DFD: State Transitions in Order

```
                    ORDER LIFECYCLE WITH PAYMENT

    ┌────────────┐
    │   CREATED  │ (Initial state when order placed)
    └─────┬──────┘
          │
          │ "Show Payment Selector"
          ▼
    ┌──────────────────────┐
    │ PAYMENT_PENDING      │ (Waiting for payment method choice)
    ├──────────────────────┤
    │ Options:             │
    │ • Choose UPI (QR)    │
    │ • Choose Counter     │
    └──┬──────────────────┬┘
       │                  │
  UPI  │                  │ COUNTER
       │                  │
       ▼                  ▼
   ┌─────────────┐   ┌──────────────┐
   │  QR_SHOWN   │   │ COUNTER_PAID │ (Staff collecting cash)
   │             │   │              │
   │ Link + QR   │   │ Customer at  │
   │ displayed   │   │ counter      │
   └──────┬──────┘   │              │
          │          │ Staff marks  │
          │ Payment  │ as paid      │
          │ gateway  │              │
          │ callback │              │
          │          └──────┬───────┘
          │                 │
          │        ┌────────▼───────┐
          └───────►│  PAID          │ (Payment received)
                   │                │
                   │ Database       │
                   │ updated        │
                   │                │
                   └────────┬───────┘
                            │
                   ┌────────▼───────┐
                   │  READY_SERVE   │ (Order prepared)
                   │                │
                   │ Send to kitchen│
                   │ Start prep     │
                   └────────┬───────┘
                            │
                   ┌────────▼───────┐
                   │  COMPLETED     │ (Customer received)
                   └────────────────┘

IMPORTANT STATE RULES:
• CREATED → PAYMENT_PENDING (always)
• PAYMENT_PENDING → QR_SHOWN OR COUNTER_PAID (user choice)
• Both paths converge at PAID (payment received)
• No payment = stays in PAYMENT_PENDING
• Timeout (30 min) = moved to ABANDONED state
```

---

## 🎯 Summary: Complete Data Flow

```
                            ┌─ CUSTOMER ─┐
                            │  at table  │
                            └─────┬──────┘
                                  │ Scans QR or enters manually
                                  ▼
                    ┌──────────────────────────────┐
                    │   VALIDATION PROCESS (1.0)   │
                    │  QR/Manual Entry Validation  │
                    └──────────────┬───────────────┘
                                   │ Returns menu URL
                                   ▼
                    ┌──────────────────────────────┐
                    │  MENU (Existing System)      │
                    │  Customer adds items         │
                    └──────────────┬───────────────┘
                                   │ Places order
                                   ▼
                    ┌──────────────────────────────┐
                    │  PAYMENT SELECTION           │
                    │  UPI or Counter?             │
                    └──────────────┬───────────────┘
                          ┌────────┴────────┐
                          ▼                 ▼
            ┌──────────────────┐  ┌─────────────────┐
            │  PAYMENT PROCESS │  │ COUNTER PAYMENT │
            │  (2.0)           │  │ (Staff handles) │
            │ QR Code + Link   │  │                 │
            └────────┬─────────┘  └────────┬────────┘
                     │                     │
          Payment    │                     │
          Gateway    │     ┌───────────────┘
          Processes  │     │ Staff marks paid
                       ▼     ▼
                    ┌──────────────────┐
                    │  WEBHOOK (3.0)   │
                    │  Payment Confirm │
                    └────────┬─────────┘
                             │ Updates DB
                             ▼
                    ┌──────────────────┐
                    │  ORDER PAID      │
                    │  Ready for prep  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  KITCHEN FLOW    │
                    │  (Existing)      │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  READY TO SERVE  │
                    │  Customer notified│
                    └──────────────────┘
```

---

## ✅ DFD VERIFICATION CHECKLIST

```
☐ All data flows shown with direction (→)
☐ All processes labeled (1.0, 2.0, 3.0, etc.)
☐ All data stores identified (Tables)
☐ All external entities shown (Gateways, users)
☐ Error handling paths included
☐ Fallback mechanisms shown
☐ Security validations marked
☐ Database operations detailed
☐ State transitions clear
☐ Timing information provided where relevant
☐ Recovery flows documented
☐ All APIs specified with request/response
☐ Webhook processing flow complete
☐ RLS policies noted
☐ Idempotency marked where needed
```

---

**All DFDs Created Successfully! ✅**
Complete visual representation of all data flows in the system.

File saved: `DFD_DATA_FLOW_DIAGRAMS.md`
