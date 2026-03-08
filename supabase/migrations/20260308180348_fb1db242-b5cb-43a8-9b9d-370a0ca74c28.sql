
CREATE POLICY "Authenticated users can view demo requests"
ON public.demo_requests
FOR SELECT
TO authenticated
USING (true);
