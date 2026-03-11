-- Create discount_categories table
CREATE TABLE IF NOT EXISTS core_personal.discount_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(empresa_id, name)
);

-- Create benefit_categories table
CREATE TABLE IF NOT EXISTS core_personal.benefit_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(empresa_id, name)
);

-- Enable RLS
ALTER TABLE core_personal.discount_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.benefit_categories ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies for Admin (Superadmin, Admin, Operador)
CREATE POLICY "Enable ALL for authenticated admins on discount_categories" 
ON core_personal.discount_categories FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_rh', 'operador'))
);

CREATE POLICY "Enable ALL for authenticated admins on benefit_categories" 
ON core_personal.benefit_categories FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin_rh', 'operador'))
);

-- Insert default categories for existing companies (Optional seed)
-- We will leave this table empty by default and let the admins populate it,
-- or the frontend will fallback to the hardcoded list if the table is empty for a company.
