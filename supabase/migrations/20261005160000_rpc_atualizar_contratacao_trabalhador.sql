-- Migration: 20261005160000_rpc_atualizar_contratacao_trabalhador.sql
-- Description: RPC to edit/update hired worker details and rate in Contratação Inicial with full data consolidation

CREATE OR REPLACE FUNCTION core_personal.atualizar_contratacao_trabalhador(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_assignment_id UUID;
    v_tarifa_acordada NUMERIC(10,2);
    v_planned_start_date DATE;
    v_planned_end_date DATE;
    v_camiseta TEXT;
    v_pantalones TEXT;
    v_licencia_conducir TEXT;
    v_movil TEXT;
    v_pasaporte TEXT;
    v_notes TEXT;
    v_job_function_name TEXT;
    v_motivo TEXT;
    v_alterado_por TEXT;

    -- Existing assignment record
    v_assignment RECORD;
    v_cod_colab TEXT;
    v_new_status VARCHAR;
    v_new_start_date DATE;
    v_new_worker_status VARCHAR;
BEGIN
    -- 1. Extract payload
    v_assignment_id := (payload->>'assignment_id')::uuid;
    IF v_assignment_id IS NULL THEN
        RAISE EXCEPTION 'O campo assignment_id é obrigatório.';
    END IF;

    IF payload->>'tarifa_acordada' IS NOT NULL AND TRIM(payload->>'tarifa_acordada') != '' THEN
        v_tarifa_acordada := (payload->>'tarifa_acordada')::numeric;
    END IF;

    IF payload->>'planned_start_date' IS NOT NULL AND TRIM(payload->>'planned_start_date') != '' THEN
        v_planned_start_date := (payload->>'planned_start_date')::date;
    END IF;

    IF payload->>'planned_end_date' IS NOT NULL AND TRIM(payload->>'planned_end_date') != '' THEN
        v_planned_end_date := (payload->>'planned_end_date')::date;
    END IF;

    v_camiseta := NULLIF(TRIM(payload->>'camiseta'), '');
    v_pantalones := NULLIF(TRIM(payload->>'pantalones'), '');
    v_licencia_conducir := NULLIF(TRIM(payload->>'licencia_conducir'), '');
    v_movil := NULLIF(TRIM(payload->>'movil'), '');
    v_pasaporte := NULLIF(TRIM(payload->>'pasaporte'), '');
    v_notes := payload->>'notes';
    v_job_function_name := NULLIF(TRIM(payload->>'job_function_name'), '');
    v_motivo := COALESCE(NULLIF(TRIM(payload->>'motivo_alteracao'), ''), 'Ajuste de dados na Contratação Inicial');
    v_alterado_por := COALESCE(NULLIF(TRIM(payload->>'alterado_por_nome'), ''), 'Contratação Inicial');

    -- 2. Fetch existing assignment
    SELECT id, empresa_id, worker_id, pedido_id, pedido_item_id, solicitud_id, tarifa_acordada, planned_start_date, planned_end_date, status, notes, job_function_name_snapshot
    INTO v_assignment
    FROM core_personal.worker_assignments
    WHERE id = v_assignment_id;

    IF v_assignment.id IS NULL THEN
        RAISE EXCEPTION 'Alocação não encontrada com ID %', v_assignment_id;
    END IF;

    -- 3. Calculate start_date and status based on planned_start_date
    IF v_planned_start_date IS NOT NULL THEN
        IF v_assignment.status IN ('planned', 'active') THEN
            IF v_planned_start_date > CURRENT_DATE THEN
                v_new_status := 'planned';
                v_new_worker_status := 'Pendente Ingresso';
                v_new_start_date := NULL;
            ELSE
                v_new_status := 'active';
                v_new_worker_status := 'Ativo';
                v_new_start_date := v_planned_start_date;
            END IF;
        ELSE
            v_new_status := v_assignment.status;
            v_new_start_date := v_planned_start_date;
        END IF;
    END IF;

    -- 4. Update worker_assignments
    UPDATE core_personal.worker_assignments
    SET
        tarifa_acordada = COALESCE(v_tarifa_acordada, tarifa_acordada),
        planned_start_date = COALESCE(v_planned_start_date, planned_start_date),
        planned_end_date = CASE 
            WHEN payload ? 'planned_end_date' THEN v_planned_end_date 
            ELSE planned_end_date 
        END,
        start_date = CASE 
            WHEN v_planned_start_date IS NOT NULL THEN v_new_start_date 
            ELSE start_date 
        END,
        status = COALESCE(v_new_status, status),
        notes = CASE 
            WHEN payload ? 'notes' THEN v_notes 
            ELSE notes 
        END,
        job_function_name_snapshot = COALESCE(v_job_function_name, job_function_name_snapshot),
        updated_at = NOW()
    WHERE id = v_assignment_id;

    -- 5. Update workers profile
    UPDATE core_personal.workers
    SET
        camiseta = COALESCE(v_camiseta, camiseta),
        pantalones = COALESCE(v_pantalones, pantalones),
        licencia_conducir = COALESCE(v_licencia_conducir, licencia_conducir),
        movil = COALESCE(v_movil, movil),
        pasaporte = COALESCE(v_pasaporte, pasaporte),
        status_trabajador = COALESCE(v_new_worker_status, status_trabajador)
    WHERE id = v_assignment.worker_id
    RETURNING cod_colab INTO v_cod_colab;

    -- 6. Synchronize with public.colaboradores (legacy)
    IF v_cod_colab IS NOT NULL THEN
        UPDATE public.colaboradores
        SET
            camiseta = COALESCE(v_camiseta, camiseta),
            pantalones = COALESCE(v_pantalones, pantalones),
            licencia_conducir = COALESCE(v_licencia_conducir, licencia_conducir),
            movil = COALESCE(v_movil, movil),
            pasaporte = COALESCE(v_pasaporte, pasaporte),
            status_trabajador = COALESCE(v_new_worker_status, status_trabajador),
            updated_at = NOW()
        WHERE cod_colab = v_cod_colab;
    END IF;

    -- 7. Synchronize worker remuneration settings (worker_beneficios_settings)
    IF v_tarifa_acordada IS NOT NULL AND v_tarifa_acordada > 0 THEN
        INSERT INTO core_personal.worker_beneficios_settings (worker_id, tarifa_hora, updated_at)
        VALUES (v_assignment.worker_id, v_tarifa_acordada, NOW())
        ON CONFLICT (worker_id)
        DO UPDATE SET tarifa_hora = EXCLUDED.tarifa_hora, updated_at = NOW();
    END IF;

    -- 8. Audit log for tariff alteration
    IF v_tarifa_acordada IS NOT NULL AND v_tarifa_acordada IS DISTINCT FROM v_assignment.tarifa_acordada THEN
        INSERT INTO core_personal.worker_tariff_audit_logs (
            worker_id,
            tarifa_anterior,
            tarifa_nova,
            alterado_por_nome,
            autorizado_por_nome,
            motivo,
            created_at
        )
        VALUES (
            v_assignment.worker_id,
            v_assignment.tarifa_acordada,
            v_tarifa_acordada,
            v_alterado_por,
            v_alterado_por,
            v_motivo,
            NOW()
        );
    END IF;

    -- 9. Synchronize pending Seguridade Social Alta if start date changed
    IF v_planned_start_date IS NOT NULL THEN
        UPDATE core_personal.seguridade_status
        SET data_efetiva = v_planned_start_date,
            updated_at = NOW()
        WHERE worker_id = v_assignment.worker_id
          AND tipo_evento = 'alta'
          AND status = 'pendente';
    END IF;

    -- 10. Return success object
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Dados da contratação atualizados com sucesso.',
        'assignment_id', v_assignment_id,
        'worker_id', v_assignment.worker_id,
        'tarifa_acordada', COALESCE(v_tarifa_acordada, v_assignment.tarifa_acordada),
        'status', COALESCE(v_new_status, v_assignment.status)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION core_personal.atualizar_contratacao_trabalhador(jsonb) TO anon, authenticated, service_role;
