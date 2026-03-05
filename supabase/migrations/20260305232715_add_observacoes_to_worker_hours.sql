-- Add observacoes column to worker_hours table
ALTER TABLE core_personal.worker_hours
ADD COLUMN observacoes text;
