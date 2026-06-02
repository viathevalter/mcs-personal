-- ========================================================================================
-- MIGRATION: BLOCO 4 - MCS COMERCIAL, OPERAÇÕES E PERSONAL (WORKER ASSIGNMENTS) V3
-- ========================================================================================
-- REVISÃO DE SEGURANÇA, INTEGRIDADE E APPEND-ONLY:
-- 1. Tabelas de log/histórico (pedido_events, pedido_status_history, solicitud_timeline, 
--    solicitud_comments) agora são 100% APPEND-ONLY (Sem UPDATE e DELETE).
-- 2. CREATE POLICY padronizado usando 'TO authenticated'.
-- 3. Nova função dedicada `core_common.set_updated_at_and_user()`.
-- 4. Constraint Unique em (empresa_id, estimacion_id, version_number).
-- 5. Colunas de auditoria faltantes adicionadas em estimacion_versions e estimacion_costs.
-- ========================================================================================

-- ========================================================================================
-- FASE 1: SCHEMAS E FUNÇÃO IDEMPOTENTE DE AUDITORIA
-- ========================================================================================
CREATE SCHEMA IF NOT EXISTS core_comercial;
CREATE SCHEMA IF NOT EXISTS core_operacoes;
CREATE SCHEMA IF NOT EXISTS core_personal;

GRANT USAGE ON SCHEMA core_common TO authenticated;
GRANT USAGE ON SCHEMA core_comercial TO authenticated;
GRANT USAGE ON SCHEMA core_operacoes TO authenticated;
GRANT USAGE ON SCHEMA core_personal TO authenticated;

-- Nova função específica para evitar colisão com funções legadas no banco atual
CREATE OR REPLACE FUNCTION core_common.set_updated_at_and_user()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Atualiza updated_by caso a coluna exista no record
    IF current_setting('request.jwt.claim.sub', true) IS NOT NULL THEN
        IF to_jsonb(NEW) ? 'updated_by' THEN
            NEW.updated_by = current_setting('request.jwt.claim.sub', true)::uuid;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tabela: core_common.departments
CREATE TABLE IF NOT EXISTS core_common.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    code VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(empresa_id, code)
);

-- Tabela: core_common.department_members
CREATE TABLE IF NOT EXISTS core_common.department_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES core_common.departments(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(empresa_id, department_id, user_id)
);


-- ========================================================================================
-- FASE 2: ESTIMACIONES (ORÇAMENTOS)
-- ========================================================================================

CREATE TABLE IF NOT EXISTS core_comercial.estimaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    codigo VARCHAR NOT NULL,
    client_id UUID NOT NULL REFERENCES core_common.clients(id) ON DELETE RESTRICT,
    client_site_id UUID REFERENCES core_common.client_sites(id) ON DELETE RESTRICT,
    current_version_id UUID, -- FK condicional (abaixo)
    status VARCHAR DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'sent', 'approved', 'rejected', 'expired', 'superseded', 'cancelled')),
    estimation_type VARCHAR CHECK (estimation_type IN ('new_allocation', 'expansion', 'other')),
    commercial_owner_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    contact_name VARCHAR,
    contact_email VARCHAR,
    expected_start_date DATE,
    expected_end_date DATE,
    validity_date DATE,
    payment_terms TEXT,
    general_notes TEXT,
    total_estimated_cost DECIMAL(15,2) CHECK (total_estimated_cost >= 0),
    total_estimated_revenue DECIMAL(15,2) CHECK (total_estimated_revenue >= 0),
    estimated_margin_percent DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(empresa_id, codigo)
);

CREATE TABLE IF NOT EXISTS core_comercial.estimacion_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    estimacion_id UUID NOT NULL REFERENCES core_comercial.estimaciones(id) ON DELETE RESTRICT,
    version_number INT NOT NULL,
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    total_cost DECIMAL(15,2) CHECK (total_cost >= 0),
    total_revenue DECIMAL(15,2) CHECK (total_revenue >= 0),
    margin_percent DECIMAL(5,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(empresa_id, estimacion_id, version_number)
);

