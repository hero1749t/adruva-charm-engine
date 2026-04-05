# 📋 COPY-PASTE DEPLOYMENT GUIDE

**For:** Supabase Project `vppaelgxovnqkqdegajb`  
**Time:** 20 minutes  
**Level:** Just copy → paste → click RUN

---

## 🎯 STEP 1: PASTE MIGRATION 1

**Go to:** https://console.supabase.com/projects/vppaelgxovnqkqdegajb/sql/new

**Click the top-left icon to see existing queries, then click NEW QUERY**

**Copy everything below and paste into the SQL editor:**

```sql
-- Create missing RPC functions for order and payment management
-- This migration adds critical functions that cashier dashboard needs

-- Function 1: Create manual counter order
CREATE OR REPLACE FUNCTION create_manual_counter_order(
  p_owner_id UUID,
  p_customer_name TEXT,
  p_table_number INT DEFAULT NULL,
  p_order_items JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  order_id UUID,
  order_number TEXT,
  status_code VARCHAR,
  total_amount DECIMAL,
  tax_amount DECIMAL
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_total_amount DECIMAL;
  v_tax_amount DECIMAL;
  v_subtotal DECIMAL := 0;
  v_item JSONB;
  v_menu_item_id UUID;
  v_item_quantity INT;
  v_item_price DECIMAL;
BEGIN
  -- Generate unique order number
  v_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || '-' || LPAD((RANDOM() * 9999)::INT::TEXT, 4, '0');
  
  -- Create order
  v_order_id := gen_random_uuid();
  
  -- Calculate total from items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
  LOOP
    v_menu_item_id := (v_item->>'menu_item_id')::UUID;
    v_item_quantity := (v_item->>'quantity')::INT;
    
    -- Get menu item price
    SELECT price INTO v_item_price FROM menu_items 
    WHERE id = v_menu_item_id AND owner_id = p_owner_id;
    
    v_subtotal := v_subtotal + (COALESCE(v_item_price, 0) * v_item_quantity);
  END LOOP;
  
  -- Calculate tax (5%)
  v_tax_amount := v_subtotal * 0.05;
  v_total_amount := v_subtotal + v_tax_amount;
  
  -- Insert order
  INSERT INTO orders (
    id, owner_id, order_number, customer_name, table_number,
    status, subtotal, tax_amount, total_amount, order_type, created_at
  ) VALUES (
    v_order_id, p_owner_id, v_order_number, p_customer_name, p_table_number,
    'new', v_subtotal, v_tax_amount, v_total_amount, 'counter', NOW()
  );
  
  -- Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
  LOOP
    v_menu_item_id := (v_item->>'menu_item_id')::UUID;
    v_item_quantity := (v_item->>'quantity')::INT;
    
    SELECT price INTO v_item_price FROM menu_items 
    WHERE id = v_menu_item_id AND owner_id = p_owner_id;
    
    INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, created_at)
    VALUES (v_order_id, v_menu_item_id, v_item_quantity, COALESCE(v_item_price, 0), NOW());
  END LOOP;
  
  RETURN QUERY SELECT v_order_id, v_order_number, 'new'::VARCHAR, v_total_amount, v_tax_amount;
END;
$$;

-- Function 2: Record manual order payment
CREATE OR REPLACE FUNCTION record_manual_order_payment(
  p_owner_id UUID,
  p_order_id UUID,
  p_amount_paid DECIMAL,
  p_payment_method VARCHAR,
  p_reference TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  order_status VARCHAR,
  remaining_amount DECIMAL
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order_total DECIMAL;
  v_paid_so_far DECIMAL;
  v_remaining DECIMAL;
  v_order_status VARCHAR;
BEGIN
  -- Get order total and current paid amount
  SELECT total_amount, COALESCE(amount_paid, 0)
  INTO v_order_total, v_paid_so_far
  FROM orders WHERE id = p_order_id AND owner_id = p_owner_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Order not found', NULL::VARCHAR, NULL::DECIMAL;
    RETURN;
  END IF;
  
  -- Calculate remaining
  v_remaining := v_order_total - (v_paid_so_far + p_amount_paid);
  
  -- Determine new status
  IF v_remaining <= 0 THEN
    v_order_status := 'paid';
  ELSE
    v_order_status := 'partial_payment';
  END IF;
  
  -- Record payment
  INSERT INTO payments (
    id, order_id, amount, payment_method, payment_status, reference, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), p_order_id, p_amount_paid, p_payment_method, 'completed', p_reference, NOW(), NOW()
  );
  
  -- Update order
  UPDATE orders 
  SET amount_paid = amount_paid + p_amount_paid,
      status = v_order_status,
      updated_at = NOW()
  WHERE id = p_order_id;
  
  RETURN QUERY SELECT TRUE, 'Payment recorded', v_order_status::VARCHAR, GREATEST(v_remaining, 0);
END;
$$;

-- Function 3: Revert order payment
CREATE OR REPLACE FUNCTION revert_order_payment(
  p_owner_id UUID,
  p_order_id UUID,
  p_payment_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  order_status VARCHAR
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_paid DECIMAL;
  v_payment_amount DECIMAL;
BEGIN
  -- Get payment amount
  SELECT COALESCE(SUM(amount), 0)
  INTO v_payment_amount
  FROM payments WHERE id = p_payment_id AND order_id = p_order_id;
  
  IF v_payment_amount = 0 THEN
    RETURN QUERY SELECT FALSE, 'Payment not found', NULL::VARCHAR;
    RETURN;
  END IF;
  
  -- Delete payment
  DELETE FROM payments WHERE id = p_payment_id;
  
  -- Update order back to 'new'
  UPDATE orders 
  SET amount_paid = amount_paid - v_payment_amount,
      status = 'new',
      updated_at = NOW()
  WHERE id = p_order_id AND owner_id = p_owner_id;
  
  RETURN QUERY SELECT TRUE, 'Payment reverted', 'new'::VARCHAR;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_manual_counter_order TO authenticated;
GRANT EXECUTE ON FUNCTION record_manual_order_payment TO authenticated;
GRANT EXECUTE ON FUNCTION revert_order_payment TO authenticated;
```

