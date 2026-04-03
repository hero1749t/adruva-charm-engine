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
    FOR r IN
      WITH ordered_components AS (
        SELECT
          oi.order_id,
          oi.menu_item_id,
          oi.quantity::numeric AS effective_quantity
        FROM public.order_items oi
        WHERE oi.order_id = NEW.id
          AND oi.menu_item_id IS NOT NULL

        UNION ALL

        SELECT
          oi.order_id,
          ci.menu_item_id,
          (oi.quantity * ci.quantity)::numeric AS effective_quantity
        FROM public.order_items oi
        JOIN public.combo_items ci ON ci.combo_id = oi.combo_id
        WHERE oi.order_id = NEW.id
          AND oi.combo_id IS NOT NULL
      )
      SELECT
        ri.ingredient_id,
        SUM(ri.quantity_used * oc.effective_quantity) AS total_deduct
      FROM ordered_components oc
      JOIN public.recipe_ingredients ri ON ri.menu_item_id = oc.menu_item_id
      WHERE ri.owner_id = NEW.owner_id
      GROUP BY ri.ingredient_id
    LOOP
      UPDATE public.ingredients
      SET current_stock = GREATEST(0, current_stock - r.total_deduct),
          updated_at = now()
      WHERE id = r.ingredient_id
        AND owner_id = NEW.owner_id;

      INSERT INTO public.stock_movements (
        owner_id,
        ingredient_id,
        order_id,
        quantity_changed,
        movement_type,
        note
      )
      VALUES (
        NEW.owner_id,
        r.ingredient_id,
        NEW.id,
        -r.total_deduct,
        'order_deduction',
        'Auto-deducted on order served'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;
