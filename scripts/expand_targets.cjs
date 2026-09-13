const { Client } = require('pg');
require('dotenv').config();

async function expandAllTargets() {
  const client = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await client.connect();

  console.log('🔄 Conectado ao banco de dados de Produção...');

  // Reativar todas as 18 missões com meta expandida de 2.000 leads cada
  // 18 missões * 2.000 = 36.000 leads potenciais!
  const res = await client.query(`
    UPDATE core_comercial.lead_prospecting_jobs
    SET target_count = 2000,
        status = 'processing',
        updated_at = NOW();
  `);

  console.log(`✅ Atualizadas ${res.rowCount} missões para target_count = 2000 e status = 'processing'!`);

  const updatedJobs = await client.query(`
    SELECT title, found_emails_count, target_count, status 
    FROM core_comercial.lead_prospecting_jobs 
    ORDER BY created_at ASC;
  `);

  console.log('\nPainel das 18 Missões Atualizadas:');
  console.table(updatedJobs.rows);

  await client.end();
}

expandAllTargets().catch(console.error);
