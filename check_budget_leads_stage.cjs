require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const connUrl = process.env.VITE_PROD_SUPABASE_DB_URL.replace(':5432', ':6543');
const client = new Client({ connectionString: connUrl });

async function check() {
  await client.connect();

  console.log("=== CHECKING MAIKA LORENZO / METAL ABGA ===");
  const maikaRes = await client.query(`
    SELECT l.id, l.name, l.company_name, l.email, l.notes, l.stage_id, l.empresa_id, l.updated_at, s.name as stage_name, s.order_index, s.empresa_id as stage_empresa_id
    FROM core_comercial.leads l
    LEFT JOIN core_comercial.kanban_stages s ON s.id = l.stage_id
    WHERE l.email ILIKE '%metalabga%' OR l.name ILIKE '%Maika%' OR l.company_name ILIKE '%METAL ABGA%';
  `);
  console.log("MAIKA LEAD:", JSON.stringify(maikaRes.rows, null, 2));

  console.log("\n=== ALL STAGES IN CRM ===");
  const stagesRes = await client.query(`
    SELECT id, empresa_id, name, name_es, order_index, color 
    FROM core_comercial.kanban_stages 
    ORDER BY empresa_id, order_index;
  `);
  console.log("STAGES:", JSON.stringify(stagesRes.rows, null, 2));

  console.log("\n=== LEADS WITH BUDGET/PROPOSAL IN NOTES ===");
  const budgetLeads = await client.query(`
    SELECT l.id, l.name, l.company_name, l.email, l.empresa_id, l.stage_id, s.name as stage_name, s.order_index, l.updated_at, LEFT(l.notes, 200) as note_sample
    FROM core_comercial.leads l
    LEFT JOIN core_comercial.kanban_stages s ON s.id = l.stage_id
    WHERE l.notes ILIKE '%PRESUPUESTO%' 
       OR l.notes ILIKE '%ORÇAMENTO%' 
       OR l.notes ILIKE '%PREVENTIVO%' 
       OR l.notes ILIKE '%DEVIS%'
       OR l.notes ILIKE '%SOLICITUD%'
       OR l.notes ILIKE '%SOLICITAÇÃO%';
  `);
  console.log(`Found ${budgetLeads.rows.length} leads with budget notes:`);
  for (const row of budgetLeads.rows) {
    console.log(`- [${row.id}] ${row.company_name} (${row.name}) | Stage: ${row.stage_name} (order: ${row.order_index}) | Updated: ${row.updated_at}`);
  }

  // Check interactions for MAIKA
  const maikaId = maikaRes.rows[0]?.id;
  if (maikaId) {
    const interRes = await client.query(`
      SELECT * FROM core_comercial.lead_interactions WHERE lead_id = $1 OR details ILIKE '%metalabga%' ORDER BY created_at DESC;
    `, [maikaId]).catch(() => ({ rows: [] }));
    console.log("\n=== INTERACTIONS FOR MAIKA ===", interRes.rows);

    const queueRes = await client.query(`
      SELECT q.*, c.name as campaign_name 
      FROM core_comercial.marketing_campaign_queue q
      LEFT JOIN core_comercial.marketing_campaigns c ON c.id = q.campaign_id
      WHERE q.lead_id = $1;
    `, [maikaId]).catch(() => ({ rows: [] }));
    console.log("\n=== QUEUE ITEMS FOR MAIKA ===", queueRes.rows);
  }

  await client.end();
}

check().catch(console.error);
