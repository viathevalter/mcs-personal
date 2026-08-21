import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Client } from 'pg';

const PROD_PG_URL = process.env.VITE_PROD_SUPABASE_DB_URL || 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';

const JUNK_DOMAINS = [
  'webador.es', 'wixpress.com', 'sentry.io', 'schema.org', 'example.com',
  'ejemplo.com', 'doe.com', 'freehtml5.co', 'themewagon.com', 'bootstrap',
  'popper', 'fontawesome', 'cloudflare.com', 'wordpress.org', 'gravatar.com',
  'google.com', 'facebook.com', 'instagram.com'
];

function isCleanValidEmail(email: string): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  if (lower.length < 6 || lower.length > 80) return false;
  if (!lower.includes('@') || !lower.includes('.')) return false;
  if (/@\d+\.\d+/i.test(lower) || /\.(js|css|png|jpg|jpeg|webp|gif|svg)@/i.test(lower)) return false;
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.webp') || lower.endsWith('.js') || lower.endsWith('.css')) return false;

  for (const junk of JUNK_DOMAINS) {
    if (lower.includes(junk)) return false;
  }
  return true;
}

async function scrapeRealEmailsFromSite(baseUrl: string): Promise<string[]> {
  if (!baseUrl || !baseUrl.startsWith('http')) return [];
  const urlsToTry = [
    baseUrl,
    baseUrl.replace(/\/$/, '') + '/contacto',
    baseUrl.replace(/\/$/, '') + '/contacto.html',
    baseUrl.replace(/\/$/, '') + '/aviso-legal'
  ];

  for (const url of urlsToTry) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: controller.signal
      });
      clearTimeout(t);

      if (!res.ok) continue;
      const html = await res.text();
      const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
      const matches = html.match(emailRegex) || [];
      const clean = matches.filter(isCleanValidEmail);

      if (clean.length > 0) {
        return clean.map(e => e.toLowerCase().trim());
      }
    } catch {}
  }
  return [];
}

async function fetchHub(province: string, keywords: string, excludedCompanies: string[]): Promise<any[]> {
  const excludeStr = excludedCompanies.length > 0 ? `\nDO NOT return any of these previously captured: [${excludedCompanies.slice(-30).join(', ')}].` : '';
  const prompt = `Provide 25 real, active small/medium industrial workshops and fabricators (Pymes / Talleres de calderería, tubería industrial, cerrajería pesada, soldadura TIG/MIG, montajes mecánicos y mecanizado) located in polígonos industriales across "${province}", Spain matching: "${keywords}".
Target medium and small workshops (10 to 50 workers) situated in industrial estates (Polígonos Industriales) that subcontract welders, fitters, and tuberos.
Only return registered Spanish companies with real websites (.es or .com).${excludeStr}

Return JSON array only:
[
  {
    "company_name": "Exact Legal/Trade Name S.L. / S.A.",
    "website": "https://www.company.es",
    "phone": "+34 9xx xxx xxx",
    "address": "Polígono Industrial...",
    "city": "${province}",
    "province": "${province}"
  }
]`;

  const CANDIDATE_MODELS = ['gemini-3.6-flash', 'gemini-pro-latest', 'gemini-3.5-flash'];
  for (const model of CANDIDATE_MODELS) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.25,
          },
        }),
        signal: controller.signal
      });
      clearTimeout(t);

      if (!res.ok) continue;
      const json: any = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // try next
    }
  }
  return [];
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
