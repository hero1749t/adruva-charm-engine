ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS settled_by_staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS latest_invoice_id UUID,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancellation_authorized_by_staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.restaurant_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  owner_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  settled_by_staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  payment_method TEXT,
  payment_reference TEXT,
  billing_notes TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  subtotal_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.restaurant_credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_number TEXT NOT NULL UNIQUE,
  invoice_id UUID NOT NULL REFERENCES public.restaurant_invoices(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  owner_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_by_staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  note TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  subtotal_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_wastage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  owner_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.restaurant_invoices(id) ON DELETE RESTRICT,
  credit_note_id UUID REFERENCES public.restaurant_credit_notes(id) ON DELETE RESTRICT,
  cancellation_reason TEXT NOT NULL,
  authorised_by_staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  estimated_loss_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_invoices_owner_created_at
ON public.restaurant_invoices (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_restaurant_credit_notes_owner_created_at
ON public.restaurant_credit_notes (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_wastage_events_owner_created_at
ON public.order_wastage_events (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_wastage_events_order_id
ON public.order_wastage_events (order_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_latest_invoice_id_fkey'
  ) THEN
    ALTER TABLE public.orders
    ADD CONSTRAINT orders_latest_invoice_id_fkey
    FOREIGN KEY (latest_invoice_id) REFERENCES public.restaurant_invoices(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.restaurant_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_wastage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and owners can view restaurant invoices" ON public.restaurant_invoices;
CREATE POLICY "Admins and owners can view restaurant invoices"
ON public.restaurant_invoices FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR auth.uid() = owner_id
  OR EXISTS (
    SELECT 1
    FROM public.staff_members sm
    WHERE sm.restaurant_owner_id = restaurant_invoices.owner_id
      AND sm.user_id = auth.uid()
      AND sm.is_active = true
  )
);

DROP POLICY IF EXISTS "Admins and owners can view restaurant credit notes" ON public.restaurant_credit_notes;
CREATE POLICY "Admins and owners can view restaurant credit notes"
ON public.restaurant_credit_notes FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR auth.uid() = owner_id
  OR EXISTS (
    SELECT 1
    FROM public.staff_members sm
    WHERE sm.restaurant_owner_id = restaurant_credit_notes.owner_id
      AND sm.user_id = auth.uid()
      AND sm.is_active = true
  )
);

DROP POLICY IF EXISTS "Admins and owners can view wastage events" ON public.order_wastage_events;
CREATE POLICY "Admins and owners can view wastage events"
ON public.order_wastage_events FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR auth.uid() = owner_id
  OR EXISTS (
    SELECT 1
    FROM public.staff_members sm
    WHERE sm.restaurant_owner_id = order_wastage_events.owner_id
      AND sm.user_id = auth.uid()
      AND sm.is_active = true
  )
);

CREATE OR REPLACE FUNCTION public.prevent_immutable_ledger_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Immutable ledger records cannot be changed once created';
END;
$$;

DROP TRIGGER IF EXISTS prevent_restaurant_invoice_update ON public.restaurant_invoices;
CREATE TRIGGER prevent_restaurant_invoice_update
BEFORE UPDATE OR DELETE ON public.restaurant_invoices
FOR EACH ROW
EXECUTE FUNCTION public.prevent_immutable_ledger_mutation();

DROP TRIGGER IF EXISTS prevent_restaurant_credit_note_update ON public.restaurant_credit_notes;
CREATE TRIGGER prevent_restaurant_credit_note_update
BEFORE UPDATE OR DELETE ON public.restaurant_credit_notes
FOR EACH ROW
EXECUTE FUNCTION public.prevent_immutable_ledger_mutation();

DROP TRIGGER IF EXISTS prevent_order_wastage_update ON public.order_wastage_events;
CREATE TRIGGER prevent_order_wastage_update
BEFORE UPDATE OR DELETE ON public.order_wastage_events
FOR EACH ROW
EXECUTE FUNCTION public.prevent_immutable_ledger_mutation();

CREATE OR REPLACE FUNCTION public.prevent_order_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Orders are immutable operational records and cannot be deleted';
END;
$$;

DROP TRIGGER IF EXISTS prevent_order_delete_trigger ON public.orders;
CREATE TRIGGER prevent_order_delete_trigger
BEFORE DELETE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.prevent_order_delete();

CREATE OR REPLACE FUNCTION public.get_current_staff_member_id(_owner_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sm.id
  FROM public.staff_members sm
  WHERE sm.restaurant_owner_id = _owner_id
    AND sm.user_id = auth.uid()
    AND sm.is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.calculate_order_financials(_order_id UUID)
RETURNS TABLE (
  subtotal_amount NUMERIC,
  discount_amount NUMERIC,
  tax_rate NUMERIC,
  tax_amount NUMERIC,
  total_amount NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH order_totals AS (
    SELECT
      o.id,
      o.owner_id,
      COALESCE(NULLIF(o.subtotal_amount, 0), SUM(oi.item_price * oi.quantity), 0) AS subtotal_amount,
      CASE
        WHEN o.subtotal_amount > 0 OR o.discount_amount > 0 THEN COALESCE(o.discount_amount, 0)
        ELSE GREATEST(
          COALESCE(SUM(oi.item_price * oi.quantity), 0) - LEAST(COALESCE(o.total_amount, 0), COALESCE(SUM(oi.item_price * oi.quantity), 0)),
          0
        )
      END AS discount_amount,
      COALESCE(p.gst_percentage, 0) AS tax_rate
    FROM public.orders o
    LEFT JOIN public.order_items oi ON oi.order_id = o.id
    LEFT JOIN public.profiles p ON p.user_id = o.owner_id
    WHERE o.id = _order_id
    GROUP BY o.id, o.owner_id, o.subtotal_amount, o.discount_amount, o.total_amount, p.gst_percentage
  )
  SELECT
    ot.subtotal_amount,
    ot.discount_amount,
    ot.tax_rate,
    round(GREATEST(ot.subtotal_amount - ot.discount_amount, 0) * ot.tax_rate / 100, 2) AS tax_amount,
    round(GREATEST(ot.subtotal_amount - ot.discount_amount, 0) + (GREATEST(ot.subtotal_amount - ot.discount_amount, 0) * ot.tax_rate / 100), 2) AS total_amount
  FROM order_totals ot;
$$;

CREATE OR REPLACE FUNCTION public.build_order_invoice_snapshot(_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_financials RECORD;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  SELECT * INTO v_financials
  FROM public.calculate_order_financials(_order_id);

  RETURN jsonb_build_object(
    'order', jsonb_build_object(
      'id', v_order.id,
      'owner_id', v_order.owner_id,
      'table_number', v_order.table_number,
      'customer_phone', v_order.customer_phone,
      'status', v_order.status,
      'notes', v_order.notes,
      'created_at', v_order.created_at
    ),
    'items', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'menu_item_id', oi.menu_item_id,
          'combo_id', oi.combo_id,
          'item_name', oi.item_name,
          'item_price', oi.item_price,
          'quantity', oi.quantity
        )
        ORDER BY oi.created_at, oi.id
      )
      FROM public.order_items oi
      WHERE oi.order_id = _order_id
    ), '[]'::jsonb),
    'financials', jsonb_build_object(
      'subtotal_amount', COALESCE(v_financials.subtotal_amount, 0),
      'discount_amount', COALESCE(v_financials.discount_amount, 0),
      'tax_rate', COALESCE(v_financials.tax_rate, 0),
      'tax_amount', COALESCE(v_financials.tax_amount, 0),
      'total_amount', COALESCE(v_financials.total_amount, 0)
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_restaurant_invoice(
  _order_id UUID,
  _payment_method TEXT,
  _payment_reference TEXT DEFAULT NULL,
  _billing_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  invoice_id UUID,
  invoice_number TEXT,
  total_amount NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_financials RECORD;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_snapshot JSONB;
  v_staff_id UUID;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.payment_status = 'confirmed' THEN
    RAISE EXCEPTION 'This order is already settled';
  END IF;

  SELECT * INTO v_financials
  FROM public.calculate_order_financials(_order_id);

  v_snapshot := public.build_order_invoice_snapshot(_order_id);
  v_staff_id := public.get_current_staff_member_id(v_order.owner_id);
  v_invoice_id := gen_random_uuid();
  v_invoice_number := 'INV-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || upper(substr(v_order.id::text, 1, 4));

  INSERT INTO public.restaurant_invoices (
    id,
    invoice_number,
    order_id,
    owner_id,
    settled_by_staff_id,
    payment_method,
    payment_reference,
    billing_notes,
    subtotal_amount,
    discount_amount,
    tax_rate,
    tax_amount,
    total_amount,
    snapshot
  )
  VALUES (
    v_invoice_id,
    v_invoice_number,
    v_order.id,
    v_order.owner_id,
    v_staff_id,
    _payment_method,
    NULLIF(trim(COALESCE(_payment_reference, '')), ''),
    NULLIF(trim(COALESCE(_billing_notes, '')), ''),
    COALESCE(v_financials.subtotal_amount, 0),
    COALESCE(v_financials.discount_amount, 0),
    COALESCE(v_financials.tax_rate, 0),
    COALESCE(v_financials.tax_amount, 0),
    COALESCE(v_financials.total_amount, 0),
    v_snapshot
  );

  UPDATE public.orders
  SET
    subtotal_amount = COALESCE(v_financials.subtotal_amount, 0),
    discount_amount = COALESCE(v_financials.discount_amount, 0),
    tax_amount = COALESCE(v_financials.tax_amount, 0),
    total_amount = COALESCE(v_financials.total_amount, 0),
    settled_at = now(),
    settled_by_staff_id = v_staff_id,
    latest_invoice_id = v_invoice_id,
    bill_number = v_invoice_number
  WHERE id = v_order.id;

  RETURN QUERY
  SELECT v_invoice_id, v_invoice_number, COALESCE(v_financials.total_amount, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_credit_note_for_order(
  _order_id UUID,
  _reason TEXT,
  _note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_invoice public.restaurant_invoices%ROWTYPE;
  v_credit_note_id UUID := gen_random_uuid();
  v_credit_note_number TEXT;
  v_staff_id UUID;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.latest_invoice_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_invoice
  FROM public.restaurant_invoices
  WHERE id = v_order.latest_invoice_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_staff_id := public.get_current_staff_member_id(v_order.owner_id);
  v_credit_note_number := 'CN-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || upper(substr(v_order.id::text, 1, 4));

  INSERT INTO public.restaurant_credit_notes (
    id,
    credit_note_number,
    invoice_id,
    order_id,
    owner_id,
    created_by_staff_id,
    reason,
    note,
    subtotal_amount,
    discount_amount,
    tax_amount,
    total_amount,
    snapshot
  )
  VALUES (
    v_credit_note_id,
    v_credit_note_number,
    v_invoice.id,
    v_order.id,
    v_order.owner_id,
    v_staff_id,
    _reason,
    _note,
    v_invoice.subtotal_amount,
    v_invoice.discount_amount,
    v_invoice.tax_amount,
    v_invoice.total_amount,
    v_invoice.snapshot
  );

  RETURN v_credit_note_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_order_wastage(
  _order_id UUID,
  _cancellation_reason TEXT,
  _credit_note_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_staff_id UUID;
  v_snapshot JSONB;
  v_event_id UUID := gen_random_uuid();
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  v_staff_id := public.get_current_staff_member_id(v_order.owner_id);
  v_snapshot := public.build_order_invoice_snapshot(_order_id);

  INSERT INTO public.order_wastage_events (
    id,
    order_id,
    owner_id,
    invoice_id,
    credit_note_id,
    cancellation_reason,
    authorised_by_staff_id,
    snapshot,
    estimated_loss_amount
  )
  VALUES (
    v_event_id,
    v_order.id,
    v_order.owner_id,
    v_order.latest_invoice_id,
    _credit_note_id,
    _cancellation_reason,
    v_staff_id,
    v_snapshot,
    COALESCE(v_order.total_amount, 0)
  );

  RETURN v_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_order_with_reason(
  _order_id UUID,
  _reason TEXT
)
RETURNS TABLE (
  order_id UUID,
  payment_status TEXT,
  bill_status TEXT,
  order_status public.order_status,
  cancellation_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_reason TEXT;
  v_staff_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF NOT public.can_correct_order_billing(v_order.owner_id) THEN
    RAISE EXCEPTION 'Only owner or manager can cancel this order';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'This order is already cancelled';
  END IF;

  IF v_order.payment_status = 'confirmed' THEN
    RAISE EXCEPTION 'Use bill void instead of raw cancellation for settled orders';
  END IF;

  IF v_order.status = 'served' THEN
    RAISE EXCEPTION 'Served orders cannot be cancelled directly';
  END IF;

  v_reason := NULLIF(trim(COALESCE(_reason, '')), '');
  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'Cancellation reason is required';
  END IF;

  v_staff_id := public.get_current_staff_member_id(v_order.owner_id);

  UPDATE public.orders
  SET
    status = 'cancelled',
    bill_status = CASE
      WHEN COALESCE(bill_status, 'draft') = 'generated' THEN 'voided'
      ELSE COALESCE(bill_status, 'draft')
    END,
    payment_status = CASE
      WHEN COALESCE(payment_status, 'pending') = 'confirmed' THEN 'voided'
      ELSE COALESCE(payment_status, 'pending')
    END,
    cancelled_at = now(),
    cancellation_reason = v_reason,
    cancellation_authorized_by_staff_id = v_staff_id,
    updated_at = now()
  WHERE id = v_order.id;

  PERFORM public.record_order_wastage(v_order.id, v_reason, NULL);

  RETURN QUERY
  SELECT
    o.id,
    o.payment_status,
    o.bill_status,
    o.status,
    COALESCE(o.cancellation_reason, v_reason)
  FROM public.orders o
  WHERE o.id = v_order.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_order_payment(
  _order_id UUID,
  _payment_method TEXT,
  _payment_reference TEXT DEFAULT NULL,
  _billing_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  order_id UUID,
  bill_number TEXT,
  payment_status TEXT,
  bill_status TEXT,
  order_status public.order_status,
  payment_method TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_method TEXT;
  v_invoice RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF NOT public.can_manage_order_billing(v_order.owner_id) THEN
    RAISE EXCEPTION 'You are not allowed to confirm this payment';
  END IF;

  IF v_order.status <> 'ready' THEN
    RAISE EXCEPTION 'Only ready orders can be billed';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled orders cannot be billed';
  END IF;

  v_method := lower(trim(COALESCE(_payment_method, '')));
  IF v_method NOT IN ('cash', 'card', 'upi') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  SELECT * INTO v_invoice
  FROM public.create_restaurant_invoice(
    v_order.id,
    v_method,
    _payment_reference,
    _billing_notes
  );

  UPDATE public.orders
  SET
    payment_method = v_method,
    payment_status = 'confirmed',
    payment_reference = NULLIF(trim(COALESCE(_payment_reference, '')), ''),
    billing_notes = NULLIF(trim(COALESCE(_billing_notes, '')), ''),
    payment_confirmed_at = now(),
    bill_status = 'generated',
    bill_generated_at = COALESCE(bill_generated_at, now()),
    bill_number = v_invoice.invoice_number,
    billing_reverted_at = NULL,
    billing_revert_reason = NULL,
    billing_voided_at = NULL,
    billing_void_reason = NULL,
    settled_at = now(),
    cancelled_at = NULL,
    cancellation_reason = NULL,
    cancellation_authorized_by_staff_id = NULL,
    status = 'served',
    updated_at = now()
  WHERE id = v_order.id;

  RETURN QUERY
  SELECT
    o.id,
    o.bill_number,
    o.payment_status,
    o.bill_status,
    o.status,
    o.payment_method
  FROM public.orders o
  WHERE o.id = v_order.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revert_order_payment(
  _order_id UUID,
  _reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  order_id UUID,
  payment_status TEXT,
  bill_status TEXT,
  order_status public.order_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_reason TEXT;
  v_credit_note_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF NOT public.can_correct_order_billing(v_order.owner_id) THEN
    RAISE EXCEPTION 'Only owner or manager can reopen this bill';
  END IF;

  IF v_order.payment_status <> 'confirmed' THEN
    RAISE EXCEPTION 'Only confirmed payments can be reverted';
  END IF;

  v_reason := COALESCE(NULLIF(trim(COALESCE(_reason, '')), ''), 'Reopened by manager');
  v_credit_note_id := public.create_credit_note_for_order(v_order.id, 'Invoice reversed before reopen', v_reason);

  PERFORM public.restore_inventory_for_billing_correction(
    v_order.id,
    'order_reopen_restock',
    'Inventory restored after bill reopen'
  );

  UPDATE public.orders
  SET
    payment_status = 'pending',
    payment_method = NULL,
    payment_reference = NULL,
    payment_confirmed_at = NULL,
    settled_at = NULL,
    settled_by_staff_id = NULL,
    bill_status = 'reverted',
    bill_generated_at = NULL,
    bill_number = NULL,
    billing_reverted_at = now(),
    billing_revert_reason = v_reason,
    status = 'ready',
    updated_at = now()
  WHERE id = v_order.id;

  RETURN QUERY
  SELECT
    o.id,
    o.payment_status,
    o.bill_status,
    o.status
  FROM public.orders o
  WHERE o.id = v_order.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.void_order_billing(
  _order_id UUID,
  _reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  order_id UUID,
  payment_status TEXT,
  bill_status TEXT,
  order_status public.order_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_reason TEXT;
  v_credit_note_id UUID;
  v_staff_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF NOT public.can_correct_order_billing(v_order.owner_id) THEN
    RAISE EXCEPTION 'Only owner or manager can void this bill';
  END IF;

  IF v_order.payment_status <> 'confirmed' THEN
    RAISE EXCEPTION 'Only confirmed bills can be voided';
  END IF;

  v_reason := COALESCE(NULLIF(trim(COALESCE(_reason, '')), ''), 'Voided by manager');
  v_staff_id := public.get_current_staff_member_id(v_order.owner_id);
  v_credit_note_id := public.create_credit_note_for_order(v_order.id, 'Invoice reversed after order cancellation', v_reason);

  PERFORM public.restore_inventory_for_billing_correction(
    v_order.id,
    'order_void_restock',
    'Inventory restored after bill void'
  );

  UPDATE public.orders
  SET
    payment_status = 'voided',
    bill_status = 'voided',
    payment_method = NULL,
    payment_reference = NULL,
    billing_voided_at = now(),
    billing_void_reason = v_reason,
    cancelled_at = now(),
    cancellation_reason = v_reason,
    cancellation_authorized_by_staff_id = v_staff_id,
    settled_at = NULL,
    settled_by_staff_id = NULL,
    updated_at = now(),
    status = 'cancelled'
  WHERE id = v_order.id;

  PERFORM public.record_order_wastage(v_order.id, v_reason, v_credit_note_id);

  RETURN QUERY
  SELECT
    o.id,
    o.payment_status,
    o.bill_status,
    o.status
  FROM public.orders o
  WHERE o.id = v_order.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_wastage_report()
RETURNS TABLE (
  id UUID,
  order_id UUID,
  owner_id UUID,
  client_name TEXT,
  table_number INTEGER,
  cancellation_reason TEXT,
  authorised_by TEXT,
  estimated_loss_amount NUMERIC,
  credit_note_number TEXT,
  invoice_number TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    owe.id,
    owe.order_id,
    owe.owner_id,
    COALESCE(NULLIF(p.restaurant_name, ''), 'Restaurant') AS client_name,
    o.table_number,
    owe.cancellation_reason,
    COALESCE(sm.name, 'Owner') AS authorised_by,
    owe.estimated_loss_amount,
    rcn.credit_note_number,
    ri.invoice_number,
    owe.created_at
  FROM public.order_wastage_events owe
  JOIN public.orders o ON o.id = owe.order_id
  LEFT JOIN public.profiles p ON p.user_id = owe.owner_id
  LEFT JOIN public.staff_members sm ON sm.id = owe.authorised_by_staff_id
  LEFT JOIN public.restaurant_credit_notes rcn ON rcn.id = owe.credit_note_id
  LEFT JOIN public.restaurant_invoices ri ON ri.id = owe.invoice_id
  WHERE public.is_admin(auth.uid())
  ORDER BY owe.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_current_staff_member_id(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_staff_member_id(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.calculate_order_financials(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_order_financials(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.build_order_invoice_snapshot(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.build_order_invoice_snapshot(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.create_restaurant_invoice(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_restaurant_invoice(UUID, TEXT, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.create_credit_note_for_order(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_credit_note_for_order(UUID, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.record_order_wastage(UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_order_wastage(UUID, TEXT, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.cancel_order_with_reason(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_order_with_reason(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.get_admin_wastage_report() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_wastage_report() TO authenticated;
