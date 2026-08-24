require('dotenv').config();
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#160;/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&aacute;/g, 'á')
    .replace(/&eacute;/g, 'é')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&uacute;/g, 'ú')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&Aacute;/g, 'Á')
    .replace(/&Eacute;/g, 'É')
    .replace(/&Iacute;/g, 'Í')
    .replace(/&Oacute;/g, 'Ó')
    .replace(/&Uacute;/g, 'Ú')
    .replace(/&Ntilde;/g, 'Ñ');
}

async function run() {
  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  const leads = await client.query('SELECT id, company_name, name, sector FROM core_comercial.leads WHERE company_name LIKE \'%&%\' OR name LIKE \'%&%\' OR sector LIKE \'%&%\';');
  let crmFixed = 0;

  for (const l of leads.rows) {
    const cName = decodeHtmlEntities(l.company_name);
    const nName = decodeHtmlEntities(l.name);
    const sName = decodeHtmlEntities(l.sector);

    if (cName !== l.company_name || nName !== l.name || sName !== l.sector) {
      await client.query(`
        UPDATE core_comercial.leads
        SET company_name = $1,
            name = $2,
            sector = $3,
            updated_at = NOW()
        WHERE id = $4;
      `, [cName, nName, sName, l.id]);
      crmFixed++;
    }
  }

  console.log(`✅ Total de leads corrigidos com entidades HTML decodificadas: ${crmFixed}`);
  await client.end();
}

run();
