-- Add missing fields to housing benefit matching new requirements
ALTER TABLE core_personal.worker_benefit_housing 
  RENAME COLUMN allowance_amount TO monthly_amount;

ALTER TABLE core_personal.worker_benefit_housing 
  ADD COLUMN start_date date,
  ADD COLUMN end_date date,
  ADD COLUMN proration_method text;

-- Add required fields for complete ledger entries handling
ALTER TABLE core_personal.worker_ledger_entries
  ADD COLUMN competence_year integer,
  ADD COLUMN competence_month integer,
  ADD COLUMN reference_type text,
  ADD COLUMN reference_id uuid,
  ADD COLUMN status text DEFAULT 'pending';

-- Add additional missing fields to ledger_types
ALTER TABLE core_personal.ledger_types
  ADD COLUMN direction text DEFAULT 'credit',
  ADD COLUMN is_active boolean DEFAULT true;

-- Rename code to type_code in ledger_types
ALTER TABLE core_personal.ledger_types
  RENAME COLUMN code TO type_code;
