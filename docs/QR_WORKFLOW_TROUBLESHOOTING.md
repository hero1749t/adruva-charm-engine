# QR Workflow Troubleshooting Quick Reference

Fast lookup guide for common issues and solutions. Use when something breaks.

---

## Issue: "Cannot GET /menu/[id]?table=5"

**Symptoms:**
- Menu page shows 404 error
- CustomerMenu component not loading

**Root Causes & Solutions:**

1. **Router configuration missing**
   ```bash
   # Check vite.config.ts has correct base path
   grep -r "base:" vite.config.ts
   
   # Fix:
   # Configure SPA routing in your hosting
   # Vercel: vercel.json has "rewrites"
   # Nginx: location / { try_files $uri $uri/ /index.html; }
   ```

2. **CustomerMenu not exported**
   ```bash
   # Verify export exists
   grep "export.*CustomerMenu" src/pages/CustomerMenu.tsx
   
   # Fix: Add to src/pages/CustomerMenu.tsx if missing
   export default CustomerMenu;
   ```

3. **Route path incorrect**
   ```bash
   # Check routing configuration
   grep -r "/menu" src/App.tsx src/routes.tsx
   
   # Fix: Path should be /menu/:ownerId with table query param
   ```

---

## Issue: "No tables in qr_scan_logs after QR scan"

**Symptoms:**
- QR validation returns success
- Database table is empty
- No scan logs recorded

**Root Causes & Solutions:**

1. **RLS Policy blocking inserts**
   ```sql
   -- Check RLS policies
   SELECT policyname, USING, WITH CHECK FROM pg_policies 
   WHERE tablename = 'qr_scan_logs';
   
   -- Fix: Ensure INSERT policy allows authenticated users
   -- Should have: create_policy('Insert QR scan logs', ..., for INSERT using (...)
   ```

2. **Function not called**
   ```typescript
   // Check API route calls validate_qr_scan
   // In src/app/api/qr/validate/route.ts, should have:
   const result = await supabaseClient.rpc('validate_qr_scan', {
     owner_id: ownerId,
     table_number: tableNumber
   });
   
   // Fix: Add RPC call if missing
   ```

3. **Supabase connection failed silently**
   ```typescript
   // Check for console errors
   // In PaymentMethodSelector or useQRValidation
   console.error('QR validation failed:', error);
   
   // Fix: Add error logging and retry logic
   ```

---

## Issue: "Payment link not generating - shows spinner forever"

**Symptoms:**
- PaymentMethodSelector shows "Pay Online" button
- Clicking starts spinner but never completes
- No error message

**Root Causes & Solutions:**

1. **Razorpay credentials invalid**
   ```bash
   # Verify credentials are correct (must be LIVE for production)
   echo $RAZORPAY_KEY_ID    # Should start: rzp_live_ or rzp_test_
   echo $RAZORPAY_KEY_SECRET
   
   # Fix:
   # 1. Check Razorpay dashboard for correct credentials
   # 2. Copy LIVE keys (not test keys)
   # 3. Update .env.local or .env.production
   # 4. Restart application
   ```

2. **RAZORPAY_WEBHOOK_SECRET not set**
   ```bash
   # Check if secret exists
   env | grep RAZORPAY_WEBHOOK_SECRET
   # If empty:
   
   # Fix:
   # 1. Add to .env.local:
   RAZORPAY_WEBHOOK_SECRET=webhook_secret_123
   # 2. Restart dev server with: npm run dev
   ```

3. **Edge Function not deployed**
   ```bash
   # Check if function exists
   supabase functions list | grep payment-links-create
   
   # If missing:
   # Deploy function
   supabase functions deploy payment-links-create
   
   # Check logs
   supabase functions logs payment-links-create
   ```

4. **Network timeout**
   ```bash
   # Test Razorpay API directly
   curl -X GET "https://api.razorpay.com/v1/payment_links" \
     -u "$RAZORPAY_KEY_ID:$RAZORPAY_KEY_SECRET" \
     -H "Content-Type: application/json"
   
   # If fails: Razorpay API is down or credentials wrong
   ```

