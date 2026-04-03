CREATE TABLE IF NOT EXISTS public.admin_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.owner_subscriptions(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  base_amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  pdf_url TEXT,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view invoices" ON public.admin_invoices;
CREATE POLICY "Admins can view invoices"
ON public.admin_invoices FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert invoices" ON public.admin_invoices;
CREATE POLICY "Admins can insert invoices"
ON public.admin_invoices FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update invoices" ON public.admin_invoices;
CREATE POLICY "Admins can update invoices"
ON public.admin_invoices FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete invoices" ON public.admin_invoices;
CREATE POLICY "Admins can delete invoices"
ON public.admin_invoices FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_admin_invoice_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_admin_invoice_updated_at ON public.admin_invoices;
CREATE TRIGGER set_admin_invoice_updated_at
BEFORE UPDATE ON public.admin_invoices
FOR EACH ROW
EXECUTE FUNCTION public.set_admin_invoice_updated_at();

INSERT INTO public.admin_invoices (
  invoice_number,
  owner_id,
  subscription_id,
  plan_id,
  base_amount,
  tax_amount,
  total_amount,
  due_date,
  payment_method,
  status,
  notes,
  last_sent_at,
  created_at
)
SELECT
  'INV-' || upper(left(replace(os.id::text, '-', ''), 8)) AS invoice_number,
  os.owner_id,
  os.id,
  os.plan_id,
  sp.price AS base_amount,
  round(sp.price * 0.18, 2) AS tax_amount,
  round(sp.price * 1.18, 2) AS total_amount,
  COALESCE(os.expires_at, now() + interval '7 days') AS due_date,
  NULL::TEXT AS payment_method,
  CASE
    WHEN lower(COALESCE(os.status, 'pending')) IN ('active', 'paid') THEN 'paid'
    WHEN lower(COALESCE(os.status, 'pending')) IN ('paused', 'expired', 'failed', 'cancelled') THEN 'failed'
    ELSE 'pending'
  END AS status,
  COALESCE(os.notes, 'Seeded from subscription state') AS notes,
  now() AS last_sent_at,
  COALESCE(os.created_at, now()) AS created_at
FROM public.owner_subscriptions os
JOIN public.subscription_plans sp ON sp.id = os.plan_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.admin_invoices ai
  WHERE ai.subscription_id = os.id
);

CREATE OR REPLACE FUNCTION public.get_admin_invoices()
RETURNS TABLE (
  id UUID,
  invoice_number TEXT,
  owner_id UUID,
  client_name TEXT,
  contact TEXT,
  plan_name TEXT,
  amount NUMERIC,
  tax NUMERIC,
  total NUMERIC,
  due_date TIMESTAMPTZ,
  payment_method TEXT,
  status TEXT,
  notes TEXT,
  pdf_url TEXT,
  last_sent_at TIMESTAMPTZ,
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
    ai.id,
    ai.invoice_number,
    ai.owner_id,
    COALESCE(NULLIF(p.restaurant_name, ''), NULLIF(p.full_name, ''), u.email, 'Unnamed Client') AS client_name,
    COALESCE(u.email, '') AS contact,
    COALESCE(sp.name, 'Unassigned Plan') AS plan_name,
    ai.base_amount AS amount,
    ai.tax_amount AS tax,
    ai.total_amount AS total,
    ai.due_date,
    ai.payment_method,
    ai.status,
    ai.notes,
    ai.pdf_url,
    ai.last_sent_at,
    ai.created_at
  FROM public.admin_invoices ai
  JOIN public.profiles p ON p.user_id = ai.owner_id
  JOIN auth.users u ON u.id = ai.owner_id
  LEFT JOIN public.subscription_plans sp ON sp.id = ai.plan_id
  ORDER BY ai.created_at DESC, ai.due_date DESC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_invoices() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_invoices() TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_admin_invoice_paid(
  _invoice_id UUID,
  _payment_method TEXT DEFAULT 'manual'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE public.admin_invoices
  SET
    status = 'paid',
    payment_method = COALESCE(NULLIF(trim(_payment_method), ''), payment_method, 'manual'),
    paid_at = now()
  WHERE id = _invoice_id;

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
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE public.admin_invoices
  SET
    status = 'refunded',
    notes = COALESCE(NULLIF(trim(COALESCE(_notes, '')), ''), notes)
  WHERE id = _invoice_id;

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
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE public.admin_invoices
  SET last_sent_at = now()
  WHERE id = _invoice_id;

  RETURN _invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resend_admin_invoice(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resend_admin_invoice(UUID) TO authenticated;
