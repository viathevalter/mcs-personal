-- Adiciona a etapa "Ligação" (Llamada) como etapa 5 no Kanban da Génio Montagens (Ayslan),
-- reordena as etapas subsequentes (6..9) e limpa a marcação antiga de [DESCADASTRADO]
-- movendo o lead Talleres ECI Calderería S.L para a nova etapa "Ligação".

DO $$
DECLARE
  v_genio_id UUID := '4a507974-f922-409f-83c0-9ef8cbf982cb';
  v_lead_id  UUID := '38747910-38c2-4d6e-bf7a-a380a691cc9b';
  v_ligacao_stage_id UUID;
BEGIN
  -- Verifica se já existe etapa Ligação/Llamada na Génio
  SELECT id INTO v_ligacao_stage_id
  FROM core_comercial.kanban_stages
  WHERE empresa_id = v_genio_id
    AND (LOWER(name) LIKE '%liga%' OR LOWER(COALESCE(name_es, '')) LIKE '%llamad%')
  LIMIT 1;

  IF v_ligacao_stage_id IS NULL THEN
    -- Desloca etapas da posição 5 em diante (+1) para abrir a posição 5
    UPDATE core_comercial.kanban_stages
    SET order_index = order_index + 1
    WHERE empresa_id = v_genio_id
      AND order_index >= 5;

    INSERT INTO core_comercial.kanban_stages (
      empresa_id,
      name,
      name_es,
      color,
      order_index,
      is_system
    ) VALUES (
      v_genio_id,
      'Ligação',
      'Llamada',
      '#ffdd00',
      5,
      true
    )
    RETURNING id INTO v_ligacao_stage_id;
  END IF;

  -- Limpa [DESCADASTRADO] e observação antiga de opt-out de setembro no lead Talleres ECI
  -- e move para a etapa 5 (Ligação)
  UPDATE core_comercial.leads
  SET
    name = TRIM(REGEXP_REPLACE(name, '^\[DESCADASTRADO\]\s*', '', 'i')),
    notes = NULLIF(
      TRIM(
        REGEXP_REPLACE(
          COALESCE(notes, ''),
          '\s*\[Opt-out via e-mail comercial em [^\]]+\]\s*',
          '',
          'gi'
        )
      ),
      ''
    ),
    stage_id = v_ligacao_stage_id,
    updated_at = NOW()
  WHERE id = v_lead_id;
END $$;
