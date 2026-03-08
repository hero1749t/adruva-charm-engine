CREATE POLICY "Anyone can view restaurant public info"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);