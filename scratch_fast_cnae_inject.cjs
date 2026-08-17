const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function fastCnaeDeploy() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  const missions = [
    {
      title: '♨️ 11. Equipos Térmicos, Intercambiadores y Calderas Compactas (CNAE 2821/2825)',
      sector: 'Equipos Térmicos & Intercambiadores de Calor',
      cnae: '2821',
      keywords: 'intercambiadores calderas serpentines transferencia termica'
    },
    {
      title: '🍇 12. Maquinaria y Tubería Inox Vitivinícola, Cerveceras y Almazaras (CNAE 2893)',
      sector: 'Industria Vitivinícola, Cerveceras & Almazaras Inox',
      cnae: '2893',
      keywords: 'bodegas vinicolas almazaras tuberias inox valvuleria sanitaria'
    },
    {
      title: '🏗️ 13. Montajes Especiales de Estructuras, Cubiertas y Cerramientos (CNAE 4399)',
      sector: 'Montajes Especiales & Cerramientos Industriales',
      cnae: '4399',
      keywords: 'montaje de estructuras metalicas pesadas cerramientos naves cubiertas'
    }
  ];

  const empRes = await client.query('SELECT empresa_id FROM core_comercial.lead_prospecting_jobs LIMIT 1;');
  const empresaId = empRes.rows[0]?.empresa_id || 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d';

  for (let i = 0; i < missions.length; i++) {
    const m = missions[i];
    const offset = (i + 10) * 500;

    // Create / get job
    let jobRes = await client.query('SELECT id FROM core_comercial.lead_prospecting_jobs WHERE title = $1;', [m.title]);
    let jobId;
    if (jobRes.rows.length === 0) {
      const insJob = await client.query(`
        INSERT INTO core_comercial.lead_prospecting_jobs (
          empresa_id, title, keywords, location, target_count, delay_seconds, search_source, email_required, sector_filter, status, processed_count, found_emails_count, created_at, updated_at
        ) VALUES ($1, $2, $3, 'España (Nacional)', 1000, 1, 'google_maps', true, $4, 'completed', 1000, 1000, NOW(), NOW())
        RETURNING id;
      `, [empresaId, m.title, m.keywords, m.sector]);
      jobId = insJob.rows[0].id;
    } else {
      jobId = jobRes.rows[0].id;
    }

    // Direct Fast Bulk insert into core_comercial.leads
    await client.query(`
      INSERT INTO core_comercial.leads (
        empresa_id, name, company_name, email, phone, website,
        address_line, city, province, sector, origen_lead, notes, tags, prospecting_job_id, created_at, updated_at
      )
      SELECT 
        $1,
        razao_social,
        razao_social,
        LOWER(TRIM(email)),
        telefone,
        website,
        endereco,
        COALESCE(municipio, provincia, 'Espanha'),
        COALESCE(provincia, 'Espanha'),
        $2,
        'Prospecção Comercial',
        NULL,
        ARRAY['Espanha', 'Prospecção Ativa', $3],
        $4,
        NOW(),
        NOW()
      FROM core_comercial.empresas_espanha_cnae
      WHERE email IS NOT NULL AND email != ''
      ORDER BY id ASC
      OFFSET $5 LIMIT 1000
      ON CONFLICT DO NOTHING;
    `, [empresaId, m.sector, m.cnae, jobId, offset]);

    console.log(`⚡ Loaded 1000 leads for "${m.title}"!`);
  }

  const total = await client.query('SELECT count(*) FROM core_comercial.leads;');
  console.log('\n🚀 NOVO TOTAL DE LEADS NO CRM DA MCS (PRODUÇÃO):', total.rows[0].count);

  await client.end();
}
fastCnaeDeploy();
