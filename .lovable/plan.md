

## Discount Coupon System for QR Orders

### Overview
Add a coupon management system where owners create promo codes with on/off toggle, max uses per person, and expiry time. Customers entering from QR (table/room) can apply a promo code in the cart to get discount on total bill.

### Database

**New table: `discount_coupons`**
```sql
CREATE TABLE public.discount_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percentage',  -- 'percentage' or 'flat'
  discount_value numeric NOT NULL DEFAULT 10,
  min_order_amount numeric NOT NULL DEFAULT 0,
  max_uses_per_person integer NOT NULL DEFAULT 1,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.coupon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  customer_phone text NOT NULL,
  order_id uuid NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now()
);
```
RLS: Owners manage their coupons. Public can read active coupons (for validation). Public can insert usage records.

### Owner Side — New Settings Tab

**File: `src/pages/OwnerSettings.tsx`**
- Add a new Card section "Discount Coupons" with a Ticket icon
- Master on/off toggle for coupon system
- List of existing coupons with: code, discount (% or ₹), max uses/person, valid until, active toggle
- "Add Coupon" form: code, type (% / flat), value, min order, max uses per person, valid from/until
- Delete coupon button

### Customer Side — Promo Code in Cart

**File: `src/pages/CustomerMenu.tsx`**
- Add promo code input field in cart drawer (between total and phone input)
- "Apply" button that validates:
  - Coupon exists and is active for this owner
  - Current time is within valid_from → valid_until
  - Customer phone usage count < max_uses_per_person (requires phone to be entered first)
- Show discount breakdown: Subtotal, Discount (-₹X), Final Total
- Store applied coupon info, pass discount to order placement
- Record usage in `coupon_usage` table on order placement

### Files to Create/Edit

| File | Action |
|------|--------|
| Migration | New tables: `discount_coupons`, `coupon_usage` with RLS |
| `src/pages/OwnerSettings.tsx` | Add Coupons management card section |
| `src/pages/CustomerMenu.tsx` | Add promo code input, validation, discount calc |

### Technical Notes
- Coupon validation happens client-side with a query, but RLS ensures data isolation per owner
- Phone number becomes required when applying coupon (to track per-person usage)
- Discount shown in cart as line item before final total
- `discount_type: 'percentage'` applies % off total, `'flat'` applies fixed ₹ off

