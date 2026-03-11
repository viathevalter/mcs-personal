-- Add import_batch_id to worker_benefit_housing to allow reverting imported batches
ALTER TABLE core_personal.worker_benefit_housing ADD COLUMN IF NOT EXISTS import_batch_id UUID;
