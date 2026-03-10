ALTER TABLE core_personal.holerite_eventos 
ADD COLUMN IF NOT EXISTS import_batch_id UUID;
