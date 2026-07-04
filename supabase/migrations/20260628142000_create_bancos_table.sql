-- Create public.bancos table
CREATE TABLE IF NOT EXISTS public.bancos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id INTEGER,
    nome_banco TEXT NOT NULL,
    agencia TEXT,
    conta TEXT,
    iban TEXT,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grant permissions
GRANT ALL ON TABLE public.bancos TO anon, authenticated, service_role;
