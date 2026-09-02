const { Client } = require('pg');

const devConn = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';
const prodConn = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';

async function compare() {
  const clientDev = new Client({ connectionString: devConn });
  const clientProd = new Client({ connectionString: prodConn });

  try {
    await clientDev.connect();
    console.log("✅ Connected to DEV Supabase (pyahcgorkvwfwmlzspnv)");
  } catch (e) {
    console.error("❌ Failed to connect to DEV Supabase:", e.message);
  }

  try {
    await clientProd.connect();
    console.log("✅ Connected to PROD Supabase (unbepkdzvsfvylnysrcq)");
  } catch (e) {
    console.error("❌ Failed to connect to PROD Supabase:", e.message);
  }

  console.log("\n=== 1. SCHEMAS & TABLES COMPARISON ===");
  const getTables = async (c) => {
    const res = await c.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema IN ('core_comercial', 'core_common', 'core_operacoes', 'core_personal', 'core_financeiro', 'core_logistica')
      ORDER BY table_schema, table_name;
    `);
    return res.rows.map(r => `${r.table_schema}.${r.table_name}`);
  };

  const devTables = await getTables(clientDev).catch(() => []);
  const prodTables = await getTables(clientProd).catch(() => []);

  console.log(`DEV total tables: ${devTables.length}`);
  console.log(`PROD total tables: ${prodTables.length}`);

  const missingInDev = prodTables.filter(t => !devTables.includes(t));
  console.log(`Tables in PROD missing in DEV:`, missingInDev);

  console.log("\n=== 2. COLUMNS IN core_comercial.leads ===");
  const getColumns = async (c, schema, table) => {
    const res = await c.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY column_name;
    `, [schema, table]);
    return res.rows;
  };

  const devLeadCols = await getColumns(clientDev, 'core_comercial', 'leads').catch(() => []);
  const prodLeadCols = await getColumns(clientProd, 'core_comercial', 'leads').catch(() => []);

  const devColNames = devLeadCols.map(c => c.column_name);
  const prodColNames = prodLeadCols.map(c => c.column_name);

  const missingColsInDev = prodColNames.filter(c => !devColNames.includes(c));
  console.log(`Columns in PROD core_comercial.leads missing in DEV:`, missingColsInDev);

  console.log("\n=== 3. TOTAL LEADS COUNT ===");
  const devLeadsCount = await clientDev.query('SELECT count(*) FROM core_comercial.leads;').catch(e => ({ rows: [{ count: e.message }] }));
  const prodLeadsCount = await clientProd.query('SELECT count(*) FROM core_comercial.leads;').catch(e => ({ rows: [{ count: e.message }] }));
  console.log(`DEV leads count: ${devLeadsCount.rows[0].count}`);
  console.log(`PROD leads count: ${prodLeadsCount.rows[0].count}`);

  console.log("\n=== 4. KANBAN STAGES IN DEV VS PROD ===");
  const devStages = await clientDev.query('SELECT count(*), empresa_id FROM core_comercial.kanban_stages GROUP BY empresa_id;').catch(e => ({ rows: [] }));
  const prodStages = await clientProd.query('SELECT count(*), empresa_id FROM core_comercial.kanban_stages GROUP BY empresa_id;').catch(e => ({ rows: [] }));
  console.log(`DEV stages:`, devStages.rows);
  console.log(`PROD stages:`, prodStages.rows);

  console.log("\n=== 5. MARKETING CAMPAIGNS & QUEUE IN DEV ===");
  const devCampCount = await clientDev.query('SELECT count(*) FROM core_comercial.marketing_campaigns;').catch(e => ({ rows: [{ count: e.message }] }));
  const prodCampCount = await clientProd.query('SELECT count(*) FROM core_comercial.marketing_campaigns;').catch(e => ({ rows: [{ count: e.message }] }));
  console.log(`DEV campaigns: ${devCampCount.rows[0].count} | PROD campaigns: ${prodCampCount.rows[0].count}`);

  await clientDev.end();
  await clientProd.end();
}

compare().catch(console.error);
