-- Creates the app_role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin_rh', 'operador', 'visualizador');

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'visualizador',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Turn on RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Helper function to get the current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.app_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- RLS Policies for user_roles
-- Users can read their own role
CREATE POLICY "Users can view their own role" 
ON public.user_roles FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Only super_admins can see all roles
CREATE POLICY "Super admins can view all roles" 
ON public.user_roles FOR SELECT 
TO authenticated 
USING (public.get_my_role() = 'super_admin');

-- Only super_admins can insert roles
CREATE POLICY "Super admins can insert roles" 
ON public.user_roles FOR INSERT 
TO authenticated 
WITH CHECK (public.get_my_role() = 'super_admin');

-- Only super_admins can update roles
CREATE POLICY "Super admins can update roles" 
ON public.user_roles FOR UPDATE 
TO authenticated 
USING (public.get_my_role() = 'super_admin');

-- Only super_admins can delete roles
CREATE POLICY "Super admins can delete roles" 
ON public.user_roles FOR DELETE 
TO authenticated 
USING (public.get_my_role() = 'super_admin');

-- Automatic trigger to assign 'visualizador' role to new users (optional, helps keep data in sync)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'visualizador');
  RETURN new;
END;
$$;

-- Trigger on auth.users requires superuser to create, standard flow is just letting the admin app manage roles.
-- But we can add the trigger anyway.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- We also need to assign a default super_admin to whoever creates this first, but that depends on the user's specific setup.
-- The user will execute this SQL and then manually set their own user to super_admin in Supabase Studio.

-- Example of securing a core_personal table based on role (We will update this later in another script or manually by the user if it's too complex now)
-- Let's say for basic tables like `worker_hours`:
-- CREATE POLICY "allow_update_worker_hours" ON core_personal.worker_hours FOR UPDATE TO authenticated USING (public.get_my_role() IN ('super_admin', 'admin_rh', 'operador'));
-- CREATE POLICY "allow_delete_worker_hours" ON core_personal.worker_hours FOR DELETE TO authenticated USING (public.get_my_role() = 'super_admin');
