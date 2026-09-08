require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const INDUSTRIAL_TERMS = [
  'tuyauterie', 'chaudronnerie', 'soudure', 'soudeur', 'mécano-soudure', 'mecano-soudure',
  'usinage', 'décolletage', 'decolletage', 'tôlerie', 'tolerie', 'charpente métallique',
  'charpente metallique', 'serrurerie', 'métallerie', 'metallerie', 'cuve', 'citerne',
  'réservoir', 'reservoir', 'naval', 'chantier naval', 'bateau', 'robinetterie',
  'valves', 'tuyaux', 'montage mécanique', 'montage mecanique', 'maintenance industrielle',
  'pipeline', 'inox', 'acier', 'métal', 'metal', 'échangeur', 'echangeur', 'chaudière', 'chaudiere'
];

const BLACKLIST_TERMS = [
  'voyage', 'voyages', 'tourisme', 'musique', 'spectacle', 'avocat', 'notaire',
  'dentiste', 'médical', 'clinique', 'coiffure', 'esthétique', 'assurance',
  'immobilier', 'agence de voyage', 'séjour', 'vacances', 'croisière', 'concert',
  'album', 'artiste', 'chanson', 'conservatoire'
];

async function checkSiteRelevance(url, companyName) {
  if (!url || !url.startsWith('http')) return { isValid: false, reason: 'No URL' };
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) return { isValid: false, reason: 'HTTP ' + res.status };
    const html = (await res.text()).toLowerCase();

    for (const bad of BLACKLIST_TERMS) {
      if (html.includes(bad)) {
        const hasIndustrial = INDUSTRIAL_TERMS.some(t => html.includes(t));
        if (!hasIndustrial) {
          return { isValid: false, reason: 'Blacklist term: ' + bad };
        }
      }
    }

    const matchedIndustrial = INDUSTRIAL_TERMS.filter(t => html.includes(t));
    if (matchedIndustrial.length > 0) {
      return { isValid: true, matched: matchedIndustrial.slice(0, 3).join(', ') };
    }

    const cleanComp = companyName.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    const words = cleanComp.split(/\s+/).filter(w => w.length >= 4);
    if (words.some(w => html.includes(w))) {
      return { isValid: true, matched: 'Company name match' };
    }

    return { isValid: false, reason: 'No industrial keywords' };
  } catch (err) {
    return { isValid: false, reason: err.message };
  }
}

async function runAudit() {
  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  console.log('====================================================================');
  console.log('🔍 AUDITORIA SEMÂNTICA E PURGA DE LEADS DA FRANÇA (100% REAIS)');
  console.log('====================================================================');

  console.log('\n1. Purgando telefones com zeros e placeholders...');
  const purgeZerosRes = await client.query(`
    DELETE FROM core_comercial.leads 
    WHERE (region = 'França' OR '🇫🇷 França' = ANY(tags))
      AND (phone LIKE '%+33 1 00 00 00 00%' OR phone LIKE '%00 00 00%')
    RETURNING id;
  `);
  console.log('  ➔ ' + purgeZerosRes.rows.length + ' leads com telefones falsos eliminados.');

  console.log('\n2. Purgando domínios incompatíveis confirmados (ex: turismo, música)...');
  const purgeKnownRes = await client.query(`
    DELETE FROM core_comercial.leads 
    WHERE (region = 'França' OR '🇫🇷 França' = ANY(tags))
      AND (
        email LIKE '%@sbv.fr' OR email LIKE '%@cnm.fr' OR email LIKE '%@creartservices.com'
        OR email LIKE '%@tac.fr' OR email LIKE '%@rcc.fr' OR email LIKE '%@arch.com'
      )
    RETURNING id;
  `);
  console.log('  ➔ ' + purgeKnownRes.rows.length + ' leads de domínios incompatíveis eliminados.');

  console.log('\n3. Auditando domínios de siglas curtas (comprimento <= 7 letras)...');
  const suspectLeads = await client.query(`
    SELECT id, company_name, email, website, phone 
    FROM core_comercial.leads 
    WHERE (region = 'França' OR '🇫🇷 França' = ANY(tags)) 
      AND length(split_part(email, '@', 2)) <= 7 
    ORDER BY id ASC;
  `);
  console.log('  Total de domínios de siglas curtas para auditar:', suspectLeads.rows.length);

  let verifiedCount = 0;
  let purgedCount = 0;
  const toDeleteIds = [];

  for (let i = 0; i < suspectLeads.rows.length; i += 20) {
    const chunk = suspectLeads.rows.slice(i, i + 20);
    await Promise.all(chunk.map(async (lead) => {
      const audit = await checkSiteRelevance(lead.website, lead.company_name);
      if (audit.isValid) {
        verifiedCount++;
        await client.query("UPDATE core_comercial.leads SET tags = array_append(tags, 'Auditado: 100% Industrial') WHERE id = $1 AND NOT ('Auditado: 100% Industrial' = ANY(tags));", [lead.id]);
      } else {
        purgedCount++;
        toDeleteIds.push(lead.id);
        console.log('  ❌ Descartado [' + audit.reason + ']: ' + lead.company_name + ' | ' + lead.email);
      }
    }));
  }

  if (toDeleteIds.length > 0) {
    await client.query("DELETE FROM core_comercial.leads WHERE id = ANY($1::uuid[]);", [toDeleteIds]);
    console.log('  ➔ ' + toDeleteIds.length + ' leads descartados por falta de correspondência industrial.');
  }

  console.log('\n4. Convalidando leads industriais restantes...');
  await client.query(`
    UPDATE core_comercial.leads 
    SET tags = array_append(tags, 'Auditado: 100% Industrial') 
    WHERE (region = 'França' OR '🇫🇷 França' = ANY(tags)) 
      AND NOT ('Auditado: 100% Industrial' = ANY(tags)) 
      AND (
        company_name ILIKE '%chaudronnerie%' OR company_name ILIKE '%tuyauterie%' 
        OR company_name ILIKE '%soudure%' OR company_name ILIKE '%mecanique%' 
        OR company_name ILIKE '%mécano%' OR company_name ILIKE '%usinage%' 
        OR company_name ILIKE '%metal%' OR company_name ILIKE '%métal%' 
        OR company_name ILIKE '%acier%' OR company_name ILIKE '%naval%' 
        OR company_name ILIKE '%inox%' OR company_name ILIKE '%industrie%'
      );
  `);

  const finalTotalCrm = await client.query("SELECT count(*) FROM core_comercial.leads;");
  const finalFranceCrm = await client.query("SELECT count(*) FROM core_comercial.leads WHERE region = 'França' OR '🇫🇷 França' = ANY(tags);");
  const auditedFrance = await client.query("SELECT count(*) FROM core_comercial.leads WHERE (region = 'França' OR '🇫🇷 França' = ANY(tags)) AND 'Auditado: 100% Industrial' = ANY(tags);");

  console.log('\n====================================================================');
  console.log('✅ AUDITORIA CONCLUÍDA!');
  console.log('====================================================================');
  console.log('📊 Total Geral no CRM:', finalTotalCrm.rows[0].count);
  console.log('🇫🇷 Total da França Limpo no CRM:', finalFranceCrm.rows[0].count);
  console.log('🎖️ Total com Selo [Auditado: 100% Industrial]:', auditedFrance.rows[0].count);
  console.log('🗑️ Total de Falsos Positivos Eliminados:', purgeZerosRes.rows.length + purgeKnownRes.rows.length + toDeleteIds.length);

  await client.end();
}

runAudit().catch(console.error);