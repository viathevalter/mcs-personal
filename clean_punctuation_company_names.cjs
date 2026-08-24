require('dotenv').config();
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

function cleanCompanyName(rawName, email, website) {
  if (!rawName) return formatFromDomain(email, website);

  let clean = rawName.trim();

  // Strip brackets, arrows, and punctuation wrappers
  clean = clean.replace(/^[::\s*【】▷►▶!¡_~#.\-\/\\|\(\)]+/, '');
  clean = clean.replace(/[::\s*【】▷►▶!¡_~#.\-\/\\|\(\)]+$/, '');
  clean = clean.replace(/【[^】]*】/g, '');
  clean = clean.replace(/\[[^\]]*\]/g, '');
  clean = clean.replace(/^::+\s*/, '');
  clean = clean.replace(/\s*::+$/, '');

  clean = clean.trim();

  const genericNames = [
    'bienvenidos',
    'bienvenido',
    'inicio',
    'aviso legal',
    'contacto',
    'home',
    'default',
    'not found',
    'error',
    'quienes somos',
    'servicios',
    'productos',
    'politica'
  ];

  if (clean.length < 3 || genericNames.includes(clean.toLowerCase())) {
    return formatFromDomain(email, website);
  }

  return clean;
}

function formatFromDomain(email, website) {
  let domain = '';
  if (website && website.startsWith('http')) {
    try {
      domain = new URL(website).hostname.replace(/^www\./, '').split('.')[0];
    } catch {}
  }
  if (!domain && email && email.includes('@')) {
    domain = email.split('@')[1].split('.')[0];
  }
  if (!domain) return 'Empresa Industrial S.L.';

  let d = domain.replace(/[-_]/g, ' ');
  let formatted = d.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  if (!formatted.toLowerCase().includes('s.l') && !formatted.toLowerCase().includes('s.a')) {
    formatted = `${formatted} S.L.`;
  }
  return formatted;
}

async function cleanPunctuationAndGenericNames() {
  console.log('==================================================================================');
  console.log('✨ HIGIENIZANDO SÍMBOLOS, PONTUAÇÃO E NOMES RESIDUAIS NO BANCO');
  console.log('==================================================================================\n');

  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  const leads = await client.query('SELECT id, name, company_name, email, website FROM core_comercial.leads;');
  let crmCleaned = 0;

  for (const l of leads.rows) {
    const cleaned = cleanCompanyName(l.company_name, l.email, l.website);
    if (cleaned !== l.company_name) {
      await client.query(`
        UPDATE core_comercial.leads
        SET company_name = $1,
            name = $1,
            updated_at = NOW()
        WHERE id = $2;
      `, [cleaned, l.id]);
      crmCleaned++;
      if (crmCleaned <= 12) {
        console.log(`🧼 [CRM] "${l.company_name}" ➔ "${cleaned}" (Email: ${l.email})`);
      }
    }
  }

  console.log(`\n✅ Total de nomes de empresas higienizados no CRM: ${crmCleaned}`);

  const staging = await client.query('SELECT id, company_name, email, website FROM core_comercial.lead_prospecting_results;');
  let stagingCleaned = 0;

  for (const s of staging.rows) {
    const cleaned = cleanCompanyName(s.company_name, s.email, s.website);
    if (cleaned !== s.company_name) {
      await client.query(`
        UPDATE core_comercial.lead_prospecting_results
        SET company_name = $1,
            updated_at = NOW()
        WHERE id = $2;
      `, [cleaned, s.id]);
      stagingCleaned++;
    }
  }

  console.log(`✅ Total de nomes de empresas higienizados no Staging: ${stagingCleaned}`);

  await client.end();
}

cleanPunctuationAndGenericNames();
