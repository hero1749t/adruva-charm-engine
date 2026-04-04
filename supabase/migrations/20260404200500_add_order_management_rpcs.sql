-- Additional RPC functions needed for system operations

-- Function: Advance order status  
CREATE OR REPLACE FUNCTION advance_order_status(
  _order_id UUID,
  _next_status VARCHAR
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
  -- Get order and verify ownership
  SELECT owner_id, status INTO v_owner_id, v_current_status
  FROM orders WHERE id = _order_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Order not found'::TEXT, NULL::VARCHAR;
    RETURN;
  END IF;
  
  -- Validate status transition
  IF v_current_status = 'new' AND _next_status != 'accepted' THEN
    RETURN QUERY SELECT FALSE, 'New orders must go to accepted state'::TEXT, v_current_status::VARCHAR;
    RETURN;
  END IF;
  
  IF v_current_status = 'accepted' AND _next_status != 'preparing' THEN
    RETURN QUERY SELECT FALSE, 'Accepted orders must go to preparing state'::TEXT, v_current_status::VARCHAR;
    RETURN;
  END IF;
  
  IF v_current_status = 'preparing' AND _next_status != 'ready' THEN
    RETURN QUERY SELECT FALSE, 'Preparing orders must go to ready state'::TEXT, v_current_status::VARCHAR;
    RETURN;
  END IF;
  
  IF v_current_status = 'ready' AND _next_status != 'served' THEN
    RETURN QUERY SELECT FALSE, 'Ready orders must go to served state'::TEXT, v_current_status::VARCHAR;
    RETURN;
  END IF;
  
  -- Update order status
  UPDATE orders 
  SET status = _next_status, updated_at = NOW()
  WHERE id = _order_id;
  
  RETURN QUERY SELECT TRUE, 'Order status updated'::TEXT, _next_status::VARCHAR;
END;
$$;

-- Function: Deduct inventory when order is placed
CREATE OR REPLACE FUNCTION deduct_inventory_on_order(
  p_order_id UUID,
  p_owner_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item RECORD;
  v_current_stock INT;
BEGIN
  -- For each item in the order, deduct from inventory
  FOR v_item IN 
    SELECT oi.menu_item_id, oi.quantity, mi.current_stock
    FROM order_items oi
    JOIN menu_items mi ON oi.menu_item_id = mi.id
    WHERE oi.order_id = p_order_id AND mi.owner_id = p_owner_id
  LOOP
    -- Check stock
    IF v_item.current_stock < v_item.quantity THEN
      RETURN QUERY SELECT FALSE, 'Insufficient stock for item: ' || v_item.menu_item_id::TEXT;
      RETURN;
    END IF;
    
    -- Deduct inventory
    UPDATE menu_items 
    SET current_stock = current_stock - v_item.quantity
    WHERE id = v_item.menu_item_id;
  END LOOP;
  
  -- Mark inventory as deducted
  UPDATE orders SET inventory_deducted = TRUE WHERE id = p_order_id;
  
  RETURN QUERY SELECT TRUE, 'Inventory deducted successfully';
END;
$$;

-- Function: Check payment status and update order if completed
CREATE OR REPLACE FUNCTION check_and_confirm_payment(
  p_order_id UUID,
  p_payment_id VARCHAR
)
RETURNS TABLE (
  success BOOLEAN,
  order_status VARCHAR,
  payment_status VARCHAR
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_payment_status VARCHAR;
  v_payment_method VARCHAR;
BEGIN
  -- Get payment status
  SELECT payment_status, payment_method 
  INTO v_payment_status, v_payment_method
  FROM payments WHERE id = p_payment_id::UUID OR payment_id_external = p_payment_id;
  
  IF v_payment_status = 'completed' THEN
    -- Update order to paid status
    UPDATE orders 
    SET status = 'accepted', payment_status = 'completed', updated_at = NOW()
    WHERE id = p_order_id;
    
    RETURN QUERY SELECT TRUE, 'accepted'::VARCHAR, 'completed'::VARCHAR;
  ELSIF v_payment_status = 'failed' THEN
    RETURN QUERY SELECT FALSE, 'new'::VARCHAR, 'failed'::VARCHAR;
  ELSE
    RETURN QUERY SELECT FALSE, 'new'::VARCHAR, 'pending'::VARCHAR;
  END IF;
END;
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION advance_order_status TO authenticated;
GRANT EXECUTE ON FUNCTION deduct_inventory_on_order TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_confirm_payment TO authenticated;

-- Grant to anon for payment webhooks
GRANT EXECUTE ON FUNCTION check_and_confirm_payment TO anon;
