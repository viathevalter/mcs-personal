require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const connUrl = process.env.VITE_PROD_SUPABASE_DB_URL.replace(':5432', ':6543');
const client = new Client({ connectionString: connUrl });

async function check() {
  await client.connect();

  const res = await client.query(`
    SELECT l.id, l.name, l.company_name, l.email, l.phone, l.empresa_id, l.stage_id, 
           s.name as stage_name, s.order_index, s.empresa_id as stage_empresa_id,
           l.notes, l.updated_at, l.created_at
    FROM core_comercial.leads l
    LEFT JOIN core_comercial.kanban_stages s ON s.id = l.stage_id
    WHERE l.notes ILIKE '%PRESUPUESTO%' 
       OR l.notes ILIKE '%ORÇAMENTO%' 
       OR l.notes ILIKE '%PREVENTIVO%' 
       OR l.notes ILIKE '%DEVIS%'
       OR l.notes ILIKE '%SOLICITUD%'
       OR l.notes ILIKE '%SOLICITAÇÃO%'
    ORDER BY l.updated_at DESC;
  `);

  console.log(`=== FOUND ${res.rows.length} LEADS WITH BUDGET REQUESTS ===\n`);
  for (const r of res.rows) {
    console.log(`------------------------------------------------------------`);
    console.log(`ID: ${r.id}`);
    console.log(`Company: ${r.company_name} | Contact: ${r.name} | Email: ${r.email} | Phone: ${r.phone}`);
    console.log(`Lead Empresa ID: ${r.empresa_id}`);
    console.log(`Current Stage: [${r.stage_id}] "${r.stage_name}" (order_index: ${r.order_index}) [Stage Empresa ID: ${r.stage_empresa_id}]`);
    console.log(`Created: ${r.created_at} | Updated: ${r.updated_at}`);
    console.log(`Notes:\n${r.notes}`);
  }

  await client.end();
}

check().catch(console.error);
