-- Add email to user_roles
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS email text;

-- Backfill existing emails
UPDATE public.user_roles ur
SET email = au.email
FROM auth.users au
WHERE ur.user_id = au.id;

-- Ensure handles_new_user captures email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, email, role)
  VALUES (new.id, new.email, 'visualizador')
  ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email;
  RETURN new;
END;
$$;
