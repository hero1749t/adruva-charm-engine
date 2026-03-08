ALTER TABLE public.customer_reviews ADD COLUMN owner_reply text DEFAULT NULL;
ALTER TABLE public.customer_reviews ADD COLUMN replied_at timestamp with time zone DEFAULT NULL;