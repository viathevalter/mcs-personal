-- =========================================================================
-- MIGRATION: CREATE COMPANY-LOGOS STORAGE BUCKET AND POLICIES
-- =========================================================================

-- Create company-logos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow authenticated uploads to company-logos
DROP POLICY IF EXISTS "Allow authenticated uploads to company-logos" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to company-logos" ON storage.objects 
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-logos');

-- Policy to allow authenticated updates to company-logos
DROP POLICY IF EXISTS "Allow authenticated updates to company-logos" ON storage.objects;
CREATE POLICY "Allow authenticated updates to company-logos" ON storage.objects 
  FOR UPDATE TO authenticated USING (bucket_id = 'company-logos');

-- Policy to allow authenticated deletes to company-logos
DROP POLICY IF EXISTS "Allow authenticated deletes to company-logos" ON storage.objects;
CREATE POLICY "Allow authenticated deletes to company-logos" ON storage.objects 
  FOR DELETE TO authenticated USING (bucket_id = 'company-logos');

-- Policy to allow public select to company-logos
DROP POLICY IF EXISTS "Allow public select to company-logos" ON storage.objects;
CREATE POLICY "Allow public select to company-logos" ON storage.objects 
  FOR SELECT TO public USING (bucket_id = 'company-logos');
