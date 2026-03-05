-- 1. Create schemas
CREATE SCHEMA IF NOT EXISTS core_common;
CREATE SCHEMA IF NOT EXISTS core_personal;

-- 2. Create core_common.user_memberships
CREATE TABLE IF NOT EXISTS core_common.user_memberships (
    user_id uuid NOT NULL,
    empresa_id uuid NOT NULL,
    role text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, empresa_id)
);

-- Note: In Supabase, users are in the auth.users table.
-- If you face permission issues or cross-schema restrictions depending on the specific
-- Supabase version/setup, you might remove this FK, but standard setups support it.
ALTER TABLE core_common.user_memberships 
    ADD CONSTRAINT fk_user_memberships_auth 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Create core_personal.workers
CREATE TABLE IF NOT EXISTS core_personal.workers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    name text NOT NULL,
    document text,
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now()
);

-- 4. Create core_personal.worker_benefit_housing
CREATE TABLE IF NOT EXISTS core_personal.worker_benefit_housing (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id uuid NOT NULL REFERENCES core_personal.workers(id) ON DELETE CASCADE,
    empresa_id uuid NOT NULL,
    address text,
    allowance_amount numeric(10, 2),
    created_at timestamptz DEFAULT now()
);

-- 5. Create core_personal.ledger_types
/*
 * COMO ALIMENTAR ESTA TABELA NO FUTURO:
 * 
 * Esta tabela define os tipos de lançamentos por empresa. 
 * Para incluir um benefício como AUX_MORADIA, use o script abaixo, 
 * substituindo o '<UUID_DA_EMPRESA>' pelo empresa_id real:
 * 
 * INSERT INTO core_personal.ledger_types (empresa_id, code, description)
 * VALUES 
 *   ('<UUID_DA_EMPRESA>', 'AUX_MORADIA', 'Auxílio Moradia'),
 *   ('<UUID_DA_EMPRESA>', 'SALARIO_BASE', 'Salário Base')
 * ON CONFLICT (empresa_id, code) DO NOTHING;
 */
CREATE TABLE IF NOT EXISTS core_personal.ledger_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    code text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(empresa_id, code)
);

-- 6. Create core_personal.worker_ledger_entries
CREATE TABLE IF NOT EXISTS core_personal.worker_ledger_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id uuid NOT NULL REFERENCES core_personal.workers(id) ON DELETE CASCADE,
    empresa_id uuid NOT NULL,
    ledger_type_id uuid NOT NULL REFERENCES core_personal.ledger_types(id) ON DELETE RESTRICT,
    amount numeric(10, 2) NOT NULL,
    entry_date date NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 7. Enable RLS on all tables (No policies created yet per requirements)
ALTER TABLE core_common.user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.worker_benefit_housing ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.ledger_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.worker_ledger_entries ENABLE ROW LEVEL SECURITY;
