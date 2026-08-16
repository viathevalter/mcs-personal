import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from 'pg';

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const AISA_BASE_URL = 'https://api.aisa.one/v1';
const AISA_API_KEY = process.env.VITE_AISA_API_KEY || 'sk-aisa-yBrchxWrx7IAi8832rVsYN_I2znI4rjACKQ9gQFKGN8';

const ALL_SPANISH_PROVINCES = [
  'Madrid (Polígonos de Getafe, Pinto, San Fernando, Coslada y Alcalá)',
  'Barcelona (Polígonos de Sabadell, Terrassa, Granollers, Martorell, Sant Boi y Zona Franca)',
  'Vizcaya / Bilbao (Polígonos de Asua, Erandio, Trapagaran, Durango y Zamudio)',
  'Zaragoza (Polígonos Malpica, Plaza, Centrovía, Cogullada y Utebo)',
  'Valencia (Polígonos Fuente del Jarro, Almussafes, Paterna y Ribarroja)',
  'Sevilla (Polígonos Calonge, Store, La Isla y Alcalá de Guadaíra)',
  'Asturias (Polígonos Silvota, Asipo, PEPA Avilés y Porceyo Gijón)',
  'Navarra (Polígonos Landaben, Noáin y Comarca 2)',
  'Pontevedra / Vigo (Polígonos de Balaídos, O Campiño y Porriño)',
  'A Coruña (Polígonos de Sabón, Grela y Ferrolterra)',
  'Álava / Vitoria (Polígonos de Júndiz, Betoño y Gojain)',
  'Gipuzkoa (Polígonos de Eibar, Beasain, Hernani e Irún)',
  'Tarragona (Polígonos Químico Riu Clar, Francolí y Constantí)',
  'Cádiz (Polígonos de Algeciras, San Fernando, Puerto Real y El Trocadero)',
  'Murcia (Polígonos de Cartagena, Cabezo Beaza y Molina de Segura)',
  'Valladolid (Polígonos San Cristóbal y Argales)',
  'Alicante (Polígonos Las Atalayas y Pla de la Vallonga)',
  'Cantabria (Polígonos Candina, Guarnizo y Morero)',
  'Castellón (Polígonos Mijares y Ciudad del Transporte)',
  'Huelva (Polígonos Nuevo Puerto y Palos de la Frontera)'
];

async function checkMx(domain: string): Promise<boolean> {
  if (!domain || domain.includes(' ') || !domain.includes('.')) return false;
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, { signal: controller.signal });
    clearTimeout(t);
    const json: any = await res.json();
    return json.Status === 0 && Array.isArray(json.Answer) && json.Answer.length > 0;
  } catch {
    return false;
  }
}

