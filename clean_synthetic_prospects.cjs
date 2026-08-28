require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

async function cleanSyntheticLeads() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  console.log("🧹 Limpando os registros sintéticos gerados pelo script de polos...");

  // 1. Identificar e excluir de core_comercial.leads
  const delLeadsRes = await c.query(`
    DELETE FROM core_comercial.leads 
    WHERE created_at >= '2026-08-27 17:35:00+00' 
      AND origen_lead = 'prospeccao_b2b';
  `);
  console.log(`🗑️ Removidos ${delLeadsRes.rowCount} leads sintéticos de core_comercial.leads.`);

  // 2. Identificar e excluir de core_comercial.lead_prospecting_results das missões 10 a 15
  const delProspectingRes = await c.query(`
    DELETE FROM core_comercial.lead_prospecting_results 
    WHERE job_id IN (
      '169610a1-ba9c-4086-8490-f064fbf80db4',
      'c61a7bee-c1b5-4c91-8339-0f303a7b49c5',
      'ad869435-b5f3-4a98-8229-932693231d40',
      'b871bee9-b8ed-48f6-aec3-a97f5325c8cb',
      '7df9ee6a-25d9-42c3-98f7-bcc4159713fa',
      'fab3cc4b-b371-4754-b608-bdaa4bd5a5d6'
    );
  `);
  console.log(`🗑️ Removidos ${delProspectingRes.rowCount} resultados sintéticos de lead_prospecting_results.`);

  // 3. Resetar os contadores das missões 10 a 15 para 0
  await c.query(`
    UPDATE core_comercial.lead_prospecting_jobs 
    SET processed_count = 0, found_emails_count = 0, status = 'pending', updated_at = NOW() 
    WHERE id IN (
      '169610a1-ba9c-4086-8490-f064fbf80db4',
      'c61a7bee-c1b5-4c91-8339-0f303a7b49c5',
      'ad869435-b5f3-4a98-8229-932693231d40',
      'b871bee9-b8ed-48f6-aec3-a97f5325c8cb',
      '7df9ee6a-25d9-42c3-98f7-bcc4159713fa',
      'fab3cc4b-b371-4754-b608-bdaa4bd5a5d6'
    );
  `);
  console.log(`🔄 Contadores das missões resetados para 0.`);

  const countRes = await c.query("SELECT count(*) FROM core_comercial.leads WHERE empresa_id = '847796c4-b253-4e53-9e6b-34a127ec7d85';");
  console.log(`📊 Base de Leads Real & Limpa da Luminous: ${countRes.rows[0].count} leads.`);

  await c.end();
}

cleanSyntheticLeads();
