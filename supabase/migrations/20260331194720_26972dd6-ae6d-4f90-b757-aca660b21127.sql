
-- Stock movement history table
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  quantity_changed numeric NOT NULL,
  movement_type text NOT NULL DEFAULT 'order_deduction',
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their stock movements"
  ON public.stock_movements FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert stock movements"
  ON public.stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Update the deduct trigger to also log movements
CREATE OR REPLACE FUNCTION public.deduct_inventory_on_served()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
BEGIN
  IF NEW.status = 'served' AND OLD.status != 'served' THEN
    -- Loop through each ingredient that needs deduction
    FOR r IN
      SELECT ri.ingredient_id, SUM(ri.quantity_used * oi.quantity) AS total_deduct
      FROM public.order_items oi
      JOIN public.recipe_ingredients ri ON ri.menu_item_id = oi.menu_item_id
      WHERE oi.order_id = NEW.id AND ri.owner_id = NEW.owner_id
      GROUP BY ri.ingredient_id
    LOOP
      -- Deduct stock
      UPDATE public.ingredients
      SET current_stock = GREATEST(0, current_stock - r.total_deduct),
          updated_at = now()
      WHERE id = r.ingredient_id AND owner_id = NEW.owner_id;

      -- Log the movement
      INSERT INTO public.stock_movements (owner_id, ingredient_id, order_id, quantity_changed, movement_type, note)
      VALUES (NEW.owner_id, r.ingredient_id, NEW.id, -r.total_deduct, 'order_deduction', 'Auto-deducted on order served');
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
