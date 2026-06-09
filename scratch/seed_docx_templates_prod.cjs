const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';
const supabaseUrl = 'https://unbepkdzvsfvylnysrcq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw';

async function run() {
    const pgClient = new Client({ connectionString: prodConnectionString });
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
        await pgClient.connect();
        console.log("Connected to PROD DB. Creating temporary upload policy for proposal-templates...");
        
        // Create temporary policy for anon upload
        await pgClient.query(`
            DROP POLICY IF EXISTS "Permitir tudo para anonimo em proposal-templates" ON storage.objects;
            CREATE POLICY "Permitir tudo para anonimo em proposal-templates"
            ON storage.objects FOR ALL TO anon, authenticated
            USING (bucket_id = 'proposal-templates')
            WITH CHECK (bucket_id = 'proposal-templates');
        `);
        console.log("Temporary policy created.");

        async function uploadFile(localPath, storageName) {
            console.log(`Uploading ${localPath} as ${storageName}...`);
            const fileBuffer = fs.readFileSync(localPath);
            
            // Delete first if exists to emulate overwrite
            await supabase.storage
                .from('proposal-templates')
                .remove([storageName]);

            const { data, error } = await supabase.storage
                .from('proposal-templates')
                .upload(storageName, fileBuffer, {
                    contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    upsert: true
                });

            if (error) {
                throw error;
            }
            console.log(`Successfully uploaded: ${storageName}`, data);
        }

        await uploadFile('scratch/default.docx', 'default.docx');
        await uploadFile('scratch/default_contrato.docx', 'default_contrato.docx');

    } catch (err) {
        console.error("Error:", err);
    } finally {
        // Clean up temporary policy
        try {
            console.log("Cleaning up temporary policy...");
            await pgClient.query(`
                DROP POLICY IF EXISTS "Permitir tudo para anonimo em proposal-templates" ON storage.objects;
            `);
            console.log("Cleaned up policy.");
        } catch (e) {
            console.error("Error during cleanup:", e.message);
        }
        await pgClient.end();
    }
}

run();
