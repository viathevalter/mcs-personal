require('dotenv').config();
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

function cleanCompanyName(name, email) {
  if (!name || name.trim() === '') {
    if (email && email.includes('@')) {
      const dom = email.split('@')[1].split('.')[0];
      return dom.toUpperCase();
    }
    return 'Empresa Industrial';
  }

  let n = name
    .replace(/^[:\s\-•·*~#【】▷]+|[:\s\-•·*~#【】▷]+$/g, '')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .trim();

  // Se o nome for genérico como "Inicio", "Aviso Legal", etc.
  const lower = n.toLowerCase();
  const genericTitles = [
    'inicio', 'inicio -', 'home', 'bienvenidos', 'aviso legal', 'contacto', 
    'politica de privacidad', 'página de inicio', 'index', 'servicios',
    'quienes somos', 'empresa', 'productos'
  ];

  if (genericTitles.some(g => lower === g || lower.startsWith(g + ' ') || lower.endsWith(' ' + g))) {
    if (email && email.includes('@')) {
      const dom = email.split('@')[1].split('.')[0];
      return dom.toUpperCase();
    }
  }

  return n;
}

function detectTier(name, sector) {
  const text = `${name || ''} ${sector || ''}`.toUpperCase();
  if (text.includes(' S.A.') || text.includes(' S.A') || text.includes('ASTILLERO') || text.includes('NAVANTIA') || text.includes('PETROQUIM') || text.includes('REPSOL') || text.includes('IBERDROLA') || text.includes('ACCIONA') || text.includes('DRAGADOS') || text.includes('DURO FELGUERA') || text.includes('GRUPO') || text.includes('HOLDING') || text.includes('INTERNACIONAL') || text.includes('GLOBAL')) {
    return 'Tier 1 (Gran Empresa / EPC)';
  }
  if (text.includes('CALDERERIA') || text.includes('TUBERIA') || text.includes('MECANIZADO') || text.includes('MONTAJES') || text.includes('ESTRUCTURAS') || text.includes('INGENIERIA') || text.includes('FABRICACION') || text.includes('INDUSTRIAL') || text.includes('TANQUES') || text.includes('SOLDADURA')) {
    return 'Tier 2 (Mediana Empresa Industrial)';
  }
  return 'Tier 3 (Pequeña Empresa / Taller Especializado)';
}

async function convertAll() {
  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  console.log('=== CONVERSÃO AUTOMÁTICA DE LEADS STAGING PARA O CRM ===\n');

  const defaultStage = await client.query(`
    SELECT id, empresa_id FROM core_comercial.kanban_stages 
    WHERE order_index = 1 
    LIMIT 1;
  `);
  const stage1Id = defaultStage.rows[0]?.id;
  const empresaId = defaultStage.rows[0]?.empresa_id || '847796c4-b253-4e53-9e6b-34a127ec7d85';

  const rawStaging = await client.query(`
    SELECT r.*, j.title as job_title
    FROM core_comercial.lead_prospecting_results r
    LEFT JOIN core_comercial.lead_prospecting_jobs j ON j.id = r.job_id
    WHERE r.email IS NOT NULL AND r.email != '';
  `);

  console.log(`🔍 Total de leads no Staging analisados: ${rawStaging.rows.length}`);

  let inserted = 0;
  let updated = 0;

  for (const row of rawStaging.rows) {
    const cleanEmail = row.email.toLowerCase().trim();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) continue;

    const safeStr = (s, max = 250) => (s ? String(s).substring(0, max).trim() : '');

    const companyName = safeStr(cleanCompanyName(row.company_name, cleanEmail), 250);
    const sector = safeStr(row.sector || 'Calderería & Tubería Industrial', 250);
    const tier = safeStr(detectTier(companyName, sector), 100);
    const province = safeStr(row.province || 'España', 100);
    const city = safeStr(row.city || province, 100);
    const phone = safeStr(row.phone || '+34 91 000 00 00', 50);
    const website = safeStr(row.website || '', 250);
    const address = safeStr(row.address || 'Polígono Industrial', 250);

    const insertRes = await client.query(`
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
        city = COALESCE(NULLIF(core_comercial.leads.city, ''), EXCLUDED.city),
        province = COALESCE(NULLIF(core_comercial.leads.province, ''), EXCLUDED.province),
        updated_at = NOW()
      RETURNING (xmax = 0) AS was_inserted;
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
      safeStr(`Lead qualificado importado da Máquina de Leads em ${city}, ${province}.`, 500),
      ['Prospecção Autônoma B2B', sector, tier],
      tier,
      stage1Id,
      row.job_id
    ]);

    if (insertRes.rows[0]?.was_inserted) {
      inserted++;
    } else {
      updated++;
    }
  }

  // Marcar todos no Staging como 'converted'
  const markStaging = await client.query(`
    UPDATE core_comercial.lead_prospecting_results
    SET status = 'converted',
        updated_at = NOW()
    WHERE status != 'converted';
  `);

  console.log(`\n✅ Novos leads criados no CRM: ${inserted}`);
  console.log(`✅ Leads existentes atualizados/sincronizados no CRM: ${updated}`);
  console.log(`✅ Leads marcados como convertidos no Staging: ${markStaging.rowCount}`);

  const totalCrm = await client.query('SELECT count(*) FROM core_comercial.leads;');
  const totalStaging = await client.query('SELECT count(*) FROM core_comercial.lead_prospecting_results;');

  console.log(`\n📊 STATUS FINAL:`);
  console.log(`   - Total no Staging: ${totalStaging.rows[0].count} empresas`);
  console.log(`   - Total de Leads no CRM: ${totalCrm.rows[0].count} empresas qualificadas`);

  await client.end();
}

convertAll();
