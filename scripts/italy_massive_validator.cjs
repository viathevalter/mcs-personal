const { Client } = require('pg');

const PROD_PG_URL = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const DEV_PG_URL = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const AISA_BASE_URL = 'https://api.aisa.one/v1';
const AISA_API_KEY = 'sk-aisa-yBrchxWrx7IAi8832rVsYN_I2znI4rjACKQ9gQFKGN8';

const ITALY_PROVINCES = [
  'Brescia (Polo Caldareria & Valcamonica)',
  'Bergamo (Polo Impiantistica & Dalmine)',
  'Milano (Zona Industriale Nord & Sesto)',
  'Vicenza (Polo Carpenteria & Arzignano)',
  'Verona (Consorzio ZAI & Meccanica)',
  'Treviso (Distretto Metalmeccanico)',
  'Padova (Zona Industriale ZIP)',
  'Torino (Polo Industriale Grugliasco & Canavese)',
  'Novara & Alessandria (Polo Piping Industriale)',
  'Bologna (Polo Packaging & Meccanica)',
  'Modena & Reggio Emilia (Polo Torneria & Lavorazioni CNC)',
  'Parma & Ravenna (Polo Inox Alimentare & Offshore Piping)',
  'Genova & La Spezia (Polo Navale & Riparazioni)',
  'Udine & Pordenone (Polo Costruzioni Acciaio)',
  'Lucca & Livorno (Polo Cartario & Scambiatori Termici)'
];

const SECTORS = [
  { name: 'Caldareria Pesante & Serbatoi a Pressione (Italia)', keywords: 'caldareria pesante, serbatoi a pressione, cisterne inox, reattori industriali, officine di caldareria' },
  { name: 'Tubisteria Industriale & Piping (Italia)', keywords: 'tubisteria industriale, piping impianti, montaggi meccanici industriali, saldatura tubazioni inox ed acciaio' },
  { name: 'Carpenteria Metallica & Strutture (Italia)', keywords: 'carpenteria metallica pesante, strutture in acciaio, capannoni industriali metallici, travi saldate' },
  { name: 'Scambiatori di Calore & Termica (Italia)', keywords: 'scambiatori di calore, caldaie industriali, recuperatori termici, essiccatori industriali' },
  { name: 'Lavorazioni Meccaniche CNC & Torneria (Italia)', keywords: 'lavorazioni meccaniche di precisione CNC, tornitura e fresatura conto terzi, alesatura pezzi grandi' },
  { name: 'Cantieri e Riparazioni Navali (Italia)', keywords: 'cantieri navali, allestimenti navali, carpenteria navale, riparazioni scafi e motori navali' },
  { name: 'Industria Vitivinícola, Cerveceras & Almazaras Inox', keywords: 'serbatoi per vino in acciaio inox, impianti enologici, birrifici impianti inox, silos alimentari' }
];

async function checkMx(domain) {
  if (!domain || domain.includes(' ') || !domain.includes('.')) return false;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, { signal: controller.signal });
    clearTimeout(t);
    const json = await res.json();
    return json.Status === 0 && Array.isArray(json.Answer) && json.Answer.length > 0;
  } catch {
    return false;
  }
}

