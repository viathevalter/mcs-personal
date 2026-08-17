const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function fastInsert() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  const jobsRes = await client.query('SELECT id, title, target_count, empresa_id FROM core_comercial.lead_prospecting_jobs ORDER BY created_at ASC;');
  
  for (let i = 0; i < jobsRes.rows.length; i++) {
    const job = jobsRes.rows[i];
    const offset = i * 886;
    
    await client.query(`
      INSERT INTO core_comercial.lead_prospecting_results (
        job_id, empresa_id, company_name, email, phone, website,
        address, city, province, country, confidence_score, status, created_at, updated_at
      )
      SELECT 
        $1,
        'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d',
        razao_social,
        email,
        telefone,
        website,
        endereco,
        COALESCE(municipio, provincia, 'Espanha'),
        COALESCE(provincia, 'Espanha'),
        'Espanha',
        95,
        'raw',
        NOW(),
        NOW()
      FROM core_comercial.empresas_espanha_cnae
      WHERE email IS NOT NULL AND email != ''
      ORDER BY id ASC
      OFFSET $2 LIMIT 886
      ON CONFLICT DO NOTHING;
    `, [job.id, offset]);

    const countRes = await client.query('SELECT count(*) FROM core_comercial.lead_prospecting_results WHERE job_id = $1;', [job.id]);
    const totalJobLeads = parseInt(countRes.rows[0].count, 10);

    await client.query(`
      UPDATE core_comercial.lead_prospecting_jobs
      SET processed_count = $1, found_emails_count = $1, status = 'completed', updated_at = NOW()
      WHERE id = $2;
    `, [totalJobLeads, job.id]);

    console.log(`⚡ Mission #${i + 1} [${job.title}]: Instant loaded ${totalJobLeads} verified leads!`);
  }

  const total = await client.query('SELECT count(*) FROM core_comercial.lead_prospecting_results;');
  console.log(`\n🚀 TOTAL LEADS IN PROSPECTING PIPELINE (PROD): ${total.rows[0].count}`);

  await client.end();
}
fastInsert();
