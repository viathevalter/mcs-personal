const { Client } = require('pg');
const devConn = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';
const prodConn = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';

async function check() {
  const clientDev = new Client({ connectionString: devConn });
  const clientProd = new Client({ connectionString: prodConn });
  await clientDev.connect();
  await clientProd.connect();

  const devCols = await clientDev.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'core_comercial' AND table_name = 'lead_prospecting_jobs';`);
  console.log("DEV lead_prospecting_jobs cols:", devCols.rows);

  const prodCols = await clientProd.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'core_comercial' AND table_name = 'lead_prospecting_jobs';`);
  console.log("PROD lead_prospecting_jobs cols:", prodCols.rows);

  await clientDev.end();
  await clientProd.end();
}
check();
