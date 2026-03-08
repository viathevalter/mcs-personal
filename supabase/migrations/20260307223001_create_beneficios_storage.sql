-- Create the storage bucket for benefits documents
INSERT INTO storage.buckets (id, name, public) VALUES ('beneficios-docs', 'beneficios-docs', false) ON CONFLICT (name) DO NOTHING;

-- Set up Storage Policies for the bucket
-- Allow authenticated admins to insert and read documents
CREATE POLICY "Admins can insert documents in beneficios-docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'beneficios-docs' AND
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_rh', 'operador'))
);

CREATE POLICY "Admins can view documents in beneficios-docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'beneficios-docs' AND
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_rh', 'operador'))
);
