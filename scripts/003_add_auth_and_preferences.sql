-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Update groups table to add creator_id
ALTER TABLE public.groups 
ADD COLUMN creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Update participants table to link to user profile
ALTER TABLE public.participants 
ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

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

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuario'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX idx_groups_creator_id ON public.groups(creator_id);
CREATE INDEX idx_participants_user_id ON public.participants(user_id);

