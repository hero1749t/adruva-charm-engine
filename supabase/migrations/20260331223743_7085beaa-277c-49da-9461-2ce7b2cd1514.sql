
-- 1. Admin users table
CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 2. is_admin security definer function
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = _user_id
  )
$$;

-- 3. RLS for admin_users
CREATE POLICY "Only admins can view admin_users"
ON public.admin_users FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can insert admin_users"
ON public.admin_users FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- 4. Subscription plans table
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  billing_period text DEFAULT 'monthly',
  max_tables integer DEFAULT 5,
  max_rooms integer DEFAULT 0,
  max_menu_items integer DEFAULT 50,
  max_staff integer DEFAULT 2,
  max_orders_per_month integer DEFAULT 500,
  feature_analytics boolean DEFAULT false,
  feature_inventory boolean DEFAULT false,
  feature_expenses boolean DEFAULT false,
  feature_chain boolean DEFAULT false,
  feature_coupons boolean DEFAULT false,
  feature_online_orders boolean DEFAULT false,
  feature_kitchen_display boolean DEFAULT true,
  feature_customer_reviews boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Plans: anyone authenticated can read (owners need plan name), only admin can write
CREATE POLICY "Anyone can view active plans"
ON public.subscription_plans FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can insert plans"
ON public.subscription_plans FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update plans"
ON public.subscription_plans FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete plans"
ON public.subscription_plans FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- 5. Owner subscriptions table
CREATE TABLE public.owner_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text DEFAULT 'active',
  starts_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  assigned_by uuid NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.owner_subscriptions ENABLE ROW LEVEL SECURITY;

-- Owners can read their own subscription
CREATE POLICY "Owners can view own subscription"
ON public.owner_subscriptions FOR SELECT
TO authenticated
USING (owner_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Only admins can insert subscriptions"
ON public.owner_subscriptions FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update subscriptions"
ON public.owner_subscriptions FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete subscriptions"
ON public.owner_subscriptions FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- 6. Admin can read all profiles (already public SELECT exists, so this is fine)
-- Admin can read all orders for owner detail view (already public SELECT exists)
