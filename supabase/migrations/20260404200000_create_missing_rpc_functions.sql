-- Create missing RPC functions for order and payment management
-- This migration adds critical functions that cashier dashboard needs

-- Function 1: Create manual counter order
CREATE OR REPLACE FUNCTION create_manual_counter_order(
  p_owner_id UUID,
  p_customer_name TEXT,
  p_table_number INT DEFAULT NULL,
  p_order_items JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  order_id UUID,
  order_number TEXT,
  status_code VARCHAR,
  total_amount DECIMAL,
  tax_amount DECIMAL
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_total_amount DECIMAL;
  v_tax_amount DECIMAL;
  v_subtotal DECIMAL := 0;
  v_item JSONB;
  v_menu_item_id UUID;
  v_item_quantity INT;
  v_item_price DECIMAL;
BEGIN
  -- Generate unique order number
  v_order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDDHH24MISS') || '-' || LPAD((RANDOM() * 9999)::INT::TEXT, 4, '0');
  
  -- Create order
  v_order_id := gen_random_uuid();
  
  -- Calculate total from items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
  LOOP
    v_menu_item_id := (v_item->>'menu_item_id')::UUID;
    v_item_quantity := (v_item->>'quantity')::INT;
    
    -- Get menu item price
    SELECT price INTO v_item_price FROM menu_items 
    WHERE id = v_menu_item_id AND owner_id = p_owner_id;
    
    v_subtotal := v_subtotal + (COALESCE(v_item_price, 0) * v_item_quantity);
  END LOOP;
  
  -- Calculate tax (5%)
  v_tax_amount := v_subtotal * 0.05;
  v_total_amount := v_subtotal + v_tax_amount;
  
  -- Insert order
  INSERT INTO orders (
    id, owner_id, order_number, customer_name, table_number,
    status, subtotal, tax_amount, total_amount, order_type, created_at
  ) VALUES (
    v_order_id, p_owner_id, v_order_number, p_customer_name, p_table_number,
    'new', v_subtotal, v_tax_amount, v_total_amount, 'counter', NOW()
  );
  
  -- Insert order items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
  LOOP
    v_menu_item_id := (v_item->>'menu_item_id')::UUID;
    v_item_quantity := (v_item->>'quantity')::INT;
    
    SELECT price INTO v_item_price FROM menu_items 
    WHERE id = v_menu_item_id AND owner_id = p_owner_id;
    
    INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, created_at)
    VALUES (v_order_id, v_menu_item_id, v_item_quantity, COALESCE(v_item_price, 0), NOW());
  END LOOP;
  
  RETURN QUERY SELECT v_order_id, v_order_number, 'new'::VARCHAR, v_total_amount, v_tax_amount;
END;
$$;

-- Function 2: Record manual order payment
CREATE OR REPLACE FUNCTION record_manual_order_payment(
  p_owner_id UUID,
  p_order_id UUID,
  p_amount_paid DECIMAL,
  p_payment_method VARCHAR,
  p_reference TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  order_status VARCHAR,
  remaining_amount DECIMAL
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order_total DECIMAL;
  v_paid_so_far DECIMAL;
  v_remaining DECIMAL;
  v_order_status VARCHAR;
BEGIN
  -- Get order total and current paid amount
  SELECT total_amount, COALESCE(amount_paid, 0)
  INTO v_order_total, v_paid_so_far
  FROM orders WHERE id = p_order_id AND owner_id = p_owner_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Order not found', NULL::VARCHAR, NULL::DECIMAL;
    RETURN;
  END IF;
  
  -- Calculate remaining
  v_remaining := v_order_total - (v_paid_so_far + p_amount_paid);
  
  -- Determine new status
  IF v_remaining <= 0 THEN
    v_order_status := 'paid';
  ELSE
    v_order_status := 'partial_payment';
  END IF;
  
  -- Record payment
  INSERT INTO payments (
    id, order_id, amount, payment_method, payment_status, reference, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), p_order_id, p_amount_paid, p_payment_method, 'completed', p_reference, NOW(), NOW()
  );
  
  -- Update order
  UPDATE orders 
  SET amount_paid = amount_paid + p_amount_paid,
      status = v_order_status,
      updated_at = NOW()
  WHERE id = p_order_id;
  
  RETURN QUERY SELECT TRUE, 'Payment recorded', v_order_status::VARCHAR, GREATEST(v_remaining, 0);
END;
$$;

-- Function 3: Revert order payment
CREATE OR REPLACE FUNCTION revert_order_payment(
  p_owner_id UUID,
  p_order_id UUID,
  p_payment_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  order_status VARCHAR
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_paid DECIMAL;
  v_payment_amount DECIMAL;
BEGIN
  -- Get payment amount
  SELECT COALESCE(SUM(amount), 0)
  INTO v_payment_amount
  FROM payments WHERE id = p_payment_id AND order_id = p_order_id;
  
  IF v_payment_amount = 0 THEN
    RETURN QUERY SELECT FALSE, 'Payment not found', NULL::VARCHAR;
    RETURN;
  END IF;
  
  -- Delete payment
  DELETE FROM payments WHERE id = p_payment_id;
  
  -- Update order back to 'new'
  UPDATE orders 
  SET amount_paid = amount_paid - v_payment_amount,
      status = 'new',
      updated_at = NOW()
  WHERE id = p_order_id AND owner_id = p_owner_id;
  
  RETURN QUERY SELECT TRUE, 'Payment reverted', 'new'::VARCHAR;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_manual_counter_order TO authenticated;
GRANT EXECUTE ON FUNCTION record_manual_order_payment TO authenticated;
GRANT EXECUTE ON FUNCTION revert_order_payment TO authenticated;
