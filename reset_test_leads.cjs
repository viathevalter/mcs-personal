require('dotenv').config();
const { Client } = require('pg');

async function reset() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  await c.query(`
    UPDATE core_comercial.leads 
    SET stage_id = '62f1f51b-7c21-433c-aa6e-47914ab78508', updated_at = NOW() 
    WHERE email IN ('fenix9926@gmail.com', 'carmonxx11@gmail.com');
  `);

  const list = await c.query(`
    SELECT l.id, l.name, l.email, s.name as stage_name, s.order_index 
    FROM core_comercial.leads l 
    JOIN core_comercial.kanban_stages s ON s.id = l.stage_id 
    WHERE l.email IN ('fenix9926@gmail.com', 'carmonxx11@gmail.com');
  `);
  console.table(list.rows);

  await c.end();
}

reset();
