
-- Restaurant Rooms table (private dining rooms)
CREATE TABLE public.restaurant_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  room_number INTEGER NOT NULL,
  label TEXT,
  status TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'reserved', 'cleaning')),
  qr_generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.restaurant_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their rooms" ON public.restaurant_rooms FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Anyone can view active rooms" ON public.restaurant_rooms FOR SELECT TO public USING (is_active = true);

-- Outlets table (chain management)
CREATE TABLE public.outlets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  manager_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their outlets" ON public.outlets FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
