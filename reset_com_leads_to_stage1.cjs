require('dotenv').config();
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function resetComLeads() {
  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  console.log('=== RESETANDO LEADS .COM PARA O ESTÁGIO INICIAL ===');
  
  // Buscar o id do Estágio 1 (Novo / Sem Contato)
  const stageRes = await client.query(`
    SELECT id, name FROM core_comercial.kanban_stages WHERE order_index = 1 LIMIT 1;
  `);
  const stage1Id = stageRes.rows[0]?.id;

  // Atualizar todos os leads .com que foram marcados como enviados para que fiquem disponíveis para novo disparo correto
  const updateRes = await client.query(`
    UPDATE core_comercial.leads
    SET stage_id = $1,
        updated_at = NOW()
    WHERE email LIKE '%.com'
      AND id IN (
        SELECT lead_id FROM core_comercial.marketing_campaign_queue
      );
  `, [stage1Id]);

  console.log(`✅ Total de leads .com recuperados e resetados para o Estágio 1: ${updateRes.rowCount}`);

  await client.end();
}

resetComLeads();