-- Constraint condicional e idempotente
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_estimacion_current_version' AND table_name = 'estimaciones') THEN
        ALTER TABLE core_comercial.estimaciones ADD CONSTRAINT fk_estimacion_current_version FOREIGN KEY (current_version_id) REFERENCES core_comercial.estimacion_versions(id) ON DELETE RESTRICT;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS core_comercial.estimacion_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    estimacion_id UUID NOT NULL REFERENCES core_comercial.estimaciones(id) ON DELETE RESTRICT,
    estimacion_version_id UUID NOT NULL REFERENCES core_comercial.estimacion_versions(id) ON DELETE RESTRICT,
    job_function_id UUID NOT NULL REFERENCES core_comercial.job_functions(id) ON DELETE RESTRICT,
    job_function_name_snapshot VARCHAR,
    job_function_description_snapshot TEXT,
    risk_level_snapshot VARCHAR,
    quantity INT CHECK (quantity > 0),
    description TEXT,
    planned_hours_per_day DECIMAL(5,2) CHECK (planned_hours_per_day >= 0),
    planned_days_per_week INT CHECK (planned_days_per_week >= 0),
    planned_total_hours DECIMAL(10,2) CHECK (planned_total_hours >= 0),
    includes_housing BOOLEAN DEFAULT false,
    includes_transport BOOLEAN DEFAULT false,
    includes_epi BOOLEAN DEFAULT true,
    base_cost_hour DECIMAL(15,2) CHECK (base_cost_hour >= 0),
    sell_rate_hour DECIMAL(15,2) CHECK (sell_rate_hour >= 0),
    minimum_sell_rate_hour DECIMAL(15,2) CHECK (minimum_sell_rate_hour >= 0),
    recommended_sell_rate_hour DECIMAL(15,2) CHECK (recommended_sell_rate_hour >= 0),
    margin_percent DECIMAL(5,2),
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS core_comercial.estimacion_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    estimacion_item_id UUID NOT NULL REFERENCES core_comercial.estimacion_items(id) ON DELETE RESTRICT,
    cost_type VARCHAR CHECK (cost_type IN ('labor', 'housing', 'transport', 'epi', 'documentation', 'insurance', 'administrative', 'other')),
    description TEXT,
    quantity DECIMAL(10,2) CHECK (quantity > 0),
    unit_cost DECIMAL(15,2) CHECK (unit_cost >= 0),
    total_cost DECIMAL(15,2) CHECK (total_cost >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);


-- ========================================================================================
-- FASE 3: PEDIDOS
-- ========================================================================================

CREATE TABLE IF NOT EXISTS core_comercial.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    codigo VARCHAR NOT NULL,
    source_estimacion_id UUID REFERENCES core_comercial.estimaciones(id) ON DELETE RESTRICT,
    source_estimacion_version_id UUID REFERENCES core_comercial.estimacion_versions(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES core_common.clients(id) ON DELETE RESTRICT,
    client_site_id UUID NOT NULL REFERENCES core_common.client_sites(id) ON DELETE RESTRICT,
    order_type VARCHAR CHECK (order_type IN ('new_allocation', 'expansion', 'direct')),
    commercial_status VARCHAR DEFAULT 'draft' CHECK (commercial_status IN ('draft', 'active', 'suspended', 'cancelled', 'completed')),
    operational_status VARCHAR DEFAULT 'pending_operations' CHECK (operational_status IN ('pending_operations', 'partially_fulfilled', 'fulfilled')),
    commercial_owner_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    responsible_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    approved_at TIMESTAMPTZ,
    expected_start_date DATE,
    expected_end_date DATE,
    payment_terms TEXT,
    notes TEXT,
    total_cost_snapshot DECIMAL(15,2) CHECK (total_cost_snapshot >= 0),
    total_revenue_snapshot DECIMAL(15,2) CHECK (total_revenue_snapshot >= 0),
    margin_percent_snapshot DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(empresa_id, codigo)
);

CREATE TABLE IF NOT EXISTS core_comercial.pedido_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    pedido_id UUID NOT NULL REFERENCES core_comercial.pedidos(id) ON DELETE RESTRICT,
    source_estimacion_item_id UUID REFERENCES core_comercial.estimacion_items(id) ON DELETE RESTRICT,
    job_function_id UUID NOT NULL REFERENCES core_comercial.job_functions(id) ON DELETE RESTRICT,
    job_function_name_snapshot VARCHAR,
    description_snapshot TEXT,
    risk_level_snapshot VARCHAR,
    quantity_requested INT NOT NULL DEFAULT 1 CHECK (quantity_requested > 0),
    quantity_fulfilled INT NOT NULL DEFAULT 0 CHECK (quantity_fulfilled >= 0),
    planned_hours_per_day DECIMAL(5,2) CHECK (planned_hours_per_day >= 0),
    planned_days_per_week INT CHECK (planned_days_per_week >= 0),
    planned_total_hours DECIMAL(10,2) CHECK (planned_total_hours >= 0),
    sell_rate_hour_snapshot DECIMAL(15,2) CHECK (sell_rate_hour_snapshot >= 0),
    base_cost_hour_snapshot DECIMAL(15,2) CHECK (base_cost_hour_snapshot >= 0),
    margin_percent_snapshot DECIMAL(5,2),
    includes_housing BOOLEAN DEFAULT false,
    includes_transport BOOLEAN DEFAULT false,
    includes_epi BOOLEAN DEFAULT true,
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'fulfilled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