---

## Issue: "Invalid signature" on webhook"

**Symptoms:**
- Payment received, but order not marked as paid
- Webhook logs show "Invalid signature"
- Customer sees payment stuck as "pending"

**Root Causes & Solutions:**

1. **Webhook secret mismatch**
   ```bash
   # In production .env:
   RAZORPAY_WEBHOOK_SECRET=from_razorpay_dashboard
   
   # Fix:
   # 1. Go to Razorpay Dashboard → Settings → Webhooks
   # 2. Find webhook URL: https://your-domain.com/api/webhooks/payment-callback
   # 3. Copy secret from dashboard
   # 4. Update environment variable
   # 5. Redeploy: vercel deploy --prod
   ```

2. **Webhook URL not matching**
   ```bash
   # In Razorpay dashboard, webhook URL must be:
   # https://your-domain.com/api/webhooks/payment-callback
   
   # Fix:
   # 1. Open Razorpay Dashboard
   # 2. Settings → Webhooks
   # 3. Edit webhook
   # 4. Verify URL matches exactly
   # 5. Same for PhonePe if using
   ```

3. **Environment variable not loaded**
   ```bash
   # If using Vercel, check env vars are set:
   # Vercel Dashboard → Project → Settings → Environment Variables
   
   # Fix:
   // In webhook handler, add logging:
   console.log('Webhook Secret:', process.env.RAZORPAY_WEBHOOK_SECRET?.substring(0, 10) + '...');
   
   # Redeploy and check logs
   ```

4. **Wrong signature algorithm**
   ```typescript
   // In src/app/api/webhooks/payment-callback/route.ts
   // Razorpay should use HMAC-SHA256
   
   // Check signature verification:
   const signature = crypto
     .createHmac('sha256', secret)  // MUST be sha256
     .update(body)
     .digest('hex');
   
   // Fix: If using different algorithm, update to sha256
   ```

---

## Issue: "Cannot read property 'ownerId' of undefined"

**Symptoms:**
- Error in console when navigating to menu page
- PaymentMethodSelector not showing
- Blank screen with error boundary

**Root Causes & Solutions:**

1. **Query parameters not parsed**
   ```typescript
   // In CustomerMenu.tsx
   const searchParams = new URLSearchParams(window.location.search);
   const ownerId = searchParams.get('ownerId');  // WRONG
   
   // Fix: Use correct parameter name (from requirements)
   // URL format: /menu/550e8400-e29b...?table=5
   // owner_id is in URL path, not query string
   const ownerId = window.location.pathname.split('/')[2];
   ```

2. **Props not passed correctly**
   ```typescript
   // In PaymentMethodSelector, check props:
   export interface PaymentMethodSelectorProps {
     orderId: string;        // Required
     orderTotal: number;     // Required
     customerPhone?: string; // Optional
     onUPISelected: (url: string) => void;    // Required callback
     onCashierSelected: () => void;            // Required callback
   }
   
   // Fix: Pass all required props when calling component
   ```

3. **State not initialized**
   ```typescript
   // In CustomerMenu.tsx, initialize states:
   const [paymentMethodSelected, setPaymentMethodSelected] = useState<'upi' | 'cashier' | null>(null);
   const [paymentLinkUrl, setPaymentLinkUrl] = useState<string | null>(null);
   
   // Fix: If undefined, add initialization above
   ```

---

## Issue: "Supabase table doesn't exist" error

**Symptoms:**
- Error: "relation 'qr_scan_logs' does not exist"
- Happens after order placement
- Database not recognizing new tables

**Root Causes & Solutions:**

1. **Migrations not deployed**
   ```bash
   # Check migrations status
   supabase migrations list
   
   # Expected output: Two new migrations should show
   # 20260404110000_create_qr_workflow_tables
   # 20260404110500_create_qr_validation_functions
   
   # If missing, deploy:
   supabase db push
   ```

2. **Deployed to wrong database**
   ```bash
   # Check which database is configured
   supabase status
   
   # Should show: "API URL:" pointing to your database
   
   # Fix: If pointing to staging, deploy to production:
   supabase db push --linked
   ```

