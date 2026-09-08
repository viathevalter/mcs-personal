const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;
const https = require('https');
const http = require('http');
const XLSX = require('xlsx');
const { Client } = require('pg');

// Set public fast DNS resolvers
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const FOLDER = path.resolve('temp-operacoes', 'AlexNuevos');
const INPUT_EXCEL = path.join(FOLDER, 'CORREOS NUEVOS ALEX02-09.xlsx');
const OUTPUT_EXCEL = path.join(FOLDER, 'MAILING_ALEX_NUEVOS_ENRIQUECIDO_FINAL.xlsx');

const prodConn = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';
const devConn = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';

const LUMINOUS_EMPRESA_ID = '847796c4-b253-4e53-9e6b-34a127ec7d85';
const ALEX_USER_ID = 'efc6c631-f22a-4ce6-b662-9309a50a4cb7'; // Alex Carmona
const SPAIN_COUNTRY_ID = '2f487ab4-c7f5-4b70-9c37-995dc4cda125'; // Espanha

// Map of common public domains
const PUBLIC_DOMAINS = new Set([
  'gmail.com', 'hotmail.com', 'yahoo.es', 'yahoo.com', 'outlook.es', 'outlook.com',
  'telefonica.net', 'movistar.es', 'wanadoo.es', 'terra.es', 'orange.es', 'vodafone.es',
  'ono.com', 'telecable.es', 'euskalnet.net', 'arrakis.es', 'mixmail.com', 'icloud.com', 'live.com'
]);

function timeoutPromise(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

async function resolveMxFast(domain) {
  if (PUBLIC_DOMAINS.has(domain)) return true;
  try {
    const mx = await Promise.race([
      dns.resolveMx(domain),
      timeoutPromise(1500)
    ]);
    return mx && mx.length > 0;
  } catch (e) {
    try {
      const a = await Promise.race([
        dns.resolve4(domain),
        timeoutPromise(1000)
      ]);
      return a && a.length > 0;
    } catch (e2) {
      return false;
    }
  }
}

// Helper for HTTP/HTTPS requests with timeout
function fetchHtml(targetUrl, timeoutMs = 2500) {
  return new Promise((resolve) => {
    try {
      const parsed = new URL(targetUrl);
      const isHttps = parsed.protocol === 'https:';
      const clientModule = isHttps ? https : http;

      const req = clientModule.get(targetUrl, {
        timeout: timeoutMs,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        },
        rejectUnauthorized: false
      }, (res) => {
        if ((res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) && res.headers.location) {
          try {
            const redirectUrl = new URL(res.headers.location, targetUrl).href;
            fetchHtml(redirectUrl, timeoutMs).then(resolve);
            return;
          } catch (e) {
            resolve({ ok: false });
            return;
          }
        }

        if (res.statusCode !== 200) {
          resolve({ ok: false, status: res.statusCode });
          return;
        }

        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => {
          data += chunk;
          if (data.length > 250000) {
            req.destroy();
            resolve({ ok: true, html: data });
          }
        });
        res.on('end', () => resolve({ ok: true, html: data }));
      });

      req.on('timeout', () => { req.destroy(); resolve({ ok: false, reason: 'timeout' }); });
      req.on('error', (err) => resolve({ ok: false, error: err.message }));
    } catch (err) {
      resolve({ ok: false, error: err.message });
    }
  });
}

