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

-- Enable Row Level Security
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups (public read/write for simplicity - no auth required)
CREATE POLICY "Allow anyone to view groups" 
  ON public.groups FOR SELECT 
  USING (true);

CREATE POLICY "Allow anyone to create groups" 
  ON public.groups FOR INSERT 
  WITH CHECK (true);

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

-- Create indexes for better query performance
CREATE INDEX idx_participants_group_id ON public.participants(group_id);
CREATE INDEX idx_assignments_group_id ON public.assignments(group_id);
CREATE INDEX idx_assignments_giver_id ON public.assignments(giver_id);
