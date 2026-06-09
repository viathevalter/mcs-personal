-- Migration: 20260609080000_create_rpc_criar_nova_versao_estimacion.sql
-- Description: Create core_comercial.criar_nova_versao_estimacion RPC to clone versions and reset to draft

BEGIN;

CREATE OR REPLACE FUNCTION core_comercial.criar_nova_versao_estimacion(
    p_estimacion_id UUID,
    p_notes TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' 
AS $$
DECLARE
    v_user_id UUID;
    v_empresa_id UUID;
    v_current_version_id UUID;
    v_max_version_number INT;
    v_new_version_id UUID;
    v_total_cost NUMERIC(15,2);
    v_total_revenue NUMERIC(15,2);
    v_margin_percent NUMERIC(5,2);
    v_status_check TEXT;
    
    -- Para loops de duplicação
    v_item RECORD;
    v_cost RECORD;
BEGIN
    v_user_id := (current_setting('request.jwt.claim.sub', true))::uuid;
    
    -- 1. Obter dados da estimación atual
    SELECT current_version_id, status, empresa_id INTO v_current_version_id, v_status_check, v_empresa_id
    FROM core_comercial.estimaciones
    WHERE id = p_estimacion_id;
    
    IF v_status_check IS NULL THEN
        RAISE EXCEPTION 'Estimación não encontrada.';
    END IF;
    
    -- O versionamento pode ser feito a partir de estimativas já enviadas ou recusadas, mas não em rascunho (draft)
    IF v_status_check = 'draft' THEN
        RAISE EXCEPTION 'O orçamento já está em status rascunho (draft) e pode ser editado diretamente.';
    END IF;
    
    -- 2. Validar permissões (super_admin ou operador)
    IF NOT (
        core_common.has_role(v_empresa_id, 'super_admin') OR 
        core_common.has_role(v_empresa_id, 'operador')
    ) THEN
        RAISE EXCEPTION 'Usuário sem permissão para versionar estimación na empresa %', v_empresa_id;
    END IF;
    
    -- 3. Obter o maior número de versão existente
    SELECT COALESCE(MAX(version_number), 0) INTO v_max_version_number
    FROM core_comercial.estimacion_versions
    WHERE estimacion_id = p_estimacion_id;
    
    -- 4. Obter totais da versão atual
    SELECT total_cost, total_revenue, margin_percent INTO v_total_cost, v_total_revenue, v_margin_percent
    FROM core_comercial.estimacion_versions
    WHERE id = v_current_version_id;
    
    -- 5. Arquivar versão atual
    UPDATE core_comercial.estimacion_versions
    SET status = 'archived'
    WHERE id = v_current_version_id;
    
    -- 6. Inserir nova versão (version_number = v_max_version_number + 1)
    INSERT INTO core_comercial.estimacion_versions (
        empresa_id, estimacion_id, version_number, status,
        notes, total_cost, total_revenue, margin_percent,
        created_by
    ) VALUES (
        v_empresa_id, p_estimacion_id, v_max_version_number + 1, 'active',
        COALESCE(p_notes, 'Nova versão criada a partir da versão ' || v_max_version_number::text),
        COALESCE(v_total_cost, 0), COALESCE(v_total_revenue, 0), COALESCE(v_margin_percent, 0),
        v_user_id
    )
    RETURNING id INTO v_new_version_id;
    
    -- 7. Duplicar os itens da versão anterior para a nova versão
    FOR v_item IN (
        SELECT * FROM core_comercial.estimacion_items 
        WHERE estimacion_version_id = v_current_version_id
    ) LOOP
        INSERT INTO core_comercial.estimacion_items (
            empresa_id, estimacion_id, estimacion_version_id, job_function_id,
            quantity, planned_hours_per_day, planned_days_per_week, planned_total_hours,
            includes_housing, includes_transport, includes_epi,
            base_cost_hour, recommended_sell_rate_hour, minimum_sell_rate_hour, sell_rate_hour,
            margin_percent, risk_level_snapshot, description,
            ss_regime, custom_lodging_rate, custom_epi_rate, custom_transport_rate,
            created_by, updated_by
        ) VALUES (
            v_empresa_id, p_estimacion_id, v_new_version_id, v_item.job_function_id,
            v_item.quantity, v_item.planned_hours_per_day, v_item.planned_days_per_week, v_item.planned_total_hours,
            v_item.includes_housing, v_item.includes_transport, v_item.includes_epi,
            v_item.base_cost_hour, v_item.recommended_sell_rate_hour, v_item.minimum_sell_rate_hour, v_item.sell_rate_hour,
            v_item.margin_percent, v_item.risk_level_snapshot, v_item.description,
            v_item.ss_regime, v_item.custom_lodging_rate, v_item.custom_epi_rate, v_item.custom_transport_rate,
            v_user_id, v_user_id
        );
    END LOOP;
    
    -- 8. Duplicar os custos adicionais da versão anterior para a nova versão
    FOR v_cost IN (
        SELECT * FROM core_comercial.estimacion_costs 
        WHERE estimacion_version_id = v_current_version_id
    ) LOOP
        INSERT INTO core_comercial.estimacion_costs (
            empresa_id, estimacion_version_id, cost_category, description,
            amount, is_rechargeable, markup_percent, is_auto,
            created_by, updated_by
        ) VALUES (
            v_empresa_id, v_new_version_id, v_cost.cost_category, v_cost.description,
            v_cost.amount, v_cost.is_rechargeable, v_cost.markup_percent, v_cost.is_auto,
            v_user_id, v_user_id
        );
    END LOOP;
    
    -- 9. Marcar links de assinatura pendente anteriores como expiráveis/expirados
    UPDATE core_comercial.proposal_signatures
    SET status = 'expired', updated_at = NOW()
    WHERE estimacion_id = p_estimacion_id 
      AND status = 'pending_signature';
      
    -- 10. Atualizar o orçamento com a ID da nova versão e retornar para status 'draft'
    UPDATE core_comercial.estimaciones
    SET 
        current_version_id = v_new_version_id,
        status = 'draft',
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE id = p_estimacion_id;
    
    -- 11. Retornar dados da nova versão
    RETURN json_build_object(
        'status', 'success',
        'estimacion_id', p_estimacion_id,
        'new_version_id', v_new_version_id,
        'version_number', v_max_version_number + 1
    );
END;
$$;

GRANT EXECUTE ON FUNCTION core_comercial.criar_nova_versao_estimacion(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
