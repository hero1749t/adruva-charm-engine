
-- Drop overly permissive INSERT policies and replace with scoped ones
DROP POLICY "Anyone can create orders" ON public.orders;
DROP POLICY "Anyone can create order items" ON public.order_items;

-- Orders: allow anonymous inserts but require owner_id to be set (not null constraint handles this)
CREATE POLICY "Anyone can create orders with valid owner" ON public.orders 
FOR INSERT WITH CHECK (owner_id IS NOT NULL AND table_number IS NOT NULL);

-- Order items: allow inserts only if order exists
CREATE POLICY "Anyone can create order items for existing orders" ON public.order_items 
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id)
);
