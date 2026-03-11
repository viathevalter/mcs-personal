-- Add import_batch_id to worker_beneficios_settings for tracking batch imports of bank accounts
ALTER TABLE core_personal.worker_beneficios_settings 
ADD COLUMN IF NOT EXISTS import_batch_id UUID NULL;

-- Create an index to quickly find rows by batch_id when reverting
CREATE INDEX IF NOT EXISTS idx_worker_beneficios_settings_import_batch_id ON core_personal.worker_beneficios_settings(import_batch_id);
