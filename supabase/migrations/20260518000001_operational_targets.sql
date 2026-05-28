-- ==============================================================================
-- Migração Evolutiva - Ajuste da Arquitetura Operacional (Targets)
-- ==============================================================================

-- 1. Adicionar root_assignment_id na tabela worker_assignments se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'core_personal' 
          AND table_name = 'worker_assignments' 
          AND column_name = 'root_assignment_id'
    ) THEN
        ALTER TABLE core_personal.worker_assignments 
        ADD COLUMN root_assignment_id UUID REFERENCES core_personal.worker_assignments(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- 2. Criar a tabela core_operacoes.solicitud_targets
CREATE TABLE IF NOT EXISTS core_operacoes.solicitud_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    solicitud_id UUID NOT NULL REFERENCES core_operacoes.solicitudes_operativas(id) ON DELETE RESTRICT,
    
    -- Alvo operacional original (Source)
    source_assignment_id UUID REFERENCES core_personal.worker_assignments(id) ON DELETE RESTRICT,
    source_worker_id UUID REFERENCES core_personal.workers(id) ON DELETE RESTRICT,
    source_pedido_id UUID REFERENCES core_comercial.pedidos(id) ON DELETE RESTRICT,
    source_pedido_item_id UUID REFERENCES core_comercial.pedido_items(id) ON DELETE RESTRICT,
    source_client_id UUID REFERENCES core_common.clients(id) ON DELETE RESTRICT,
    source_client_site_id UUID REFERENCES core_common.client_sites(id) ON DELETE RESTRICT,

    -- Destino/resultado operacional (Target)
    -- O campo target_assignment_id será preenchido posteriormente pela RPC que finalizar o replacement/reubicación
    target_worker_id UUID REFERENCES core_personal.workers(id) ON DELETE RESTRICT,
    target_assignment_id UUID REFERENCES core_personal.worker_assignments(id) ON DELETE RESTRICT,
    target_pedido_id UUID REFERENCES core_comercial.pedidos(id) ON DELETE RESTRICT,
    target_pedido_item_id UUID REFERENCES core_comercial.pedido_items(id) ON DELETE RESTRICT,
    target_client_id UUID REFERENCES core_common.clients(id) ON DELETE RESTRICT,
    target_client_site_id UUID REFERENCES core_common.client_sites(id) ON DELETE RESTRICT,

    -- Classificação
    -- Nota de Design:
    -- action_type (aqui) = ação solicitada: 'replace', 'relocate', 'test', 'offboard'
    -- assignment_type (em worker_assignments) = origem da nova alocação: 'new_hire', 'replacement', 'relocation', 'temporary_test'
    action_type VARCHAR NOT NULL CHECK (action_type IN ('replace', 'relocate', 'test', 'offboard')),
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    reason TEXT,
    notes TEXT,

    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 3. Trigger para updated_at e updated_by
CREATE TRIGGER set_solicitud_targets_updated_at
    BEFORE UPDATE ON core_operacoes.solicitud_targets
    FOR EACH ROW
    EXECUTE FUNCTION core_common.set_updated_at_and_user();

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_solicitud_targets_empresa ON core_operacoes.solicitud_targets(empresa_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_targets_solicitud ON core_operacoes.solicitud_targets(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_targets_source_assignment ON core_operacoes.solicitud_targets(source_assignment_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_targets_target_assignment ON core_operacoes.solicitud_targets(target_assignment_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_targets_source_worker ON core_operacoes.solicitud_targets(source_worker_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_targets_target_worker ON core_operacoes.solicitud_targets(target_worker_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_targets_source_pedido ON core_operacoes.solicitud_targets(source_pedido_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_targets_target_pedido ON core_operacoes.solicitud_targets(target_pedido_id);

-- 5. Restrição de Unicidade Parcial (Impede selecionar o mesmo trabalhador duas vezes no mesmo replacement)
CREATE UNIQUE INDEX IF NOT EXISTS uq_solicitud_targets_solicitud_source_assignment 
ON core_operacoes.solicitud_targets(solicitud_id, source_assignment_id) 
WHERE source_assignment_id IS NOT NULL;

-- 6. Row Level Security (RLS)
ALTER TABLE core_operacoes.solicitud_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura de targets da propria empresa" 
    ON core_operacoes.solicitud_targets 
    FOR SELECT TO authenticated 
    USING (core_common.is_member(empresa_id));

CREATE POLICY "Insercao de targets por administradores e operadores" 
    ON core_operacoes.solicitud_targets 
    FOR INSERT TO authenticated 
    WITH CHECK (
        core_common.has_role(empresa_id, 'super_admin') OR 
        core_common.has_role(empresa_id, 'admin') OR 
        core_common.has_role(empresa_id, 'operador') OR 
        core_common.has_role(empresa_id, 'rh')
    );

CREATE POLICY "Atualizacao de targets por administradores e operadores" 
    ON core_operacoes.solicitud_targets 
    FOR UPDATE TO authenticated 
    USING (
        core_common.has_role(empresa_id, 'super_admin') OR 
        core_common.has_role(empresa_id, 'admin') OR 
        core_common.has_role(empresa_id, 'operador') OR 
        core_common.has_role(empresa_id, 'rh')
    )
    WITH CHECK (
        core_common.has_role(empresa_id, 'super_admin') OR 
        core_common.has_role(empresa_id, 'admin') OR 
        core_common.has_role(empresa_id, 'operador') OR 
        core_common.has_role(empresa_id, 'rh')
    );
