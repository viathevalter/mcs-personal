const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const pgClient = new Client({ connectionString: devConnectionString });
    await pgClient.connect();

    try {
        console.log("Creating bucket 'mcs-personal-docs' in storage.buckets...");
        await pgClient.query(`
            INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
            VALUES (
                'mcs-personal-docs', 
                'mcs-personal-docs', 
                false, 
                15728640, -- 15MB
                ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
            )
            ON CONFLICT (id) DO NOTHING;
        `);
        console.log("Bucket created successfully.");

        console.log("Creating RLS policies for 'mcs-personal-docs' on storage.objects...");
        
        // Drop existing policies if any
        await pgClient.query(`
            DROP POLICY IF EXISTS "Authenticated users can read mcs-personal-docs" ON storage.objects;
            DROP POLICY IF EXISTS "Admins and CAE compliance can manage mcs-personal-docs" ON storage.objects;
        `);

        // Create select policy
        await pgClient.query(`
            CREATE POLICY "Authenticated users can read mcs-personal-docs"
            ON storage.objects FOR SELECT TO authenticated
            USING (bucket_id = 'mcs-personal-docs');
        `);

        // Create write/management policy
        await pgClient.query(`
            CREATE POLICY "Admins and CAE compliance can manage mcs-personal-docs"
            ON storage.objects FOR ALL TO authenticated
            USING (
                bucket_id = 'mcs-personal-docs' AND (
                    EXISTS (
                        SELECT 1 FROM public.user_roles
                        WHERE user_roles.user_id = auth.uid()
                        AND user_roles.role = ANY (ARRAY['super_admin'::app_role, 'admin_rh'::app_role])
                    ) OR EXISTS (
                        SELECT 1 FROM core_common.user_memberships
                        WHERE user_memberships.user_id = auth.uid()
                        AND user_memberships.role = ANY (ARRAY['super_admin', 'admin', 'admin_rh', 'cae_compliance'])
                        AND user_memberships.is_active = true
                    )
                )
            )
            WITH CHECK (
                bucket_id = 'mcs-personal-docs' AND (
                    EXISTS (
                        SELECT 1 FROM public.user_roles
                        WHERE user_roles.user_id = auth.uid()
                        AND user_roles.role = ANY (ARRAY['super_admin'::app_role, 'admin_rh'::app_role])
                    ) OR EXISTS (
                        SELECT 1 FROM core_common.user_memberships
                        WHERE user_memberships.user_id = auth.uid()
                        AND user_memberships.role = ANY (ARRAY['super_admin', 'admin', 'admin_rh', 'cae_compliance'])
                        AND user_memberships.is_active = true
                    )
                )
            );
        `);
        console.log("Policies created successfully.");

    } catch (err) {
        console.error("Error setting up storage bucket and policies:", err);
    } finally {
        await pgClient.end();
    }
}

run();
