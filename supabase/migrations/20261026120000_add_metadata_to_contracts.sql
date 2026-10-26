-- Add metadata JSONB column to core_personal.contracts for storing termination notice period dates and extra parameters
ALTER TABLE core_personal.contracts
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
