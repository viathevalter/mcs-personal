const { Client } = require('pg');

const devConn = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';
const prodConn = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';

async function checkConstraints() {
  const clientDev = new Client({ connectionString: devConn });
  const clientProd = new Client({ connectionString: prodConn });
  await clientDev.connect();
  await clientProd.connect();

  const devCons = await clientDev.query(`
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'core_comercial' AND conrelid = 'core_comercial.leads'::regclass;
  `);
  console.log("DEV core_comercial.leads constraints:", devCons.rows);

  const prodCons = await clientProd.query(`
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'core_comercial' AND conrelid = 'core_comercial.leads'::regclass;
  `);
  console.log("PROD core_comercial.leads constraints:", prodCons.rows);

  await clientDev.end();
  await clientProd.end();
}

checkConstraints().catch(console.error);
