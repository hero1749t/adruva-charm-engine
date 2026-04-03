ALTER TABLE public.demo_requests
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'website',
ADD COLUMN IF NOT EXISTS lead_status TEXT NOT NULL DEFAULT 'new',
ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS proposed_plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS contacted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS demo_scheduled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS converted_owner_id UUID,
ADD COLUMN IF NOT EXISTS meeting_notes TEXT,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'demo_requests_lead_status_check'
  ) THEN
    ALTER TABLE public.demo_requests
    ADD CONSTRAINT demo_requests_lead_status_check
    CHECK (lead_status IN ('new', 'contacted', 'demo_scheduled', 'approved', 'rejected', 'converted'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'demo_requests_priority_check'
  ) THEN
    ALTER TABLE public.demo_requests
    ADD CONSTRAINT demo_requests_priority_check
    CHECK (priority IN ('low', 'medium', 'high'));
  END IF;
END $$;

DROP POLICY IF EXISTS "Admins can update demo requests" ON public.demo_requests;
CREATE POLICY "Admins can update demo requests"
ON public.demo_requests
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_demo_requests_updated_at ON public.demo_requests;
CREATE TRIGGER update_demo_requests_updated_at
BEFORE UPDATE ON public.demo_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
