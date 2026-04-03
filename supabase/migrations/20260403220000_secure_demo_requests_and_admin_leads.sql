DROP POLICY IF EXISTS "Authenticated users can view demo requests"
ON public.demo_requests;

CREATE POLICY "Only admins can view demo requests"
ON public.demo_requests
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));