3. **RLS preventing table visibility**
   ```sql
   -- Check if tables are visible to anon user
   SET ROLE anon;
   SELECT * FROM qr_scan_logs LIMIT 1;
   
   -- If error "permission denied": RLS too restrictive
   
   -- Fix: Enable table visibility in RLS policies
   ```

---

## Issue: "PaymentLinkDisplay shows 'Payment Timeout'"

**Symptoms:**
- QR code displays
- Countdown reaches 0:00
- Shows "Payment link expired"
- Customer didn't pay in time

**Root Causes & Solutions:**

1. **QR code expiration normal (15 minutes)**
   ```bash
   # This is expected behavior
   # Payment links expire after 15 minutes
   
   # Fix: Customer needs to initiate payment within 15 minutes
   # Or restart payment process to get new 15-minute window
   ```

2. **Payment not marked as completed**
   ```typescript
   // After customer pays via Razorpay/PhonePe
   // Should show "Payment Received ✓"
   
   // Fix: Check webhook was received
   // In supabase functions logs:
   supabase functions logs payment-webhook
   
   // If no logs: webhook not being called
   // Check Razorpay Settings → Webhooks → Recent Events
   ```

3. **onPaymentConfirmed callback not called**
   ```typescript
   // In PaymentLinkDisplay.tsx, check:
   const handlePaymentConfirmed = () => {
     props.onPaymentConfirmed?.();  // Make sure this is called
   }
   
   // Fix: Add UI update when payment confirmed
   ```

---

## Issue: "Order not appearing in CashierDashboard"

**Symptoms:**
- Customer placed order and selected "Pay at Counter"
- Order doesn't show in cashier view
- No notification sent to staff

**Root Causes & Solutions:**

1. **CashierDashboard not subscribed to orders**
   ```typescript
   // Check if dashboard subscribes to realtime updates
   // In CashierDashboard.tsx:
   const { data: orders } = useQuery({
     queryKey: ['orders'],
     queryFn: fetchPendingOrders,
     refetchInterval: 5000  // Should refetch frequently
   });
   
   // Fix: Add Supabase realtime subscription for live updates
   const { data: orders } = useSupabaseRealtimeQuery('orders', filters);
   ```

2. **Order status not set to "pending_payment"**
   ```sql
   -- Check order status in database
   SELECT id, status FROM orders WHERE id = 'order-123';
   
   -- Should be: "pending_payment" or similar
   -- Fix: Update order status after "Pay at Counter" selected
   ```

3. **RLS preventing cashier from viewing orders**
   ```sql
   -- Check RLS policies for orders table
   SELECT policyname FROM pg_policies WHERE tablename = 'orders';
   
   -- Should have policy allowing staff to view their restaurant orders
   -- Fix: Add RLS policy for staff role
   ```

---

## Issue: "Abandonment tracking shows all orders as abandoned"

**Symptoms:**
- Owner dashboard shows all orders as "abandoned"
- Even paid orders show as unpaid
- Abandonment count inflated

**Root Causes & Solutions:**

1. **Webhook not marking orders as paid**
   ```bash
   # Check payment-webhook logs
   supabase functions logs payment-webhook --limit 50
   
   # Should show: "Payment processed for order-123"
   # If shows errors: webhook processing failed
   ```

2. **RPC function not updating records**
   ```sql
   -- Test the update function directly
   SELECT mark_order_paid_from_tracking('order-123');
   
   -- Check order_abandonment_tracking table:
   SELECT * FROM order_abandonment_tracking 
   WHERE order_id = 'order-123';
   
   -- Should show: status = 'paid'
   ```

3. **Threshold too aggressive**
   ```typescript
   // In useOrderAbandonment hook
   const minutesThreshold = 30;  // Orders unpaid for >30min
   
   // Fix: Adjust threshold if needed
   // Test with lower threshold: 5 minutes for testing
   ```

---

## Issue: "API routes return 500 Internal Server Error"

**Symptoms:**
- API calls fail with 500 status
- No error message in response
- Logs show "Internal Server Error"

**Root Causes & Solutions:**