-- APPEND ONLY
CREATE TABLE IF NOT EXISTS core_comercial.pedido_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    pedido_id UUID NOT NULL REFERENCES core_comercial.pedidos(id) ON DELETE RESTRICT,
    event_type VARCHAR CHECK (event_type IN ('aditivo', 'scope_change', 'cancellation', 'replacement', 'relocation', 'other')),
    title VARCHAR NOT NULL,
    description TEXT,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

-- APPEND ONLY
CREATE TABLE IF NOT EXISTS core_comercial.pedido_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    pedido_id UUID NOT NULL REFERENCES core_comercial.pedidos(id) ON DELETE RESTRICT,
    old_commercial_status VARCHAR,
    new_commercial_status VARCHAR,
    old_operational_status VARCHAR,
    new_operational_status VARCHAR,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ========================================================================================
-- FASE 4: OPERAÇÕES E FASE 6: PERSONAL
-- ========================================================================================

CREATE TABLE IF NOT EXISTS core_personal.worker_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    worker_id UUID NOT NULL REFERENCES core_personal.workers(id) ON DELETE RESTRICT,
    pedido_id UUID NOT NULL REFERENCES core_comercial.pedidos(id) ON DELETE RESTRICT,
    pedido_item_id UUID NOT NULL REFERENCES core_comercial.pedido_items(id) ON DELETE RESTRICT,
    solicitud_id UUID, -- FK condicional (abaixo)
    client_id UUID NOT NULL REFERENCES core_common.clients(id) ON DELETE RESTRICT,
    client_site_id UUID NOT NULL REFERENCES core_common.client_sites(id) ON DELETE RESTRICT,
    job_function_id UUID NOT NULL REFERENCES core_comercial.job_functions(id) ON DELETE RESTRICT,
    job_function_name_snapshot VARCHAR NOT NULL,
    assignment_type VARCHAR CHECK (assignment_type IN ('new_hire', 'replacement', 'relocation', 'reactivation', 'temporary_test')),
    status VARCHAR DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'paused', 'completed', 'cancelled', 'replaced', 'relocated')),
    start_date DATE,
    end_date DATE,
    planned_start_date DATE,
    planned_end_date DATE,
    replacement_of_assignment_id UUID REFERENCES core_personal.worker_assignments(id) ON DELETE RESTRICT,
    source_type VARCHAR,
    source_id UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS core_operacoes.solicitudes_operativas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    codigo VARCHAR NOT NULL,
    source_module VARCHAR NOT NULL,
    source_entity_type VARCHAR NOT NULL,
    source_entity_id UUID NOT NULL,
    pedido_id UUID REFERENCES core_comercial.pedidos(id) ON DELETE RESTRICT,
    pedido_item_id UUID REFERENCES core_comercial.pedido_items(id) ON DELETE RESTRICT,
    tipo VARCHAR CHECK (tipo IN ('new_order', 'replacement', 'relocation', 'technical_test', 'field_trial', 'offboarding', 'scope_change', 'cancellation', 'document_request', 'logistics_request', 'billing_request', 'incident')),
    title VARCHAR NOT NULL,
    description TEXT,
    priority VARCHAR DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'blocked', 'completed', 'cancelled')),
    client_id UUID REFERENCES core_common.clients(id) ON DELETE RESTRICT,
    client_site_id UUID REFERENCES core_common.client_sites(id) ON DELETE RESTRICT,
    target_worker_id UUID REFERENCES core_personal.workers(id) ON DELETE RESTRICT,
    target_assignment_id UUID REFERENCES core_personal.worker_assignments(id) ON DELETE RESTRICT,
    target_pedido_item_id UUID REFERENCES core_comercial.pedido_items(id) ON DELETE RESTRICT,
    prueba_type VARCHAR CHECK (prueba_type IN ('technical_test', 'field_trial')),
    assigned_department_id UUID REFERENCES core_common.departments(id) ON DELETE RESTRICT,
    responsible_user_id UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    reason TEXT,
    due_date DATE,
    requested_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(empresa_id, codigo)
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_worker_assignment_solicitud' AND table_name = 'worker_assignments') THEN
        ALTER TABLE core_personal.worker_assignments ADD CONSTRAINT fk_worker_assignment_solicitud FOREIGN KEY (solicitud_id) REFERENCES core_operacoes.solicitudes_operativas(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- APPEND ONLY
CREATE TABLE IF NOT EXISTS core_operacoes.solicitud_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    solicitud_id UUID NOT NULL REFERENCES core_operacoes.solicitudes_operativas(id) ON DELETE RESTRICT,
    event_type VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

-- APPEND ONLY
CREATE TABLE IF NOT EXISTS core_operacoes.solicitud_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    solicitud_id UUID NOT NULL REFERENCES core_operacoes.solicitudes_operativas(id) ON DELETE RESTRICT,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ========================================================================================
-- FASE 5: PLAYBOOKS (MOTOR DE AUTOMATIZAÇÃO)
-- ========================================================================================

CREATE TABLE IF NOT EXISTS core_operacoes.playbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    code VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    solicitud_type VARCHAR NOT NULL,
    description TEXT,
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(empresa_id, code)
);

