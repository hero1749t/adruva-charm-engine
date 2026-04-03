DROP POLICY IF EXISTS "Public can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view restaurant public info" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_public_restaurant_profile(_owner_id UUID)
RETURNS TABLE (
  restaurant_name TEXT,
  upi_id TEXT,
  phone TEXT,
  restaurant_logo_url TEXT,
  address TEXT,
  gst_number TEXT,
  gst_percentage NUMERIC,
  gps_latitude DOUBLE PRECISION,
  gps_longitude DOUBLE PRECISION,
  gps_range_meters INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.restaurant_name,
    p.upi_id,
    p.phone,
    p.restaurant_logo_url,
    p.address,
    p.gst_number,
    p.gst_percentage,
    p.gps_latitude,
    p.gps_longitude,
    p.gps_range_meters
  FROM public.profiles p
  WHERE p.user_id = _owner_id
  LIMIT 1;
$$;
