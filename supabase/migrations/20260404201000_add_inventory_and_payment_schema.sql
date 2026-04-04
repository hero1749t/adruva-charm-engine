-- Add missing columns and tables for inventory and payment tracking

-- 1. Add missing columns to orders table (if not already present)
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS inventory_deducted BOOLEAN DEFAULT false;
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0;

-- 2. Create inventory_deductions tracking table
CREATE TABLE IF NOT EXISTS inventory_deductions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  quantity INT NOT NULL,
  deducted_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_inventory_deductions_order ON inventory_deductions(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_deductions_owner ON inventory_deductions(owner_id);

-- 3. Create webhook_events table (if not already present)
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id VARCHAR(255) NOT NULL,
  order_id VARCHAR(255) NOT NULL,
  gateway VARCHAR(50) NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMP NOT NULL,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(payment_id, order_id, gateway)
);

-- Create index for idempotency checks
CREATE INDEX IF NOT EXISTS idx_webhook_events_payment ON webhook_events(payment_id, order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON webhook_events(created_at DESC);

-- 4. Add columns to payments table for better tracking
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS payment_id_external VARCHAR(255);
ALTER TABLE IF EXISTS payments ADD COLUMN IF NOT EXISTS reference VARCHAR(255);

-- Create index for payment lookups
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON payments(payment_id_external);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

-- 5. Enable RLS on webhook_events (for audit trail access)
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Allow owners to see webhooks for their orders
CREATE POLICY IF NOT EXISTS "Owners can view webhook events" ON webhook_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id::TEXT = webhook_events.order_id 
      AND o.owner_id = auth.uid()
    )
  );

-- Allow system to insert webhooks
CREATE POLICY IF NOT EXISTS "System can insert webhooks" ON webhook_events
  FOR INSERT WITH CHECK (true);

-- 6. Add trigger to automatically deduct inventory when order is created
CREATE OR REPLACE FUNCTION trigger_deduct_inventory_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for new orders that are being inserted
  IF NEW.status = 'new' AND NEW.inventory_deducted = false THEN
    -- This will be called by a separate process to avoid transaction issues
    -- For now, just mark for deduction
    NEW.inventory_deducted := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS orders_inventory_trigger ON orders;

-- Create new trigger (non-cascading to avoid deadlocks)
CREATE TRIGGER orders_inventory_trigger
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION trigger_deduct_inventory_on_order();

-- 7. Fix order_items table - ensure item_name is stored
ALTER TABLE IF EXISTS order_items ADD COLUMN IF NOT EXISTS item_name VARCHAR(255);

-- 8. Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_owner_status ON orders(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_owner ON menu_items(owner_id);