CREATE TABLE IF NOT EXISTS core_operacoes.playbook_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    playbook_id UUID NOT NULL REFERENCES core_operacoes.playbooks(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES core_common.departments(id) ON DELETE RESTRICT,
    title VARCHAR NOT NULL,
    description TEXT,
    priority VARCHAR DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    default_due_days INT DEFAULT 0,
    required BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 1,
    blocking BOOLEAN DEFAULT false,
    depends_on_step_id UUID REFERENCES core_operacoes.playbook_steps(id) ON DELETE RESTRICT,
    status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS core_operacoes.solicitud_tareas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core_common.empresas(id) ON DELETE RESTRICT,
    solicitud_id UUID NOT NULL REFERENCES core_operacoes.solicitudes_operativas(id) ON DELETE RESTRICT,
    playbook_step_id UUID REFERENCES core_operacoes.playbook_steps(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES core_common.departments(id) ON DELETE RESTRICT,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
    title VARCHAR NOT NULL,
    description TEXT,
    status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'blocked', 'completed', 'cancelled')),
    priority VARCHAR DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    blocked_by_task_id UUID REFERENCES core_operacoes.solicitud_tareas(id) ON DELETE RESTRICT,
    blocking BOOLEAN DEFAULT false,
    due_date DATE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ========================================================================================
-- FASE 7: TRIGGERS (UPDATED_AT) IDEMPOTENTES E ÍNDICES
-- ========================================================================================

DROP TRIGGER IF EXISTS update_departments_modtime ON core_common.departments;
CREATE TRIGGER update_departments_modtime BEFORE UPDATE ON core_common.departments FOR EACH ROW EXECUTE FUNCTION core_common.set_updated_at_and_user();

DROP TRIGGER IF EXISTS update_department_members_modtime ON core_common.department_members;
CREATE TRIGGER update_department_members_modtime BEFORE UPDATE ON core_common.department_members FOR EACH ROW EXECUTE FUNCTION core_common.set_updated_at_and_user();

DROP TRIGGER IF EXISTS update_estimaciones_modtime ON core_comercial.estimaciones;
CREATE TRIGGER update_estimaciones_modtime BEFORE UPDATE ON core_comercial.estimaciones FOR EACH ROW EXECUTE FUNCTION core_common.set_updated_at_and_user();

DROP TRIGGER IF EXISTS update_estimacion_versions_modtime ON core_comercial.estimacion_versions;
CREATE TRIGGER update_estimacion_versions_modtime BEFORE UPDATE ON core_comercial.estimacion_versions FOR EACH ROW EXECUTE FUNCTION core_common.set_updated_at_and_user();

DROP TRIGGER IF EXISTS update_estimacion_items_modtime ON core_comercial.estimacion_items;
CREATE TRIGGER update_estimacion_items_modtime BEFORE UPDATE ON core_comercial.estimacion_items FOR EACH ROW EXECUTE FUNCTION core_common.set_updated_at_and_user();

