require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const connUrl = process.env.VITE_PROD_SUPABASE_DB_URL.replace(':5432', ':6543');
const client = new Client({ connectionString: connUrl });

async function checkAll() {
  await client.connect();

  console.log("=== CHECKING ALL COMPANIES AND THEIR KANBAN STAGES ===");
  const companiesRes = await client.query(`
    SELECT id, nome, codigo FROM core_common.empresas WHERE is_active = true;
  `);
  console.table(companiesRes.rows);

  const stagesRes = await client.query(`
    SELECT s.id, s.empresa_id, e.nome as empresa_nome, s.name, s.name_es, s.order_index, s.color
    FROM core_comercial.kanban_stages s
    LEFT JOIN core_common.empresas e ON e.id = s.empresa_id
    ORDER BY s.empresa_id, s.order_index;
  `);
  console.table(stagesRes.rows);

  console.log("\n=== CHECKING ALL LEADS WITH PRESUPUESTO / ORÇAMENTO / ESTIMATIVA ===");
  const budgetLeads = await client.query(`
    SELECT l.id, l.name, l.company_name, l.email, l.phone, l.empresa_id, l.stage_id,
           s.name as current_stage_name, s.order_index as current_stage_index, s.empresa_id as stage_empresa_id,
           e.nome as lead_empresa_nome
    FROM core_comercial.leads l
    LEFT JOIN core_comercial.kanban_stages s ON s.id = l.stage_id
    LEFT JOIN core_common.empresas e ON e.id = l.empresa_id
    WHERE l.notes ILIKE '%SOLICITUD DE PRESUPUESTO%'
       OR l.notes ILIKE '%SOLICITAÇÃO DE ORÇAMENTO%'
       OR l.notes ILIKE '%RICHIESTA DI PREVENTIVO%'
       OR l.notes ILIKE '%DEMANDE DE DEVIS%'
    ORDER BY l.updated_at DESC;
  `);
  console.table(budgetLeads.rows);

  await client.end();
}

checkAll().catch(console.error);