**Click:** `Run` (top right)

**Expected:** ✅ Success message

---

## 🎯 STEP 2: GET REMAINING MIGRATIONS

**The next 3 migrations are large. Copy from these files:**

1. **Migration 2:** `supabase/migrations/20260404200500_add_order_management_rpcs.sql`
2. **Migration 3:** `supabase/migrations/20260404201000_add_inventory_and_payment_schema.sql`
3. **Migration 4:** `supabase/migrations/20260404202000_add_payment_processing_rpcs.sql`

**For each file:**
- Open in VS Code (or text editor)
- Ctrl+A → Ctrl+C (select all, copy)
- Go to SQL editor
- Ctrl+A → Ctrl+V (select all, paste)
- Click Run
- Repeat for next migration

---

## ✅ AFTER ALL 4 MIGRATIONS:

You should see in Supabase:
```
✅ create_manual_counter_order - RPC available
✅ record_manual_order_payment - RPC available
✅ revert_order_payment - RPC available
✅ advance_order_status - RPC available
✅ deduct_inventory_on_order - RPC available
✅ process_order_payment - RPC available
✅ check_and_confirm_payment - RPC available
```

---

## 🎯 STEP 3: DEPLOY EDGE FUNCTION 1 - payment-webhook

**Go to:** https://console.supabase.com/projects/vppaelgxovnqkqdegajb/functions

**Click:** `Create New Function`

**Enter:**
- Function name: `payment-webhook`
- Click: `Create`

**Replace the template code with:**