DROP TRIGGER IF EXISTS update_estimacion_costs_modtime ON core_comercial.estimacion_costs;
CREATE TRIGGER update_estimacion_costs_modtime BEFORE UPDATE ON core_comercial.estimacion_costs FOR EACH ROW EXECUTE FUNCTION core_common.set_updated_at_and_user();

DROP TRIGGER IF EXISTS update_pedidos_modtime ON core_comercial.pedidos;
CREATE TRIGGER update_pedidos_modtime BEFORE UPDATE ON core_comercial.pedidos FOR EACH ROW EXECUTE FUNCTION core_common.set_updated_at_and_user();

DROP TRIGGER IF EXISTS update_pedido_items_modtime ON core_comercial.pedido_items;
CREATE TRIGGER update_pedido_items_modtime BEFORE UPDATE ON core_comercial.pedido_items FOR EACH ROW EXECUTE FUNCTION core_common.set_updated_at_and_user();

DROP TRIGGER IF EXISTS update_solicitudes_operativas_modtime ON core_operacoes.solicitudes_operativas;
CREATE TRIGGER update_solicitudes_operativas_modtime BEFORE UPDATE ON core_operacoes.solicitudes_operativas FOR EACH ROW EXECUTE FUNCTION core_common.set_updated_at_and_user();

DROP TRIGGER IF EXISTS update_solicitud_tareas_modtime ON core_operacoes.solicitud_tareas;
CREATE TRIGGER update_solicitud_tareas_modtime BEFORE UPDATE ON core_operacoes.solicitud_tareas FOR EACH ROW EXECUTE FUNCTION core_common.set_updated_at_and_user();

DROP TRIGGER IF EXISTS update_playbooks_modtime ON core_operacoes.playbooks;
CREATE TRIGGER update_playbooks_modtime BEFORE UPDATE ON core_operacoes.playbooks FOR EACH ROW EXECUTE FUNCTION core_common.set_updated_at_and_user();

DROP TRIGGER IF EXISTS update_playbook_steps_modtime ON core_operacoes.playbook_steps;
CREATE TRIGGER update_playbook_steps_modtime BEFORE UPDATE ON core_operacoes.playbook_steps FOR EACH ROW EXECUTE FUNCTION core_common.set_updated_at_and_user();

DROP TRIGGER IF EXISTS update_worker_assignments_modtime ON core_personal.worker_assignments;
CREATE TRIGGER update_worker_assignments_modtime BEFORE UPDATE ON core_personal.worker_assignments FOR EACH ROW EXECUTE FUNCTION core_common.set_updated_at_and_user();

-- ÍNDICES SOLICITADOS (Evitando colisões se executado mais de uma vez)
CREATE INDEX IF NOT EXISTS idx_estimaciones_empresa_codigo ON core_comercial.estimaciones(empresa_id, codigo);
CREATE INDEX IF NOT EXISTS idx_pedidos_empresa_codigo ON core_comercial.pedidos(empresa_id, codigo);
CREATE INDEX IF NOT EXISTS idx_solicitudes_empresa_codigo ON core_operacoes.solicitudes_operativas(empresa_id, codigo);
CREATE INDEX IF NOT EXISTS idx_playbooks_empresa_sol_type ON core_operacoes.playbooks(empresa_id, solicitud_type, status);

