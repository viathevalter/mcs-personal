require('dotenv').config();
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function check() {
  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  console.log('=== 1. CAMPANHA CARMONA ===');
  const camp = await client.query(`
    SELECT id, title, status, scheduled_at, template_id, empresa_id, created_at, updated_at
    FROM core_comercial.marketing_campaigns
    WHERE LOWER(title) LIKE '%carmona%'
    ORDER BY created_at DESC;
  `);
  console.table(camp.rows);

  if (camp.rows.length > 0) {
    const cId = camp.rows[0].id;
    console.log('\n=== 2. FILA DE ENVIO (marketing_campaign_queue) ===');
    const queue = await client.query(`
      SELECT q.*, l.email, l.name
      FROM core_comercial.marketing_campaign_queue q
      LEFT JOIN core_comercial.leads l ON l.id = q.lead_id
      WHERE q.campaign_id = $1;
    `, [cId]);
    console.table(queue.rows);

    console.log('\n=== 3. CONFIGURAÇÃO DE ENVIO / RESEND / SMTP NA EMPRESA ===');
    const emp = await client.query(`
      SELECT id, name, email, resend_api_key, smtp_host, smtp_user, smtp_from_email, smtp_from_name, smtp_port
      FROM core.empresas
      WHERE id = $1;
    `, [camp.rows[0].empresa_id]);
    console.table(emp.rows.map(r => ({
      ...r,
      resend_api_key: r.resend_api_key ? (r.resend_api_key.substring(0, 8) + '...') : null
    })));
  }

  await client.end();
}

check();
