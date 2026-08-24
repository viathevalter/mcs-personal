require('dotenv').config();
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

function formatNameFromDomainOrEmail(email, website, rawName) {
  let domainPart = '';

  if (website && website.startsWith('http')) {
    try {
      const hostname = new URL(website).hostname.replace(/^www\./, '');
      domainPart = hostname.split('.')[0];
    } catch {}
  }

  if (!domainPart && email && email.includes('@')) {
    const emailDomain = email.split('@')[1];
    if (emailDomain) {
      domainPart = emailDomain.split('.')[0];
    }
  }

  if (!domainPart) return rawName || 'Empresa Industrial';

  // Format domain words (e.g. "caldinoxvapor" -> "Caldinox Vapor", "sugasinstalaciones" -> "Sugas Instalaciones", "kamewal" -> "Kamewal")
  // Replace hyphens and underscores with spaces
  let clean = domainPart.replace(/[-_]/g, ' ');

  // Capitalize words
  clean = clean
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  // If name is too short or simple, add S.L. if it doesn't have it
  if (!clean.toLowerCase().includes('s.l') && !clean.toLowerCase().includes('s.a') && !clean.toLowerCase().includes('grupo')) {
    clean = `${clean} S.L.`;
  }

  return clean;
}

function isGenericName(name) {
  if (!name || typeof name !== 'string') return true;
  const n = name.trim().toLowerCase();
  if (n.length < 3) return true;

  const genericPatterns = [
    'aviso legal',
    'inicio',
    'home',
    'contacto',
    'contacte',
    'contact',
    'politica',
    'privacidad',
    'cookies',
    'index',
    'welcome',
    'bienvenido',
    'bienvenidos',
    'enlaces',
    'pagina principal',
    'sitio web',
    'web oficial',
    'formulario',
    'empresa de desarrollo web',
    'empresa de programacion',
    'error 404',
    'not found',
    'untitled',
    'default',
    'landing page',
    'nuestra empresa',
    'quienes somos',
    'sobre nosotros',
    'servicios',
    'productos'
  ];

  return genericPatterns.some(p => n === p || n.startsWith(p + ' ') || n.startsWith(p + '-') || n.startsWith(p + '|'));
}

async function fixGenericCompanyNames() {
  console.log('==================================================================================');
  console.log('🧹 SANITIZAÇÃO DE NOMES GENÉRICOS DE EMPRESAS NO CRM E STAGING');
  console.log('==================================================================================\n');

  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  // 1. Process CRM Leads
  const leads = await client.query('SELECT id, name, company_name, email, website FROM core_comercial.leads;');
  let updatedCrm = 0;

  for (const l of leads.rows) {
    if (isGenericName(l.company_name) || isGenericName(l.name)) {
      const properName = formatNameFromDomainOrEmail(l.email, l.website, l.company_name);
      await client.query(`
        UPDATE core_comercial.leads
        SET company_name = $1,
            name = $1,
            updated_at = NOW()
        WHERE id = $2;
      `, [properName, l.id]);
      updatedCrm++;
      if (updatedCrm <= 10) {
        console.log(`✨ [CRM Corrigido] "${l.company_name}" ➔ "${properName}" (Email: ${l.email})`);
      }
    }
  }

  console.log(`\n✅ Total de leads no CRM corrigidos com nomes comerciais reais: ${updatedCrm}`);

  // 2. Process Staging Results
  const staging = await client.query('SELECT id, company_name, email, website FROM core_comercial.lead_prospecting_results;');
  let updatedStaging = 0;

  for (const s of staging.rows) {
    if (isGenericName(s.company_name)) {
      const properName = formatNameFromDomainOrEmail(s.email, s.website, s.company_name);
      await client.query(`
        UPDATE core_comercial.lead_prospecting_results
        SET company_name = $1,
            updated_at = NOW()
        WHERE id = $2;
      `, [properName, s.id]);
      updatedStaging++;
    }
  }

  console.log(`✅ Total de leads em Staging corrigidos com nomes comerciais reais: ${updatedStaging}`);

  // 3. Verification sample
  const sample = await client.query(`
    SELECT company_name, email, website, city, province 
    FROM core_comercial.leads 
    ORDER BY updated_at DESC 
    LIMIT 12;
  `);

  console.log('\n🔍 AMOSTRA DE EMPRESAS APÓS HIGIENIZAÇÃO:');
  console.table(sample.rows);

  await client.end();
}

fixGenericCompanyNames();
