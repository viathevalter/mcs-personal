-- ========================================================================================
-- Migration: 20260610161000_add_worker_sizes_and_rate_to_assignments.sql
-- Description: Adiciona campos de tamanho de roupa e tarifa acordada, cria tabela de e-mails, 
--              reconstroi a view vw_worker_allocations e atualiza a RPC de alocação.
-- ========================================================================================

-- 1. Alterações na tabela core_personal.workers
ALTER TABLE core_personal.workers ADD COLUMN IF NOT EXISTS camiseta TEXT;
ALTER TABLE core_personal.workers ADD COLUMN IF NOT EXISTS pantalones TEXT;

-- 2. Alterações na tabela core_personal.worker_assignments
ALTER TABLE core_personal.worker_assignments ADD COLUMN IF NOT EXISTS tarifa_acordada NUMERIC(10,2);

-- 3. Alterações na tabela core_comercial.pedidos
ALTER TABLE core_comercial.pedidos ADD COLUMN IF NOT EXISTS pergunta_respuesta JSONB;

-- 4. Criação da tabela core_comercial.notification_emails
CREATE TABLE IF NOT EXISTS core_comercial.notification_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('pedido', 'reemplazo', 'reubicacion')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS para a tabela de e-mails
ALTER TABLE core_comercial.notification_emails ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Leitura de emails por empresa" ON core_comercial.notification_emails;
CREATE POLICY "Leitura de emails por empresa" ON core_comercial.notification_emails 
    FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));

DROP POLICY IF EXISTS "Escrita de emails por empresa" ON core_comercial.notification_emails;
CREATE POLICY "Escrita de emails por empresa" ON core_comercial.notification_emails 
    FOR ALL TO authenticated USING (core_common.is_member(empresa_id)) 
    WITH CHECK (core_common.is_member(empresa_id));

-- Trigger de updated_at para e-mails
DROP TRIGGER IF EXISTS set_notification_emails_updated_at ON core_comercial.notification_emails;
CREATE TRIGGER set_notification_emails_updated_at 
    BEFORE UPDATE ON core_comercial.notification_emails 
    FOR EACH ROW EXECUTE FUNCTION public.set_current_timestamp_updated_at();


-- 5. Recriação da view core_personal.vw_worker_allocations para incluir novos campos
CREATE OR REPLACE VIEW core_personal.vw_worker_allocations AS
 SELECT (wa.id)::text AS id,
    w.cod_colab,
    COALESCE(p.codigo, 'N/A'::character varying) AS codpedido,
    COALESCE(c.trade_name, c.legal_name, 'Cliente'::text) AS cliente_nombre,
    COALESCE(emp.nome, 'Não definido'::text) AS contratante,
    'Pedido'::text AS tiposervico,
    COALESCE(wa.start_date, wa.planned_start_date) AS fechainiciopedido,
    wa.end_date AS fechafinpedido,
        CASE
            WHEN ((wa.status)::text = 'cancelled'::text) THEN (wa.updated_at)::date
            ELSE NULL::date
        END AS fechasalidatrabajador,
    wa.job_function_name_snapshot AS funcion,
    wa.created_at AS inserted_at,
    wa.updated_at,
    -- novos campos mapeados
    wa.tarifa_acordada::text AS tarifa_acordada_trab,
    w.camiseta AS camisa,
    w.pantalones AS pantalone,
    w.licencia_conducir AS licencia_de_conducir
   FROM ((((core_personal.worker_assignments wa
     JOIN core_personal.workers w ON ((w.id = wa.worker_id)))
     LEFT JOIN core_comercial.pedidos p ON ((p.id = wa.pedido_id)))
     LEFT JOIN core_common.clients c ON ((c.id = wa.client_id)))
     LEFT JOIN core_common.empresas emp ON ((emp.id = wa.empresa_id)))
