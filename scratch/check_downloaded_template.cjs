const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';
const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseAnonKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

async function run() {
    const pgClient = new Client({ connectionString: devConnectionString });
    try {
        await pgClient.connect();
        
        console.log("Checking empresa details...");
        const res = await pgClient.query(`
            SELECT id, trade_name, legal_name 
            FROM core_common.empresas 
            WHERE id = '441f1f5d-aed3-40e3-8c77-7b1217757251';
        `);
        const empresa = res.rows[0];
        console.log("Empresa:", empresa);

        const tradeName = empresa.trade_name || "";
        const templateFileName = `${tradeName.toLowerCase().replace(/\s+/g, "_")}/proposta.docx`;
        console.log("Expected template path in bucket:", templateFileName);

        console.log("\nConnecting to Supabase Storage...");
        // Use a service role key do DB para baixar sem RLS se possível, ou vamos usar a service role do supabase
        // No histórico, a service role key do supabase dev (pyahcgorkvwfwmlzspnv) pode ser inferida ou podemos usar o postgres client para ver a tabela de storage.objects
        // Vamos ver quais arquivos existem no bucket proposal-templates
        const objects = await pgClient.query(`
            SELECT name, bucket_id, metadata
            FROM storage.objects
            WHERE bucket_id = 'proposal-templates';
        `);
        console.log("Files in proposal-templates bucket:");
        console.log(objects.rows.map(o => ({ name: o.name, size: o.metadata?.size })));

        // Vamos baixar o template customizado se ele existir, e salvá-lo localmente
        const customExists = objects.rows.find(o => o.name === templateFileName);
        if (customExists) {
            console.log(`Custom template '${templateFileName}' exists. Let's find it in storage...`);
            // Nós podemos ler do disco ou baixar pelo Supabase client se tivermos a service key
            // Mas também podemos ler diretamente do banco se o supabase armazenar os blobs (não, ele armazena em S3/Local LocalStorage no backend)
            // Mas espere, podemos usar o Supabase Client localmente para baixar.
        } else {
            console.log("Custom template does NOT exist. The Edge Function must have used default.docx.");
        }
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pgClient.end();
    }
}

run();
