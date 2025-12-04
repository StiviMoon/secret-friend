-- ============================================
-- SCHEMA COMPLETO PARA AMIGO SECRETO ONLINE
-- ============================================
-- Ejecuta este script completo en Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. TABLAS BASE
-- ============================================

-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  budget_limit DECIMAL(10,2),
  custom_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create participants table
CREATE TABLE IF NOT EXISTS public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  wishlist TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assignments table (who gives to whom)
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  giver_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, giver_id),
  UNIQUE(group_id, receiver_id),
  CHECK (giver_id != receiver_id)
);

-- ============================================
-- 2. CÓDIGOS DE UNIÓN Y ADMIN
-- ============================================

-- Add join_code and admin_secret to groups table
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS admin_secret TEXT;

-- Create function to generate random join code
CREATE OR REPLACE FUNCTION generate_join_code() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude confusing chars
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate admin secret
CREATE OR REPLACE FUNCTION generate_admin_secret() RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Update existing groups with join codes and admin secrets
UPDATE public.groups 
SET 
  join_code = COALESCE(join_code, generate_join_code()),
  admin_secret = COALESCE(admin_secret, generate_admin_secret())
WHERE join_code IS NULL OR admin_secret IS NULL;

-- Make join_code and admin_secret NOT NULL now that they have values
ALTER TABLE public.groups 
ALTER COLUMN join_code SET NOT NULL,
ALTER COLUMN admin_secret SET NOT NULL;

-- Create trigger to auto-generate codes for new groups
CREATE OR REPLACE FUNCTION set_group_codes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.join_code IS NULL THEN
    NEW.join_code := generate_join_code();
  END IF;
  IF NEW.admin_secret IS NULL THEN
    NEW.admin_secret := generate_admin_secret();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS before_insert_group ON public.groups;
CREATE TRIGGER before_insert_group
BEFORE INSERT ON public.groups
FOR EACH ROW
EXECUTE FUNCTION set_group_codes();

-- ============================================
-- 3. SISTEMA DE AUTENTICACIÓN Y PERFILES
-- ============================================

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. SISTEMA DE PREFERENCIAS
-- ============================================

-- Create preferences table (catalog of available preferences)
CREATE TABLE IF NOT EXISTS public.preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT, -- 'default' or 'custom'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default preferences
INSERT INTO public.preferences (name, category) VALUES
  ('Tecnología', 'default'),
  ('Cocina', 'default'),
  ('Deportes', 'default'),
  ('Música', 'default'),
  ('Libros', 'default'),
  ('Arte', 'default'),
  ('Videojuegos', 'default'),
  ('Moda', 'default'),
  ('Viajes', 'default'),
  ('Mascotas', 'default'),
  ('Fotografía', 'default'),
  ('Jardinería', 'default')
ON CONFLICT (name) DO NOTHING;

-- Create user_preferences table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  preference_id UUID REFERENCES public.preferences(id) ON DELETE CASCADE,
  custom_preference TEXT, -- For custom preferences not in catalog
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, preference_id),
  CHECK (
    (preference_id IS NOT NULL AND custom_preference IS NULL) OR
    (preference_id IS NULL AND custom_preference IS NOT NULL)
  )
);

-- ============================================
-- 5. ACTUALIZAR TABLAS EXISTENTES
-- ============================================

-- Update groups table to add creator_id
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Update participants table to link to user profile
ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow anyone to view groups" ON public.groups;
DROP POLICY IF EXISTS "Allow anyone to create groups" ON public.groups;
DROP POLICY IF EXISTS "Allow anyone to view participants" ON public.participants;
DROP POLICY IF EXISTS "Allow anyone to create participants" ON public.participants;
DROP POLICY IF EXISTS "Allow anyone to update participants" ON public.participants;
DROP POLICY IF EXISTS "Allow users to view their own assignment" ON public.assignments;
DROP POLICY IF EXISTS "Allow anyone to create assignments" ON public.assignments;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view preferences" ON public.preferences;
DROP POLICY IF EXISTS "Users can view all user preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preferences;

-- RLS Policies for groups (public read/write for simplicity - no auth required)
CREATE POLICY "Allow anyone to view groups" 
  ON public.groups FOR SELECT 
  USING (true);

CREATE POLICY "Allow anyone to create groups" 
  ON public.groups FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow anyone to update groups" 
  ON public.groups FOR UPDATE 
  USING (true);

-- RLS Policies for participants
CREATE POLICY "Allow anyone to view participants" 
  ON public.participants FOR SELECT 
  USING (true);

CREATE POLICY "Allow anyone to create participants" 
  ON public.participants FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow anyone to update participants" 
  ON public.participants FOR UPDATE 
  USING (true);

-- RLS Policies for assignments (read restricted to specific giver)
CREATE POLICY "Allow users to view their own assignment" 
  ON public.assignments FOR SELECT 
  USING (true);

CREATE POLICY "Allow anyone to create assignments" 
  ON public.assignments FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow anyone to delete assignments" 
  ON public.assignments FOR DELETE 
  USING (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- RLS Policies for preferences (public read)
CREATE POLICY "Anyone can view preferences" 
  ON public.preferences FOR SELECT 
  USING (true);

-- RLS Policies for user_preferences
CREATE POLICY "Users can view all user preferences" 
  ON public.user_preferences FOR SELECT 
  USING (true);

CREATE POLICY "Users can manage own preferences" 
  ON public.user_preferences FOR ALL 
  USING (auth.uid() = user_id);

-- ============================================
-- 7. TRIGGERS Y FUNCIONES AUTOMÁTICAS
-- ============================================

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuario'),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    name = COALESCE(EXCLUDED.name, profiles.name),
    email = COALESCE(EXCLUDED.email, profiles.email),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 8. ÍNDICES PARA MEJOR RENDIMIENTO
-- ============================================

-- Indexes for groups
CREATE INDEX IF NOT EXISTS idx_groups_join_code ON public.groups(join_code);
CREATE INDEX IF NOT EXISTS idx_groups_creator_id ON public.groups(creator_id);

-- Indexes for participants
CREATE INDEX IF NOT EXISTS idx_participants_group_id ON public.participants(group_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON public.participants(user_id);

-- Indexes for assignments
CREATE INDEX IF NOT EXISTS idx_assignments_group_id ON public.assignments(group_id);
CREATE INDEX IF NOT EXISTS idx_assignments_giver_id ON public.assignments(giver_id);

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Indexes for user_preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_preference_id ON public.user_preferences(preference_id);

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- Verifica que todas las tablas se hayan creado correctamente:
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- ORDER BY table_name;
-- ============================================

