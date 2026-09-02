const { Client } = require('pg');

const devConn = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';
const prodConn = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';

async function deepCompare() {
  const clientDev = new Client({ connectionString: devConn });
  const clientProd = new Client({ connectionString: prodConn });

  await clientDev.connect();
  await clientProd.connect();

  console.log("=== DEEP SCHEMA COMPARISON ===");

  const schemas = ['core_comercial', 'core_common', 'core_operacoes', 'core_personal', 'core_financeiro', 'core_logistica'];

  for (const schema of schemas) {
    const prodColsRes = await clientProd.query(`
      SELECT table_name, column_name, data_type, udt_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = $1
      ORDER BY table_name, column_name;
    `, [schema]);

    const devColsRes = await clientDev.query(`
      SELECT table_name, column_name, data_type, udt_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = $1
      ORDER BY table_name, column_name;
    `, [schema]);

    const devMap = new Set(devColsRes.rows.map(r => `${r.table_name}.${r.column_name}`));
    const missingInDev = prodColsRes.rows.filter(r => !devMap.has(`${r.table_name}.${r.column_name}`));

    if (missingInDev.length > 0) {
      console.log(`\n❌ [${schema}] Missing columns in DEV:`);
      for (const m of missingInDev) {
        console.log(`  - ${m.table_name}.${m.column_name} (${m.data_type} / ${m.udt_name})`);
      }
    } else {
      console.log(`✅ [${schema}] All columns in sync!`);
    }
  }

  await clientDev.end();
  await clientProd.end();
}

deepCompare().catch(console.error);
