
-- 1. Create staff role enum
CREATE TYPE public.staff_role AS ENUM ('owner', 'manager', 'kitchen', 'cashier');

-- 2. Create staff_members table
CREATE TABLE public.staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_owner_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role staff_role NOT NULL DEFAULT 'cashier',
  name TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (restaurant_owner_id, user_id)
);

-- 3. Enable RLS
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

-- 4. Security definer function to check staff role
CREATE OR REPLACE FUNCTION public.get_staff_role(_user_id UUID, _owner_id UUID)
RETURNS staff_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.staff_members
  WHERE user_id = _user_id
    AND restaurant_owner_id = _owner_id
    AND is_active = true
  LIMIT 1;
$$;

-- 5. Check if user is owner or staff of a restaurant
CREATE OR REPLACE FUNCTION public.is_restaurant_staff(_user_id UUID, _owner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    _user_id = _owner_id
    OR EXISTS (
      SELECT 1 FROM public.staff_members
      WHERE user_id = _user_id
        AND restaurant_owner_id = _owner_id
        AND is_active = true
    )
  );
$$;

-- 6. RLS: Owners can manage their staff
CREATE POLICY "Owners can manage their staff"
  ON public.staff_members FOR ALL
  USING (auth.uid() = restaurant_owner_id)
  WITH CHECK (auth.uid() = restaurant_owner_id);

-- 7. RLS: Staff can view their own record
CREATE POLICY "Staff can view own record"
  ON public.staff_members FOR SELECT
  USING (auth.uid() = user_id);

-- 8. Updated_at trigger
CREATE TRIGGER update_staff_members_updated_at
  BEFORE UPDATE ON public.staff_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_members;