```typescript
/**
 * Payment Webhook Handler - Supabase Edge Function
 * Handles callbacks from payment gateways (Razorpay, PhonePe)
 * 
 * Supports:
 * - Razorpay: payment.authorized, payment.captured webhooks
 * - PhonePe: transaction.success, transaction.failed webhooks
 * - Automatically marks orders as paid and moves to kitchen
 * - Records payment in database
 * - Handles duplicates gracefully
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface WebhookPayload {
  gateway: "razorpay" | "phonepe";
  type: string;
  event: string;
  timestamp: number;
  data: Record<string, unknown>;
  signature?: string;
}

interface ProcessingResult {
  success: boolean;
  message: string;
  orderId?: string;
  paymentLinkId?: string;
  error?: string;
}

const RAZORPAY_WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET") || "";
const PHONEPE_API_KEY = Deno.env.get("PHONEPE_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("OK", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = await req.json() as Record<string, unknown>;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let result: ProcessingResult;

    // Detect payment gateway type
    if (payload.event && (payload.event as string).includes("razorpay")) {
      // Razorpay webhook
      const data = payload.payload as any;
      const { data: linkData } = await supabase
        .from("payment_link_tokens")
        .select("order_id")
        .eq("payment_token", data.payment_link?.id)
        .single();

      if (linkData) {
        const { error: processError } = await supabase.rpc(
          "process_order_payment",
          {
            p_order_id: linkData.order_id,
            p_payment_method: "upi",
            p_amount_paise: (data.payment_link?.amount || 0) as number,
            p_gateway_reference: data.payment_link?.id,
          }
        );

        result = {
          success: !processError,
          message: processError ? "Payment processing failed" : "Payment processed",
          orderId: linkData.order_id,
          error: processError?.message,
        };
      } else {
        result = { success: false, message: "Order not found", error: "Order not found" };
      }
    } else if (payload.response) {
      // PhonePe webhook
      const response = payload.response as any;
      const { data: linkData } = await supabase
        .from("payment_link_tokens")
        .select("order_id")
        .eq("gateway_reference", response.transactionId)
        .single();

      if (linkData) {
        const { error: processError } = await supabase.rpc(
          "process_order_payment",
          {
            p_order_id: linkData.order_id,
            p_payment_method: "upi",
            p_amount_paise: (response.amount || 0) as number,
            p_gateway_reference: response.transactionId,
          }
        );

        result = {
          success: !processError,
          message: processError ? "Payment processing failed" : "Payment processed",
          orderId: linkData.order_id,
          error: processError?.message,
        };
      } else {
        result = { success: false, message: "Order not found", error: "Order not found" };
      }
    } else {
      result = {
        success: false,
        message: "Unknown webhook format",
        error: "Unknown webhook gateway",
      };
    }

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Webhook processing error",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

**Click:** `Deploy`

**Expected:** ✅ Function deployed (shows green checkmark)

---

## 🎯 STEP 4: DEPLOY EDGE FUNCTION 2 - qr-validate

**Go to:** https://console.supabase.com/projects/vppaelgxovnqkqdegajb/functions

**Click:** `Create New Function`

**Enter:**
- Function name: `qr-validate`
- Click: `Create`

**Copy code from:** `supabase/functions/qr-validate/index.ts`

**Paste into the new function editor**

**Click:** `Deploy`

**Expected:** ✅ Function deployed

---

## 🎯 STEP 5: DEPLOY EDGE FUNCTION 3 - payment-links-create

**Go to:** https://console.supabase.com/projects/vppaelgxovnqkqdegajb/functions

**Click:** `Create New Function`

**Enter:**
- Function name: `payment-links-create`
- Click: `Create`

**Copy code from:** `supabase/functions/payment-links-create/index.ts`

**Paste into the new function editor**

**Click:** `Deploy`

**Expected:** ✅ Function deployed

---

## ✅ VERIFY ALL 3 FUNCTIONS

**Go to:** https://console.supabase.com/projects/vppaelgxovnqkqdegajb/functions

**Should show all 3 as Active:**
```
✅ payment-webhook (Active)
✅ qr-validate (Active)
✅ payment-links-create (Active)
```

---

## 🎯 STEP 6: SET ENVIRONMENT VARIABLES

**Go to:** `D:\Adruva_Resto\adruva-charm-engine`

**Create file:** `.env.production`

**Add these lines:**
```
VITE_SUPABASE_URL=https://vppaelgxovnqkqdegajb.supabase.co
VITE_SUPABASE_ANON_KEY=<GET THIS FROM SUPABASE>
```

**How to get ANON_KEY:**
1. Go: https://console.supabase.com/projects/vppaelgxovnqkqdegajb/settings/api
2. Find: "Project API keys" section
3. Copy: "anon public" key
4. Paste in `.env.production`

**Example (filled in):**
```
VITE_SUPABASE_URL=https://vppaelgxovnqkqdegajb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🚀 DEPLOY FRONTEND

**Option A: Auto-deploy via GitHub**
```bash
git add -A
git commit -m "Add environment variables"
git push origin main
# Vercel auto-deploys (wait 2-3 minutes)
```

**Option B: Manual Vercel Deploy**
1. Go: https://vercel.com/dashboard
2. Select your project
3. Click: Redeploy
4. Wait for green checkmark

---

## ✅ TEST FEATURE 1: Customer QR Order

1. Go to your restaurant website
2. Find QR code (or scan directly)
3. Should see menu with categories
4. Click item → Add to cart
5. Click "Place Order"
6. **Expected:** ✅ Order created, payment link shown

---

## ✅ TEST FEATURE 2: Kitchen Dashboard

1. Go to Kitchen Dashboard
2. Should see orders appearing
3. Click order → See items
4. Should see "Accept" button
5. Click "Accept"
6. **Expected:** ✅ Order moves to "Preparing" status

---

## ✅ TEST FEATURE 3: Payment Auto-Process

1. Start Test Feature 1 (order placed)
2. Get payment link QR
3. Pay using test payment gateway
4. Go back to Kitchen Dashboard
5. **Expected:** ✅ Order auto-updates to "Paid", shows in kitchen

---

## ✅ TEST FEATURE 4: Inventory Deduction

1. Check initial inventory for an item (e.g., 100)
2. Place QR order with that item (qty 5)
3. Complete payment
4. Check inventory again
5. **Expected:** ✅ Now shows 95 items

---

## ✅ TEST FEATURE 5: Cashier Order

1. Go to Cashier Dashboard
2. Click "Create Manual Order"
3. Select items
4. Enter customer details
5. Click "Create & Mark Paid"
6. **Expected:** ✅ Order created and marked paid immediately

---

## 🎉 ALL DONE!

After completing all 6 steps:
- ✅ 4 database migrations applied
- ✅ 3 Edge Functions deployed
- ✅ Environment variables set
- ✅ All 5 features tested

**Your system is now LIVE and working!**

---

## 📞 EMERGENCY ISSUES

**Issue:** Something not working?
**Solution:** Check:
1. All 4 migrations ran (check Supabase SQL tab)
2. All 3 Edge Functions show "Active"
3. Environment variables set in `.env.production`
4. Vercel shows green checkmark (redeployed)

**Still stuck?** Restart browser cache:
```
Ctrl+Shift+Delete → Clear cache → Retry
```

---

*Generated: April 5, 2026*  
*Project: Adruva Resto*  
*Status: Ready to Deploy*
