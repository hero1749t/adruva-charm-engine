ALTER TABLE public.menu_categories
ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS original_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS gst_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_type TEXT NOT NULL DEFAULT 'inclusive',
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER,
ADD COLUMN IF NOT EXISTS available_from TIME,
ADD COLUMN IF NOT EXISTS available_to TIME;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'menu_items_tax_type_check'
  ) THEN
    ALTER TABLE public.menu_items
    ADD CONSTRAINT menu_items_tax_type_check
    CHECK (tax_type IN ('inclusive', 'exclusive'));
  END IF;
END $$;