1. **Environment variables missing**
   ```bash
   # If running on Vercel:
   # Check env vars are set in Vercel dashboard
   
   # Test locally:
   echo $VITE_SUPABASE_URL
   echo $SUPABASE_ANON_KEY
   
   # Fix: Add missing vars to .env.local or Vercel
   ```

2. **Database connection failure**
   ```bash
   # Test Supabase connectivity
   curl -X GET "https://$SUPABASE_PROJECT.supabase.co/auth/v1/health" \
     -H "apikey: $SUPABASE_ANON_KEY"
   
   # If fails: Supabase is down or URL wrong
   ```

3. **RPC function error**
   ```bash
   # Test RPC directly in SQL Editor
   SELECT validate_qr_scan(
     '550e8400-e29b-41d4-a716-446655440000'::uuid,
     5
   );
   
   # If error: function has bug, fix in migration
   ```

---

## Issue: "QR code won't scan on mobile"

**Symptoms:**
- Phone camera opens but doesn't find QR code
- Camera feed looks correct but no detection
- Scanning works on desktop browser

**Root Causes & Solutions:**

1. **QR code resolution too small**
   ```typescript
   // In PaymentLinkDisplay.tsx, check QR size:
   <QRCode 
     value={qrString} 
     size={256}  // Should be at least 200px
     level="H"   // High error correction
   />
   
   // Fix: Increase size for mobile viewing
   size={400}  // Better for small screens
   ```

2. **Camera permissions not granted**
   ```javascript
   // On mobile, must request camera permission:
   const stream = await navigator.mediaDevices.getUserMedia({ 
     video: { facingMode: 'environment' }  // Back camera
   });
   
   // Fix: Handle permission denied, show message
   ```

3. **QR code image quality poor**
   ```bash
   # Razorpay generated QR may have low contrast
   
   # Fix:
   # 1. Display QR larger (see #1)
   # 2. Add white border around QR code
   # 3. Ensure good lighting in display
   ```

---

## Quick Diagnostic Commands

Use these to quickly identify issues:

```bash
# Check if Edge Functions are running
supabase functions list

# Check Edge Function logs for errors
supabase functions logs payment-webhook --limit 20

# Verify database tables exist
supabase db query "SELECT table_name FROM information_schema.tables 
  WHERE table_schema='public' LIMIT 10"

# Check RLS policies
supabase db query "SELECT schemaname, tablename, policyname 
  FROM pg_policies WHERE schemaname='public' LIMIT 10"

# Test Razorpay credentials
curl -X GET "https://api.razorpay.com/v1/invoices" \
  -u "$RAZORPAY_KEY_ID:$RAZORPAY_KEY_SECRET"

# Check application logs
npm run logs  # If configured
# Or check Vercel dashboard logs

# Verify environment variables are loaded
node -e "console.log(process.env.RAZORPAY_KEY_ID)"

# Test database connection
supabase db query "SELECT NOW()"

# Check build artifacts
ls -la .next/server/app/api/
```

---

## Emergency Contacts

- **Supabase Status:** https://status.supabase.io
- **Razorpay Status:** https://razorpay.status.io
- **PhonePe Support:** https://www.phonepe.com/support
- **Vercel Status:** https://vercel.statuspage.io

---

## When All Else Fails

1. **Check the logs:**
   ```bash
   supabase functions logs payment-webhook --limit 50
   ```

2. **Restart everything:**
   ```bash
   npm run dev  # Restart dev server
   supabase stop && supabase start  # Restart local Supabase
   ```

3. **Test the database directly:**
   ```bash
   supabase db query "SELECT COUNT(*) FROM qr_scan_logs"
   ```

4. **Nuclear option - reset local environment:**
   ```bash
   supabase db reset  # WARNING: Deletes all local data
   npm install  # Fresh install
   npm run dev  # Start fresh
   ```

5. **Ask for help:**
   - Check conversation history for similar issues
   - Review memory files: `/memories/session/`
   - Share:
     - Error message (full stack trace)
     - Steps to reproduce
     - Environment (local/staging/production)
     - Recent changes made
