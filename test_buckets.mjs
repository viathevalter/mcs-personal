import pg from 'pg';
const { Client } = pg;

async function checkAndCreateBuckets() {
    const prodClient = new Client({
        connectionString: 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres'
    });
    await prodClient.connect();
    
    console.log("Connected to PROD!");
    const resProd = await prodClient.query('SELECT id, name, public FROM storage.buckets;');
    console.log("PROD Buckets:\n", resProd.rows);

    await prodClient.query(`
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES ('documents', 'documents', true, 52428800, NULL)
        ON CONFLICT (id) DO UPDATE SET public = true;

        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES ('signatures', 'signatures', true, 52428800, NULL)
        ON CONFLICT (id) DO UPDATE SET public = true;
    `);
    console.log("Ensured 'documents' and 'signatures' buckets in PROD!");

    // Check RLS policies on storage.objects
    await prodClient.query(`
        CREATE POLICY "Allow public read on documents bucket"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'documents');

        CREATE POLICY "Allow public insert on documents bucket"
        ON storage.objects FOR INSERT
        TO public
        WITH CHECK (bucket_id = 'documents');

        CREATE POLICY "Allow public update on documents bucket"
        ON storage.objects FOR UPDATE
        TO public
        USING (bucket_id = 'documents');

        CREATE POLICY "Allow public read on signatures bucket"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'signatures');

        CREATE POLICY "Allow public insert on signatures bucket"
        ON storage.objects FOR INSERT
        TO public
        WITH CHECK (bucket_id = 'signatures');
    `).catch(e => console.log("Policies note (might already exist):", e.message));

    // DEV DB
    const devClient = new Client({
        connectionString: 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:6543/postgres'
    });
    await devClient.connect();
    await devClient.query(`
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES ('documents', 'documents', true, 52428800, NULL)
        ON CONFLICT (id) DO UPDATE SET public = true;

        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES ('signatures', 'signatures', true, 52428800, NULL)
        ON CONFLICT (id) DO UPDATE SET public = true;
    `);
    console.log("Ensured 'documents' and 'signatures' buckets in DEV!");

    await prodClient.end();
    await devClient.end();
}

checkAndCreateBuckets().catch(console.error);
