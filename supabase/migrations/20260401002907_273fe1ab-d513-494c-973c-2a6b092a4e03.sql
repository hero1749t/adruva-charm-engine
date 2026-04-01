
CREATE OR REPLACE FUNCTION public.check_white_label(_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT sp.feature_white_label
     FROM public.owner_subscriptions os
     JOIN public.subscription_plans sp ON sp.id = os.plan_id
     WHERE os.owner_id = _owner_id
       AND os.status = 'active'
     ORDER BY os.created_at DESC
     LIMIT 1),
    false
  );
$$;
