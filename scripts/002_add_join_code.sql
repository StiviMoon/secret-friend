-- Add join_code and admin_secret to groups table
ALTER TABLE public.groups 
ADD COLUMN join_code TEXT UNIQUE,
ADD COLUMN admin_secret TEXT;

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
  join_code = generate_join_code(),
  admin_secret = generate_admin_secret()
WHERE join_code IS NULL;

-- Make join_code and admin_secret NOT NULL now that they have values
ALTER TABLE public.groups 
ALTER COLUMN join_code SET NOT NULL,
ALTER COLUMN admin_secret SET NOT NULL;

-- Create index for quick lookup
CREATE INDEX idx_groups_join_code ON public.groups(join_code);

-- Update groups table to auto-generate codes for new groups
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

CREATE TRIGGER before_insert_group
BEFORE INSERT ON public.groups
FOR EACH ROW
EXECUTE FUNCTION set_group_codes();
