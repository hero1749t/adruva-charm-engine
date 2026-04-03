ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS order_origin TEXT NOT NULL DEFAULT 'qr',
ADD COLUMN IF NOT EXISTS payment_locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS payment_lock_reason TEXT,
ADD COLUMN IF NOT EXISTS qr_gateway_reference TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'orders_order_origin_check'
  ) THEN
    ALTER TABLE public.orders
    ADD CONSTRAINT orders_order_origin_check
    CHECK (order_origin IN ('qr', 'counter'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.order_payment_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  owner_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  staff_member_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  payment_method TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  reference TEXT,
  note TEXT,
  gateway_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_payment_entries_order_created_at
ON public.order_payment_entries (order_id, created_at);

CREATE INDEX IF NOT EXISTS idx_order_payment_entries_owner_created_at
ON public.order_payment_entries (owner_id, created_at DESC);

ALTER TABLE public.order_payment_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and restaurant staff can view payment entries" ON public.order_payment_entries;
CREATE POLICY "Admins and restaurant staff can view payment entries"
ON public.order_payment_entries FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR auth.uid() = owner_id
  OR EXISTS (
    SELECT 1
    FROM public.staff_members sm
    WHERE sm.restaurant_owner_id = order_payment_entries.owner_id
      AND sm.user_id = auth.uid()
      AND sm.is_active = true
  )
);

CREATE OR REPLACE FUNCTION public.prevent_order_payment_entry_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Payment entries are immutable and cannot be changed once created';
END;
$$;

DROP TRIGGER IF EXISTS prevent_order_payment_entry_update ON public.order_payment_entries;
CREATE TRIGGER prevent_order_payment_entry_update
BEFORE UPDATE OR DELETE ON public.order_payment_entries
FOR EACH ROW
EXECUTE FUNCTION public.prevent_order_payment_entry_mutation();

CREATE OR REPLACE FUNCTION public.get_order_payment_summary(_order_id UUID)
RETURNS TABLE (
  order_total NUMERIC,
  paid_amount NUMERIC,
  remaining_amount NUMERIC,
  payment_methods TEXT[],
  is_closed BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH order_financials AS (
    SELECT COALESCE(f.total_amount, 0) AS total_amount
    FROM public.calculate_order_financials(_order_id) f
  ),
  payments AS (
    SELECT
      COALESCE(SUM(ope.amount), 0) AS paid_amount,
      ARRAY_REMOVE(ARRAY_AGG(DISTINCT lower(ope.payment_method)), NULL) AS payment_methods
    FROM public.order_payment_entries ope
    WHERE ope.order_id = _order_id
  )
  SELECT
    ofn.total_amount AS order_total,
    p.paid_amount,
    GREATEST(ofn.total_amount - p.paid_amount, 0) AS remaining_amount,
    COALESCE(p.payment_methods, ARRAY[]::TEXT[]) AS payment_methods,
    p.paid_amount = ofn.total_amount AS is_closed
  FROM order_financials ofn
  CROSS JOIN payments p;
$$;

CREATE OR REPLACE FUNCTION public.sync_billing_discrepancy_alert(_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_summary RECORD;
  v_existing_id UUID;
  v_title TEXT := 'Billing discrepancy detected';
  v_message TEXT;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT * INTO v_summary
  FROM public.get_order_payment_summary(_order_id);

  SELECT an.id
  INTO v_existing_id
  FROM public.admin_notifications an
  WHERE an.type = 'billing_discrepancy'
    AND COALESCE(an.metadata->>'order_id', '') = _order_id::text
    AND an.status <> 'resolved'
  ORDER BY an.created_at DESC
  LIMIT 1;

  IF v_order.status = 'cancelled' OR COALESCE(v_summary.paid_amount, 0) = COALESCE(v_summary.order_total, 0) OR COALESCE(v_summary.paid_amount, 0) = 0 THEN
    IF v_existing_id IS NOT NULL THEN
      UPDATE public.admin_notifications
      SET
        status = 'resolved',
        resolved_at = now(),
        updated_at = now()
      WHERE id = v_existing_id;
    END IF;
    RETURN;
  END IF;

  v_message := format(
    'Order %s has recorded payments of Rs %s against order value Rs %s. Remaining: Rs %s.',
    left(_order_id::text, 8),
    trim(to_char(COALESCE(v_summary.paid_amount, 0), 'FM999999990.00')),
    trim(to_char(COALESCE(v_summary.order_total, 0), 'FM999999990.00')),
    trim(to_char(COALESCE(v_summary.remaining_amount, 0), 'FM999999990.00'))
  );

  IF v_existing_id IS NULL THEN
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
      v_order.owner_id,
      'billing_discrepancy',
      v_title,
      v_message,
      'warning',
      'active',
      'billing',
      jsonb_build_object(
        'order_id', v_order.id,
        'table_number', v_order.table_number,
        'order_origin', v_order.order_origin,
        'paid_amount', COALESCE(v_summary.paid_amount, 0),
        'order_total', COALESCE(v_summary.order_total, 0),
        'remaining_amount', COALESCE(v_summary.remaining_amount, 0)
      )
    );
  ELSE
    UPDATE public.admin_notifications
    SET
      message = v_message,
      severity = 'warning',
      status = 'active',
      resolved_at = NULL,
      updated_at = now(),
      metadata = jsonb_build_object(
        'order_id', v_order.id,
        'table_number', v_order.table_number,
        'order_origin', v_order.order_origin,
        'paid_amount', COALESCE(v_summary.paid_amount, 0),
        'order_total', COALESCE(v_summary.order_total, 0),
        'remaining_amount', COALESCE(v_summary.remaining_amount, 0)
      )
    WHERE id = v_existing_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_manual_counter_order(
  _owner_id UUID,
  _table_id UUID,
  _customer_phone TEXT,
  _notes TEXT,
  _items JSONB
)
RETURNS TABLE (
  order_id UUID,
  table_number INTEGER,
  total_amount NUMERIC,
  order_status public.order_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_table public.restaurant_tables%ROWTYPE;
  v_order_id UUID;
  v_financials RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.can_manage_order_billing(_owner_id) THEN
    RAISE EXCEPTION 'You are not allowed to create counter orders';
  END IF;

  SELECT *
  INTO v_table
  FROM public.restaurant_tables
  WHERE id = _table_id
    AND owner_id = _owner_id
    AND is_active = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected table is invalid';
  END IF;

  IF v_table.status <> 'free' THEN
    RAISE EXCEPTION 'Only free tables can be used for a new counter order';
  END IF;

  v_order_id := public.place_public_order(
    _owner_id,
    v_table.table_number,
    _customer_phone,
    _notes,
    _items,
    NULL
  );

  SELECT * INTO v_financials
  FROM public.calculate_order_financials(v_order_id);

  UPDATE public.orders
  SET
    table_id = v_table.id,
    table_number = v_table.table_number,
    order_origin = 'counter',
    subtotal_amount = COALESCE(v_financials.subtotal_amount, subtotal_amount),
    discount_amount = COALESCE(v_financials.discount_amount, discount_amount),
    tax_amount = COALESCE(v_financials.tax_amount, tax_amount),
    total_amount = COALESCE(v_financials.total_amount, total_amount),
    payment_status = 'pending',
    bill_status = 'draft',
    updated_at = now()
  WHERE id = v_order_id;

  UPDATE public.restaurant_tables
  SET status = 'occupied'
  WHERE id = v_table.id;

  RETURN QUERY
  SELECT
    o.id,
    o.table_number,
    o.total_amount,
    o.status
  FROM public.orders o
  WHERE o.id = v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_manual_order_payment(
  _order_id UUID,
  _payment_method TEXT,
  _amount NUMERIC,
  _payment_reference TEXT DEFAULT NULL,
  _billing_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  order_id UUID,
  paid_amount NUMERIC,
  remaining_amount NUMERIC,
  payment_status TEXT,
  bill_status TEXT,
  bill_number TEXT,
  order_status public.order_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_staff_id UUID;
  v_method TEXT;
  v_summary RECORD;
  v_invoice RECORD;
  v_reference TEXT;
  v_payment_methods TEXT[];
  v_invoice_method TEXT;
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
    RAISE EXCEPTION 'You are not allowed to record this payment';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled orders cannot accept payments';
  END IF;

  IF v_order.payment_locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'This invoice is locked because a gateway settlement already exists';
  END IF;

  v_method := lower(trim(COALESCE(_payment_method, '')));
  IF v_method NOT IN ('cash', 'card', 'upi') THEN
    RAISE EXCEPTION 'Invalid payment method';
  END IF;

  IF COALESCE(_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  v_staff_id := public.get_current_staff_member_id(v_order.owner_id);
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Active staff mapping required for manual payment entry';
  END IF;

  SELECT * INTO v_summary
  FROM public.get_order_payment_summary(v_order.id);

  IF COALESCE(v_summary.paid_amount, 0) >= COALESCE(v_summary.order_total, 0) THEN
    RAISE EXCEPTION 'This order is already fully settled';
  END IF;

  IF COALESCE(v_summary.paid_amount, 0) + _amount > COALESCE(v_summary.order_total, 0) THEN
    RAISE EXCEPTION 'Recorded payment exceeds order value';
  END IF;

  INSERT INTO public.order_payment_entries (
    order_id,
    owner_id,
    staff_member_id,
    source,
    payment_method,
    amount,
    reference,
    note
  )
  VALUES (
    v_order.id,
    v_order.owner_id,
    v_staff_id,
    'manual',
    v_method,
    _amount,
    NULLIF(trim(COALESCE(_payment_reference, '')), ''),
    NULLIF(trim(COALESCE(_billing_note, '')), '')
  );

  SELECT * INTO v_summary
  FROM public.get_order_payment_summary(v_order.id);

  IF v_summary.is_closed THEN
    v_payment_methods := COALESCE(v_summary.payment_methods, ARRAY[]::TEXT[]);
    v_invoice_method := CASE
      WHEN array_length(v_payment_methods, 1) IS NULL THEN v_method
      WHEN array_length(v_payment_methods, 1) = 1 THEN v_payment_methods[1]
      ELSE 'split'
    END;
    v_reference := CASE
      WHEN v_invoice_method = 'split' THEN 'Multiple payments recorded'
      ELSE NULLIF(trim(COALESCE(_payment_reference, '')), '')
    END;

    SELECT * INTO v_invoice
    FROM public.create_restaurant_invoice(
      v_order.id,
      v_invoice_method,
      v_reference,
      _billing_note
    );

    UPDATE public.orders
    SET
      payment_method = v_invoice_method,
      payment_reference = v_reference,
      payment_status = 'confirmed',
      payment_confirmed_at = now(),
      bill_status = 'generated',
      bill_generated_at = COALESCE(bill_generated_at, now()),
      bill_number = v_invoice.invoice_number,
      settled_at = now(),
      cancelled_at = NULL,
      cancellation_reason = NULL,
      cancellation_authorized_by_staff_id = NULL,
      status = 'served',
      updated_at = now()
    WHERE id = v_order.id;
  ELSE
    UPDATE public.orders
    SET
      payment_status = 'partial',
      bill_status = 'draft',
      payment_method = NULL,
      payment_reference = NULL,
      updated_at = now()
    WHERE id = v_order.id;
  END IF;

  PERFORM public.sync_billing_discrepancy_alert(v_order.id);

  RETURN QUERY
  SELECT
    o.id,
    v_summary.paid_amount,
    v_summary.remaining_amount,
    o.payment_status,
    o.bill_status,
    o.bill_number,
    o.status
  FROM public.orders o
  WHERE o.id = v_order.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_qr_gateway_payment(
  _order_id UUID,
  _payment_method TEXT,
  _amount NUMERIC,
  _gateway_reference TEXT,
  _gateway_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  order_id UUID,
  paid_amount NUMERIC,
  remaining_amount NUMERIC,
  payment_status TEXT,
  bill_status TEXT,
  bill_number TEXT,
  order_status public.order_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_method TEXT;
  v_summary RECORD;
  v_invoice RECORD;
  v_role TEXT := current_setting('request.jwt.claim.role', true);
BEGIN
  IF auth.uid() IS NULL AND COALESCE(v_role, '') <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = _order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.order_origin <> 'qr' THEN
    RAISE EXCEPTION 'Gateway settlement is only valid for QR orders';
  END IF;

  IF v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled orders cannot accept gateway payments';
  END IF;

  v_method := lower(trim(COALESCE(_payment_method, '')));
  IF v_method NOT IN ('card', 'upi') THEN
    RAISE EXCEPTION 'Gateway payments must be card or UPI';
  END IF;

  IF COALESCE(_amount, 0) <= 0 THEN
    RAISE EXCEPTION 'Gateway payment amount must be greater than zero';
  END IF;

  IF trim(COALESCE(_gateway_reference, '')) = '' THEN
    RAISE EXCEPTION 'Gateway reference is required';
  END IF;

  SELECT * INTO v_summary
  FROM public.get_order_payment_summary(v_order.id);

  IF COALESCE(v_summary.paid_amount, 0) + _amount > COALESCE(v_summary.order_total, 0) THEN
    RAISE EXCEPTION 'Gateway payment exceeds order value';
  END IF;

  INSERT INTO public.order_payment_entries (
    order_id,
    owner_id,
    staff_member_id,
    source,
    payment_method,
    amount,
    reference,
    note,
    gateway_payload
  )
  VALUES (
    v_order.id,
    v_order.owner_id,
    NULL,
    'gateway',
    v_method,
    _amount,
    trim(_gateway_reference),
    'Captured from QR payment gateway',
    COALESCE(_gateway_payload, '{}'::jsonb)
  );

  SELECT * INTO v_summary
  FROM public.get_order_payment_summary(v_order.id);

  IF v_summary.is_closed THEN
    SELECT * INTO v_invoice
    FROM public.create_restaurant_invoice(
      v_order.id,
      CASE WHEN array_length(v_summary.payment_methods, 1) = 1 THEN v_summary.payment_methods[1] ELSE 'split' END,
      trim(_gateway_reference),
      'Gateway-settled QR order'
    );

    UPDATE public.orders
    SET
      payment_method = CASE WHEN array_length(v_summary.payment_methods, 1) = 1 THEN v_summary.payment_methods[1] ELSE 'split' END,
      payment_reference = trim(_gateway_reference),
      payment_status = 'confirmed',
      payment_confirmed_at = now(),
      bill_status = 'generated',
      bill_generated_at = COALESCE(bill_generated_at, now()),
      bill_number = v_invoice.invoice_number,
      payment_locked_at = now(),
      payment_lock_reason = 'Gateway settlement recorded',
      qr_gateway_reference = trim(_gateway_reference),
      settled_at = now(),
      updated_at = now()
    WHERE id = v_order.id;
  ELSE
    UPDATE public.orders
    SET
      payment_status = 'partial',
      payment_locked_at = now(),
      payment_lock_reason = 'Gateway settlement recorded',
      qr_gateway_reference = trim(_gateway_reference),
      updated_at = now()
    WHERE id = v_order.id;
  END IF;

  PERFORM public.sync_billing_discrepancy_alert(v_order.id);

  RETURN QUERY
  SELECT
    o.id,
    v_summary.paid_amount,
    v_summary.remaining_amount,
    o.payment_status,
    o.bill_status,
    o.bill_number,
    o.status
  FROM public.orders o
  WHERE o.id = v_order.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_billing_discrepancies()
RETURNS TABLE (
  order_id UUID,
  owner_id UUID,
  client_name TEXT,
  table_number INTEGER,
  order_origin TEXT,
  order_status public.order_status,
  payment_status TEXT,
  total_amount NUMERIC,
  paid_amount NUMERIC,
  remaining_amount NUMERIC,
  last_payment_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH payment_rollup AS (
    SELECT
      ope.order_id,
      COALESCE(SUM(ope.amount), 0) AS paid_amount,
      MAX(ope.created_at) AS last_payment_at
    FROM public.order_payment_entries ope
    GROUP BY ope.order_id
  )
  SELECT
    o.id,
    o.owner_id,
    COALESCE(NULLIF(p.restaurant_name, ''), 'Restaurant') AS client_name,
    o.table_number,
    o.order_origin,
    o.status,
    o.payment_status,
    o.total_amount,
    COALESCE(pr.paid_amount, 0) AS paid_amount,
    GREATEST(o.total_amount - COALESCE(pr.paid_amount, 0), 0) AS remaining_amount,
    pr.last_payment_at
  FROM public.orders o
  LEFT JOIN payment_rollup pr ON pr.order_id = o.id
  LEFT JOIN public.profiles p ON p.user_id = o.owner_id
  WHERE public.is_admin(auth.uid())
    AND o.status <> 'cancelled'
    AND COALESCE(pr.paid_amount, 0) > 0
    AND COALESCE(pr.paid_amount, 0) <> COALESCE(o.total_amount, 0)
  ORDER BY pr.last_payment_at DESC NULLS LAST, o.created_at DESC;
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

  IF v_order.table_id IS NOT NULL THEN
    UPDATE public.restaurant_tables
    SET status = 'free'
    WHERE id = v_order.table_id
      AND status = 'occupied';
  END IF;

  PERFORM public.record_order_wastage(v_order.id, v_reason, NULL);
  PERFORM public.sync_billing_discrepancy_alert(v_order.id);

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
    payment_locked_at = NULL,
    payment_lock_reason = NULL,
    updated_at = now(),
    status = 'cancelled'
  WHERE id = v_order.id;

  IF v_order.table_id IS NOT NULL THEN
    UPDATE public.restaurant_tables
    SET status = 'free'
    WHERE id = v_order.table_id
      AND status = 'occupied';
  END IF;

  PERFORM public.record_order_wastage(v_order.id, v_reason, v_credit_note_id);
  PERFORM public.sync_billing_discrepancy_alert(v_order.id);

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

REVOKE ALL ON FUNCTION public.get_order_payment_summary(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_payment_summary(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.sync_billing_discrepancy_alert(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_billing_discrepancy_alert(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.create_manual_counter_order(UUID, UUID, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_manual_counter_order(UUID, UUID, TEXT, TEXT, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.record_manual_order_payment(UUID, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_manual_order_payment(UUID, TEXT, NUMERIC, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.record_qr_gateway_payment(UUID, TEXT, NUMERIC, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_qr_gateway_payment(UUID, TEXT, NUMERIC, TEXT, JSONB) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_admin_billing_discrepancies() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_billing_discrepancies() TO authenticated;
