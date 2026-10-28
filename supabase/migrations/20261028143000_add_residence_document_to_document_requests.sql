-- Adiciona suporte a documento de residência europeia (NIE / Título de Residência)
ALTER TABLE core_personal.document_requests 
ADD COLUMN IF NOT EXISTS residence_url text;

ALTER TABLE core_personal.document_requests 
ADD COLUMN IF NOT EXISTS tiene_residencia_ue boolean DEFAULT true;
