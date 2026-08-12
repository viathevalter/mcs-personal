const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  try {
    const clientsCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'core_common' AND table_name = 'clients';
    `);
    console.log('core_common.clients columns:', clientsCols.rows.map(c => c.column_name));

    const workersCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'core_personal' AND table_name = 'workers';
    `);
    console.log('core_personal.workers columns:', workersCols.rows.map(c => c.column_name));

    const hoursCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'core_personal' AND table_name = 'worker_hours';
    `);
    console.log('core_personal.worker_hours columns:', hoursCols.rows.map(c => c.column_name));

    const finHoursCols = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'core_finance' AND table_name = 'horas_trabalhadas';
    `);
    console.log('core_finance.horas_trabalhadas columns:', finHoursCols.rows.map(c => c.column_name));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

run();
