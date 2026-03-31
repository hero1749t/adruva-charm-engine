ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gps_latitude numeric NULL,
ADD COLUMN IF NOT EXISTS gps_longitude numeric NULL,
ADD COLUMN IF NOT EXISTS gps_range_meters integer NOT NULL DEFAULT 200;