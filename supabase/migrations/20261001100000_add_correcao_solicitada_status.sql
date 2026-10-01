-- Migration: Add 'correcao_solicitada' to status_pagamento and support payment settlement
ALTER TYPE core_finance.status_pagamento ADD VALUE IF NOT EXISTS 'correcao_solicitada';

-- Colunas para registrar liquidação bancária e motivo de correção
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS banco_id uuid REFERENCES public.bancos(id);
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS forma_pagamento text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS motivo_correcao text;

-- Bucket para comprovantes e justificantes bancários
INSERT INTO storage.buckets (id, name, public) 
VALUES ('comprovantes-financeiro', 'comprovantes-financeiro', true) 
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public access on comprovantes-financeiro" ON storage.objects;
CREATE POLICY "Public access on comprovantes-financeiro"
ON storage.objects FOR ALL
USING (bucket_id = 'comprovantes-financeiro')
WITH CHECK (bucket_id = 'comprovantes-financeiro');
