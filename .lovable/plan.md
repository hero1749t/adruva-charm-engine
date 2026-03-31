

## Three Improvements: GPS Diameter, Dynamic GST, Receipt After Payment

### What's Changing

**1. GPS → Diameter-based range (instead of radius)**
Currently the GPS slider sets a radius. You want it to work as a diameter — so the restaurant is at the center, and the range represents the full circle diameter. This makes it more intuitive and works consistently across laptops/mobiles since it uses the same Haversine formula.

**Change:** Divide the set range by 2 when comparing distance. So if owner sets 100m diameter, customer must be within 50m radius. Update labels to say "diameter" instead of just "range."

**2. Dynamic GST % from Settings**
Currently GST is hardcoded at 5%. You want the owner to set GST % in settings, and that % should appear on all bills/receipts.

**Changes:**
- **Migration:** Add `gst_percentage` column (numeric, default 5) to `profiles` table
- **Settings page:** Add GST % input field in the GST & Location section
- **CustomerReceipt:** Accept `gstRate` as prop instead of hardcoded 0.05
- **PrinterSetup:** Accept `gstRate` in receipt data instead of hardcoded 0.05
- **CustomerMenu:** Fetch `gst_percentage` from profile and pass to receipt
- **CashierDashboard:** Fetch `gst_percentage` and pass to printer receipt

**3. Receipt download only after payment confirmed**
Currently customer can download/print receipt immediately after placing order. You want receipt to only appear after the cashier confirms payment (sets payment_method on the order).

**Changes:**
- **CustomerMenu (order tracking screen):** Hide `CustomerReceipt` component unless `payment_method` is set (not null/not "counter")
- Track `payment_method` via realtime updates alongside `status`
- Show a message like "Receipt available after payment confirmation" until then

### Technical Details

**Files to modify:**
1. `supabase/migrations/` — new migration for `gst_percentage` column
2. `src/pages/OwnerSettings.tsx` — add GST % input, diameter label
3. `src/pages/CustomerMenu.tsx` — fetch gst_percentage, track payment_method via realtime, hide receipt until payment confirmed, adjust GPS comparison to use diameter/2
4. `src/components/CustomerReceipt.tsx` — accept dynamic `gstRate` prop
5. `src/components/billing/PrinterSetup.tsx` — accept dynamic `gstRate` in data
6. `src/pages/CashierDashboard.tsx` — pass gst_percentage to printer

**Migration SQL:**
```sql
ALTER TABLE public.profiles ADD COLUMN gst_percentage numeric NOT NULL DEFAULT 5;
```

**GPS diameter logic:**
```typescript
// In verifyGPS: compare distance against range/2 (diameter → radius)
if (distance <= restaurantGpsRange / 2) { ... }
```

**Receipt gate logic:**
```typescript
// In CustomerMenu order tracking screen
const paymentConfirmed = livePaymentMethod && livePaymentMethod !== "counter";
// Only show CustomerReceipt when paymentConfirmed is true
```

