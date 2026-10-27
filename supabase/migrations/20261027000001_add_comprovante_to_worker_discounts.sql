-- Add comprovante_url and comprovante_nome to worker_discounts (public & core_personal schemas)
ALTER TABLE IF EXISTS public.worker_discounts
ADD COLUMN IF NOT EXISTS comprovante_url TEXT,
ADD COLUMN IF NOT EXISTS comprovante_nome TEXT;

ALTER TABLE IF EXISTS core_personal.worker_discounts
ADD COLUMN IF NOT EXISTS comprovante_url TEXT,
ADD COLUMN IF NOT EXISTS comprovante_nome TEXT;

NOTIFY pgrst, 'reload schema';