CREATE INDEX IF NOT EXISTS idx_estimacion_versions_est ON core_comercial.estimacion_versions(estimacion_id);
CREATE INDEX IF NOT EXISTS idx_estimacion_items_empresa_version ON core_comercial.estimacion_items(empresa_id, estimacion_version_id);
CREATE INDEX IF NOT EXISTS idx_estimacion_costs_item ON core_comercial.estimacion_costs(estimacion_item_id);
CREATE INDEX IF NOT EXISTS idx_pedido_items_empresa_pedido ON core_comercial.pedido_items(empresa_id, pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_events_pedido ON core_comercial.pedido_events(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pedido_status_history_pedido ON core_comercial.pedido_status_history(pedido_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_timeline_solicitud ON core_operacoes.solicitud_timeline(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_comments_solicitud ON core_operacoes.solicitud_comments(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_playbook_steps_playbook ON core_operacoes.playbook_steps(playbook_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_tareas_solicitud ON core_operacoes.solicitud_tareas(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_solicitud_tareas_blocked ON core_operacoes.solicitud_tareas(blocked_by_task_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_target_assign ON core_operacoes.solicitudes_operativas(target_assignment_id);
CREATE INDEX IF NOT EXISTS idx_worker_assign_pedido_item ON core_personal.worker_assignments(pedido_item_id);
CREATE INDEX IF NOT EXISTS idx_worker_assign_solicitud ON core_personal.worker_assignments(solicitud_id);
CREATE INDEX IF NOT EXISTS idx_worker_assign_client ON core_personal.worker_assignments(client_id, client_site_id);

-- ========================================================================================
-- FASE 8: ROW LEVEL SECURITY (RLS) & GRANTS
-- ========================================================================================

-- Permissões Padrão (Sem GRANT UPDATE nas tabelas append-only)
GRANT SELECT, INSERT, UPDATE ON core_common.departments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON core_common.department_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON core_comercial.estimaciones TO authenticated;
GRANT SELECT, INSERT, UPDATE ON core_comercial.estimacion_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON core_comercial.estimacion_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON core_comercial.estimacion_costs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON core_comercial.pedidos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON core_comercial.pedido_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON core_operacoes.solicitudes_operativas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON core_operacoes.solicitud_tareas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON core_operacoes.playbooks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON core_operacoes.playbook_steps TO authenticated;
GRANT SELECT, INSERT, UPDATE ON core_personal.worker_assignments TO authenticated;

-- Permissões Append-Only
GRANT SELECT, INSERT ON core_comercial.pedido_events TO authenticated;
GRANT SELECT, INSERT ON core_comercial.pedido_status_history TO authenticated;
GRANT SELECT, INSERT ON core_operacoes.solicitud_timeline TO authenticated;
GRANT SELECT, INSERT ON core_operacoes.solicitud_comments TO authenticated;

-- Habilitando RLS
ALTER TABLE core_common.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_common.department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_comercial.estimaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_comercial.estimacion_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_comercial.estimacion_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_comercial.estimacion_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_comercial.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_comercial.pedido_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_comercial.pedido_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_comercial.pedido_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_operacoes.solicitudes_operativas ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_operacoes.solicitud_tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_operacoes.solicitud_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_operacoes.solicitud_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_operacoes.playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_operacoes.playbook_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.worker_assignments ENABLE ROW LEVEL SECURITY;

-- Limpeza de Policies Atuais para reescrita segura
DROP POLICY IF EXISTS "View departments if member" ON core_common.departments;
DROP POLICY IF EXISTS "Manage departments" ON core_common.departments;
DROP POLICY IF EXISTS "Update departments" ON core_common.departments;

DROP POLICY IF EXISTS "View department_members if member" ON core_common.department_members;
DROP POLICY IF EXISTS "Manage department_members" ON core_common.department_members;
DROP POLICY IF EXISTS "Update department_members" ON core_common.department_members;

DROP POLICY IF EXISTS "View estimaciones if member" ON core_comercial.estimaciones;
DROP POLICY IF EXISTS "Manage estimaciones" ON core_comercial.estimaciones;
DROP POLICY IF EXISTS "Update estimaciones" ON core_comercial.estimaciones;

DROP POLICY IF EXISTS "View estimacion_versions if member" ON core_comercial.estimacion_versions;
DROP POLICY IF EXISTS "Manage estimacion_versions" ON core_comercial.estimacion_versions;
DROP POLICY IF EXISTS "Update estimacion_versions" ON core_comercial.estimacion_versions;

DROP POLICY IF EXISTS "View estimacion_items if member" ON core_comercial.estimacion_items;
DROP POLICY IF EXISTS "Manage estimacion_items" ON core_comercial.estimacion_items;
DROP POLICY IF EXISTS "Update estimacion_items" ON core_comercial.estimacion_items;

DROP POLICY IF EXISTS "View estimacion_costs if member" ON core_comercial.estimacion_costs;
DROP POLICY IF EXISTS "Manage estimacion_costs" ON core_comercial.estimacion_costs;
DROP POLICY IF EXISTS "Update estimacion_costs" ON core_comercial.estimacion_costs;

DROP POLICY IF EXISTS "View pedidos if member" ON core_comercial.pedidos;
DROP POLICY IF EXISTS "Manage pedidos" ON core_comercial.pedidos;
DROP POLICY IF EXISTS "Update pedidos" ON core_comercial.pedidos;

DROP POLICY IF EXISTS "View pedido_items if member" ON core_comercial.pedido_items;
DROP POLICY IF EXISTS "Manage pedido_items" ON core_comercial.pedido_items;
DROP POLICY IF EXISTS "Update pedido_items" ON core_comercial.pedido_items;

DROP POLICY IF EXISTS "View pedido_events if member" ON core_comercial.pedido_events;
DROP POLICY IF EXISTS "Manage pedido_events" ON core_comercial.pedido_events;
DROP POLICY IF EXISTS "Update pedido_events" ON core_comercial.pedido_events;

DROP POLICY IF EXISTS "View pedido_status_history if member" ON core_comercial.pedido_status_history;
DROP POLICY IF EXISTS "Manage pedido_status_history" ON core_comercial.pedido_status_history;
DROP POLICY IF EXISTS "Update pedido_status_history" ON core_comercial.pedido_status_history;

DROP POLICY IF EXISTS "View solicitudes_operativas if member" ON core_operacoes.solicitudes_operativas;
DROP POLICY IF EXISTS "Manage solicitudes_operativas" ON core_operacoes.solicitudes_operativas;
DROP POLICY IF EXISTS "Update solicitudes_operativas" ON core_operacoes.solicitudes_operativas;

DROP POLICY IF EXISTS "View solicitud_tareas if member" ON core_operacoes.solicitud_tareas;
DROP POLICY IF EXISTS "Manage solicitud_tareas" ON core_operacoes.solicitud_tareas;
DROP POLICY IF EXISTS "Update solicitud_tareas" ON core_operacoes.solicitud_tareas;

DROP POLICY IF EXISTS "View solicitud_timeline if member" ON core_operacoes.solicitud_timeline;
DROP POLICY IF EXISTS "Manage solicitud_timeline" ON core_operacoes.solicitud_timeline;
DROP POLICY IF EXISTS "Update solicitud_timeline" ON core_operacoes.solicitud_timeline;

DROP POLICY IF EXISTS "View solicitud_comments if member" ON core_operacoes.solicitud_comments;
DROP POLICY IF EXISTS "Manage solicitud_comments" ON core_operacoes.solicitud_comments;
DROP POLICY IF EXISTS "Update solicitud_comments" ON core_operacoes.solicitud_comments;

DROP POLICY IF EXISTS "View playbooks if member" ON core_operacoes.playbooks;
DROP POLICY IF EXISTS "Manage playbooks" ON core_operacoes.playbooks;
DROP POLICY IF EXISTS "Update playbooks" ON core_operacoes.playbooks;

DROP POLICY IF EXISTS "View playbook_steps if member" ON core_operacoes.playbook_steps;
DROP POLICY IF EXISTS "Manage playbook_steps" ON core_operacoes.playbook_steps;
DROP POLICY IF EXISTS "Update playbook_steps" ON core_operacoes.playbook_steps;

DROP POLICY IF EXISTS "View worker_assignments if member" ON core_personal.worker_assignments;
DROP POLICY IF EXISTS "Manage worker_assignments" ON core_personal.worker_assignments;
DROP POLICY IF EXISTS "Update worker_assignments" ON core_personal.worker_assignments;

-- -------------------------------------------------------------------------
-- POLICIES DE RLS FORMATADAS
-- -------------------------------------------------------------------------

-- core_common.departments
CREATE POLICY "View departments if member" ON core_common.departments FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Manage departments" ON core_common.departments FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin'));
CREATE POLICY "Update departments" ON core_common.departments FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin')) WITH CHECK (core_common.has_role(empresa_id, 'super_admin'));

-- core_common.department_members
CREATE POLICY "View department_members if member" ON core_common.department_members FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Manage department_members" ON core_common.department_members FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin'));
CREATE POLICY "Update department_members" ON core_common.department_members FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin')) WITH CHECK (core_common.has_role(empresa_id, 'super_admin'));

-- core_comercial.*
CREATE POLICY "View estimaciones if member" ON core_comercial.estimaciones FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Manage estimaciones" ON core_comercial.estimaciones FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador'));
CREATE POLICY "Update estimaciones" ON core_comercial.estimaciones FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador')) WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador'));

CREATE POLICY "View estimacion_versions if member" ON core_comercial.estimacion_versions FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Manage estimacion_versions" ON core_comercial.estimacion_versions FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador'));
CREATE POLICY "Update estimacion_versions" ON core_comercial.estimacion_versions FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador')) WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador'));

CREATE POLICY "View estimacion_items if member" ON core_comercial.estimacion_items FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Manage estimacion_items" ON core_comercial.estimacion_items FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador'));
CREATE POLICY "Update estimacion_items" ON core_comercial.estimacion_items FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador')) WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador'));

CREATE POLICY "View estimacion_costs if member" ON core_comercial.estimacion_costs FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Manage estimacion_costs" ON core_comercial.estimacion_costs FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador'));
CREATE POLICY "Update estimacion_costs" ON core_comercial.estimacion_costs FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador')) WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador'));

