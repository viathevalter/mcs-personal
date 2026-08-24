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

async function fastBatchIngest() {
  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  console.log('=== INGESTÃO TURBO DE EMPRESAS CNAE (BATCH 500 ROWS) ===\n');

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

  // 1. Bulk Ingest into Staging directly in SQL
  console.log('1. Inserindo todas as empresas pendentes em Staging (lead_prospecting_results)...');
  const stagingInsert = await client.query(`
    INSERT INTO core_comercial.lead_prospecting_results (
      job_id, empresa_id, company_name, email, phone, website, address, city, province, country, confidence_score, status, created_at, updated_at
    )
    SELECT 
      $1 as job_id,
      $2 as empresa_id,
      COALESCE(NULLIF(TRIM(cnae.nome_comercial), ''), NULLIF(TRIM(cnae.razao_social), ''), 'Empresa Industrial') as company_name,
      LOWER(TRIM(cnae.email)) as email,
      COALESCE(NULLIF(TRIM(cnae.telefone), ''), '+34 91 000 00 00') as phone,
      COALESCE(NULLIF(TRIM(cnae.website), ''), '') as website,
      COALESCE(NULLIF(TRIM(cnae.endereco), ''), 'Polígono Industrial') as address,
      COALESCE(NULLIF(TRIM(cnae.municipio), ''), cnae.provincia, 'España') as city,
      COALESCE(NULLIF(TRIM(cnae.provincia), ''), 'España') as province,
      'Espanha' as country,
      99 as confidence_score,
      'raw' as status,
      NOW(),
      NOW()
    FROM core_comercial.empresas_espanha_cnae cnae
    WHERE cnae.email IS NOT NULL 
      AND cnae.email != ''
      AND LOWER(TRIM(cnae.email)) NOT IN (
        SELECT LOWER(TRIM(email)) FROM core_comercial.lead_prospecting_results WHERE email IS NOT NULL
      )
    ON CONFLICT DO NOTHING;
  `, [job2Id, empresaId]);

  console.log(`✅ Staging inseridos: ${stagingInsert.rowCount} novos registros!`);

  // 2. Bulk Ingest into CRM leads directly in SQL
  console.log('2. Inserindo/Sincronizando todas as empresas no CRM (core_comercial.leads)...');
  const crmInsert = await client.query(`
    INSERT INTO core_comercial.leads (
      empresa_id, name, company_name, email, phone, website, city, province, address_line, sector, cargo, origen_lead, notes, tags, company_size, stage_id, prospecting_job_id, created_at, updated_at
    )
    SELECT DISTINCT ON (LOWER(TRIM(cnae.email)))
      $1::uuid as empresa_id,
      COALESCE(NULLIF(TRIM(cnae.nome_comercial), ''), NULLIF(TRIM(cnae.razao_social), ''), 'Empresa Industrial') as name,
      COALESCE(NULLIF(TRIM(cnae.nome_comercial), ''), NULLIF(TRIM(cnae.razao_social), ''), 'Empresa Industrial') as company_name,
      LOWER(TRIM(cnae.email)) as email,
      COALESCE(NULLIF(TRIM(cnae.telefone), ''), '+34 91 000 00 00') as phone,
      COALESCE(NULLIF(TRIM(cnae.website), ''), '') as website,
      COALESCE(NULLIF(TRIM(cnae.municipio), ''), cnae.provincia, 'España') as city,
      COALESCE(NULLIF(TRIM(cnae.provincia), ''), 'España') as province,
      COALESCE(NULLIF(TRIM(cnae.endereco), ''), 'Polígono Industrial') as address_line,
      COALESCE(NULLIF(TRIM(cnae.setor), ''), 'Calderería Pesada & Fabricación Metálica') as sector,
      'Diretoria / Compras / Técnico' as cargo,
      'prospeccao_b2b' as origen_lead,
      CONCAT('Lead qualificado importado da base industrial CNAE (', COALESCE(cnae.cnae_codigo, '2529'), ').') as notes,
      ARRAY['Prospecção Autônoma B2B', COALESCE(cnae.setor, 'Calderería')] as tags,
      CASE 
        WHEN UPPER(CONCAT(cnae.razao_social, ' ', cnae.nome_comercial)) LIKE '% S.A.%' 
          OR UPPER(CONCAT(cnae.razao_social, ' ', cnae.nome_comercial)) LIKE '% S.A'
          OR UPPER(CONCAT(cnae.razao_social, ' ', cnae.nome_comercial)) LIKE '%ASTILLERO%'
          OR UPPER(CONCAT(cnae.razao_social, ' ', cnae.nome_comercial)) LIKE '%NAVANTIA%'
          OR UPPER(CONCAT(cnae.razao_social, ' ', cnae.nome_comercial)) LIKE '%PETROQUIM%'
          OR UPPER(CONCAT(cnae.razao_social, ' ', cnae.nome_comercial)) LIKE '%REPSOL%'
          OR UPPER(CONCAT(cnae.razao_social, ' ', cnae.nome_comercial)) LIKE '%IBERDROLA%'
          OR UPPER(CONCAT(cnae.razao_social, ' ', cnae.nome_comercial)) LIKE '%ACCIONA%'
          OR UPPER(CONCAT(cnae.razao_social, ' ', cnae.nome_comercial)) LIKE '%DRAGADOS%'
          OR UPPER(CONCAT(cnae.razao_social, ' ', cnae.nome_comercial)) LIKE '%DURO FELGUERA%'
          OR UPPER(CONCAT(cnae.razao_social, ' ', cnae.nome_comercial)) LIKE '%GRUPO%'
        THEN 'Tier 1 (Gran Empresa / EPC)'
        WHEN UPPER(CONCAT(cnae.razao_social, ' ', cnae.nome_comercial)) LIKE '%CALDERERIA%'
          OR UPPER(CONCAT(cnae.razao_social, ' ', cnae.nome_comercial)) LIKE '%TUBERIA%'
          OR UPPER(CONCAT(cnae.razao_social, ' ', cnae.nome_comercial)) LIKE '%MECANIZADO%'
          OR UPPER(CONCAT(cnae.razao_social, ' ', cnae.nome_comercial)) LIKE '%MONTAJES%'
          OR UPPER(CONCAT(cnae.razao_social, ' ', cnae.nome_comercial)) LIKE '%ESTRUCTURAS%'
          OR UPPER(CONCAT(cnae.razao_social, ' ', cnae.nome_comercial)) LIKE '%INGENIERIA%'
          OR UPPER(CONCAT(cnae.razao_social, ' ', cnae.nome_comercial)) LIKE '%FABRICACION%'
          OR UPPER(CONCAT(cnae.razao_social, ' ', cnae.nome_comercial)) LIKE '%TANQUES%'
        THEN 'Tier 2 (Mediana Empresa Industrial)'
        ELSE 'Tier 3 (Pequeña Empresa / Taller Especializado)'
      END as company_size,
      $2::uuid as stage_id,
      $3::uuid as prospecting_job_id,
      NOW(),
      NOW()
    FROM core_comercial.empresas_espanha_cnae cnae
    WHERE cnae.email IS NOT NULL 
      AND cnae.email != ''
      AND LOWER(TRIM(cnae.email)) NOT IN (
        SELECT LOWER(TRIM(email)) FROM core_comercial.leads WHERE email IS NOT NULL
      )
    ORDER BY LOWER(TRIM(cnae.email))
    ON CONFLICT (lower(TRIM(BOTH FROM email))) WHERE ((email IS NOT NULL) AND ((email)::text <> ''::text)) DO UPDATE SET
      company_name = EXCLUDED.company_name,
      company_size = COALESCE(NULLIF(core_comercial.leads.company_size, ''), EXCLUDED.company_size),
      phone = COALESCE(NULLIF(core_comercial.leads.phone, ''), EXCLUDED.phone),
      website = COALESCE(NULLIF(core_comercial.leads.website, ''), EXCLUDED.website),
      updated_at = NOW();
  `, [empresaId, stage1Id, job2Id]);

  console.log(`✅ CRM inseridos: ${crmInsert.rowCount} novos leads!`);

  // 3. Atualizar contadores de todos os jobs
  console.log('3. Atualizando contadores de todas as missões de busca...');
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

  // Higienizar nomes com pontuação estranha
  await client.query(`
    UPDATE core_comercial.leads
    SET name = REGEXP_REPLACE(name, '^[\\s:·•\\-~*#【】▷]+|[\\s:·•\\-~*#【】▷]+$', '', 'g'),
        company_name = REGEXP_REPLACE(company_name, '^[\\s:·•\\-~*#【】▷]+|[\\s:·•\\-~*#【】▷]+$', '', 'g')
    WHERE name ~ '^[\\s:·•\\-~*#【】▷]' OR name ~ '[\\s:·•\\-~*#【】▷]$'
       OR company_name ~ '^[\\s:·•\\-~*#【】▷]' OR company_name ~ '[\\s:·•\\-~*#【】▷]$';
  `);

  const finalStaging = await client.query('SELECT count(*) FROM core_comercial.lead_prospecting_results;');
  const finalCrm = await client.query('SELECT count(*) FROM core_comercial.leads;');

  console.log(`\n🎉 INGESTÃO TURBO CONCLUÍDA!`);
  console.log(`📊 Staging Total: ${finalStaging.rows[0].count} empresas`);
  console.log(`📊 CRM Total: ${finalCrm.rows[0].count} leads qualificados prontos`);

  await client.end();
}

fastBatchIngest();
