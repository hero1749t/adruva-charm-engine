-- Post-deploy verification for public-access hardening and secure order flow.
-- Run this in Supabase SQL editor after migrations are applied.

-- 1. Confirm required RPCs exist
select
  n.nspname as schema_name,
  p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'claim_staff_invitation',
    'get_public_restaurant_profile',
    'get_public_menu_customization',
    'get_public_order_tracking',
    'get_public_order_receipt',
    'validate_public_coupon',
    'place_public_order'
  )
order by p.proname;

-- 2. Confirm dangerous broad public policies are gone
select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public'
  and policyname in (
    'Public can view all profiles',
    'Anyone can view restaurant public info',
    'Anyone can view active coupons',
    'Anyone can read coupon usage for validation',
    'Anyone can insert coupon usage',
    'Anyone can view menu customization',
    'Anyone can view tags',
    'Anyone can view item tags',
    'Anyone can view variant groups',
    'Anyone can view variant options',
    'Anyone can view addon groups',
    'Anyone can view addon options',
    'Anyone can view item addon links',
    'Anyone can view combo items',
    'Anyone can view their order by id',
    'Anyone can view order items',
    'Anyone can create orders',
    'Anyone can create orders with valid owner',
    'Anyone can create order items',
    'Anyone can create order items for existing orders'
  )
order by tablename, policyname;

-- 3. Confirm order_items schema supports combos safely
select
  column_name,
  is_nullable,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'order_items'
  and column_name in ('menu_item_id', 'combo_id')
order by column_name;

select
  conname as constraint_name,
  pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'order_items'
  and conname = 'order_items_menu_or_combo_check';

-- 4. Confirm secure public-facing policies still exist
select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public'
  and policyname in (
    'Public can view tags linked to public menu items',
    'Public can view tag links for public menu items',
    'Public can view variant groups for public menu items',
    'Public can view variant options for public menu items',
    'Public can view addon groups linked to public menu items',
    'Public can view addon options linked to public menu items',
    'Public can view addon links for public menu items',
    'Public can view combo items for available combos'
  )
order by tablename, policyname;

-- 5. Confirm inventory trigger function is the latest combo-aware version
select
  proname,
  pg_get_functiondef(p.oid) like '%JOIN public.combo_items ci ON ci.combo_id = oi.combo_id%' as supports_combo_items
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname = 'deduct_inventory_on_served';

-- 6. Helpful sanity counts
select
  count(*) filter (where combo_id is not null) as combo_order_lines,
  count(*) filter (where menu_item_id is not null) as menu_item_order_lines
from public.order_items;
