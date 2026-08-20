import pg from 'pg';
const { Client } = pg;

async function checkTables() {
    const prodClient = new Client({
        connectionString: 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres'
    });
    await prodClient.connect();

    console.log("Connected to PROD DB!");

    const tables = await prodClient.query(`
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_name IN ('generated_documents', 'document_templates');
    `);
    console.log("PROD Tables:", tables.rows);

    // Let's ensure public.generated_documents exists or create a view/table in public
    await prodClient.query(`
        CREATE SCHEMA IF NOT EXISTS core_docs;

        CREATE TABLE IF NOT EXISTS public.generated_documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            empresa_id UUID,
            template_id UUID,
            target_type VARCHAR(20) NOT NULL,
            client_id UUID,
            worker_id UUID,
            title VARCHAR(255) NOT NULL,
            document_url TEXT NOT NULL,
            pdf_url TEXT,
            signature_status VARCHAR(20) DEFAULT 'pending',
            public_token VARCHAR(100) UNIQUE NOT NULL,
            signature_url TEXT,
            signed_at TIMESTAMPTZ,
            signed_by_name VARCHAR(255),
            signed_ip VARCHAR(50),
            custom_data JSONB,
            created_at TIMESTAMPTZ DEFAULT now(),
            created_by UUID
        );

        CREATE TABLE IF NOT EXISTS public.document_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            empresa_id UUID,
            name VARCHAR(255) NOT NULL,
            target_type VARCHAR(20) NOT NULL,
            description TEXT,
            file_url TEXT NOT NULL,
            variables JSONB,
            created_at TIMESTAMPTZ DEFAULT now(),
            created_by UUID
        );

        -- Grant permissions
        GRANT ALL ON TABLE public.generated_documents TO anon, authenticated, service_role;
        GRANT ALL ON TABLE public.document_templates TO anon, authenticated, service_role;

        -- RLS Policies
        ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Allow all for generated_documents" ON public.generated_documents;
        CREATE POLICY "Allow all for generated_documents" ON public.generated_documents FOR ALL TO public USING (true) WITH CHECK (true);

        DROP POLICY IF EXISTS "Allow all for document_templates" ON public.document_templates;
        CREATE POLICY "Allow all for document_templates" ON public.document_templates FOR ALL TO public USING (true) WITH CHECK (true);
    `);
    console.log("PROD public tables ensured and configured!");

    // DEV DB
    const devClient = new Client({
        connectionString: 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:6543/postgres'
    });
    await devClient.connect();

    await devClient.query(`
        CREATE TABLE IF NOT EXISTS public.generated_documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            empresa_id UUID,
            template_id UUID,
            target_type VARCHAR(20) NOT NULL,
            client_id UUID,
            worker_id UUID,
            title VARCHAR(255) NOT NULL,
            document_url TEXT NOT NULL,
            pdf_url TEXT,
            signature_status VARCHAR(20) DEFAULT 'pending',
            public_token VARCHAR(100) UNIQUE NOT NULL,
            signature_url TEXT,
            signed_at TIMESTAMPTZ,
            signed_by_name VARCHAR(255),
            signed_ip VARCHAR(50),
            custom_data JSONB,
            created_at TIMESTAMPTZ DEFAULT now(),
            created_by UUID
        );

        CREATE TABLE IF NOT EXISTS public.document_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            empresa_id UUID,
            name VARCHAR(255) NOT NULL,
            target_type VARCHAR(20) NOT NULL,
            description TEXT,
            file_url TEXT NOT NULL,
            variables JSONB,
            created_at TIMESTAMPTZ DEFAULT now(),
            created_by UUID
        );

        GRANT ALL ON TABLE public.generated_documents TO anon, authenticated, service_role;
        GRANT ALL ON TABLE public.document_templates TO anon, authenticated, service_role;

        ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Allow all for generated_documents" ON public.generated_documents;
        CREATE POLICY "Allow all for generated_documents" ON public.generated_documents FOR ALL TO public USING (true) WITH CHECK (true);

        DROP POLICY IF EXISTS "Allow all for document_templates" ON public.document_templates;
        CREATE POLICY "Allow all for document_templates" ON public.document_templates FOR ALL TO public USING (true) WITH CHECK (true);
    `);
    console.log("DEV public tables ensured and configured!");

    // If core_docs.generated_documents has data, copy to public.generated_documents
    try {
        await prodClient.query(`
            INSERT INTO public.generated_documents SELECT * FROM core_docs.generated_documents
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log("Copied core_docs.generated_documents data to public.generated_documents in PROD");
    } catch (e) {
        console.log("core_docs copy note:", e.message);
    }

    await prodClient.end();
    await devClient.end();
}

checkTables().catch(console.error);