CREATE POLICY "View pedidos if member" ON core_comercial.pedidos FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Manage pedidos" ON core_comercial.pedidos FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador'));
CREATE POLICY "Update pedidos" ON core_comercial.pedidos FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador')) WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador'));

CREATE POLICY "View pedido_items if member" ON core_comercial.pedido_items FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Manage pedido_items" ON core_comercial.pedido_items FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador') OR core_common.has_role(empresa_id, 'admin_rh'));
CREATE POLICY "Update pedido_items" ON core_comercial.pedido_items FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador') OR core_common.has_role(empresa_id, 'admin_rh')) WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador') OR core_common.has_role(empresa_id, 'admin_rh'));

-- APPEND ONLY POLICIES
CREATE POLICY "View pedido_events if member" ON core_comercial.pedido_events FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Manage pedido_events" ON core_comercial.pedido_events FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador'));

CREATE POLICY "View pedido_status_history if member" ON core_comercial.pedido_status_history FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Manage pedido_status_history" ON core_comercial.pedido_status_history FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador'));

-- core_operacoes.*
CREATE POLICY "View solicitudes_operativas if member" ON core_operacoes.solicitudes_operativas FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Manage solicitudes_operativas" ON core_operacoes.solicitudes_operativas FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador') OR core_common.has_role(empresa_id, 'admin_rh'));
CREATE POLICY "Update solicitudes_operativas" ON core_operacoes.solicitudes_operativas FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador') OR core_common.has_role(empresa_id, 'admin_rh')) WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador') OR core_common.has_role(empresa_id, 'admin_rh'));

