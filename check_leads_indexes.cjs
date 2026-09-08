const { Client } = require('pg');
const devConn = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';
const prodConn = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';

async function checkIndexes() {
  const clientDev = new Client({ connectionString: devConn });
  const clientProd = new Client({ connectionString: prodConn });
  await clientDev.connect();
  await clientProd.connect();

  const devIdx = await clientDev.query(`
    SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'core_comercial' AND tablename = 'leads';
  `);
  console.log("DEV leads indexes:", devIdx.rows);

  const prodIdx = await clientProd.query(`
    SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'core_comercial' AND tablename = 'leads';
  `);
  console.log("PROD leads indexes:", prodIdx.rows);

  await clientDev.end();
  await clientProd.end();
}
checkIndexes();
