CREATE TABLE public.staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role public.staff_role NOT NULL DEFAULT 'cashier',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'revoked')),
  claimed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX staff_invitations_owner_email_pending_idx
  ON public.staff_invitations (restaurant_owner_id, lower(email))
  WHERE status = 'pending';

ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their staff invitations"
  ON public.staff_invitations FOR ALL
  USING (auth.uid() = restaurant_owner_id)
  WITH CHECK (auth.uid() = restaurant_owner_id);

CREATE POLICY "Users can view their pending staff invitations"
  ON public.staff_invitations FOR SELECT
  USING (
    status = 'pending'
    AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

CREATE OR REPLACE FUNCTION public.claim_staff_invitation(_invitation_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_record public.staff_invitations%ROWTYPE;
BEGIN
  SELECT *
  INTO invitation_record
  FROM public.staff_invitations
  WHERE id = _invitation_id
    AND status = 'pending'
  FOR UPDATE;

  IF invitation_record.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found or already claimed';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF lower(invitation_record.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) THEN
    RAISE EXCEPTION 'Invitation email does not match current user';
  END IF;

  INSERT INTO public.staff_members (
    restaurant_owner_id,
    user_id,
    role,
    name,
    phone,
    is_active
  )
  VALUES (
    invitation_record.restaurant_owner_id,
    auth.uid(),
    invitation_record.role,
    invitation_record.name,
    invitation_record.phone,
    true
  )
  ON CONFLICT (restaurant_owner_id, user_id) DO UPDATE
  SET
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    is_active = true,
    updated_at = now();

  UPDATE public.staff_invitations
  SET
    status = 'claimed',
    claimed_by_user_id = auth.uid(),
    claimed_at = now(),
    updated_at = now()
  WHERE id = invitation_record.id;

  RETURN invitation_record.restaurant_owner_id;
END;
$$;

CREATE TRIGGER update_staff_invitations_updated_at
  BEFORE UPDATE ON public.staff_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_invitations;