UNION ALL
 SELECT (cpp.id)::text AS id,
    cpp.cod_colab,
    cpp.codpedido,
    cpp.cliente_nombre,
    cpp.contratante,
    cpp.tiposervico,
    cpp.fechainiciopedido,
    cpp.fechafinpedido,
    cpp.fechasalidatrabajador,
    cpp.funcion,
    cpp.inserted_at,
    cpp.updated_at,
    -- null/default values
    NULL::text AS tarifa_acordada_trab,
    NULL::text AS camisa,
    NULL::text AS pantalone,
    NULL::text AS licencia_de_conducir
   FROM colaborador_por_pedido cpp;

GRANT ALL ON core_personal.vw_worker_allocations TO anon, authenticated, service_role;


-- 6. Recriação da stored procedure de alocação de trabalhadores
CREATE OR REPLACE FUNCTION core_personal.alocar_trabalhador_em_vaga(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_empresa_id UUID;
    v_pedido_item_id UUID;
    v_worker_id UUID;
    v_worker_name TEXT;
    v_worker_document TEXT;
    v_planned_start_date DATE;
    v_solicitud_id UUID;
    v_notes TEXT;
    
    -- Novos campos no payload
    v_camiseta TEXT;
    v_pantalones TEXT;
    v_licencia_conducir TEXT;
    v_movil TEXT;
    v_tarifa_acordada NUMERIC(10,2);
    
    v_has_access BOOLEAN;
    
    -- Dados do Item
    v_pedido_id UUID;
    v_job_function_id UUID;
    v_job_function_name VARCHAR;
    v_qty_requested INT;
    v_qty_fulfilled INT;
    v_item_status VARCHAR;
    
    -- Dados do Pedido Principal
    v_client_id UUID;
    v_client_site_id UUID;
    v_pedido_codigo VARCHAR;
    
    -- Alocação
    v_new_assignment_id UUID := gen_random_uuid();
    v_assignment_status VARCHAR;
    v_start_date DATE;
    v_source_type VARCHAR;
    v_source_id UUID;
    
    -- Verificacao
    v_existing_active_assignment UUID;
    
    -- Recalculo de Pedido
    v_total_items INT;
    v_fulfilled_items INT;
    v_new_operational_status VARCHAR;
BEGIN
    -- 1. Extração do payload
    v_empresa_id := (payload->>'empresa_id')::uuid;
    v_pedido_item_id := (payload->>'pedido_item_id')::uuid;
    
    IF payload->>'worker_id' IS NOT NULL AND payload->>'worker_id' != '' THEN
        v_worker_id := (payload->>'worker_id')::uuid;
    END IF;
    
    v_worker_name := payload->>'worker_name';
    v_worker_document := payload->>'worker_document';
    v_planned_start_date := (payload->>'planned_start_date')::date;
    
    IF payload->>'solicitud_id' IS NOT NULL AND payload->>'solicitud_id' != '' THEN
        v_solicitud_id := (payload->>'solicitud_id')::uuid;
    END IF;
    
    v_notes := payload->>'notes';
    
    -- Novos campos opcionais
    v_camiseta := payload->>'camiseta';
    v_pantalones := payload->>'pantalones';
    v_licencia_conducir := payload->>'licencia_conducir';
    v_movil := payload->>'movil';
    
    IF payload->>'tarifa_acordada' IS NOT NULL AND payload->>'tarifa_acordada' != '' THEN
        v_tarifa_acordada := (payload->>'tarifa_acordada')::numeric;
    END IF;

    -- Validação Básica
    IF v_empresa_id IS NULL OR v_pedido_item_id IS NULL OR v_planned_start_date IS NULL THEN
        RAISE EXCEPTION 'empresa_id, pedido_item_id e planned_start_date são obrigatórios.';
    END IF;

    -- 2. Validação de Acesso (RH, Admin, etc)
    SELECT EXISTS (
        SELECT 1 FROM core_common.user_memberships
        WHERE user_id = v_user_id 
          AND empresa_id = v_empresa_id 
          AND is_active = true
          AND role IN ('admin', 'rh', 'super_admin', 'admin_rh', 'operador')
    ) INTO v_has_access;

    IF NOT v_has_access THEN
        RAISE EXCEPTION 'Acesso negado. Apenas RH ou Operação (Admin) podem alocar trabalhadores.';
    END IF;

    -- 3. Buscar dados do Pedido e Item
    SELECT 
        pi.pedido_id, 
        pi.job_function_id, 
        COALESCE(NULLIF(TRIM(pi.job_function_name_snapshot), ''), NULLIF(TRIM(jf.name), ''), 'Desconhecida'),
        pi.quantity_requested, 
        pi.quantity_fulfilled,
        p.client_id,
        p.client_site_id,
        p.codigo
    INTO 
        v_pedido_id, 
        v_job_function_id, 
        v_job_function_name, 
        v_qty_requested, 
        v_qty_fulfilled,
        v_client_id,
        v_client_site_id,
        v_pedido_codigo
    FROM core_comercial.pedido_items pi
    JOIN core_comercial.pedidos p ON p.id = pi.pedido_id
    LEFT JOIN core_comercial.job_functions jf ON jf.id = pi.job_function_id
    WHERE pi.id = v_pedido_item_id AND pi.empresa_id = v_empresa_id;

    IF v_pedido_id IS NULL THEN
        RAISE EXCEPTION 'Pedido Item não encontrado.';
    END IF;

    -- 4. Validar saldo da vaga
    IF v_qty_fulfilled >= v_qty_requested THEN
        RAISE EXCEPTION 'Este item já teve todas as suas vagas preenchidas.';
    END IF;

    -- 5. Lidar com o Worker (Criar se não existir, atualizar se já existir)
    IF v_worker_id IS NULL THEN
        IF v_worker_name IS NULL OR v_worker_name = '' THEN
            RAISE EXCEPTION 'Se worker_id não for informado, worker_name é obrigatório para cadastro.';
        END IF;
        
        v_worker_id := gen_random_uuid();
        
        INSERT INTO core_personal.workers (
            id, empresa_id, nome, nif, status_trabajador,
            camiseta, pantalones, licencia_conducir, movil, cod_colab
        )
        VALUES (
            v_worker_id, 
            v_empresa_id, 
            v_worker_name, 
            v_worker_document, 
            'Ativo',
            v_camiseta,
            v_pantalones,
            v_licencia_conducir,
            v_movil,
            'TEMP-' || substring(gen_random_uuid()::text from 1 for 8) -- código temporário
        );
    ELSE
        -- Validar se o worker já não está ativamente alocado nesta mesma vaga
        SELECT id INTO v_existing_active_assignment
        FROM core_personal.worker_assignments
        WHERE worker_id = v_worker_id 
          AND pedido_item_id = v_pedido_item_id 
          AND status IN ('planned', 'active', 'paused');
          
        IF v_existing_active_assignment IS NOT NULL THEN
            RAISE EXCEPTION 'O trabalhador já possui uma alocação ativa neste pedido.';
        END IF;

        -- Atualizar os dados de tamanho/CNH/celular no cadastro do trabalhador
        UPDATE core_personal.workers
        SET camiseta = COALESCE(NULLIF(v_camiseta, ''), camiseta),
            pantalones = COALESCE(NULLIF(v_pantalones, ''), pantalones),
            licencia_conducir = COALESCE(NULLIF(v_licencia_conducir, ''), licencia_conducir),
            movil = COALESCE(NULLIF(v_movil, ''), movil)
        WHERE id = v_worker_id;
    END IF;

    -- 6. Calcular Status da Alocação e Source
    IF v_planned_start_date <= CURRENT_DATE THEN
        v_assignment_status := 'active';
        v_start_date := v_planned_start_date;
    ELSE
        v_assignment_status := 'planned';
        v_start_date := NULL;
    END IF;
    
    IF v_solicitud_id IS NOT NULL THEN
        v_source_type := 'solicitud';
        v_source_id := v_solicitud_id;
    ELSE
        v_source_type := 'pedido';
        v_source_id := v_pedido_id;
    END IF;

    -- 7. Inserir Worker Assignment
    INSERT INTO core_personal.worker_assignments (
        id,
        empresa_id,
        worker_id,
        pedido_id,
        pedido_item_id,
        solicitud_id,
        client_id,
        client_site_id,
        job_function_id,
        job_function_name_snapshot,
        assignment_type,
        status,
        planned_start_date,
        start_date,
        source_type,
        source_id,
        notes,
        root_assignment_id,
        created_by,
        tarifa_acordada
    ) VALUES (
        v_new_assignment_id,
        v_empresa_id,
        v_worker_id,
        v_pedido_id,
        v_pedido_item_id,
        v_solicitud_id,
        v_client_id,
        v_client_site_id,
        v_job_function_id,
        v_job_function_name,
        'new_hire',
        v_assignment_status,
        v_planned_start_date,
        v_start_date,
        v_source_type,
        v_source_id,
        v_notes,
        v_new_assignment_id,
        v_user_id,
        v_tarifa_acordada
    );

    -- 8. Atualizar pedido_item
    v_qty_fulfilled := v_qty_fulfilled + 1;
    
    IF v_qty_fulfilled >= v_qty_requested THEN
        v_item_status := 'fulfilled';
    ELSE
        IF v_qty_fulfilled > 0 THEN
            v_item_status := 'active';
        ELSE
            v_item_status := 'pending';
        END IF;
    END IF;
    
    UPDATE core_comercial.pedido_items
    SET quantity_fulfilled = v_qty_fulfilled,
        status = v_item_status,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE id = v_pedido_item_id;

    -- 9. Recalcular operational_status do Pedido Inteiro
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN status = 'fulfilled' THEN 1 END)
    INTO v_total_items, v_fulfilled_items
    FROM core_comercial.pedido_items
    WHERE pedido_id = v_pedido_id AND status != 'cancelled';
    
    IF v_fulfilled_items = 0 THEN
        IF EXISTS (SELECT 1 FROM core_comercial.pedido_items WHERE pedido_id = v_pedido_id AND quantity_fulfilled > 0 AND status != 'cancelled') THEN
            v_new_operational_status := 'partially_fulfilled';
        ELSE
            v_new_operational_status := 'pending_operations';
        END IF;
    ELSIF v_fulfilled_items = v_total_items THEN
        v_new_operational_status := 'fulfilled';
    ELSE
        v_new_operational_status := 'partially_fulfilled';
    END IF;

    UPDATE core_comercial.pedidos
    SET operational_status = v_new_operational_status,
        updated_at = NOW(),
        updated_by = v_user_id
    WHERE id = v_pedido_id;

    -- 10. Registrar Evento e Timeline
    INSERT INTO core_comercial.pedido_events (
        empresa_id, pedido_id, event_type, title, description, created_by
    ) VALUES (
        v_empresa_id, 
        v_pedido_id, 
        'other', 
        'Trabalhador alocado à vaga', 
        'Alocação gerada para a função ' || v_job_function_name, 
        v_user_id
    );

    IF v_solicitud_id IS NOT NULL THEN
        INSERT INTO core_operacoes.solicitud_timeline (
            empresa_id, solicitud_id, event_type, title, description, created_by
        ) VALUES (
            v_empresa_id,
            v_solicitud_id,
            'other',
            'Alocação Efetivada',
            'Trabalhador alocado à vaga ' || v_job_function_name,
            v_user_id
        );
    END IF;

    -- 11. Retorno
    RETURN jsonb_build_object(
        'assignment_id', v_new_assignment_id,
        'worker_id', v_worker_id,
        'pedido_id', v_pedido_id,
        'pedido_item_id', v_pedido_item_id,
        'assignment_status', v_assignment_status,
        'operational_status', v_new_operational_status,
        'item_status', v_item_status,
        'qty_requested', v_qty_requested,
        'qty_fulfilled', v_qty_fulfilled
    );

EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao alocar trabalhador: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION core_personal.alocar_trabalhador_em_vaga(jsonb) TO authenticated;
