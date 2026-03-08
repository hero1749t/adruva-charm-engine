
-- Add status column to restaurant_tables
CREATE TYPE public.table_status AS ENUM ('free', 'occupied', 'reserved', 'cleaning');

ALTER TABLE public.restaurant_tables
  ADD COLUMN status public.table_status NOT NULL DEFAULT 'free';
