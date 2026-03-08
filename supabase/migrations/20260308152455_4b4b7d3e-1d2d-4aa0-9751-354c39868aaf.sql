
-- Add new profile fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS gst_number text,
ADD COLUMN IF NOT EXISTS opening_hours text,
ADD COLUMN IF NOT EXISTS closing_hours text;

-- Create customer reviews table
CREATE TABLE public.customer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  owner_id uuid NOT NULL,
  rating integer NOT NULL,
  comment text,
  customer_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT rating_range CHECK (rating >= 1 AND rating <= 5)
);

ALTER TABLE public.customer_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a review
CREATE POLICY "Anyone can submit a review"
ON public.customer_reviews
FOR INSERT
WITH CHECK (true);

-- Anyone can view reviews
CREATE POLICY "Anyone can view reviews"
ON public.customer_reviews
FOR SELECT
USING (true);

-- Owners can manage their reviews
CREATE POLICY "Owners can manage their reviews"
ON public.customer_reviews
FOR ALL
USING (auth.uid() = owner_id);

-- Create restaurant-logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('restaurant-logos', 'restaurant-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: anyone can view logos
CREATE POLICY "Anyone can view restaurant logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'restaurant-logos');

-- Authenticated users can upload their logos
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'restaurant-logos' AND auth.role() = 'authenticated');

-- Authenticated users can update their logos
CREATE POLICY "Authenticated users can update logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'restaurant-logos' AND auth.role() = 'authenticated');

-- Authenticated users can delete their logos
CREATE POLICY "Authenticated users can delete logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'restaurant-logos' AND auth.role() = 'authenticated');
