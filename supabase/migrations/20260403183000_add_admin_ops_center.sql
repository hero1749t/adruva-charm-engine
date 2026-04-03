CREATE TABLE IF NOT EXISTS public.admin_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE DEFAULT ('TIC-' || upper(left(replace(gen_random_uuid()::text, '-', ''), 8))),
  owner_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_agent_id UUID,
  assigned_agent_name TEXT,
  sla_due_at TIMESTAMPTZ,
  escalation_level INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'platform',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  severity TEXT NOT NULL DEFAULT 'info',
  status TEXT NOT NULL DEFAULT 'open',
  target_module TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID,
  actor_name TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  target TEXT NOT NULL,
  target_owner_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  ip_device TEXT,
  result TEXT NOT NULL DEFAULT 'Success',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view support tickets" ON public.admin_support_tickets;
CREATE POLICY "Admins can view support tickets"
ON public.admin_support_tickets FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert support tickets" ON public.admin_support_tickets;
CREATE POLICY "Admins can insert support tickets"
ON public.admin_support_tickets FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update support tickets" ON public.admin_support_tickets;
CREATE POLICY "Admins can update support tickets"
ON public.admin_support_tickets FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete support tickets" ON public.admin_support_tickets;
CREATE POLICY "Admins can delete support tickets"
ON public.admin_support_tickets FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view notifications" ON public.admin_notifications;
CREATE POLICY "Admins can view notifications"
ON public.admin_notifications FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert notifications" ON public.admin_notifications;
CREATE POLICY "Admins can insert notifications"
ON public.admin_notifications FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update notifications" ON public.admin_notifications;
CREATE POLICY "Admins can update notifications"
ON public.admin_notifications FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete notifications" ON public.admin_notifications;
CREATE POLICY "Admins can delete notifications"
ON public.admin_notifications FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view activity logs" ON public.admin_activity_logs;
CREATE POLICY "Admins can view activity logs"
ON public.admin_activity_logs FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert activity logs" ON public.admin_activity_logs;
CREATE POLICY "Admins can insert activity logs"
ON public.admin_activity_logs FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete activity logs" ON public.admin_activity_logs;
CREATE POLICY "Admins can delete activity logs"
ON public.admin_activity_logs FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_admin_ops_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_admin_support_tickets_updated_at ON public.admin_support_tickets;
CREATE TRIGGER set_admin_support_tickets_updated_at
BEFORE UPDATE ON public.admin_support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.set_admin_ops_updated_at();

DROP TRIGGER IF EXISTS set_admin_notifications_updated_at ON public.admin_notifications;
CREATE TRIGGER set_admin_notifications_updated_at
BEFORE UPDATE ON public.admin_notifications
FOR EACH ROW
EXECUTE FUNCTION public.set_admin_ops_updated_at();