function extractMetadataFromHtml(html) {
  if (!html) return {};

  const cleanText = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
                        .replace(/<[^>]+>/g, ' ');

  // 1. Phone extraction
  let phones = [];
  const phoneMatches = html.match(/(?:\+34|0034)?[\s.-]?(?:[6789]\d{2})[\s.-]?\d{3}[\s.-]?\d{3}/g) || [];
  for (let p of phoneMatches) {
    const digits = p.replace(/\D/g, '');
    let cleanPhone = '';
    if (digits.startsWith('34') && digits.length === 11) {
      cleanPhone = `+34 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    } else if (digits.length === 9) {
      cleanPhone = `+34 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    if (cleanPhone && !phones.includes(cleanPhone)) {
      phones.push(cleanPhone);
    }
  }

  // 2. CIF / NIF extraction
  let cif = null;
  const cifMatch = html.match(/\b([ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J])\b/i);
  if (cifMatch) {
    cif = cifMatch[1].toUpperCase();
  }

  // 3. Official Legal Name
  let legalName = null;
  const legalMatch = cleanText.match(/([A-ZÁÉÍÓÚÑ0-9\s.,&-]{3,50}\s+(?:S\.?L\.?U?|S\.?A\.?U?|S\.?C\.?P?|SOCIEDAD LIMITADA|SOCIEDAD ANONIMA))/i);
  if (legalMatch) {
    const rawLegal = legalMatch[1].trim().replace(/\s+/g, ' ');
    if (rawLegal.length < 60 && !rawLegal.toLowerCase().includes('copyright') && !rawLegal.toLowerCase().includes('todos')) {
      legalName = rawLegal;
    }
  }

  // 4. Sector detection
  let detectedSector = null;
  const lowerText = cleanText.toLowerCase();
  if (lowerText.includes('calderería') || lowerText.includes('caldereria') || lowerText.includes('tubería') || lowerText.includes('piping')) {
    detectedSector = 'Calderería & Tubería Industrial';
  } else if (lowerText.includes('estructura metálica') || lowerText.includes('estructuras metalicas') || lowerText.includes('cerrajería') || lowerText.includes('carpintería metálica')) {
    detectedSector = 'Estructuras Metálicas & Montajes';
  } else if (lowerText.includes('mecanizado') || lowerText.includes('torno') || lowerText.includes('fresado') || lowerText.includes('cnc') || lowerText.includes('matricería')) {
    detectedSector = 'Mecanizado & Matricería';
  } else if (lowerText.includes('naval') || lowerText.includes('astillero') || lowerText.includes('embarcacion')) {
    detectedSector = 'Construção & Reparação Naval';
  } else if (lowerText.includes('fundición') || lowerText.includes('forja') || lowerText.includes('siderurg') || lowerText.includes('acero')) {
    detectedSector = 'Siderurgia, Fundición & Forja';
  } else if (lowerText.includes('soldadura') || lowerText.includes('soldador') || lowerText.includes('welding')) {
    detectedSector = 'Soldadura Industrial';
  } else if (lowerText.includes('electricidad') || lowerText.includes('automatización') || lowerText.includes('cuadros eléctricos')) {
    detectedSector = 'Montajes Eléctricos & Climatización';
  }

  return {
    phone: phones[0] || null,
    cif,
    legalName,
    detectedSector
  };
}

async function run() {
  console.log("================================================================================");
  console.log("⚡ INICIANDO ENRIQUECIMENTO, VALIDAÇÃO E IMPORTAÇÃO DO MAILING DE ALEX (02/09)");
  console.log("================================================================================");

  const wb = XLSX.readFile(INPUT_EXCEL);
  const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  console.log(`📋 Total de registros lidos da planilha: ${rawRows.length}`);

  // Connect to DBs
  const clientProd = new Client({ connectionString: prodConn });
  const clientDev = new Client({ connectionString: devConn });
  await clientProd.connect();
  await clientDev.connect();

  // Find stage 1 for Luminous
  const stageRes = await clientProd.query(`SELECT id FROM core_comercial.kanban_stages WHERE empresa_id = $1 AND order_index = 1 LIMIT 1;`, [LUMINOUS_EMPRESA_ID]);
  const defaultStageId = stageRes.rows[0]?.id || '0f5adbfe-9d19-4629-a2ac-e3fb2b2afd69';
  console.log(`🎯 Estágio Inicial Selecionado: ${defaultStageId}`);

  // Load existing leads in PROD
  const existingRes = await clientProd.query('SELECT id, LOWER(TRIM(email)) as email, tags, phone, website FROM core_comercial.leads WHERE email IS NOT NULL;');
  const existingMap = new Map();
  for (const r of existingRes.rows) {
    existingMap.set(r.email, r);
  }
  console.log(`💾 Base do CRM carregada: ${existingMap.size} leads já cadastrados.`);

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const uniqueNewItems = new Map();
  const existingToTag = [];

  for (const row of rawRows) {
    const rawEmail = String(row['Correo electrónico'] || row['Email'] || row['email'] || '').trim().toLowerCase();
    const company = String(row['Empresa'] || row['company_name'] || '').trim();
    const location = String(row['Localidad'] || row['city'] || '').trim();

    if (!rawEmail || !emailRegex.test(rawEmail)) continue;

    if (existingMap.has(rawEmail)) {
      existingToTag.push({ email: rawEmail, dbLead: existingMap.get(rawEmail), row });
    } else {
      if (!uniqueNewItems.has(rawEmail)) {
        uniqueNewItems.set(rawEmail, {
          email: rawEmail,
          company: company || 'Empresa Industrial',
          location: location || 'Espanha',
          row
        });
      }
    }
  }

  console.log(`\n🔍 Análise de duplicidade:`);
  console.log(`  - Leads que já existem no CRM (a receber tag): ${existingToTag.length}`);
  console.log(`  - Leads inéditos a enriquecer e cadastrar: ${uniqueNewItems.size}`);

  // Group unique domains for DNS and Web Scraping
  const domainMap = new Map();
  for (const item of uniqueNewItems.values()) {
    const domain = item.email.split('@')[1];
    if (!domainMap.has(domain)) {
      domainMap.set(domain, {
        domain,
        isPublic: PUBLIC_DOMAINS.has(domain),
        hasMx: false,
        website: null,
        phone: null,
        cif: null,
        legalName: null,
        detectedSector: null
      });
    }
  }

  console.log(`\n🌐 Domínios corporativos únicos para investigar: ${domainMap.size}`);

  // 1. DNS / MX validation in parallel with fast timeouts
  console.log(`\n🚀 Executando validação DNS & MX em paralelo...`);
  const domainList = Array.from(domainMap.values());
  const dnsBatchSize = 100;

  for (let i = 0; i < domainList.length; i += dnsBatchSize) {
    const chunk = domainList.slice(i, i + dnsBatchSize);
    await Promise.all(chunk.map(async (dInfo) => {
      dInfo.hasMx = await resolveMxFast(dInfo.domain);
    }));
    process.stdout.write(`Progresso DNS: ${Math.min(i + dnsBatchSize, domainList.length)}/${domainList.length} domínios verificados...\r`);
  }
  console.log(`\n✅ Validação DNS concluída!`);

  // 2. Web Scraping & Multi-channel Website Enrichment
  console.log(`\n🌐 Iniciando Web Crawler autônomo para enriquecer Websites, Telefones e CIFs...`);
  const webBatchSize = 40;

  for (let i = 0; i < domainList.length; i += webBatchSize) {
    const chunk = domainList.slice(i, i + webBatchSize);
    await Promise.all(chunk.map(async (dInfo) => {
      if (dInfo.isPublic) return;

      const tryUrls = [
        `https://www.${dInfo.domain}`,
        `https://${dInfo.domain}`,
        `http://www.${dInfo.domain}`,
        `http://${dInfo.domain}`
      ];

      for (const u of tryUrls) {
        const res = await fetchHtml(u, 2500);
        if (res.ok && res.html) {
          dInfo.website = u;
          const meta = extractMetadataFromHtml(res.html);
          if (meta.phone) dInfo.phone = meta.phone;
          if (meta.cif) dInfo.cif = meta.cif;
          if (meta.legalName) dInfo.legalName = meta.legalName;
          if (meta.detectedSector) dInfo.detectedSector = meta.detectedSector;
          break;
        }
      }

      if (!dInfo.website && dInfo.hasMx) {
        dInfo.website = `https://www.${dInfo.domain}`;
      }
    }));
    process.stdout.write(`Progresso Web Crawler: ${Math.min(i + webBatchSize, domainList.length)}/${domainList.length} domínios auditados...\r`);
  }
  console.log(`\n✅ Varredura Web concluída com sucesso!`);

  // 3. Build enriched lead list
  console.log(`\n📊 Consolidando leads enriquecidos...`);
  const enrichedLeads = [];
  const validNewLeads = [];

  for (const item of uniqueNewItems.values()) {
    const domain = item.email.split('@')[1];
    const dInfo = domainMap.get(domain) || {};

    const companyName = dInfo.legalName || item.company;
    const website = dInfo.website || (dInfo.isPublic ? null : `https://www.${domain}`);
    const phone = dInfo.phone || null;
    const sector = dInfo.detectedSector || 'Calderería & Tubería Industrial';
    const city = item.location && item.location !== 'Espanha' ? item.location : 'Vitoria-Gasteiz';
    const province = city === 'Amurrio' || city === 'Llodio' || city === 'Vitoria-Gasteiz' || city === 'Araia' || city === 'Legutio' ? 'Álava' : 'Álava / País Vasco';
    const tags = ['Alex Carmona', 'Mailing Alex', 'Mailing Alex 02-09', 'Espanha'];
    const notes = `Lead importado da base do Alex (02/09). Localidade: ${item.location}. Domínio: ${domain}. MX: ${dInfo.hasMx ? 'Ativo' : 'Verificar'}.`;

    const enrichedObj = {
      Empresa: companyName,
      Email: item.email,
      Telefone: phone || 'Consultar Site',
      Website: website || 'Não disponível',
      Localidade: city,
      Provincia: province,
      Pais: 'Espanha',
      Sector: sector,
      CIF: dInfo.cif || 'Não identificado',
      Status_MX: dInfo.hasMx ? 'VÁLIDO' : 'SEM_MX',
      Origem: 'Mailing Alex 02-09'
    };

    enrichedLeads.push(enrichedObj);

    if (dInfo.hasMx) {
      validNewLeads.push({
        name: companyName,
        company_name: companyName,
        email: item.email,
        phone,
        website,
        city,
        province,
        address_line: item.location ? `Polígono Industrial, ${item.location}` : null,
        sector,
        tax_id: dInfo.cif,
        notes,
        tags
      });
    }
  }

  console.log(`✨ Total de leads novos processados: ${enrichedLeads.length}`);
  console.log(`🎯 Leads com MX ativo e prontos para inserção: ${validNewLeads.length}`);
  console.log(`🌐 Empresas com Website oficial extraído: ${enrichedLeads.filter(l => l.Website && l.Website !== 'Não disponível').length}`);
  console.log(`📞 Empresas com Telefone comercial espanhol direto: ${enrichedLeads.filter(l => l.Telefone && l.Telefone !== 'Consultar Site').length}`);
  console.log(`🏢 Empresas com CIF / Razão Social identificada: ${enrichedLeads.filter(l => l.CIF && l.CIF !== 'Não identificado').length}`);

  // 4. Save Excel
  const newWb = XLSX.utils.book_new();
  const newWs = XLSX.utils.json_to_sheet(enrichedLeads);
  XLSX.utils.book_append_sheet(newWb, newWs, 'Leads_Enriquecidos');
  XLSX.writeFile(newWb, OUTPUT_EXCEL);
  console.log(`\n📁 Planilha enriquecida gravada em:\n   ${OUTPUT_EXCEL}`);

  // 5. Insert valid leads into PROD and DEV
  console.log(`\n🚀 Gravando novos leads no Supabase PROD e DEV...`);
  const insertBatchSize = 100;

  for (let i = 0; i < validNewLeads.length; i += insertBatchSize) {
    const chunk = validNewLeads.slice(i, i + insertBatchSize);
    
    for (const l of chunk) {
      // Inserir no PROD
      await clientProd.query(`
        INSERT INTO core_comercial.leads (
          empresa_id, stage_id, name, company_name, email, phone, website,
          city, province, address_line, sector, tax_id, origen_lead, notes, tags,
          assigned_to, country_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `, [
        LUMINOUS_EMPRESA_ID, defaultStageId, l.name, l.company_name, l.email,
        l.phone, l.website, l.city, l.province, l.address_line, l.sector,
        l.tax_id, 'Mailing Alex 02-09', l.notes, l.tags,
        ALEX_USER_ID, SPAIN_COUNTRY_ID
      ]);

      // Inserir no DEV
      await clientDev.query(`
        INSERT INTO core_comercial.leads (
          empresa_id, stage_id, name, company_name, email, phone, website,
          city, province, address_line, sector, tax_id, origen_lead, notes, tags,
          assigned_to, country_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `, [
        LUMINOUS_EMPRESA_ID, defaultStageId, l.name, l.company_name, l.email,
        l.phone, l.website, l.city, l.province, l.address_line, l.sector,
        l.tax_id, 'Mailing Alex 02-09', l.notes, l.tags,
        ALEX_USER_ID, SPAIN_COUNTRY_ID
      ]);
    }
    process.stdout.write(`Progresso Inserção: ${Math.min(i + insertBatchSize, validNewLeads.length)}/${validNewLeads.length} leads inseridos...\r`);
  }
  console.log(`\n✅ Inserção de novos leads concluída no PROD e DEV!`);

  // 6. Taguear leads já existentes no CRM com a tag 'Mailing Alex 02-09'
  console.log(`\n🏷️ Atualizando tags dos ${existingToTag.length} leads já existentes...`);
  for (const item of existingToTag) {
    const curTags = item.dbLead.tags || [];
    const newTags = Array.from(new Set([...curTags, 'Alex Carmona', 'Mailing Alex', 'Mailing Alex 02-09', 'Espanha']));
    
    await clientProd.query('UPDATE core_comercial.leads SET tags = $1 WHERE id = $2;', [newTags, item.dbLead.id]);
    await clientDev.query('UPDATE core_comercial.leads SET tags = $1 WHERE id = $2;', [newTags, item.dbLead.id]);
  }
  console.log(`✅ Tags atualizadas com sucesso!`);

  // Final count
  const countProd = await clientProd.query('SELECT count(*) FROM core_comercial.leads;');
  const countDev = await clientDev.query('SELECT count(*) FROM core_comercial.leads;');

  console.log("\n================================================================================");
  console.log(`🎉 IMPORTAÇÃO E OXIGENAÇÃO CONCLUÍDAS COM SUCESSO TOTAL!`);
  console.log(`📊 Total de Leads no CRM (PROD): ${countProd.rows[0].count}`);
  console.log(`📊 Total de Leads no CRM (DEV): ${countDev.rows[0].count}`);
  console.log("================================================================================");

  await clientProd.end();
  await clientDev.end();
}

run().catch(console.error);
