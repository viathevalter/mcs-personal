-- Migration: Ordens de Pagamento e Pagos (Contas a Pagar)
-- Created: 2026-06-28 14:30:00

-- 1. Criar Sequência e Tabela para Contas a Pagar (public.contas_pagar)
CREATE SEQUENCE IF NOT EXISTS public.contas_pagar_id_seq;

CREATE TABLE IF NOT EXISTS public.contas_pagar (
    id bigint NOT NULL DEFAULT nextval('public.contas_pagar_id_seq'::regclass) PRIMARY KEY,
    sp_id integer,
    sp_modified timestamp with time zone,
    empresa text,
    cod_provedor text,
    provedor text,
    obra text,
    periodo_fat text,
    data_emissao text,
    competencia text,
    dt_venc text,
    moeda text DEFAULT 'EUR',
    valor_total text,
    status text DEFAULT 'A vencer',
    origem text,
    cat_despesa text,
    centro_custo text,
    conta_contab text,
    num_doc text,
    obs text,
    creado text,
    creado_por text,
    banco text,
    comentarios text,
    form_pag text,
    hist_valor_parcial text,
    integral_parcial text DEFAULT 'Integral',
    prev_pag text,
    saldo_a_pagar text,
    valor_parcial text,
    obs_pagamento text,
    dt_pagamento text,
    modificado text,
    modificado_por text,
    categoria_id uuid,
    departamento_id text,
    obra_id uuid,
    anexo_url text,
    ordem_pagamento_id uuid,
    ordem_pagamento_item_id uuid
);

-- 2. Criar Tabela para Registro de Pagamentos (public.contas_pagar_pagamentos)
CREATE TABLE IF NOT EXISTS public.contas_pagar_pagamentos (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    conta_pagar_id bigint NOT NULL REFERENCES public.contas_pagar(id) ON DELETE CASCADE,
    valor numeric(15,2) NOT NULL,
    data_pagamento date NOT NULL,
    forma_pagamento text NOT NULL,
    tipo_pagamento text NOT NULL,
    banco_id uuid REFERENCES public.bancos(id),
    criado_por text,
    criado_em timestamp with time zone DEFAULT now()
);

-- 3. Alterar core_finance.ordens_pagamento adicionando colunas do legado
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS cod_orden_pago text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS departamento_origem text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS cod_cliente text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS cod_servicio text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS cod_provedor text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS cod_contrato text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS cod_alojamiento text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS id_empresa text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS tipo_orden text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS observaciones text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS observaciones_financeiro text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS fecha_aprobacion timestamp with time zone;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS pago_por text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS fecha_pago timestamp with time zone;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS comprovante_geral text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS qtde_itens integer DEFAULT 0;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS cancelado_por text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS fecha_cancelamento timestamp with time zone;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS anexos text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS centro_custos text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS tipo_proveedor text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS tipo_centro_custo text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS item_ordem text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS cat_despesas text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS contab_conta_snc text;
ALTER TABLE core_finance.ordens_pagamento ADD COLUMN IF NOT EXISTS fecha_vencto date;

-- 4. Criar Tabela core_finance.ordens_pagamento_itens
CREATE TABLE IF NOT EXISTS core_finance.ordens_pagamento_itens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cod_orden_pago_item text,
    ordem_pagamento_id uuid REFERENCES core_finance.ordens_pagamento(id) ON DELETE CASCADE,
    cod_orden_pago text,
    cod_pago text,
    cod_contrato text,
    cod_provedor text,
    cod_servicio text,
    cod_alojamiento text,
    cod_cliente text,
    categoria_orden text,
    id_empresa text,
    tipo_origem text,
    id_origem text,
    valor_orden numeric(15,2),
    vencimento_orden date,
    centro_custo text,
    status_item text,
    comprovante_item text,
    observacion_item text,
    cod_colab text,
    motivo_denegacion text,
    aprovado_por text,
    otros_gastos text,
    created_at timestamp with time zone DEFAULT now()
);

-- 5. Criar Tabela core_finance.movimentos_pagos
CREATE TABLE IF NOT EXISTS core_finance.movimentos_pagos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ordem_pagamento_id uuid REFERENCES core_finance.ordens_pagamento(id) ON DELETE CASCADE,
    cod_mov text,
    tipo_mov text,
    estado_mov text,
    valor_pago numeric(15,2),
    observaciones text,
    criado_por text,
    criado_em timestamp with time zone DEFAULT now(),
    anexo_url text,
    banco_id uuid REFERENCES public.bancos(id),
    forma_pagamento text
);

-- 6. Trigger para gerar contas_pagar automaticamente ao aprovar OP
CREATE OR REPLACE FUNCTION core_finance.fn_trg_aprovar_ordem_pagamento()
RETURNS TRIGGER AS $$
DECLARE
    r_item RECORD;
    v_contas_pagar_id bigint;
    v_cod_pago text;
    v_empresa_nome text;
    v_provedor_nome text;
    v_obra_nome text;
    v_criador_email text;