async function fetchItalianHub(province, sectorObj, excluded) {
  const excludeStr = excluded.length > 0 ? `\nDO NOT return any of these previously captured companies: [${excluded.slice(-25).join(', ')}].` : '';
  const prompt = `Provide 25 real, active Italian small/medium industrial workshops and fabricators (PMR / Officine metalmeccaniche, caldareria, tubisteria industriale, carpenteria pesante, montaggi industriali, lavorazioni CNC) located in industrial estates (Aree / Zone Industriali) across "${province}", Italy matching: "${sectorObj.keywords}".
Target medium and small Italian workshops (10 to 80 workers) that subcontract welders (saldatori), pipefitters (tubisti), and metal fabricators (carpentieri).
Only return valid registered Italian companies with their active website (.it or .com) and verified contact email (e.g. info@, commerciale@, segreteria@, direzione@).${excludeStr}

Return JSON array only with this exact structure:
[
  {
    "company_name": "Exact Italian Legal/Trade Name (S.r.l. / S.p.A.)",
    "website": "https://www.domain.it",
    "phone": "+39 0xx xxxxxx",
    "address": "Via Industriale / Zona Industriale...",
    "city": "${province.split(' ')[0]}",
    "province": "${province}",
    "email": "info@domain.it"
  }
]`;

  try {
    const res = await fetch(`${AISA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AISA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an Italian industrial registry AI expert specialized in Italian B2B industrial districts (Distretti Industriali e Camere di Commercio). Return ONLY valid JSON array.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content || '[]';
    const clean = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error(`Fetch error for ${province}:`, err.message);
    return [];
  }
}

async function mineAndValidateBatch(rounds = 10) {
  const client = new Client({ connectionString: PROD_PG_URL });
  await client.connect();

  console.log(`========================================================================`);
  console.log(`🇮🇹 INICIANDO MINERAÇÃO E VALIDAÇÃO MASSIVA DE LEADS INDUSTRIAIS DA ITÁLIA`);
  console.log(`========================================================================\n`);

  // Get active empresa
  const empRes = await client.query('SELECT id FROM core_common.empresas LIMIT 1;');
  const empresaId = empRes.rows[0]?.id || 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d';

  // Get default stage
  const stageRes = await client.query(`
    SELECT id FROM core_comercial.kanban_stages 
    WHERE empresa_id = $1 AND order_index = 1 
    LIMIT 1;
  `, [empresaId]);
  const defaultStageId = stageRes.rows[0]?.id || null;

  // Existing emails cache
  const existingRes = await client.query('SELECT LOWER(TRIM(email)) as email FROM core_comercial.leads WHERE email IS NOT NULL;');
  const existingEmails = new Set(existingRes.rows.map(r => r.email));
  console.log(`Total de e-mails existentes no CRM para deduplicação: ${existingEmails.size}`);

  let totalMined = 0;
  let totalMxVerified = 0;
  let totalInserted = 0;

  for (let r = 0; r < rounds; r++) {
    console.log(`\n--- [CICLO ${r + 1} de ${rounds}] Varrendo Polos Industriais Italianos ---`);

    for (const province of ITALY_PROVINCES) {
      for (const sector of SECTORS) {
        const rawCompanies = await fetchItalianHub(province, sector, []);
        if (!rawCompanies || rawCompanies.length === 0) continue;

        totalMined += rawCompanies.length;
        const validBatch = [];

        for (const comp of rawCompanies) {
          if (!comp.email || !comp.company_name) continue;
          const cleanEmail = comp.email.toLowerCase().trim();
          if (existingEmails.has(cleanEmail)) continue;

          // Extract domain
          let domain = comp.website ? comp.website.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].split('?')[0].trim() : '';
          if (!domain && cleanEmail.includes('@')) {
            domain = cleanEmail.split('@')[1];
          }

          // Check DNS MX Record
          const hasMx = await checkMx(domain);
          if (!hasMx) {
            continue; // Skip invalid or non-existent email server domain
          }

          totalMxVerified++;
          existingEmails.add(cleanEmail);

          validBatch.push({
            empresa_id: empresaId,
            stage_id: defaultStageId,
            name: comp.company_name,
            company_name: comp.company_name,
            email: cleanEmail,
            phone: comp.phone || '+39 02 000000',
            website: comp.website || `https://www.${domain}`,
            address_line: comp.address || `${province}, Italia`,
            city: comp.city || province.split(' ')[0],
            province: province,
            sector: sector.name,
            origen_lead: 'AIsa - Prospecção Itália',
            notes: `Lead industrial italiano verificado via DNS MX. Setor: ${sector.name}. Distrito: ${province}.`,
            tags: ['Itália', 'Italia', 'Prospecção AI', 'AIsa Italia', sector.name]
          });
        }

        if (validBatch.length > 0) {
          for (const item of validBatch) {
            try {
              const checkRes = await client.query('SELECT id FROM core_comercial.leads WHERE LOWER(TRIM(email)) = LOWER(TRIM($1)) LIMIT 1;', [item.email]);
              if (checkRes.rows.length === 0) {
                await client.query(`
                  INSERT INTO core_comercial.leads (
                    empresa_id, stage_id, name, company_name, email, phone, website,
                    address_line, city, province, sector, origen_lead, notes, tags, created_at, updated_at
                  ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
                  );
                `, [
                  item.empresa_id, item.stage_id, item.name, item.company_name, item.email,
                  item.phone, item.website, item.address_line, item.city, item.province,
                  item.sector, item.origen_lead, item.notes, item.tags
                ]);
                totalInserted++;
              }
            } catch (insErr) {
              console.error("Insert error:", insErr.message);
            }
          }
          console.log(`[${province.split(' ')[0]}] +${validBatch.length} indústrias validadas com MX ativo! (Total inserido no CRM: ${totalInserted})`);
        }
      }
    }
  }

  console.log(`\n========================================================================`);
  console.log(`✅ PROCESSO DE MINERAÇÃO E VALIDAÇÃO CONCLUÍDO!`);
  console.log(`Total Mapeado: ${totalMined} | MX Verificados: ${totalMxVerified} | Inseridos no CRM: ${totalInserted}`);
  console.log(`========================================================================`);

  await client.end();
}

mineAndValidateBatch(4);
