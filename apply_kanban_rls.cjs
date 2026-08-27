require('dotenv').config();
const { Client } = require('pg');

async function fixRls() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  console.log('Aplicando RLS pública global para kanban_stages...');
  await c.query(`
    DROP POLICY IF EXISTS "Permitir leitura publica de estagios kanban" ON core_comercial.kanban_stages;
    DROP POLICY IF EXISTS "Leitura global de estagios kanban" ON core_comercial.kanban_stages;
    CREATE POLICY "Leitura global de estagios kanban" 
    ON core_comercial.kanban_stages 
    FOR SELECT 
    TO public 
    USING (true);
  `);
  await c.query("NOTIFY pgrst, 'reload schema';");
  console.log('✅ Política global TO public aplicada com sucesso!');

  await c.end();
}

fixRls();
