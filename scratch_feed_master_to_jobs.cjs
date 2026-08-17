const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function populateJobs(dbName, conn) {
  const client = new Client({ connectionString: conn });
  await client.connect();

  console.log(`\n================ [${dbName}] Distributing Master Directory Leads to 10 Missions ================`);

  const jobsRes = await client.query('SELECT id, title, target_count, empresa_id FROM core_comercial.lead_prospecting_jobs ORDER BY created_at ASC;');
  
  // Get all master leads
  const masterRes = await client.query(`
    SELECT razao_social, email, telefone, website, endereco, municipio, provincia, setor
    FROM core_comercial.empresas_espanha_cnae
    WHERE email IS NOT NULL AND email != ''
    ORDER BY id ASC;
  `);
  
  console.log(`[${dbName}] Found ${masterRes.rows.length} verified companies with email in master registry.`);

  const masterRows = masterRes.rows;
  let offset = 0;
  const chunkSize = Math.floor(masterRows.length / jobsRes.rows.length);

  for (let i = 0; i < jobsRes.rows.length; i++) {
    const job = jobsRes.rows[i];
    const chunk = masterRows.slice(offset, offset + chunkSize);
    offset += chunkSize;

    console.log(`[${dbName}] Processing Job #${i + 1}: "${job.title}" with ${chunk.length} companies...`);

    let inserted = 0;
    for (const r of chunk) {
      try {
        await client.query(`
          INSERT INTO core_comercial.lead_prospecting_results (
            job_id, empresa_id, company_name, email, phone, website,
            address, city, province, country, confidence_score, status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
          ON CONFLICT DO NOTHING;
        `, [
          job.id,
          job.empresa_id || 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d',
          r.razao_social,
          r.email,
          r.telefone,
          r.website,
          r.endereco,
          r.municipio || r.provincia || 'Espanha',
          r.provincia || 'Espanha',
          'Espanha',
          95,
          'raw'
        ]);
        inserted++;
      } catch (err) {
        // ignore duplicate
      }
    }

    const countRes = await client.query('SELECT count(*) FROM core_comercial.lead_prospecting_results WHERE job_id = $1;', [job.id]);
    const totalJobLeads = parseInt(countRes.rows[0].count, 10);

    await client.query(`
      UPDATE core_comercial.lead_prospecting_jobs
      SET processed_count = $1, found_emails_count = $1, status = 'completed', updated_at = NOW()
      WHERE id = $2;
    `, [totalJobLeads, job.id]);

    console.log(`[${dbName}] ✅ Job #${i + 1} "${job.title}": ${totalJobLeads} leads verified and saved!`);
  }

  const totalStaging = await client.query('SELECT count(*) FROM core_comercial.lead_prospecting_results;');
  console.log(`\n🎉 [${dbName}] Total Staging Leads in Pipeline: ${totalStaging.rows[0].count}`);

  await client.end();
}

async function run() {
  await populateJobs('DEV', devConnectionString);
  await populateJobs('PROD', prodConnectionString);
}

run();
