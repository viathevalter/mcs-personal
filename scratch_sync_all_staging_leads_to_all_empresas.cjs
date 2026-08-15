const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function syncStagingToAllEmpresas(connStr, envName) {
  const client = new Client({ connectionString: connStr });
  await client.connect();

  console.log(`\n======================================================`);
  console.log(`🚀 REPLICANDO TODOS OS LEADS DE STAGING PARA TODAS AS EMPRESAS [${envName}]`);
  console.log(`======================================================`);

  try {
    const resEmpresas = await client.query(`SELECT id, nome FROM core_common.empresas;`);

    // Get all unique staging leads from master company (WISEOWE)
    const masterStaging = await client.query(`
      SELECT DISTINCT ON (LOWER(TRIM(email)))
        company_name, email, phone, website, linkedin_url, address, city, province, country, confidence_score
      FROM core_comercial.lead_prospecting_results
      WHERE email IS NOT NULL
      ORDER BY LOWER(TRIM(email)), created_at DESC;
    `);

    console.log(`📊 Total de e-mails únicos a replicar: ${masterStaging.rows.length}`);

    for (const emp of resEmpresas.rows) {
      console.log(`\n🏢 Replicando para empresa: "${emp.nome}" (ID: ${emp.id})`);

      // Get first active job for this empresa
      const firstJobRes = await client.query(`
        SELECT id FROM core_comercial.lead_prospecting_jobs
        WHERE empresa_id = $1
        ORDER BY created_at ASC
        LIMIT 1;
      `, [emp.id]);

      if (firstJobRes.rows.length === 0) continue;
      const defaultJobId = firstJobRes.rows[0].id;

      // Get existing emails in staging for this empresa
      const existingRes = await client.query(`
        SELECT LOWER(TRIM(email)) as email
        FROM core_comercial.lead_prospecting_results
        WHERE empresa_id = $1 AND email IS NOT NULL;
      `, [emp.id]);
      const existingEmailSet = new Set(existingRes.rows.map(r => r.email).filter(Boolean));

      let insertedForEmpresa = 0;
      for (const lead of masterStaging.rows) {
        const normEmail = lead.email.trim().toLowerCase();
        if (existingEmailSet.has(normEmail)) continue;
        existingEmailSet.add(normEmail);

        await client.query(`
          INSERT INTO core_comercial.lead_prospecting_results (
            job_id, empresa_id, company_name, email, phone, website, linkedin_url, address, city, province, country, confidence_score, status, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Espanha', 95, 'raw', NOW(), NOW()
          );
        `, [
          defaultJobId,
          emp.id,
          lead.company_name,
          lead.email,
          lead.phone,
          lead.website,
          lead.linkedin_url,
          lead.address,
          lead.city,
          lead.province,
        ]);
        insertedForEmpresa++;
      }

      console.log(`  ✅ +${insertedForEmpresa} leads inseridos em Staging para "${emp.nome}"!`);

      // Update counters on jobs
      await client.query(`
        UPDATE core_comercial.lead_prospecting_jobs
        SET 
          processed_count = (SELECT COUNT(*) FROM core_comercial.lead_prospecting_results WHERE job_id = $1),
          found_emails_count = (SELECT COUNT(email) FROM core_comercial.lead_prospecting_results WHERE job_id = $1),
          updated_at = NOW()
        WHERE id = $1;
      `, [defaultJobId]);
    }

    await client.query("NOTIFY pgrst, 'reload schema';");
  } catch (err) {
    console.error(`Erro em [${envName}]:`, err);
  } finally {
    await client.end();
  }
}

async function run() {
  await syncStagingToAllEmpresas(devConnectionString, 'DEV');
  await syncStagingToAllEmpresas(prodConnectionString, 'PROD');
}

run();
