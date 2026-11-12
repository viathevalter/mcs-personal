-- 1. Atualizar trigger de proteção de estágios para impedir que leads [DESCADASTRADO] / Opt-out em Perdido/Desvinculado (8) voltem para E-mail Lido/Clicado (3)
CREATE OR REPLACE FUNCTION core_comercial.fn_protect_engaged_lead_stage()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  old_order_index INT := 0;
  new_order_index INT := 0;
BEGIN
  IF OLD.stage_id IS NOT DISTINCT FROM NEW.stage_id THEN
    RETURN NEW;
  END IF;

  IF OLD.stage_id IS NOT NULL THEN
    SELECT order_index INTO old_order_index
    FROM core_comercial.kanban_stages
    WHERE id = OLD.stage_id;
  END IF;

  IF NEW.stage_id IS NOT NULL THEN
    SELECT order_index INTO new_order_index
    FROM core_comercial.kanban_stages
    WHERE id = NEW.stage_id;
  END IF;

  -- Regra 1: Se o lead já alcançou estágio >= 3 e tentarem regredi-lo para <= 2, preserva o estágio engajado
  IF old_order_index >= 3 AND new_order_index < old_order_index AND new_order_index <= 2 THEN
    NEW.stage_id := OLD.stage_id;
  END IF;

  -- Regra 2: Se o lead está DESCADASTRADO / Opt-out em Perdido / Desvinculado (>= 8), bloqueia retorno automático para E-mail Lido / Clicado (3)
  IF (COALESCE(NEW.name, '') LIKE '[DESCADASTRADO]%' OR COALESCE(NEW.notes, '') LIKE '%[Opt-out%')
     AND old_order_index >= 8 AND new_order_index = 3 THEN
    NEW.stage_id := OLD.stage_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Restaurar os 54 leads da Itália (Giada) que sofreram falso opt-out automático por scanners anti-spam corporativos (en-US '11/12/2026' em ~30-77s após o envio),
-- preservando integralmente os opt-outs humanos reais ('12/11/2026').
ALTER TABLE core_comercial.leads DISABLE TRIGGER trg_protect_engaged_lead_stage;

UPDATE core_comercial.leads
SET
  name = BTRIM(REGEXP_REPLACE(name, '^\[DESCADASTRADO\]\s*', '')),
  notes = NULLIF(BTRIM(REPLACE(COALESCE(notes, ''), '[Opt-out via e-mail comercial em 11/12/2026]', '')), ''),
  stage_id = '2b19d5b9-ea3d-489d-9225-8328a3c1358d',
  updated_at = NOW()
WHERE assigned_to = '76f9a2f5-116a-456e-a7d9-9a6a0401ac65'
  AND notes LIKE '%[Opt-out via e-mail comercial em 11/12/2026]%';

ALTER TABLE core_comercial.leads ENABLE TRIGGER trg_protect_engaged_lead_stage;