BEGIN
    -- Executa apenas quando o status muda para 'aprovado'
    IF (NEW.status = 'aprovado' AND (OLD.status IS NULL OR OLD.status != 'aprovado')) THEN
        
        -- Buscar e-mail do criador
        SELECT email INTO v_criador_email FROM auth.users WHERE id = NEW.criador_id;
        
        -- Percorrer os itens desta ordem de pagamento
        FOR r_item IN 
            SELECT * FROM core_finance.ordens_pagamento_itens 
            WHERE ordem_pagamento_id = NEW.id
        LOOP
            -- Buscar nome da empresa
            IF r_item.id_empresa IS NOT NULL AND r_item.id_empresa != '' THEN
                SELECT nome INTO v_empresa_nome FROM core_common.empresas WHERE id::text = r_item.id_empresa LIMIT 1;
            END IF;
            IF v_empresa_nome IS NULL THEN
                v_empresa_nome := 'Empresa ' || COALESCE(r_item.id_empresa, NEW.id_empresa, '');
            END IF;

            -- Buscar nome do fornecedor/provedor
            SELECT trade_name INTO v_provedor_nome FROM core_common.suppliers WHERE codigo = r_item.cod_provedor LIMIT 1;
            IF v_provedor_nome IS NULL THEN
                v_provedor_nome := COALESCE(r_item.cod_provedor, '');
            END IF;

            -- Buscar nome da obra/centro de custo
            IF r_item.cod_cliente IS NOT NULL AND r_item.cod_cliente != '' THEN
                SELECT nome INTO v_obra_nome FROM public.obras WHERE id::text = r_item.cod_cliente LIMIT 1;
            END IF;
            IF v_obra_nome IS NULL THEN
                v_obra_nome := COALESCE(r_item.centro_custo, '');
            END IF;

            -- Inserir o contas a pagar correspondente
            INSERT INTO public.contas_pagar (
                empresa,
                cod_provedor,
                provedor,
                obra,
                periodo_fat,
                data_emissao,
                competencia,
                dt_venc,
                moeda,
                valor_total,
                status,
                origem,
                cat_despesa,
                centro_custo,
                num_doc,
                obs,
                creado,
                creado_por,
                banco,
                comentarios,
                integral_parcial,
                saldo_a_pagar,
                valor_parcial,
                categoria_id,
                obra_id,
                ordem_pagamento_id,
                ordem_pagamento_item_id
            ) VALUES (
                v_empresa_nome,
                r_item.cod_provedor,
                v_provedor_nome,
                v_obra_nome,
                COALESCE(r_item.categoria_orden, ''),
                to_char(NEW.created_at, 'DD/MM/YYYY'),
                COALESCE(r_item.tipo_origem, 'OP'),
                to_char(r_item.vencimento_orden, 'DD/MM/YYYY'),
                'EUR',
                r_item.valor_orden::text,
                'A vencer',
                'Ordem de Pagamento',
                r_item.categoria_orden,
                r_item.centro_custo,
                NEW.cod_orden_pago,
                COALESCE(r_item.observacion_item, NEW.descricao),
                to_char(now(), 'DD/MM/YYYY HH24:MI'),
                COALESCE(v_criador_email, 'sistema'),
                '',
                COALESCE(r_item.otros_gastos, ''),
                'Integral',
                r_item.valor_orden::text,
                '0',
                NEW.fornecedor_id,
                CASE WHEN r_item.cod_cliente ~ '^[0-9a-fA-F-]{36}$' THEN r_item.cod_cliente::uuid ELSE NULL END,
                NEW.id,
                r_item.id
            ) RETURNING id INTO v_contas_pagar_id;

            -- Gerar o código de pagamento PG-YYYY-XXXXXX
            v_cod_pago := 'PG-' || to_char(now(), 'YYYY') || '-' || LPAD(v_contas_pagar_id::text, 6, '0');

            -- Atualizar o item da OP e a contas_pagar criada com o código do pagamento
            UPDATE core_finance.ordens_pagamento_itens 
            SET cod_pago = v_cod_pago, status_item = 'Aprovado', aprovado_por = COALESCE(v_criador_email, 'sistema')
            WHERE id = r_item.id;

            UPDATE public.contas_pagar
            SET prev_pag = v_cod_pago
            WHERE id = v_contas_pagar_id;

        END LOOP;
        
        -- Inserir movimento de aprovação
        INSERT INTO core_finance.movimentos_pagos (
            ordem_pagamento_id,
            cod_mov,
            tipo_mov,
            estado_mov,
            valor_pago,
            observaciones,
            criado_por
        ) VALUES (
            NEW.id,
            'MOV-' || to_char(now(), 'YYMMDDHH24MISS'),
            'Aprovación',
            'Aprobado',
            NEW.valor,
            NEW.observaciones_financeiro,
            COALESCE(v_criador_email, 'sistema')
        );

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Associar a trigger à tabela core_finance.ordens_pagamento
DROP TRIGGER IF EXISTS trg_aprovar_ordem_pagamento ON core_finance.ordens_pagamento;
CREATE TRIGGER trg_aprovar_ordem_pagamento
AFTER UPDATE ON core_finance.ordens_pagamento
FOR EACH ROW
EXECUTE FUNCTION core_finance.fn_trg_aprovar_ordem_pagamento();

-- 7. Desativar RLS nas tabelas (não é usado no contas_receber)
ALTER TABLE public.contas_pagar DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_pagar_pagamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE core_finance.ordens_pagamento_itens DISABLE ROW LEVEL SECURITY;
ALTER TABLE core_finance.movimentos_pagos DISABLE ROW LEVEL SECURITY;

-- 8. Conceder permissões de CRUD para a API
GRANT ALL ON SEQUENCE public.contas_pagar_id_seq TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.contas_pagar TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.contas_pagar_pagamentos TO anon, authenticated, service_role;
GRANT ALL ON TABLE core_finance.ordens_pagamento_itens TO anon, authenticated, service_role;
GRANT ALL ON TABLE core_finance.movimentos_pagos TO anon, authenticated, service_role;
