-- QR Workflow Tables
-- These tables extend the existing billing system to support QR-based ordering

-- 1. QR Scan Logs (Track QR scan events)
CREATE TABLE IF NOT EXISTS public.qr_scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  scan_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  success BOOLEAN NOT NULL DEFAULT true,
  error_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  device_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_owner_created
  ON public.qr_scan_logs(owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_table_created
  ON public.qr_scan_logs(table_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_success
  ON public.qr_scan_logs(success, created_at DESC);

ALTER TABLE public.qr_scan_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant staff can view scan logs" ON public.qr_scan_logs;
CREATE POLICY "Restaurant staff can view scan logs"
  ON public.qr_scan_logs FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = auth.uid()
      AND sm.restaurant_owner_id = owner_id
      AND sm.role IN ('admin', 'manager', 'analytics')
    )
  );

-- 2. Order Abandonment Tracking
CREATE TABLE IF NOT EXISTS public.order_abandonment_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ,
  time_to_payment_seconds INTEGER,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'voided', 'abandoned')),
  recovery_attempted BOOLEAN DEFAULT false,
  recovery_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_abandonment_order_id
  ON public.order_abandonment_tracking(order_id);

CREATE INDEX IF NOT EXISTS idx_abandonment_owner_created
  ON public.order_abandonment_tracking(owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_abandonment_status
  ON public.order_abandonment_tracking(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_abandonment_abandoned_at
  ON public.order_abandonment_tracking(abandoned_at DESC) WHERE abandoned_at IS NOT NULL;

ALTER TABLE public.order_abandonment_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Restaurant staff view abandonment tracking" ON public.order_abandonment_tracking;
CREATE POLICY "Restaurant staff view abandonment tracking"
  ON public.order_abandonment_tracking FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = auth.uid()
      AND sm.restaurant_owner_id = owner_id
      AND sm.role IN ('admin', 'manager', 'cashier', 'analytics')
    )
  );

-- 3. Payment Link Tokens (Track UPI payment links)
CREATE TABLE IF NOT EXISTS public.payment_link_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  payment_token TEXT NOT NULL UNIQUE,
  gateway TEXT NOT NULL CHECK (gateway IN ('razorpay', 'phonepe', 'upi')),
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  upi_id TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'expired')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  gateway_reference TEXT,
  gateway_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  webhook_received_at TIMESTAMPTZ,
  idempotency_key UUID UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_payment_links_order_id
  ON public.payment_link_tokens(order_id);

CREATE INDEX IF NOT EXISTS idx_payment_links_owner_created
  ON public.payment_link_tokens(owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_links_status
  ON public.payment_link_tokens(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_links_token
  ON public.payment_link_tokens(payment_token);

CREATE INDEX IF NOT EXISTS idx_payment_links_gateway_ref
  ON public.payment_link_tokens(gateway_reference);

CREATE INDEX IF NOT EXISTS idx_payment_links_expires_at
  ON public.payment_link_tokens(expires_at) WHERE status = 'active';

ALTER TABLE public.payment_link_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers view own payment links" ON public.payment_link_tokens;
CREATE POLICY "Customers view own payment links"
  ON public.payment_link_tokens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = payment_link_tokens.order_id
      AND (
        o.customer_id = auth.uid()
        OR o.table_id = ANY(
          SELECT rt.id FROM public.restaurant_tables rt
          WHERE rt.owner_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Staff manage payment links" ON public.payment_link_tokens;
CREATE POLICY "Staff manage payment links"
  ON public.payment_link_tokens FOR ALL
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR auth.uid() = owner_id
    OR EXISTS (
      SELECT 1 FROM public.staff_members sm
      WHERE sm.user_id = auth.uid()
      AND sm.restaurant_owner_id = owner_id
    )
  );
