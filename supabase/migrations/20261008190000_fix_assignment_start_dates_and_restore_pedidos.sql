-- Migration: 20261008190000_fix_assignment_start_dates_and_restore_pedidos.sql
-- Description: Corrige alocações e trabalhadores que tiveram suas datas de início indevidamente sobrescritas pela data de assinatura eletrônica do contrato.
-- Garante que alocações vinculadas a Pedidos respeitem rigorosamente o expected_start_date do Pedido comercial.

DO $$
DECLARE
    r RECORD;
    v_active_count INTEGER;
BEGIN
    -- 1. Restaurar alocações FUTURAS vinculadas a pedidos
    -- Para pedidos cuja data prevista é maior que CURRENT_DATE, a alocação deve ser 'planned' e start_date deve ser NULL
    UPDATE core_personal.worker_assignments wa
    SET 
        planned_start_date = p.expected_start_date,
        start_date = NULL,
        status = 'planned',
        updated_at = NOW()
    FROM core_comercial.pedidos p
    WHERE wa.pedido_id = p.id
      AND p.expected_start_date IS NOT NULL
      AND p.expected_start_date > CURRENT_DATE
      AND wa.status NOT IN ('cancelled', 'terminated')
      AND (
          wa.start_date IS NOT NULL 
          OR wa.planned_start_date IS DISTINCT FROM p.expected_start_date
          OR wa.status != 'planned'
      );

    -- 2. Restaurar alocações PASSADAS ou DE HOJE vinculadas a pedidos
    -- Para pedidos já iniciados, planned_start_date e start_date devem ser iguais ao expected_start_date do pedido
    UPDATE core_personal.worker_assignments wa
    SET 
        planned_start_date = p.expected_start_date,
        start_date = p.expected_start_date,
        updated_at = NOW()
    FROM core_comercial.pedidos p
    WHERE wa.pedido_id = p.id
      AND p.expected_start_date IS NOT NULL
      AND p.expected_start_date <= CURRENT_DATE
      AND wa.status NOT IN ('cancelled', 'terminated')
      AND (
          wa.planned_start_date IS DISTINCT FROM p.expected_start_date
          OR (wa.start_date IS NOT NULL AND wa.start_date < p.expected_start_date)
      );

    -- 3. Sincronizar status dos trabalhadores que possuem apenas alocações futuras
    FOR r IN (
        SELECT DISTINCT w.id, w.cod_colab
        FROM core_personal.workers w
        JOIN core_personal.worker_assignments wa ON wa.worker_id = w.id
        WHERE wa.status = 'planned'
          AND wa.planned_start_date > CURRENT_DATE
    ) LOOP
        -- Verificar se o trabalhador possui alguma outra alocação realmente ATIVA
        SELECT COUNT(*) INTO v_active_count
        FROM core_personal.worker_assignments
        WHERE worker_id = r.id
          AND status = 'active'
          AND (start_date IS NULL OR start_date <= CURRENT_DATE)
          AND (end_date IS NULL OR end_date >= CURRENT_DATE);

        IF v_active_count = 0 THEN
            -- Se não tem alocação ativa atual, o status do trabalhador deve ser 'Pendente Ingresso'
            UPDATE core_personal.workers
            SET status_trabajador = 'Pendente Ingresso'
            WHERE id = r.id
              AND status_trabajador = 'Ativo';

            IF r.cod_colab IS NOT NULL THEN
                UPDATE public.colaboradores
                SET status_trabajador = 'Pendente Ingresso'
                WHERE cod_colab = r.cod_colab
                  AND status_trabajador = 'Ativo';

                -- Ressincronizar campos de cliente/contratante/função
                BEGIN
                    PERFORM core_personal.fn_sync_worker_active_fields_by_cod(r.cod_colab);
                EXCEPTION WHEN OTHERS THEN
                    -- Se a função falhar, não impede o restante
                    NULL;
                END;
            END IF;
        END IF;
    END LOOP;

    -- 4. Garantir consistência na tabela legada public.colaborador_por_pedido para pedidos ativos
    UPDATE public.colaborador_por_pedido cpp
    SET fechainiciopedido = p.expected_start_date,
        updated_at = NOW()
    FROM core_comercial.pedidos p
    WHERE cpp.codpedido = p.codigo
      AND p.expected_start_date IS NOT NULL
      AND cpp.fechainiciopedido IS DISTINCT FROM p.expected_start_date;

END $$;
