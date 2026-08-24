require('dotenv').config();
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function audit() {
  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  console.log('=== 1. AUDIT DE EMAILS NO BANCO DE DADOS (core_comercial.leads) ===');
  const leadsStats = await client.query(`
    SELECT 
      count(*) as total_leads,
      count(*) FILTER (WHERE email IS NULL OR email = '') as no_email,
      count(*) FILTER (WHERE email LIKE '%.es') as es_leads,
      count(*) FILTER (WHERE email LIKE '%.com') as com_leads,
      count(*) FILTER (WHERE email LIKE '%.pt') as pt_leads,
      count(*) FILTER (WHERE email LIKE '%.eu') as eu_leads,
      count(*) FILTER (WHERE email LIKE '%.net') as net_leads,
      count(*) FILTER (WHERE email LIKE '%.org') as org_leads,
      count(*) FILTER (WHERE email LIKE '%.co') as co_leads,
      count(*) FILTER (WHERE email ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$') as valid_rfc_email,
      count(*) FILTER (WHERE NOT (email ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')) as invalid_rfc_email
    FROM core_comercial.leads;
  `);
  console.table(leadsStats.rows);

  console.log('\n=== 2. AMOSTRA DE EMAILS .ES NO BANCO ===');
  const sampleEs = await client.query(`
    SELECT id, name, company_name, email 
    FROM core_comercial.leads 
    WHERE email LIKE '%.es' 
    LIMIT 10;
  `);
  console.table(sampleEs.rows);

  console.log('\n=== 3. VERIFICAR SE EXISTEM EMAILS COM CARACTERES ESTRANHOS OU ESPAÇOS ===');
  const strangeEmails = await client.query(`
    SELECT id, name, email 
    FROM core_comercial.leads 
    WHERE email ~ '[\\s;,()<>\\[\\]"\\\\]'
    LIMIT 10;
  `);
  console.log(`Encontrados com caracteres estranhos: ${strangeEmails.rows.length}`);
  if (strangeEmails.rows.length > 0) console.table(strangeEmails.rows);

  console.log('\n=== 4. VERIFICAR QUEUE DE ENVIOS ANTERIORES E STATUS NO KANBAN ===');
  const stageStats = await client.query(`
    SELECT s.name as stage_name, s.order_index, count(l.id) as lead_count
    FROM core_comercial.leads l
    LEFT JOIN core_comercial.kanban_stages s ON s.id = l.stage_id
    GROUP BY s.name, s.order_index
    ORDER BY s.order_index ASC NULLS LAST;
  `);
  console.table(stageStats.rows);

  await client.end();
}

audit();
