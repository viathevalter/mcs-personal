require('dotenv').config();
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

function cleanCompanyName(name) {
  if (!name) return 'Empresa Industrial';
  return name
    .replace(/^[:\s\-•·*~#【】▷]+|[:\s\-•·*~#【】▷]+$/g, '')
    .replace(/&#8211;/g, '–')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function detectTier(c) {
  const text = `${c.razao_social || ''} ${c.nome_comercial || ''} ${c.setor || ''}`.toUpperCase();
  if (text.includes(' S.A.') || text.includes(' S.A') || text.includes('ASTILLERO') || text.includes('NAVANTIA') || text.includes('PETROQUIM') || text.includes('REPSOL') || text.includes('IBERDROLA') || text.includes('ACCIONA') || text.includes('DRAGADOS') || text.includes('DURO FELGUERA') || text.includes('GRUPO') || text.includes('HOLDING') || text.includes('INTERNACIONAL') || text.includes('GLOBAL')) {
    return 'Tier 1 (Gran Empresa / EPC)';
  }
  if (text.includes('CALDERERIA') || text.includes('TUBERIA') || text.includes('MECANIZADO') || text.includes('MONTAJES') || text.includes('ESTRUCTURAS') || text.includes('INGENIERIA') || text.includes('FABRICACION') || text.includes('INDUSTRIAL') || text.includes('TANQUES') || text.includes('SOLDADURA')) {
    return 'Tier 2 (Mediana Empresa Industrial)';
  }
  return 'Tier 3 (Pequeña Empresa / Taller Especializado)';
}

async function ingestAll() {
  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  console.log('=== INGESTÃO MASIVA DE EMPRESAS CNAE PARA STAGING E CRM ===\n');

  // Obter o job CNAE 2529
  const job2Res = await client.query(`
    SELECT id, empresa_id FROM core_comercial.lead_prospecting_jobs
    WHERE title LIKE '%2529%'
    LIMIT 1;
  `);
  const job2Id = job2Res.rows[0]?.id;
  const empresaId = job2Res.rows[0]?.empresa_id || '847796c4-b253-4e53-9e6b-34a127ec7d85';

  const defaultStage = await client.query(`
    SELECT id FROM core_comercial.kanban_stages WHERE order_index = 1 AND empresa_id = $1 LIMIT 1;
  `, [empresaId]);
  const stage1Id = defaultStage.rows[0]?.id;

  const pendingCompanies = await client.query(`
    SELECT * FROM core_comercial.empresas_espanha_cnae
    WHERE email IS NOT NULL AND email != ''
      AND LOWER(TRIM(email)) NOT IN (
        SELECT LOWER(TRIM(email)) FROM core_comercial.lead_prospecting_results WHERE email IS NOT NULL
      );
  `);

  console.log(`🚀 Empresas encontradas para ingestão imediata: ${pendingCompanies.rows.length}`);

  let inserted = 0;
  for (const c of pendingCompanies.rows) {
    const cleanEmail = c.email.toLowerCase().trim();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) continue;

    const companyName = cleanCompanyName(c.nome_comercial || c.razao_social || 'Empresa Industrial');
    const tier = detectTier(c);
    const sector = c.setor || 'Calderería Pesada & Fabricación Metálica';
    const province = c.provincia || 'España';
    const city = c.municipio || province;
    const phone = c.telefone || '+34 91 000 00 00';
    const website = c.website || '';
    const address = c.endereco || 'Polígono Industrial';

    // 1. Inserir em Staging
    await client.query(`
      INSERT INTO core_comercial.lead_prospecting_results (
        job_id, empresa_id, company_name, email, phone, website, address, city, province, country, confidence_score, status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, 'Espanha', 99, 'raw', NOW(), NOW()
      )
      ON CONFLICT DO NOTHING;
    `, [job2Id, empresaId, companyName, cleanEmail, phone, website, address, city, province]);

    // 2. Inserir em CRM Leads
    await client.query(`
      INSERT INTO core_comercial.leads (
        empresa_id, name, company_name, email, phone, website, city, province, address_line, sector, cargo, origen_lead, notes, tags, company_size, stage_id, prospecting_job_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Diretoria / Compras / Técnico', 'prospeccao_b2b', $11, $12, $13, $14, $15, NOW(), NOW()
      )
      ON CONFLICT (lower(TRIM(BOTH FROM email))) WHERE ((email IS NOT NULL) AND ((email)::text <> ''::text)) DO UPDATE SET
        company_name = EXCLUDED.company_name,
        company_size = COALESCE(NULLIF(core_comercial.leads.company_size, ''), EXCLUDED.company_size),
        phone = COALESCE(NULLIF(core_comercial.leads.phone, ''), EXCLUDED.phone),
        website = COALESCE(NULLIF(core_comercial.leads.website, ''), EXCLUDED.website),
        updated_at = NOW();
    `, [
      empresaId,
      companyName,
      companyName,
      cleanEmail,
      phone,
      website,
      city,
      province,
      address,
      sector,
      `Lead qualificado importado da base industrial CNAE (${c.cnae_codigo || '2529'}).`,
      ['Prospecção Autônoma B2B', sector, tier],
      tier,
      stage1Id,
      job2Id
    ]);

    inserted++;
    if (inserted % 500 === 0) {
      console.log(`... ${inserted} / ${pendingCompanies.rows.length} empresas processadas`);
    }
  }

  // Atualizar contadores de todos os jobs
  const jobs = await client.query('SELECT id FROM core_comercial.lead_prospecting_jobs;');
  for (const j of jobs.rows) {
    await client.query(`
      UPDATE core_comercial.lead_prospecting_jobs
      SET found_emails_count = (SELECT count(email) FROM core_comercial.lead_prospecting_results WHERE job_id = $1),
          processed_count = (SELECT count(*) FROM core_comercial.lead_prospecting_results WHERE job_id = $1),
          status = 'completed',
          updated_at = NOW()
      WHERE id = $1;
    `, [j.id]);
  }

  const finalStaging = await client.query('SELECT count(*) FROM core_comercial.lead_prospecting_results;');
  const finalCrm = await client.query('SELECT count(*) FROM core_comercial.leads;');

  console.log(`\n🎉 INGESTÃO CONCLUÍDA COM SUCESSO!`);
  console.log(`📊 Staging Total: ${finalStaging.rows[0].count} empresas`);
  console.log(`📊 CRM Total: ${finalCrm.rows[0].count} leads qualificados`);

  await client.end();
}

ingestAll();
