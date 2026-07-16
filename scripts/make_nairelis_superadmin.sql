-- 1. Update mcs_users
UPDATE public.mcs_users 
SET role = 'super_admin' 
WHERE id = '94b58b31-b6a7-41e1-9fca-b83aade7cf1b';

-- 2. Update user_roles
INSERT INTO public.user_roles (user_id, role, email)
VALUES ('94b58b31-b6a7-41e1-9fca-b83aade7cf1b', 'super_admin', 'nairelis@gestaologinpro.com')
ON CONFLICT (user_id) DO UPDATE 
SET role = EXCLUDED.role, email = EXCLUDED.email;

-- 3. Update profiles
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE id = '94b58b31-b6a7-41e1-9fca-b83aade7cf1b';
