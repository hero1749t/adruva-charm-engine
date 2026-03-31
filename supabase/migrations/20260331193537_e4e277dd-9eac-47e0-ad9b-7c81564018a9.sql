
CREATE OR REPLACE FUNCTION public.deduct_inventory_on_served()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only run when status changes to 'served'
  IF NEW.status = 'served' AND OLD.status != 'served' THEN
    UPDATE public.ingredients
    SET current_stock = GREATEST(0, current_stock - (
      SELECT COALESCE(SUM(ri.quantity_used * oi.quantity), 0)
      FROM public.order_items oi
      JOIN public.recipe_ingredients ri ON ri.menu_item_id = oi.menu_item_id
      WHERE oi.order_id = NEW.id
        AND ri.ingredient_id = ingredients.id
        AND ri.owner_id = NEW.owner_id
    )),
    updated_at = now()
    WHERE owner_id = NEW.owner_id
      AND id IN (
        SELECT ri.ingredient_id
        FROM public.order_items oi
        JOIN public.recipe_ingredients ri ON ri.menu_item_id = oi.menu_item_id
        WHERE oi.order_id = NEW.id AND ri.owner_id = NEW.owner_id
      );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deduct_inventory_on_served
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_inventory_on_served();
