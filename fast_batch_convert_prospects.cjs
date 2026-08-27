require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

async function runFastBatchConvert() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  console.log('=== ⚡ CONVERSÃO RÁPIDA EM LOTE DE PROSPECTS PARA LEADS ===\n');

  // 1. Obter o estágio padrão 1 da Luminous
  const stage1Res = await c.query(`
    SELECT id FROM core_comercial.kanban_stages 
    WHERE empresa_id = '847796c4-b253-4e53-9e6b-34a127ec7d85' AND order_index = 1 
    LIMIT 1;
  `);
  const stage1Id = stage1Res.rows[0]?.id;

  // 2. Inserir novos Leads que ainda NÃO existem em core_comercial.leads
  const insertSql = `
    WITH cleaned_prospects AS (
      SELECT
        r.id as result_id,
        COALESCE(r.empresa_id, j.empresa_id, '847796c4-b253-4e53-9e6b-34a127ec7d85'::uuid) as empresa_id,
        COALESCE(r.company_name, 'Responsável') as name,
        r.company_name,
        LOWER(TRIM(BOTH FROM REPLACE(REPLACE(REPLACE(REPLACE(r.email, '%20', ''), 'mailto:', ''), ' ', ''), '"', ''))) as clean_email,
        r.phone,
        r.website,
        r.linkedin_url,
        r.instagram_url,
        r.address as address_line,
        r.city,
        r.province,
        r.region,
        r.company_size,
        COALESCE(j.title, 'Geral') as sector,
        'Diretoria / Compras' as cargo,
        'prospeccao_b2b' as origen_lead,
        'Lead qualificado importado da Máquina de Leads - Missão: ' || COALESCE(j.title, 'Geral') || '. Localidade: ' || COALESCE(r.city, '') || ', ' || COALESCE(r.province, '') || '.' as notes,
        ARRAY['Prospecção Autônoma B2B', COALESCE(j.title, 'Geral'), COALESCE(r.company_size, ''), COALESCE(r.region, '')]::text[] as tags,
        r.job_id as prospecting_job_id,
        '${stage1Id}'::uuid as stage_id,
        r.created_at
      FROM core_comercial.lead_prospecting_results r
      LEFT JOIN core_comercial.lead_prospecting_jobs j ON j.id = r.job_id
      WHERE r.email IS NOT NULL 
        AND TRIM(r.email) != ''
    ),
    valid_distinct_prospects AS (
      SELECT DISTINCT ON (clean_email) *
      FROM cleaned_prospects
      WHERE clean_email ~* '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$'
        AND NOT (clean_email ~* '\\.(png|jpg|jpeg|avif|webp|svg|gif|bmp|ico|pdf)$')
      ORDER BY clean_email, created_at DESC
    ),
    new_leads_to_insert AS (
      SELECT vp.*
      FROM valid_distinct_prospects vp
      WHERE NOT EXISTS (
        SELECT 1 FROM core_comercial.leads l 
        WHERE LOWER(TRIM(BOTH FROM l.email)) = vp.clean_email
      )
    ),
    inserted_leads AS (
      INSERT INTO core_comercial.leads (
        empresa_id, name, company_name, email, phone, website,
        linkedin_url, instagram_url, address_line, city, province,
        region, company_size, sector, cargo, origen_lead,
        notes, tags, prospecting_job_id, stage_id, created_at, updated_at
      )
      SELECT 
        empresa_id, name, company_name, clean_email, phone, website,
        linkedin_url, instagram_url, address_line, city, province,
        region, company_size, sector, cargo, origen_lead,
        notes, tags, prospecting_job_id, stage_id, NOW(), NOW()
      FROM new_leads_to_insert
      RETURNING id, email
    )
    SELECT count(*) as total_inserted FROM inserted_leads;
  `;

  console.log('Inserindo novos Leads no Funil...');
  const insertRes = await c.query(insertSql);
  console.log(`Novos Leads Inseridos com Sucesso: ${insertRes.rows[0]?.total_inserted}`);

  // 3. Atualizar dados faltantes (website, telefone, cidade) em leads existentes
  console.log('Enriquecendo dados (website/telefone) de leads existentes...');
  const enrichRes = await c.query(`
    UPDATE core_comercial.leads l
    SET website = COALESCE(l.website, r.website),
        phone = COALESCE(l.phone, r.phone),
        city = COALESCE(l.city, r.city),
        province = COALESCE(l.province, r.province),
        updated_at = NOW()
    FROM core_comercial.lead_prospecting_results r
    WHERE LOWER(TRIM(BOTH FROM l.email)) = LOWER(TRIM(BOTH FROM REPLACE(REPLACE(r.email, '%20', ''), 'mailto:', '')))
      AND (l.website IS NULL OR l.phone IS NULL OR l.city IS NULL)
      AND (r.website IS NOT NULL OR r.phone IS NOT NULL OR r.city IS NOT NULL);
  `);
  console.log(`Leads Existentes Enriquecidos: ${enrichRes.rowCount}`);

  // 4. Atualizar imported_lead_id em lead_prospecting_results
  console.log('Vinculando imported_lead_id em lead_prospecting_results...');
  const linkRes = await c.query(`
    UPDATE core_comercial.lead_prospecting_results r
    SET imported_lead_id = l.id,
        status = 'imported',
        updated_at = NOW()
    FROM core_comercial.leads l
    WHERE LOWER(TRIM(BOTH FROM l.email)) = LOWER(TRIM(BOTH FROM REPLACE(REPLACE(r.email, '%20', ''), 'mailto:', '')))
      AND r.imported_lead_id IS NULL;
  `);
  console.log(`Resultados de Prospecção Vinculados com Sucesso: ${linkRes.rowCount}`);

  // 5. Auditoria Final do Funil
  const totalLeads = await c.query('SELECT count(*) FROM core_comercial.leads;');
  const dist = await c.query(`
    SELECT s.order_index, s.name as stage_name, count(l.id) as total_leads
    FROM core_comercial.kanban_stages s
    LEFT JOIN core_comercial.leads l ON l.stage_id = s.id
    WHERE s.empresa_id = '847796c4-b253-4e53-9e6b-34a127ec7d85'
    GROUP BY s.order_index, s.name
    ORDER BY s.order_index ASC;
  `);

  console.log('\n=== STATUS ATUALIZADO DO FUNIL DE VENDAS (LUMINOUS) ===');
  console.log(`Total Geral de Leads no Sistema: ${totalLeads.rows[0].count}`);
  console.table(dist.rows);

  await c.end();
}

runFastBatchConvert();
