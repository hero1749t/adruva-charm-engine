
-- Discount coupons table
CREATE TABLE public.discount_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percentage',
  discount_value numeric NOT NULL DEFAULT 10,
  min_order_amount numeric NOT NULL DEFAULT 0,
  max_uses_per_person integer NOT NULL DEFAULT 1,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their coupons" ON public.discount_coupons FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Anyone can view active coupons" ON public.discount_coupons FOR SELECT TO public USING (is_active = true);

-- Coupon usage tracking table
CREATE TABLE public.coupon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.discount_coupons(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  customer_phone text NOT NULL,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  used_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their coupon usage" ON public.coupon_usage FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Anyone can insert coupon usage" ON public.coupon_usage FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Anyone can read coupon usage for validation" ON public.coupon_usage FOR SELECT TO public USING (true);
