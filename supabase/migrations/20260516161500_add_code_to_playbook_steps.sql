-- ========================================================================================
-- MIGRATION: ADD CODE TO PLAYBOOK_STEPS
-- Objetivo: Facilitar o seed idempotente e o mapeamento de dependências entre steps.
-- ========================================================================================

BEGIN;

-- Adiciona a coluna code se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'core_operacoes' AND table_name = 'playbook_steps' AND column_name = 'code') THEN
        ALTER TABLE core_operacoes.playbook_steps ADD COLUMN code VARCHAR;
    END IF;
END $$;

-- Preenche um valor padrão temporário para registros existentes (se houver algum)
UPDATE core_operacoes.playbook_steps SET code = id::varchar WHERE code IS NULL;

-- Torna a coluna NOT NULL
ALTER TABLE core_operacoes.playbook_steps ALTER COLUMN code SET NOT NULL;

-- Garante que o code seja único por Playbook
ALTER TABLE core_operacoes.playbook_steps DROP CONSTRAINT IF EXISTS uq_playbook_step_code;
ALTER TABLE core_operacoes.playbook_steps ADD CONSTRAINT uq_playbook_step_code UNIQUE (playbook_id, code);

COMMIT;
