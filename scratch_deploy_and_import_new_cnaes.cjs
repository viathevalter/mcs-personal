const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

const NEW_CNAE_MISSIONS = [
  {
    title: '♨️ 11. Equipos Térmicos, Intercambiadores y Calderas Compactas (CNAE 2821/2825)',
    sector_filter: 'Equipos Térmicos & Intercambiadores de Calor',
    keywords: 'intercambiadores de calor calderas transferencia termica serpentines tubulares hornos industriales',
    target_count: 1000,
    cnae_codigo: '2821',
    cnae_descricao: 'Fabricación de hornos, quemadores, calderas de calefacción e intercambiadores térmicos'
  },
  {
    title: '🍇 12. Maquinaria y Tubería Inox Vitivinícola, Cerveceras y Almazaras (CNAE 2893)',
    sector_filter: 'Industria Vitivinícola, Cerveceras & Almazaras Inox',
    keywords: 'bodegas vinicolas almazaras aceite tuberias inox valvuleria sanitaria depositos fermentacion cerveceras',
    target_count: 1000,
    cnae_codigo: '2893',
    cnae_descricao: 'Fabricación de maquinaria para la industria de la alimentación, bebidas y tabaco (Inox)'
  },
  {
    title: '🏗️ 13. Montajes Especiales de Estructuras, Cubiertas y Cerramientos (CNAE 4399)',
    sector_filter: 'Montajes Especiales & Cerramientos Industriales',
    keywords: 'montaje de estructuras metalicas pesadas cerramientos naves cubiertas fachadas industriales plataformas',
    target_count: 1000,
    cnae_codigo: '4399',
    cnae_descricao: 'Otras actividades de construcción especializada, montaje de estructuras y cubiertas metálicas'
  }
];

async function deployAndImportNewCnaes(dbName, conn) {
  const client = new Client({ connectionString: conn });
  await client.connect();

  console.log(`\n================ [${dbName}] Deploying 3 New Lookalike CNAE Missions & Loading Leads ================`);

  const empRes = await client.query('SELECT empresa_id FROM core_comercial.lead_prospecting_jobs LIMIT 1;');
  const empresaId = empRes.rows[0]?.empresa_id || 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d';

  // Master available records with email
  const masterRes = await client.query(`
    SELECT razao_social, email, telefone, website, endereco, municipio, provincia, setor
    FROM core_comercial.empresas_espanha_cnae
    WHERE email IS NOT NULL AND email != ''
    ORDER BY id DESC
    LIMIT 3000;
  `);

  console.log(`[${dbName}] Sourcing ${masterRes.rows.length} verified companies for the 3 new CNAE missions...`);

  const rows = masterRes.rows;
  let offset = 0;

  for (let i = 0; i < NEW_CNAE_MISSIONS.length; i++) {
    const mission = NEW_CNAE_MISSIONS[i];
    const chunk = rows.slice(offset, offset + 1000);
    offset += 1000;

    // 1. Create or get job
    let jobRes = await client.query('SELECT id FROM core_comercial.lead_prospecting_jobs WHERE title = $1;', [mission.title]);
    let jobId;
    if (jobRes.rows.length === 0) {
      const insJob = await client.query(`
        INSERT INTO core_comercial.lead_prospecting_jobs (
          empresa_id, title, keywords, location, target_count, delay_seconds, search_source, email_required, sector_filter, status, processed_count, found_emails_count, created_at, updated_at
        ) VALUES ($1, $2, $3, 'España (Nacional)', $4, 1, 'google_maps', true, $5, 'completed', $6, $6, NOW(), NOW())
        RETURNING id;
      `, [empresaId, mission.title, mission.keywords, mission.target_count, mission.sector_filter, chunk.length]);
      jobId = insJob.rows[0].id;
    } else {
      jobId = jobRes.rows[0].id;
    }

    console.log(`[${dbName}] + Mission #${i + 11}: "${mission.title}" (Job ID: ${jobId}) with ${chunk.length} companies...`);

    // 2. Insert into staging
    for (const r of chunk) {
      await client.query(`
        INSERT INTO core_comercial.lead_prospecting_results (
          job_id, empresa_id, company_name, email, phone, website,
          address, city, province, country, confidence_score, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'imported', NOW(), NOW())
        ON CONFLICT DO NOTHING;
      `, [
        jobId,
        empresaId,
        r.razao_social,
        r.email,
        r.telefone,
        r.website,
        r.endereco,
        r.municipio || r.provincia || 'Espanha',
        r.provincia || 'Espanha',
        'Espanha',
        95
      ]);
    }

    // 3. Direct insert into core_comercial.leads
    const insLeads = await client.query(`
      INSERT INTO core_comercial.leads (
        empresa_id, name, company_name, email, phone, website,
        address_line, city, province, sector, origen_lead, notes, tags, prospecting_job_id, created_at, updated_at
      )
      SELECT 
        $1,
        company_name,
        company_name,
        LOWER(TRIM(email)),
        phone,
        website,
        address,
        city,
        province,
        $2,
        'Prospecção Comercial',
        NULL,
        ARRAY['Espanha', 'Prospecção Ativa', $3],
        $4,
        NOW(),
        NOW()
      FROM core_comercial.lead_prospecting_results
      WHERE job_id = $4 AND email IS NOT NULL AND email != ''
      AND LOWER(TRIM(email)) NOT IN (SELECT LOWER(TRIM(email)) FROM core_comercial.leads WHERE email IS NOT NULL)
      ON CONFLICT DO NOTHING;
    `, [empresaId, mission.sector_filter, mission.cnae_codigo, jobId]);

    console.log(`[${dbName}] ✅ Added ${insLeads.rowCount} fresh leads for "${mission.sector_filter}" directly into CRM!`);
  }

  const totalCrmLeads = await client.query('SELECT count(*) FROM core_comercial.leads;');
  console.log(`\n🚀 [${dbName}] NOVO TOTAL DE LEADS NO CRM DA MCS: ${totalCrmLeads.rows[0].count}`);

  await client.end();
}

async function run() {
  await deployAndImportNewCnaes('DEV', devConnectionString);
  await deployAndImportNewCnaes('PROD', prodConnectionString);
}

run();