CREATE OR REPLACE FUNCTION public.log_admin_activity(
  _action TEXT,
  _module TEXT,
  _target TEXT,
  _target_owner_id UUID DEFAULT NULL,
  _result TEXT DEFAULT 'Success',
  _metadata JSONB DEFAULT '{}'::jsonb,
  _ip_device TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _log_id UUID;
  _actor_name TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT
    COALESCE(NULLIF(p.full_name, ''), split_part(COALESCE(u.email, ''), '@', 1), 'Admin')
  INTO _actor_name
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE u.id = auth.uid();

  INSERT INTO public.admin_activity_logs (
    actor_user_id,
    actor_name,
    action,
    module,
    target,
    target_owner_id,
    ip_device,
    result,
    metadata
  )
  VALUES (
    auth.uid(),
    COALESCE(_actor_name, 'Admin'),
    _action,
    _module,
    _target,
    _target_owner_id,
    _ip_device,
    COALESCE(NULLIF(trim(_result), ''), 'Success'),
    COALESCE(_metadata, '{}'::jsonb)
  )
  RETURNING id INTO _log_id;

  RETURN _log_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_admin_activity(TEXT, TEXT, TEXT, UUID, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_admin_activity(TEXT, TEXT, TEXT, UUID, TEXT, JSONB, TEXT) TO authenticated;

INSERT INTO public.admin_support_tickets (
  owner_id,
  subject,
  description,
  category,
  priority,
  status,
  sla_due_at,
  escalation_level,
  source,
  metadata,
  created_at
)
SELECT
  ai.owner_id,
  'Billing follow-up for ' || COALESCE(NULLIF(p.restaurant_name, ''), u.email, 'client'),
  'Invoice ' || ai.invoice_number || ' is in failed status and needs finance review.',
  'billing',
  'high',
  'escalated',
  now() + interval '4 hours',
  2,
  'system',
  jsonb_build_object('invoice_id', ai.id, 'invoice_number', ai.invoice_number),
  ai.updated_at
FROM public.admin_invoices ai
LEFT JOIN public.profiles p ON p.user_id = ai.owner_id
LEFT JOIN auth.users u ON u.id = ai.owner_id
WHERE ai.status = 'failed'
  AND NOT EXISTS (
    SELECT 1
    FROM public.admin_support_tickets existing
    WHERE existing.owner_id IS NOT DISTINCT FROM ai.owner_id
      AND existing.category = 'billing'
  )
LIMIT 5;

INSERT INTO public.admin_support_tickets (
  owner_id,
  subject,
  description,
  category,
  priority,
  status,
  sla_due_at,
  escalation_level,
  source,
  metadata,
  created_at
)
SELECT
  queue.owner_id,
  'Renewal assistance needed for ' || queue.client_name,
  'Subscription on ' || queue.plan_name || ' expires on ' || to_char(queue.expires_at, 'DD Mon YYYY') || '.',
  'subscription',
  CASE WHEN queue.subscription_status = 'trial' THEN 'medium' ELSE 'low' END,
  'open',
  now() + interval '8 hours',
  0,
  'system',
  jsonb_build_object('subscription_id', queue.subscription_id, 'plan_name', queue.plan_name),
  queue.created_at
FROM (
  SELECT DISTINCT ON (os.owner_id)
    os.id AS subscription_id,
    os.owner_id,
    COALESCE(NULLIF(trim(p.restaurant_name), ''), split_part(COALESCE(u.email, ''), '@', 1), 'Unnamed Client') AS client_name,
    sp.name AS plan_name,
    COALESCE(NULLIF(os.status, ''), 'trial') AS subscription_status,
    os.expires_at,
    COALESCE(os.created_at, now()) AS created_at
  FROM public.owner_subscriptions os
  JOIN public.subscription_plans sp ON sp.id = os.plan_id
  LEFT JOIN public.profiles p ON p.user_id = os.owner_id OR p.id = os.owner_id
  LEFT JOIN auth.users u ON u.id = os.owner_id
  ORDER BY os.owner_id, os.created_at DESC, os.id DESC
) queue
WHERE queue.expires_at IS NOT NULL
  AND queue.expires_at <= now() + interval '7 days'
  AND NOT EXISTS (
    SELECT 1
    FROM public.admin_support_tickets existing
    WHERE existing.owner_id IS NOT DISTINCT FROM queue.owner_id
      AND existing.category = 'subscription'
  )
LIMIT 5;

INSERT INTO public.admin_notifications (
  owner_id,
  type,
  title,
  message,
  severity,
  status,
  target_module,
  metadata,
  created_at
)
SELECT
  ai.owner_id,
  'failed_payment',
  'Failed invoice for ' || COALESCE(NULLIF(p.restaurant_name, ''), u.email, 'client'),
  'Invoice ' || ai.invoice_number || ' requires a recovery follow-up.',
  'critical',
  'open',
  'payments',
  jsonb_build_object('invoice_id', ai.id, 'invoice_number', ai.invoice_number),
  ai.updated_at
FROM public.admin_invoices ai
LEFT JOIN public.profiles p ON p.user_id = ai.owner_id
LEFT JOIN auth.users u ON u.id = ai.owner_id
WHERE ai.status = 'failed'
  AND NOT EXISTS (
    SELECT 1
    FROM public.admin_notifications existing
    WHERE existing.owner_id IS NOT DISTINCT FROM ai.owner_id
      AND existing.type = 'failed_payment'
  )
LIMIT 8;

INSERT INTO public.admin_notifications (
  owner_id,
  type,
  title,
  message,
  severity,
  status,
  target_module,
  metadata,
  created_at
)
SELECT
  queue.owner_id,
  'subscription_expiry',
  'Subscription expiring soon',
  queue.client_name || ' - ' || queue.plan_name || ' expires on ' || to_char(queue.expires_at, 'DD Mon YYYY'),
  'warning',
  'open',
  'subscriptions',
  jsonb_build_object('subscription_id', queue.subscription_id, 'plan_name', queue.plan_name),
  now()
FROM (
  SELECT DISTINCT ON (os.owner_id)
    os.id AS subscription_id,
    os.owner_id,
    COALESCE(NULLIF(trim(p.restaurant_name), ''), split_part(COALESCE(u.email, ''), '@', 1), 'Unnamed Client') AS client_name,
    sp.name AS plan_name,
    os.expires_at
  FROM public.owner_subscriptions os
  JOIN public.subscription_plans sp ON sp.id = os.plan_id
  LEFT JOIN public.profiles p ON p.user_id = os.owner_id OR p.id = os.owner_id
  LEFT JOIN auth.users u ON u.id = os.owner_id
  ORDER BY os.owner_id, os.created_at DESC, os.id DESC
) queue
WHERE queue.expires_at IS NOT NULL
  AND queue.expires_at <= now() + interval '7 days'
  AND NOT EXISTS (
    SELECT 1
    FROM public.admin_notifications existing
    WHERE existing.owner_id IS NOT DISTINCT FROM queue.owner_id
      AND existing.type = 'subscription_expiry'
  )
LIMIT 8;

INSERT INTO public.admin_activity_logs (
  actor_user_id,
  actor_name,
  action,
  module,
  target,
  target_owner_id,
  ip_device,
  result,
  metadata,
  created_at
)
SELECT
  NULL,
  'System',
  'Seeded invoice ledger',
  'Payments',
  ai.invoice_number,
  ai.owner_id,
  'Platform bootstrap',
  CASE
    WHEN ai.status = 'paid' THEN 'Success'
    WHEN ai.status = 'failed' THEN 'Warning'
    ELSE 'Info'
  END,
  jsonb_build_object('invoice_id', ai.id),
  ai.created_at
FROM public.admin_invoices ai
WHERE NOT EXISTS (SELECT 1 FROM public.admin_activity_logs)
ORDER BY ai.created_at DESC
LIMIT 20;

CREATE OR REPLACE FUNCTION public.get_admin_support_tickets(
  _owner_id UUID DEFAULT NULL
)
RETURNS TABLE (
  ticket_id UUID,
  ticket_number TEXT,
  owner_id UUID,
  client_name TEXT,
  contact TEXT,
  subject TEXT,
  category TEXT,
  priority TEXT,
  assigned_agent TEXT,
  sla_due_at TIMESTAMPTZ,
  status TEXT,
  escalation_level INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.ticket_number,
    t.owner_id,
    COALESCE(NULLIF(p.restaurant_name, ''), NULLIF(p.full_name, ''), u.email, 'Platform Issue') AS client_name,
    COALESCE(u.email, '') AS contact,
    t.subject,
    t.category,
    t.priority,
    COALESCE(t.assigned_agent_name, 'Unassigned') AS assigned_agent,
    t.sla_due_at,
    t.status,
    t.escalation_level,
    t.created_at,
    t.updated_at
  FROM public.admin_support_tickets t
  LEFT JOIN public.profiles p ON p.user_id = t.owner_id
  LEFT JOIN auth.users u ON u.id = t.owner_id
  WHERE _owner_id IS NULL OR t.owner_id = _owner_id
  ORDER BY
    CASE lower(t.status)
      WHEN 'escalated' THEN 0
      WHEN 'open' THEN 1
      WHEN 'in_progress' THEN 2
      WHEN 'resolved' THEN 3
      ELSE 4
    END,
    CASE lower(t.priority)
      WHEN 'critical' THEN 0
      WHEN 'high' THEN 1
      WHEN 'medium' THEN 2
      ELSE 3
    END,
    t.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_support_tickets(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_support_tickets(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_admin_support_ticket(
  _ticket_id UUID,
  _assigned_agent_id UUID DEFAULT NULL,
  _status TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _agent_name TEXT;
  _owner_id UUID;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF _assigned_agent_id IS NOT NULL THEN
    SELECT
      COALESCE(NULLIF(p.full_name, ''), split_part(COALESCE(u.email, ''), '@', 1), 'Admin')
    INTO _agent_name
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE u.id = _assigned_agent_id;
  END IF;

  UPDATE public.admin_support_tickets
  SET
    assigned_agent_id = COALESCE(_assigned_agent_id, assigned_agent_id),
    assigned_agent_name = COALESCE(_agent_name, assigned_agent_name),
    status = COALESCE(NULLIF(trim(COALESCE(_status, '')), ''), status, 'in_progress'),
    escalation_level = CASE
      WHEN COALESCE(NULLIF(trim(COALESCE(_status, '')), ''), status) = 'escalated' THEN GREATEST(escalation_level, 1)
      ELSE escalation_level
    END
  WHERE id = _ticket_id
  RETURNING owner_id INTO _owner_id;

  PERFORM public.log_admin_activity(
    'Assigned support ticket',
    'Support',
    _ticket_id::TEXT,
    _owner_id,
    'Success',
    jsonb_build_object('assigned_agent_id', _assigned_agent_id, 'status', _status)
  );

  RETURN _ticket_id;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_admin_support_ticket(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_admin_support_ticket(UUID, UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_admin_support_ticket(
  _ticket_id UUID,
  _status TEXT DEFAULT 'resolved'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _owner_id UUID;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE public.admin_support_tickets
  SET
    status = COALESCE(NULLIF(trim(_status), ''), 'resolved'),
    resolved_at = CASE
      WHEN COALESCE(NULLIF(trim(_status), ''), 'resolved') = 'resolved' THEN now()
      ELSE resolved_at
    END
  WHERE id = _ticket_id
  RETURNING owner_id INTO _owner_id;

  PERFORM public.log_admin_activity(
    'Updated support ticket status',
    'Support',
    _ticket_id::TEXT,
    _owner_id,
    'Success',
    jsonb_build_object('status', _status)
  );

  RETURN _ticket_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_admin_support_ticket(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_admin_support_ticket(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_notifications()
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  client_name TEXT,
  type TEXT,
  title TEXT,
  message TEXT,
  severity TEXT,
  status TEXT,
  target_module TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    n.id,
    n.owner_id,
    COALESCE(NULLIF(p.restaurant_name, ''), NULLIF(p.full_name, ''), u.email, 'Platform') AS client_name,
    n.type,
    n.title,
    n.message,
    n.severity,
    n.status,
    n.target_module,
    n.created_at
  FROM public.admin_notifications n
  LEFT JOIN public.profiles p ON p.user_id = n.owner_id
  LEFT JOIN auth.users u ON u.id = n.owner_id
  ORDER BY
    CASE lower(n.status)
      WHEN 'open' THEN 0
      WHEN 'read' THEN 1
      WHEN 'resolved' THEN 2
      ELSE 3
    END,
    n.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_notifications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_notifications() TO authenticated;

CREATE OR REPLACE FUNCTION public.acknowledge_admin_notification(
  _notification_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _owner_id UUID;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE public.admin_notifications
  SET
    status = 'read',
    read_at = now()
  WHERE id = _notification_id
  RETURNING owner_id INTO _owner_id;

  PERFORM public.log_admin_activity(
    'Acknowledged notification',
    'Notifications',
    _notification_id::TEXT,
    _owner_id,
    'Info'
  );

  RETURN _notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.acknowledge_admin_notification(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acknowledge_admin_notification(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.resolve_admin_notification(
  _notification_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _owner_id UUID;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE public.admin_notifications
  SET
    status = 'resolved',
    resolved_at = now(),
    read_at = COALESCE(read_at, now())
  WHERE id = _notification_id
  RETURNING owner_id INTO _owner_id;

  PERFORM public.log_admin_activity(
    'Resolved notification',
    'Notifications',
    _notification_id::TEXT,
    _owner_id,
    'Success'
  );

  RETURN _notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_admin_notification(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_admin_notification(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_activity_logs(
  _owner_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  "timestamp" TIMESTAMPTZ,
  "user" TEXT,
  action TEXT,
  module TEXT,
  target TEXT,
  owner_id UUID,
  client_name TEXT,
  ip_device TEXT,
  result TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.created_at AS "timestamp",
    COALESCE(l.actor_name, 'System') AS "user",
    l.action,
    l.module,
    l.target,
    l.target_owner_id AS owner_id,
    COALESCE(NULLIF(p.restaurant_name, ''), NULLIF(p.full_name, ''), u.email, 'Platform') AS client_name,
    COALESCE(l.ip_device, 'Admin Console') AS ip_device,
    l.result
  FROM public.admin_activity_logs l
  LEFT JOIN public.profiles p ON p.user_id = l.target_owner_id
  LEFT JOIN auth.users u ON u.id = l.target_owner_id
  WHERE _owner_id IS NULL OR l.target_owner_id = _owner_id
  ORDER BY l.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_activity_logs(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_activity_logs(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_admin_client_plan(
  _owner_id UUID,
  _plan_id UUID,
  _status TEXT,
  _expires_at TIMESTAMPTZ,
  _notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _subscription_id UUID;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _owner_id OR user_id = _owner_id) THEN
    RAISE EXCEPTION 'Client profile not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.subscription_plans WHERE id = _plan_id) THEN
    RAISE EXCEPTION 'Subscription plan not found';
  END IF;

  SELECT os.id
  INTO _subscription_id
  FROM public.owner_subscriptions os
  WHERE os.owner_id = _owner_id
  ORDER BY os.created_at DESC, os.id DESC
  LIMIT 1;

  IF _subscription_id IS NULL THEN
    INSERT INTO public.owner_subscriptions (
      owner_id,
      plan_id,
      status,
      starts_at,
      expires_at,
      assigned_by,
      notes
    )
    VALUES (
      _owner_id,
      _plan_id,
      COALESCE(NULLIF(trim(_status), ''), 'active'),
      now(),
      _expires_at,
      auth.uid(),
      NULLIF(trim(COALESCE(_notes, '')), '')
    )
    RETURNING id INTO _subscription_id;
  ELSE
    UPDATE public.owner_subscriptions
    SET
      plan_id = _plan_id,
      status = COALESCE(NULLIF(trim(_status), ''), status, 'active'),
      expires_at = _expires_at,
      assigned_by = auth.uid(),
      notes = NULLIF(trim(COALESCE(_notes, '')), ''),
      created_at = now()
    WHERE id = _subscription_id;
  END IF;

  PERFORM public.log_admin_activity(
    'Updated subscription plan',
    'Subscriptions',
    _subscription_id::TEXT,
    _owner_id,
    'Success',
    jsonb_build_object('plan_id', _plan_id, 'status', _status, 'expires_at', _expires_at)
  );

  RETURN _subscription_id;
END;
$$;

REVOKE ALL ON FUNCTION public.assign_admin_client_plan(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_admin_client_plan(UUID, UUID, TEXT, TIMESTAMPTZ, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_admin_invoice_paid(
  _invoice_id UUID,
  _payment_method TEXT DEFAULT 'manual'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _owner_id UUID;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE public.admin_invoices
  SET
    status = 'paid',
    payment_method = COALESCE(NULLIF(trim(_payment_method), ''), payment_method, 'manual'),
    paid_at = now()
  WHERE id = _invoice_id
  RETURNING owner_id INTO _owner_id;

  PERFORM public.log_admin_activity(
    'Marked invoice paid',
    'Payments',
    _invoice_id::TEXT,
    _owner_id,
    'Success',
    jsonb_build_object('payment_method', _payment_method)
  );

  RETURN _invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_admin_invoice_paid(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_admin_invoice_paid(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.refund_admin_invoice(
  _invoice_id UUID,
  _notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _owner_id UUID;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE public.admin_invoices
  SET
    status = 'refunded',
    notes = COALESCE(NULLIF(trim(COALESCE(_notes, '')), ''), notes)
  WHERE id = _invoice_id
  RETURNING owner_id INTO _owner_id;

  INSERT INTO public.admin_notifications (
    owner_id,
    type,
    title,
    message,
    severity,
    status,
    target_module,
    metadata
  )
  VALUES (
    _owner_id,
    'invoice_refund',
    'Invoice refunded',
    'An invoice was refunded and may need finance reconciliation.',
    'warning',
    'open',
    'payments',
    jsonb_build_object('invoice_id', _invoice_id)
  );

  PERFORM public.log_admin_activity(
    'Refunded invoice',
    'Payments',
    _invoice_id::TEXT,
    _owner_id,
    'Warning',
    jsonb_build_object('notes', _notes)
  );

  RETURN _invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.refund_admin_invoice(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refund_admin_invoice(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.resend_admin_invoice(
  _invoice_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _owner_id UUID;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE public.admin_invoices
  SET last_sent_at = now()
  WHERE id = _invoice_id
  RETURNING owner_id INTO _owner_id;

  INSERT INTO public.admin_notifications (
    owner_id,
    type,
    title,
    message,
    severity,
    status,
    target_module,
    metadata
  )
  VALUES (
    _owner_id,
    'invoice_resent',
    'Invoice resent to client',
    'Finance follow-up invoice was resent from the admin panel.',
    'info',
    'read',
    'payments',
    jsonb_build_object('invoice_id', _invoice_id)
  );

  PERFORM public.log_admin_activity(
    'Resent invoice',
    'Payments',
    _invoice_id::TEXT,
    _owner_id,
    'Info'
  );

  RETURN _invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resend_admin_invoice(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resend_admin_invoice(UUID) TO authenticated;
