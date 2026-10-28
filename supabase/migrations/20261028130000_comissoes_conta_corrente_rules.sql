-- Migration: Comissões de Vendedores & Conta Corrente (Regras €30 Novo Cliente, €20 Contratação, 15 Dias Carência, Quitação Fatura)

-- 1. Evoluir tabela mcs_comissoes_settings e garantir seed inicial (id = 1)
ALTER TABLE public.mcs_comissoes_settings
  ADD COLUMN IF NOT EXISTS exigir_fatura_quitada BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS data_corte_novos_clientes DATE DEFAULT '2026-07-05';

INSERT INTO public.mcs_comissoes_settings (
  id, comissao_base, bonus_novo_cliente, carencia_dias, exigir_fatura_quitada, data_corte_novos_clientes, updated_at
) VALUES (
  1, 20.00, 30.00, 15, true, '2026-07-05', NOW()
)
ON CONFLICT (id) DO UPDATE SET
  comissao_base = CASE WHEN public.mcs_comissoes_settings.comissao_base IS NULL OR public.mcs_comissoes_settings.comissao_base = 0 THEN 20.00 ELSE public.mcs_comissoes_settings.comissao_base END,
  bonus_novo_cliente = CASE WHEN public.mcs_comissoes_settings.bonus_novo_cliente IS NULL OR public.mcs_comissoes_settings.bonus_novo_cliente = 0 THEN 30.00 ELSE public.mcs_comissoes_settings.bonus_novo_cliente END,
  carencia_dias = CASE WHEN public.mcs_comissoes_settings.carencia_dias IS NULL OR public.mcs_comissoes_settings.carencia_dias = 0 THEN 15 ELSE public.mcs_comissoes_settings.carencia_dias END,
  exigir_fatura_quitada = COALESCE(public.mcs_comissoes_settings.exigir_fatura_quitada, true),
  data_corte_novos_clientes = COALESCE(public.mcs_comissoes_settings.data_corte_novos_clientes, '2026-07-05'::date),
  updated_at = NOW();

-- 2. Ampliar constraint de tipos em mcs_comissoes_lancamentos para suportar liberação manual de fatura/comissão
ALTER TABLE public.mcs_comissoes_lancamentos
  DROP CONSTRAINT IF EXISTS mcs_comissoes_lancamentos_tipo_check;

ALTER TABLE public.mcs_comissoes_lancamentos
  ADD CONSTRAINT mcs_comissoes_lancamentos_tipo_check
  CHECK (tipo = ANY (ARRAY['pagamento'::text, 'ajuste_positivo'::text, 'ajuste_negativo'::text, 'liberacao_fatura'::text]));

-- 3. Fortalecer função is_admin() para contemplar mcs_users e user_roles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.mcs_users
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'admin_rh')
  ) OR EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin', 'admin_rh')
  );
END;
$function$;

-- 4. Backfill de commercial_owner_id em estimaciones e pedidos sem vendedor comercial vinculado
-- Omar: 346a9262-2edf-4a2e-80fc-aa5b43bf483a (França / Bélgica / idioma fr)
-- Alex Carmona: efc6c631-f22a-4ce6-b662-9309a50a4cb7 (Espanha / demais)
DO $$
DECLARE
  v_alex_id UUID := 'efc6c631-f22a-4ce6-b662-9309a50a4cb7';
  v_omar_id UUID := '346a9262-2edf-4a2e-80fc-aa5b43bf483a';
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_omar_id) AND EXISTS (SELECT 1 FROM auth.users WHERE id = v_alex_id) THEN
    -- Atualizar estimaciones onde commercial_owner_id é nulo ou pertence a contas de diretoria/coordenação/sistema
    UPDATE core_comercial.estimaciones e
    SET commercial_owner_id = CASE
      WHEN e.document_language = 'fr'
        OR e.country_id = 'a6a47427-89f2-4e6b-b4ee-e645381a9cfd'
        OR EXISTS (SELECT 1 FROM core_common.countries co WHERE co.id = e.country_id AND co.name ILIKE ANY (ARRAY['%Fran%', '%Bél%', '%Belg%']))
      THEN v_omar_id
      ELSE v_alex_id
    END
    WHERE e.commercial_owner_id IS NULL
       OR e.commercial_owner_id IN (
         'b9d213e3-c28c-4e97-b3ab-7fb7af9f48cb', -- Walter
         '287f7dd3-c81a-424c-a47c-182b3ee71dbf', -- Valtencir
         '86ca2db1-07fd-42d9-a62c-739f091da519'  -- Kawan
       );

    -- Sincronizar pedidos a partir da estimación ou idioma/país
    UPDATE core_comercial.pedidos p
    SET commercial_owner_id = COALESCE(
      (SELECT e.commercial_owner_id FROM core_comercial.estimaciones e WHERE e.id = p.source_estimacion_id),
      CASE
        WHEN p.document_language = 'fr'
          OR p.country_id = 'a6a47427-89f2-4e6b-b4ee-e645381a9cfd'
          OR EXISTS (SELECT 1 FROM core_common.countries co WHERE co.id = p.country_id AND co.name ILIKE ANY (ARRAY['%Fran%', '%Bél%', '%Belg%']))
        THEN v_omar_id
        ELSE v_alex_id
      END
    )
    WHERE p.commercial_owner_id IS NULL
       OR p.commercial_owner_id IN (
         'b9d213e3-c28c-4e97-b3ab-7fb7af9f48cb',
         '287f7dd3-c81a-424c-a47c-182b3ee71dbf',
         '86ca2db1-07fd-42d9-a62c-739f091da519'
       );
  END IF;
END $$;
