-- Critical function: Process order + payment + inventory atomically
-- This is called AFTER payment is confirmed by webhook

CREATE OR REPLACE FUNCTION process_order_payment(
  p_order_id UUID,
  p_payment_method VARCHAR,
  p_amount_paise INT,
  p_gateway_reference VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_status VARCHAR
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_owner_id UUID;
  v_current_status VARCHAR;
BEGIN
  -- Get order and verify
  SELECT owner_id, status 
  INTO v_owner_id, v_current_status
  FROM orders WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Order not found'::TEXT, NULL::VARCHAR;
    RETURN;
  END IF;

  -- Start transaction
  BEGIN
    -- 1. Record payment
    INSERT INTO payments (
      id, order_id, amount, payment_method, payment_status,
      payment_id_external, reference, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), p_order_id, p_amount_paise / 100.0,
      p_payment_method, 'completed',
      p_gateway_reference, p_gateway_reference, NOW(), NOW()
    );

    -- 2. Update order status (move to kitchen)
    UPDATE orders 
    SET status = 'accepted',
        payment_status = 'completed',
        amount_paid = p_amount_paise / 100.0,
        inventory_deducted = true,
        updated_at = NOW()
    WHERE id = p_order_id;

    -- 3. Deduct inventory for each item
    UPDATE menu_items mi
    SET current_stock = current_stock - oi.quantity
    FROM order_items oi
    WHERE oi.order_id = p_order_id
      AND mi.id = oi.menu_item_id;

    RETURN QUERY SELECT TRUE, 'Payment processed and order sent to kitchen'::TEXT, 'accepted'::VARCHAR;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM::TEXT, v_current_status::VARCHAR;
  END;
END;
$$;

-- Function: Mark order as paid in abandonment tracking
CREATE OR REPLACE FUNCTION mark_order_paid_from_tracking(
  p_order_id UUID,
  p_paid_at TIMESTAMP
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE order_abandonment_tracking
  SET is_paid = true, paid_at = p_paid_at, updated_at = NOW()
  WHERE order_id = p_order_id;
  
  RETURN QUERY SELECT TRUE, 'Abandonment tracking updated'::TEXT;
EXCEPTION WHEN OTHERS THEN
  -- Non-critical, don't fail
  RETURN QUERY SELECT FALSE, SQLERRM::TEXT;
END;
$$;

-- Function: Create payment link (wrapper for webhook)
CREATE OR REPLACE FUNCTION create_payment_link_rpc(
  p_order_id UUID,
  p_owner_id UUID,
  p_amount DECIMAL,
  p_customer_name VARCHAR,
  p_customer_phone VARCHAR,
  p_customer_email VARCHAR
)
RETURNS TABLE (
  success BOOLEAN,
  payment_url VARCHAR,
  qr_code TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Insert payment link token for tracking
  INSERT INTO payment_link_tokens (
    id, owner_id, order_id, amount, customer_phone, customer_email,
    status, created_at
  ) VALUES (
    gen_random_uuid(), p_owner_id, p_order_id, p_amount,
    p_customer_phone, p_customer_email, 'active', NOW()
  );
  
  -- Return mock payment URL (real integration happens in Edge Function)
  RETURN QUERY SELECT 
    TRUE,
    'https://razorpay.com/i/' || gen_random_uuid()::TEXT,
    'https://api.example.com/qr/' || p_order_id::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, NULL::VARCHAR, NULL::TEXT;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_order_payment TO authenticated;
GRANT EXECUTE ON FUNCTION mark_order_paid_from_tracking TO authenticated;
GRANT EXECUTE ON FUNCTION create_payment_link_rpc TO authenticated;
GRANT EXECUTE ON FUNCTION process_order_payment TO anon;
GRANT EXECUTE ON FUNCTION mark_order_paid_from_tracking TO anon;
