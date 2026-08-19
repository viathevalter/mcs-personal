const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkKanbanAndResend() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();

    console.log(`=== STAGES IN KANBAN ===`);
    const stages = await client.query(`
      SELECT id, name, order_index, color 
      FROM core_comercial.kanban_stages 
      ORDER BY order_index ASC;
    `);
    console.table(stages.rows);

    console.log(`\n=== LEADS BY STAGE ===`);
    const counts = await client.query(`
      SELECT 
        s.name, 
        s.order_index, 
        count(l.id) as total_leads
      FROM core_comercial.kanban_stages s
      LEFT JOIN core_comercial.leads l ON l.stage_id = s.id
      GROUP BY s.name, s.order_index
      ORDER BY s.order_index ASC;
    `);
    console.table(counts.rows);

    console.log(`\n=== VERIFYING WEBHOOK / RESEND LOGS ===`);
    const resendEmails = await client.query(`
      SELECT 
        count(*) as total_sent_queue,
        min(sent_at) as started_at,
        max(sent_at) as completed_at
      FROM core_comercial.marketing_campaign_queue
      WHERE campaign_id = 'e42297ad-5865-4ab8-a635-4b1150a36ae4';
    `);
    console.table(resendEmails.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

checkKanbanAndResend();
