const { Client } = require('pg');

const AISA_BASE_URL = 'https://api.aisa.one/v1';
const DEFAULT_AISA_API_KEY = 'sk-aisa-yBrchxWrx7IAi8832rVsYN_I2znI4rjACKQ9gQFKGN8';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

function sanitizeEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const cleaned = email.trim().toLowerCase();
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

function isFreeEmailDomain(email) {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase().trim();
  return ['gmail.com', 'hotmail.com', 'yahoo.com', 'yahoo.es', 'outlook.com', 'icloud.com'].includes(domain || '');
}

async function searchCompaniesViaAIsa(keywords, location, count, searchSource, apiKey, excludedCompanyNames) {
  let sourceInstructions = 'Use official Google Maps listings and verified Spanish business registries.';
  if (searchSource === 'linkedin') {
    sourceInstructions = 'Search active LinkedIn B2B company pages and verified corporate accounts in Spain.';
  } else if (searchSource === 'web_broad') {
    sourceInstructions = 'Crawl official corporate websites, Impressum, Contact, and Aviso Legal pages in Spain.';
  }

  const cleanLocation = location.replace(/,?\s*espanha/i, '').trim();
  let cleanKeywords = keywords.replace(new RegExp(cleanLocation, 'gi'), '').trim();
  if (!cleanKeywords) cleanKeywords = keywords;

  const excludedListStr = excludedCompanyNames.length > 0
    ? excludedCompanyNames.slice(-40).join(', ')
    : '';
  const excludeInstruction = excludedListStr
    ? `\nCRITICAL DEDUPLICATION RULE: DO NOT return any of the following company names as they have ALREADY been captured: [${excludedListStr}]. Focus strictly on discovering NEW, UNCAPTURED companies operating in ${location}.`
    : '';

  const prompt = `Act as a real-time B2B data crawler for industrial companies in Spain.
Search for ${count} REAL active companies in Spain matching core business activity: "${cleanKeywords}" strictly located anywhere within "${location}" (including all its cities and industrial parks).

CRITICAL INSTRUCTIONS:
1. ${sourceInstructions}
2. MANDATORY STRICT RULE: ONLY return active Spanish companies that HAVE a verified corporate email address (e.g. gerencia@, compras@, comercial@, presupuestos@, info@). DO NOT return any company if you cannot verify its corporate email.
3. EXPANDED METROPOLITAN & INDUSTRIAL BELT COVERAGE: Include companies physically located ANYWHERE in the metropolitan area, industrial belt (polígonos industriales), and full region/province of "${location}".
4. HIGH-QUALITY DIRECT EMAILS: Prioritize direct departmental or decision-maker emails published on their web pages (gerencia@, compras@, presupuestos@, tecnico@, or named contact emails like j.perez@domain.es). Only fallback to info@ or contacto@ if no direct departmental email is listed.
5. STRICT WEBSITE VERIFICATION: ONLY set "website" to a URL if the company HAS an active, verified public website. Otherwise set "website" strictly to null.${excludeInstruction}

Return ONLY a valid JSON array of objects with the exact schema below, with no markdown codeblocks, no explanations:
[
  {
    "company_name": "Exact Legal or Trade Name",
    "website": "https://www.realcompany.es" or null,
    "phone": "+34 976 123 456" or null,
    "address": "Calle Example 123, Polígono Industrial" or null,
    "city": "${location}",
    "province": "${location}",
    "email": "gerencia@realcompany.es",
    "linkedin_url": "https://www.linkedin.com/company/realcompany" or null,
    "sector": "${cleanKeywords}"
  }
]`;

  try {
    const response = await fetch(`${AISA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey || DEFAULT_AISA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a B2B business data assistant for industrial companies in Spain. Return ONLY a valid JSON array.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) return [];

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content || '[]';
    const cleanJsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const rawResults = JSON.parse(cleanJsonStr);

    return rawResults.map(item => ({
      company_name: item.company_name,
      website: item.website || null,
      phone: item.phone || null,
      address: item.address || null,
      city: item.city || location,
      province: item.province || location,
      email: sanitizeEmail(item.email),
      linkedin_url: item.linkedin_url || null,
      sector: item.sector || keywords,
    }));
  } catch (err) {
    console.error('AIsa API Error:', err.message);
    return [];
  }
}

async function runTurboMiner() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  console.log('🚀 INICIANDO TURBO MINER SERVER-SIDE PARA TODAS AS MISSÕES EM PROD...');

  try {
    while (true) {
      // Get next pending or processing job
      const resJob = await client.query(`
        SELECT * FROM core_comercial.lead_prospecting_jobs
        WHERE status IN ('processing', 'pending')
        ORDER BY created_at ASC
        LIMIT 1;
      `);

      if (resJob.rows.length === 0) {
        console.log('✅ TODAS AS MISSÕES FORAM CONCLUÍDAS COM SUCESSO!');
        break;
      }

      const job = resJob.rows[0];
      console.log(`\n📌 Minando Missão: "${job.title}" em ${job.location} (Fonte: ${job.search_source})`);

      // Set status to processing
      await client.query(`UPDATE core_comercial.lead_prospecting_jobs SET status = 'processing', updated_at = NOW() WHERE id = $1;`, [job.id]);

      // Query existing company names in staging & CRM for anti-duplication
      const resExisting = await client.query(`
        SELECT LOWER(TRIM(company_name)) as name, LOWER(TRIM(email)) as email
        FROM core_comercial.lead_prospecting_results
        WHERE empresa_id = $1
        UNION
        SELECT LOWER(TRIM(company_name)) as name, LOWER(TRIM(email)) as email
        FROM core_comercial.leads
        WHERE empresa_id = $1;
      `, [job.empresa_id]);

      const existingCompanySet = new Set(resExisting.rows.map(r => r.name).filter(Boolean));
      const existingEmailSet = new Set(resExisting.rows.map(r => r.email).filter(Boolean));

      // Get current emails count for this job
      const resEmailsCount = await client.query(`
        SELECT COUNT(*) as cnt FROM core_comercial.lead_prospecting_results
        WHERE job_id = $1 AND email IS NOT NULL;
      `, [job.id]);
      let currentEmails = parseInt(resEmailsCount.rows[0].cnt, 10);

      if (currentEmails >= job.target_count) {
        console.log(`🎯 Meta de ${job.target_count} e-mails já atingida nesta missão. Concluindo...`);
        await client.query(`UPDATE core_comercial.lead_prospecting_jobs SET status = 'completed', found_emails_count = $1, updated_at = NOW() WHERE id = $2;`, [currentEmails, job.id]);
        continue;
      }

      let emptyBatches = 0;
      while (currentEmails < job.target_count && emptyBatches < 3) {
        const excludedNames = Array.from(existingCompanySet);
        const fetchCount = 15;

        console.log(`  [Batch Request] Solicitando ${fetchCount} empresas para AIsa... (E-mails atuais: ${currentEmails}/${job.target_count})`);
        const scraped = await searchCompaniesViaAIsa(job.keywords, job.location, fetchCount, job.search_source, null, excludedNames);

        let insertedInBatch = 0;
        for (const item of scraped) {
          if (!item.company_name || !item.email) continue;
          const normName = item.company_name.trim().toLowerCase();
          const normEmail = item.email.trim().toLowerCase();

          if (existingCompanySet.has(normName) || existingEmailSet.has(normEmail)) continue;

          existingCompanySet.add(normName);
          existingEmailSet.add(normEmail);

          await client.query(`
            INSERT INTO core_comercial.lead_prospecting_results (
              job_id, empresa_id, company_name, email, phone, website, linkedin_url, address, city, province, country, confidence_score, status, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Espanha', 95, 'raw', NOW(), NOW()
            );
          `, [
            job.id,
            job.empresa_id,
            item.company_name,
            item.email,
            item.phone,
            item.website,
            item.linkedin_url,
            item.address,
            item.city || job.location,
            item.province || job.location,
          ]);

          insertedInBatch++;
          currentEmails++;
        }

        console.log(`  ✅ [Batch Sucesso] +${insertedInBatch} novos e-mails qualificados salvos. Total missão: ${currentEmails}/${job.target_count}`);

        if (insertedInBatch === 0) {
          emptyBatches++;
        } else {
          emptyBatches = 0;
        }

        // Update counts in job table
        await client.query(`
          UPDATE core_comercial.lead_prospecting_jobs
          SET 
            processed_count = (SELECT COUNT(*) FROM core_comercial.lead_prospecting_results WHERE job_id = $1),
            found_emails_count = $2,
            updated_at = NOW()
          WHERE id = $1;
        `, [job.id, currentEmails]);

        if (scraped.length === 0 || emptyBatches >= 3) {
          console.log(`📍 Região "${job.location}" varrida ao máximo. Total de e-mails encontrados: ${currentEmails}. Concluindo missão...`);
          await client.query(`UPDATE core_comercial.lead_prospecting_jobs SET status = 'completed', updated_at = NOW() WHERE id = $1;`, [job.id]);
          break;
        }

        // Short 1s delay
        await new Promise(r => setTimeout(r, 1000));
      }

      // Ensure job marked completed if done
      await client.query(`UPDATE core_comercial.lead_prospecting_jobs SET status = 'completed', updated_at = NOW() WHERE id = $1;`, [job.id]);
    }
  } catch (err) {
    console.error('Erro no Turbo Miner:', err);
  } finally {
    await client.end();
  }
}

runTurboMiner();