CREATE POLICY "View solicitud_tareas if member" ON core_operacoes.solicitud_tareas FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Manage solicitud_tareas" ON core_operacoes.solicitud_tareas FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador') OR core_common.has_role(empresa_id, 'admin_rh'));
CREATE POLICY "Update solicitud_tareas" ON core_operacoes.solicitud_tareas FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador') OR core_common.has_role(empresa_id, 'admin_rh')) WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador') OR core_common.has_role(empresa_id, 'admin_rh'));

-- APPEND ONLY POLICIES
CREATE POLICY "View solicitud_timeline if member" ON core_operacoes.solicitud_timeline FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Manage solicitud_timeline" ON core_operacoes.solicitud_timeline FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador') OR core_common.has_role(empresa_id, 'admin_rh'));

CREATE POLICY "View solicitud_comments if member" ON core_operacoes.solicitud_comments FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Manage solicitud_comments" ON core_operacoes.solicitud_comments FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador') OR core_common.has_role(empresa_id, 'admin_rh'));

CREATE POLICY "View playbooks if member" ON core_operacoes.playbooks FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Manage playbooks" ON core_operacoes.playbooks FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador'));
CREATE POLICY "Update playbooks" ON core_operacoes.playbooks FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador')) WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador'));

CREATE POLICY "View playbook_steps if member" ON core_operacoes.playbook_steps FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Manage playbook_steps" ON core_operacoes.playbook_steps FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador'));
CREATE POLICY "Update playbook_steps" ON core_operacoes.playbook_steps FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador')) WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'operador'));

-- core_personal.*
CREATE POLICY "View worker_assignments if member" ON core_personal.worker_assignments FOR SELECT TO authenticated USING (core_common.is_member(empresa_id));
CREATE POLICY "Manage worker_assignments" ON core_personal.worker_assignments FOR INSERT TO authenticated WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin_rh'));
CREATE POLICY "Update worker_assignments" ON core_personal.worker_assignments FOR UPDATE TO authenticated USING (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin_rh')) WITH CHECK (core_common.has_role(empresa_id, 'super_admin') OR core_common.has_role(empresa_id, 'admin_rh'));
