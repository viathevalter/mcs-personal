require('dotenv').config();
const { Client } = require('pg');

async function test() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  await c.query('BEGIN;');
  await c.query("SET LOCAL ROLE anon;");
  await c.query("SELECT set_config('request.jwt.claims', '{\"role\": \"anon\"}', true);");
  const res = await c.query('SELECT id, name, empresa_id FROM core_comercial.kanban_stages;');
  console.log('Stages count with anon claims in PG:', res.rows.length);
  await c.query('ROLLBACK;');

  await c.end();
}

test();
