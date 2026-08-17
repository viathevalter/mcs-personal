const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();

    console.log(`=== CHECKING LEADS STAGE_ID IN PROD ===`);
    const res = await client.query(`
      SELECT 
        l.stage_id,
        s.name as stage_name,
        s.order_index,
        s.empresa_id as stage_empresa_id,
        count(*) as lead_count
      FROM core_comercial.leads l
      LEFT JOIN core_comercial.kanban_stages s ON s.id = l.stage_id
      GROUP BY l.stage_id, s.name, s.order_index, s.empresa_id
      ORDER BY s.order_index, lead_count DESC;
    `);
    console.table(res.rows);

    console.log(`\n=== CHECKING ALL KANBAN STAGES ===`);
    const allStages = await client.query(`
      SELECT id, empresa_id, name, order_index
      FROM core_comercial.kanban_stages
      ORDER BY order_index, empresa_id;
    `);
    console.table(allStages.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