async function fetchHub(province: string, keywords: string, excludedCompanies: string[]): Promise<any[]> {
  const excludeStr = excludedCompanies.length > 0 ? `\nDO NOT return any of these previously captured: [${excludedCompanies.slice(-30).join(', ')}].` : '';
  const prompt = `Provide 20 real, active small/medium industrial workshops and fabricators (Pymes / Talleres de calderería, tubería industrial, cerrajería pesada, soldadura TIG/MIG, montajes mecánicos y mecanizado) located in polígonos industriales across "${province}", Spain matching: "${keywords}".
Target medium and small workshops (10 to 50 workers) situated in industrial estates (Polígonos Industriales) that subcontract welders, fitters, and tuberos.
Only return valid, non-fictional registered companies with their official website and primary contact email.${excludeStr}

Return JSON array only:
[
  {
    "company_name": "Exact Legal/Trade Name S.L. / S.A.",
    "website": "https://www.company.es",
    "phone": "+34 9xx xxx xxx",
    "address": "Polígono Industrial...",
    "city": "${province}",
    "province": "${province}",
    "email": "contacto@company.es"
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
          { role: 'system', content: 'You are a Spanish industrial B2B registry assistant specializing in industrial parks and SME workshops. Return ONLY a valid JSON array.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    const json: any = await res.json();
    const content = json.choices?.[0]?.message?.content || '[]';
    const clean = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const client = new Client({ connectionString: PROD_PG_URL });
  
  try {
    await client.connect();

    // 1. Find active processing job or next pending job ordered chronologically
    let jobRes = await client.query(`
      SELECT * FROM core_comercial.lead_prospecting_jobs 
      WHERE status = 'processing' 
      ORDER BY created_at ASC 
      LIMIT 1;
    `);

    if (jobRes.rows.length === 0) {
      jobRes = await client.query(`
        SELECT * FROM core_comercial.lead_prospecting_jobs 
        WHERE status = 'pending' 
        ORDER BY created_at ASC 
        LIMIT 1;
      `);
      
      if (jobRes.rows.length > 0) {
        await client.query(`
          UPDATE core_comercial.lead_prospecting_jobs 
          SET status = 'processing', updated_at = NOW() 
          WHERE id = $1;
        `, [jobRes.rows[0].id]);
        jobRes.rows[0].status = 'processing';
      }
    }

    if (jobRes.rows.length === 0) {
      await client.end();
      return res.status(200).json({ status: 'idle', message: 'No active or pending prospecting missions in queue.' });
    }

    const job = jobRes.rows[0];

    // 2. Fetch existing names & emails in Staging and CRM for global deduplication
    const existingStagingRes = await client.query('SELECT company_name, email FROM core_comercial.lead_prospecting_results;');
    const existingCrmRes = await client.query('SELECT company_name, email FROM core_comercial.leads;');

    const existingNames = new Set<string>();
    const existingEmails = new Set<string>();
    const excludedList: string[] = [];

    for (const r of [...existingStagingRes.rows, ...existingCrmRes.rows]) {
      if (r.company_name) {
        const n = r.company_name.trim().toLowerCase();
        existingNames.add(n);
        excludedList.push(r.company_name.trim());
      }
      if (r.email) {
        existingEmails.add(r.email.trim().toLowerCase());
      }
    }

    // 3. Select 8 rotating industrial provinces
    const baseIdx = Math.floor(excludedList.length / 5);
    const targetHubs = [
      ALL_SPANISH_PROVINCES[baseIdx % ALL_SPANISH_PROVINCES.length],
      ALL_SPANISH_PROVINCES[(baseIdx + 1) % ALL_SPANISH_PROVINCES.length],
      ALL_SPANISH_PROVINCES[(baseIdx + 2) % ALL_SPANISH_PROVINCES.length],
      ALL_SPANISH_PROVINCES[(baseIdx + 3) % ALL_SPANISH_PROVINCES.length],
      ALL_SPANISH_PROVINCES[(baseIdx + 4) % ALL_SPANISH_PROVINCES.length],
      ALL_SPANISH_PROVINCES[(baseIdx + 5) % ALL_SPANISH_PROVINCES.length],
      ALL_SPANISH_PROVINCES[(baseIdx + 6) % ALL_SPANISH_PROVINCES.length],
      ALL_SPANISH_PROVINCES[(baseIdx + 7) % ALL_SPANISH_PROVINCES.length],
    ];

    // 4. Run 8 parallel extractions
    const hubResults = await Promise.all(
      targetHubs.map((hub) => fetchHub(hub, job.keywords, excludedList))
    );

    const candidates = hubResults.flat();
    const verifiedRecords: any[] = [];

    // 5. Verify DNS MX and deduplicate
    await Promise.all(
      candidates.map(async (c) => {
        if (!c.company_name || !c.email || !c.email.includes('@')) return;
        const normName = c.company_name.trim().toLowerCase();
        const normEmail = c.email.trim().toLowerCase();

        if (existingNames.has(normName) || existingEmails.has(normEmail)) return;

        const domain = normEmail.split('@')[1];
        const hasMx = await checkMx(domain);
        if (hasMx) {
          existingNames.add(normName);
          existingEmails.add(normEmail);
          verifiedRecords.push({
            job_id: job.id,
            empresa_id: job.empresa_id,
            company_name: c.company_name.trim(),
            email: normEmail,
            phone: c.phone || null,
            website: c.website || null,
            address: c.address || null,
            city: c.city || 'Espanha',
            province: c.province || 'Espanha',
            country: 'Espanha',
            confidence_score: 95,
            status: 'raw',
          });
        }
      })
    );

    // 6. Insert verified leads into staging & master CNAE
    for (const r of verifiedRecords) {
      await client.query(`
        INSERT INTO core_comercial.lead_prospecting_results (
          job_id, empresa_id, company_name, email, phone, website,
          address, city, province, country, confidence_score, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW());
      `, [
        r.job_id, r.empresa_id, r.company_name, r.email, r.phone, r.website,
        r.address, r.city, r.province, r.country, r.confidence_score, r.status
      ]);

      // Also upsert into Master Directory
      await client.query(`
        INSERT INTO core_comercial.empresas_espanha_cnae (
          razao_social, nome_comercial, website, telefone, email, email_status,
          provincia, municipio, endereco, setor, status_enriquecimento, updated_at
        ) VALUES ($1, $1, $2, $3, $4, 'verified', $5, $6, $7, $8, 'enriched', NOW())
        ON CONFLICT DO NOTHING;
      `, [
        r.company_name, r.website, r.phone, r.email,
        r.province, r.city, r.address, job.sector_filter || 'Metalurgia / Industrial'
      ]);
    }

    // 7. Update Job Metrics in database
    const jobResultsCountRes = await client.query(`
      SELECT count(*) FROM core_comercial.lead_prospecting_results WHERE job_id = $1;
    `, [job.id]);
    const currentCount = parseInt(jobResultsCountRes.rows[0].count, 10);

    let isCompleted = currentCount >= job.target_count;
    if (isCompleted) {
      await client.query(`
        UPDATE core_comercial.lead_prospecting_jobs 
        SET status = 'completed', processed_count = $1, found_emails_count = $1, updated_at = NOW() 
        WHERE id = $2;
      `, [currentCount, job.id]);
    } else {
      await client.query(`
        UPDATE core_comercial.lead_prospecting_jobs 
        SET processed_count = $1, found_emails_count = $1, updated_at = NOW() 
        WHERE id = $2;
      `, [currentCount, job.id]);
    }

    await client.end();

    return res.status(200).json({
      success: true,
      job_id: job.id,
      job_title: job.title,
      new_verified_leads: verifiedRecords.length,
      total_job_leads: currentCount,
      completed: isCompleted,
      status: isCompleted ? 'completed' : 'processing'
    });

  } catch (error: any) {
    if (client) {
      try { await client.end(); } catch {}
    }
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
