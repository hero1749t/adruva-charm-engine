-- Fix RLS policies on profiles table to allow public read access for restaurant menus
-- This allows unauthenticated users to view restaurant profile information

-- Drop existing public-facing policies if they exist
DROP POLICY IF EXISTS "Public can view all profiles" ON public.profiles;

-- Add new policy to allow anyone to read profiles (for public restaurant menus)
CREATE POLICY "Public can view all profiles" ON public.profiles FOR SELECT USING (true);
