const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

async function importAllStagingToCrm(dbName, conn) {
  const client = new Client({ connectionString: conn });
  await client.connect();

  console.log(`\n================ [${dbName}] Converting All Staging Leads into CRM Leads ================`);

  // Get active empresa
  const empRes = await client.query('SELECT empresa_id FROM core_comercial.lead_prospecting_jobs LIMIT 1;');
  const empresaId = empRes.rows[0]?.empresa_id || 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d';

  // Direct fast bulk conversion from lead_prospecting_results to leads
  const insertRes = await client.query(`
    INSERT INTO core_comercial.leads (
      empresa_id,
      name,
      company_name,
      email,
      phone,
      website,
      address_line,
      city,
      province,
      sector,
      origen_lead,
      notes,
      tags,
      prospecting_job_id,
      created_at,
      updated_at
    )
    SELECT 
      COALESCE(r.empresa_id, $1),
      r.company_name,
      r.company_name,
      LOWER(TRIM(r.email)),
      r.phone,
      r.website,
      r.address,
      r.city,
      r.province,
      COALESCE(j.sector_filter, 'Calderería & Tubería Industrial'),
      CONCAT('AIsa - ', COALESCE(j.title, 'Prospecção Nacional')),
      CONCAT('Lead qualificado e verificado via AIsa Prospecting. Setor: ', COALESCE(j.sector_filter, 'Geral'), '. Província: ', r.province),
      ARRAY[COALESCE(j.title, 'Prospecção AI'), 'Prospecção AI', 'Espanha'],
      r.job_id,
      NOW(),
      NOW()
    FROM core_comercial.lead_prospecting_results r
    LEFT JOIN core_comercial.lead_prospecting_jobs j ON j.id = r.job_id
    WHERE r.email IS NOT NULL AND r.email != ''
    AND LOWER(TRIM(r.email)) NOT IN (SELECT LOWER(TRIM(email)) FROM core_comercial.leads WHERE email IS NOT NULL)
    ON CONFLICT DO NOTHING;
  `, [empresaId]);

  console.log(`[${dbName}] ✅ Successfully inserted ${insertRes.rowCount} brand new verified leads into CRM (core_comercial.leads)!`);

  // Update staging status to 'imported'
  await client.query(`
    UPDATE core_comercial.lead_prospecting_results
    SET status = 'imported', updated_at = NOW()
    WHERE email IS NOT NULL AND email != '';
  `);

  const totalCrmLeads = await client.query('SELECT count(*) FROM core_comercial.leads;');
  console.log(`[${dbName}] 🚀 TOTAL ACTIVE LEADS IN CRM: ${totalCrmLeads.rows[0].count}`);

  await client.end();
}

async function run() {
  await importAllStagingToCrm('DEV', devConnectionString);
  await importAllStagingToCrm('PROD', prodConnectionString);
}

run();
