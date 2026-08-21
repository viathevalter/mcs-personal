const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function purgeOldJobsAndStaging() {
  const client = new Client({ connectionString: PROD_PG_URL });
  try {
    await client.connect();

    console.log(`=== LIMPANDO MISSÕES ANTIGAS E MANTENDO APENAS OS 8 CNAES ===`);

    const oldJobIds = [
      '6138a708-c9bd-42fd-a51e-8feabf824055',
      '2b5212a8-70d3-4fe9-83dd-44eda6bf2ec1',
      '3498e63d-faf4-40c9-a1b0-49beedaa0841',
      '79f87839-ddbb-4de4-87d2-af865b0def9c',
      '57b63c2c-ec67-4f52-80af-7f161d234ceb',
      'ff2c6ab4-f94b-48ff-8f1b-7b933dd98946',
      '42d7ee85-decc-45c2-a960-7e9f5da70d02',
      '42e612da-c0a9-4068-a8bd-51b438f002ac'
    ];

    // 1. Delete staging results from old jobs
    const delStaging = await client.query(`
      DELETE FROM core_comercial.lead_prospecting_results 
      WHERE job_id = ANY($1::uuid[]);
    `, [oldJobIds]);
    console.log(`Deletados ${delStaging.rowCount} registros antigos de staging.`);

    // 2. Delete old jobs
    const delJobs = await client.query(`
      DELETE FROM core_comercial.lead_prospecting_jobs 
      WHERE id = ANY($1::uuid[]);
    `, [oldJobIds]);
    console.log(`Deletadas ${delJobs.rowCount} missões antigas.`);

    // 3. List remaining active jobs
    const remaining = await client.query(`
      SELECT id, title, location, status, processed_count, found_emails_count
      FROM core_comercial.lead_prospecting_jobs
      ORDER BY title ASC;
    `);
    console.log("\n=== MISSÕES OFICIAIS ATIVAS (8 CNAEs): ===");
    console.table(remaining.rows);

    const stagingCount = await client.query(`SELECT count(*) FROM core_comercial.lead_prospecting_results;`);
    console.log(`\nTotal em Staging agora: ${stagingCount.rows[0].count} leads.`);

  } finally {
    await client.end();
  }
}

purgeOldJobsAndStaging();
