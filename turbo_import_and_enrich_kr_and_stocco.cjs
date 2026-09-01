require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { Pool } = require('pg');

const KR_FOLDER = path.resolve('temp-operacoes', 'Kr-captacion');
const KR_VALID_EXCEL = path.join(KR_FOLDER, 'MAILING_KR_CAPTACION_VALIDOS_PRONTOS.xlsx');
const STOCCO_FOLDER = path.resolve('temp-operacoes', 'STOCCO CAPTACIÓN');
const CACHE_FILE = path.join(KR_FOLDER, 'domain_scrape_cache.json');

const connUrl = process.env.VITE_PROD_SUPABASE_DB_URL.replace(':5432', ':6543');
const pool = new Pool({
  connectionString: connUrl,
  max: 10,
  idleTimeoutMillis: 30000
});

const SPANISH_PROVINCES = [
  'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Málaga', 'Murcia',
  'Palma', 'Las Palmas', 'Bilbao', 'Vizcaya', 'Alicante', 'Córdoba', 'Valladolid',
  'Vigo', 'Gijón', 'Asturias', 'Hospitalet', 'A Coruña', 'Vitoria-Gasteiz', 'Álava',
  'Granada', 'Elche', 'Oviedo', 'Badalona', 'Cartagena', 'Terrassa', 'Jerez',
  'Sabadell', 'Santa Cruz de Tenerife', 'Móstoles', 'Alcalá de Henares', 'Pamplona',
  'Navarra', 'Fuenlabrada', 'Almería', 'Leganés', 'San Sebastián', 'Gipuzkoa',
  'Burgos', 'Santander', 'Cantabria', 'Castellón', 'Getafe', 'Alcorcón', 'Logroño',
  'La Rioja', 'Badajoz', 'Salamanca', 'Huelva', 'Lleida', 'Tarragona', 'León',
  'Cádiz', 'Jaén', 'Ourense', 'Lugo', 'Girona', 'Cáceres', 'Guadalajara', 'Toledo',
  'Pontevedra', 'Palencia', 'Ciudad Real', 'Zamora', 'Ávila', 'Cuenca', 'Huesca',
  'Segovia', 'Soria', 'Teruel'
];

function cleanHtml(html) {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
             .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
             .replace(/<[^>]+>/g, ' ')
             .replace(/\s+/g, ' ');
}

async function scrapeWebsiteDetails(baseUrl) {
  if (!baseUrl || !baseUrl.startsWith('http')) return null;

  const result = {
    realName: null,
    legalName: null,
    cif: null,
    phone: null,
    city: null,
    province: null,
    sector: null,
    sectorTag: null
  };

  const urlsToTry = [
    baseUrl,
    baseUrl.replace(/\/$/, '') + '/contacto',
    baseUrl.replace(/\/$/, '') + '/aviso-legal'
  ];

  for (const url of urlsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) continue;
      const html = await res.text();

      // 1. Title / Nome Comercial
      if (!result.realName) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          let cleanTitle = titleMatch[1].split(/[-|–—»:]/)[0].trim();
          if (cleanTitle.length > 2 && cleanTitle.length < 50 && !cleanTitle.toLowerCase().includes('inicio') && !cleanTitle.toLowerCase().includes('home')) {
            result.realName = cleanTitle;
          }
        }
        const ogMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
        if (ogMatch && ogMatch[1] && ogMatch[1].length < 50) {
          result.realName = ogMatch[1].trim();
        }
      }

      // 2. Razão Social Oficial
      if (!result.legalName) {
        const legalMatch = html.match(/([A-Z0-9ÁÉÍÓÚÑa-záéíóúñ\s.,&-]{3,50}\s+(?:S\.?L\.?U?|S\.?A\.?U?|S\.?C\.?P\.?|S\.?L\.?L\.?))/i);
        if (legalMatch && legalMatch[1]) {
          const cand = legalMatch[1].trim();
          if (cand.length < 50 && !cand.toLowerCase().includes('cookies') && !cand.toLowerCase().includes('politica')) {
            result.legalName = cand;
            if (!result.realName) result.realName = cand;
          }
        }
      }

      // 3. CIF / NIF
      if (!result.cif) {
        const cifMatch = html.match(/\b([A-HJ-NP-SUVW][0-9]{7}[0-9A-J])\b/);
        if (cifMatch && cifMatch[1]) {
          result.cif = cifMatch[1];
        }
      }

      // 4. Telefone Espanhol
      if (!result.phone) {
        const phoneMatch = html.match(/(?:\+34|0034)?[\s.-]?([689][0-9]{2}[\s.-]?[0-9]{3}[\s.-]?[0-9]{3})/);
        if (phoneMatch && phoneMatch[1]) {
          result.phone = `+34 ${phoneMatch[1].replace(/[\s.-]/g, '')}`;
        }
      }

      // 5. Província / Cidade Espanhola
      if (!result.province) {
        const text = cleanHtml(html);
        for (const prov of SPANISH_PROVINCES) {
          const reg = new RegExp(`\\b${prov}\\b`, 'i');
          if (reg.test(text)) {
            result.province = prov;
            result.city = prov;
            break;
          }
        }
      }

      // 6. Setor & Tag de Nicho
      if (!result.sector) {
        const textLower = cleanHtml(html).toLowerCase();
        if (textLower.includes('calderer') || textLower.includes('tuber') || textLower.includes('caldereria')) {
          result.sector = 'Calderería & Tubería Industrial';
          result.sectorTag = 'Calderería';
        } else if (textLower.includes('soldadur') || textLower.includes('soldador') || textLower.includes('solda')) {
          result.sector = 'Soldadura Industrial & Calderería';
          result.sectorTag = 'Soldadura';
        } else if (textLower.includes('mecaniz') || textLower.includes('torno') || textLower.includes('fresa') || textLower.includes('matricer')) {
          result.sector = 'Talleres & Mecanizado';
          result.sectorTag = 'Mecanizado';
        } else if (textLower.includes('taller') || textLower.includes('talleres') || textLower.includes('reparaci')) {
          result.sector = 'Talleres Industriales & Reparación';
          result.sectorTag = 'Talleres';
        } else if (textLower.includes('estructur') || textLower.includes('cerrajer') || textLower.includes('metal')) {
          result.sector = 'Estructuras Metálicas & Cerrajería';
          result.sectorTag = 'Estructuras Metálicas';
        } else if (textLower.includes('electr') || textLower.includes('automatiz') || textLower.includes('cuadros')) {
          result.sector = 'Instalaciones Eléctricas & Automatización';
          result.sectorTag = 'Electricidad';
        } else if (textLower.includes('montaj') || textLower.includes('mantenim')) {
          result.sector = 'Montajes & Mantenimiento Industrial';
          result.sectorTag = 'Montajes Industriales';
        } else if (textLower.includes('construcc') || textLower.includes('obras') || textLower.includes('edificaci')) {
          result.sector = 'Construcción & Obras';
          result.sectorTag = 'Construcción';
        }
      }

      if (result.legalName && result.phone && result.province && result.sector) break;
    } catch {
      // Ignore network timeout
    }
  }

  return result;
}

async function run() {
  console.log("==========================================================");
  console.log("⚡ CRAWLER E ENRIQUECIMENTO PROFUNDO (KR & STOCCO)");
  console.log("==========================================================");

  // ETAPA 1: Carregar Leads para Enriquecimento
  console.log(`🌐 Carregando leads de Kr-Captacion e Alex Stocco do CRM...`);
  const leadsToEnrichRes = await pool.query(`
    SELECT id, email, company_name, website, phone, province, city, sector, legal_name, tax_id, tags
    FROM core_comercial.leads 
    WHERE ('Kr-Captacion' = ANY(tags) OR 'Alex Stocco' = ANY(tags));
  `);

  console.log(`📋 Total de leads para oxigenar e enriquecer: ${leadsToEnrichRes.rows.length}`);

  // CRAWLER COM CACHE DE DOMÍNIO
  const domainLeadMap = new Map();
  for (const lead of leadsToEnrichRes.rows) {
    if (!lead.email) continue;
    const dom = lead.email.split('@')[1];
    if (['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.es', 'yahoo.com', 'live.com', 'icloud.com', 'telefonica.net'].includes(dom)) {
      continue;
    }
    if (!domainLeadMap.has(dom)) {
      domainLeadMap.set(dom, []);
    }
    domainLeadMap.get(dom).push(lead);
  }

  const uniqueDomains = Array.from(domainLeadMap.keys());
  console.log(`🌐 Total de domínios únicos de empresas a crawlear: ${uniqueDomains.length}`);

  let domainScrapeResults = new Map();
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const rawCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      domainScrapeResults = new Map(Object.entries(rawCache));
      console.log(`⚡ Cache carregado: ${domainScrapeResults.size} domínios já escaneados anteriormente.`);
    } catch (e) {}
  }

  const domainsToScrape = uniqueDomains.filter(d => !domainScrapeResults.has(d));
  console.log(`🔍 Domínios pendentes de varredura: ${domainsToScrape.length}`);

  if (domainsToScrape.length > 0) {
    const CONCURRENCY = 40;
    let domainsDone = 0;

    for (let i = 0; i < domainsToScrape.length; i += CONCURRENCY) {
      const chunk = domainsToScrape.slice(i, i + CONCURRENCY);
      await Promise.all(chunk.map(async (dom) => {
        const siteUrl = `https://www.${dom}`;
        const res = await scrapeWebsiteDetails(siteUrl);
        domainScrapeResults.set(dom, res);
      }));

      domainsDone += chunk.length;
      process.stdout.write(`Progresso Crawler de Sites: ${domainsDone}/${domainsToScrape.length} domínios escaneados...\r`);
    }

    const cacheObj = Object.fromEntries(domainScrapeResults);
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheObj, null, 2));
    console.log(`\n✅ Varredura de todos os sites corporativos concluída!`);
  }

  // ETAPA 2: Preparar e Salvar Dados Enriquecidos no Banco de Dados
  console.log(`💾 Aplicando enriquecimento no Banco de Dados...`);
  const enrichedResults = [];
  const updateList = [];

  for (const lead of leadsToEnrichRes.rows) {
    const dom = lead.email ? lead.email.split('@')[1] : null;
    const enriched = dom ? domainScrapeResults.get(dom) : null;

    const finalCompanyName = (enriched && enriched.realName) ? enriched.realName : lead.company_name;
    const finalLegalName = (enriched && enriched.legalName) ? enriched.legalName : lead.legal_name;
    const finalCif = (enriched && enriched.cif) ? enriched.cif : lead.tax_id;
    const finalPhone = (enriched && enriched.phone) ? enriched.phone : lead.phone;
    const finalProvince = (enriched && enriched.province) ? enriched.province : (lead.province || 'Espanha');
    const finalCity = (enriched && enriched.city) ? enriched.city : (lead.city || finalProvince);
    const finalSector = (enriched && enriched.sector) ? enriched.sector : (lead.sector || 'Metalmecânica & Industrial');
    const website = lead.website || (dom && !['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.es', 'yahoo.com'].includes(dom) ? `https://www.${dom}` : null);
    
    let updatedTags = Array.isArray(lead.tags) ? [...lead.tags] : [];
    if (enriched && enriched.sectorTag && !updatedTags.includes(enriched.sectorTag)) {
      updatedTags.push(enriched.sectorTag);
    }

    updateList.push({
      id: lead.id,
      company_name: finalCompanyName,
      legal_name: finalLegalName,
      tax_id: finalCif,
      phone: finalPhone,
      website: website,
      province: finalProvince,
      city: finalCity,
      sector: finalSector,
      tags: updatedTags
    });

    enrichedResults.push({
      Email: lead.email,
      Nome_Empresa: finalCompanyName,
      Razao_Social_Oficial: finalLegalName || '',
      CIF_NIF: finalCif || '',
      Telefone: finalPhone || '',
      Website: website || '',
      Provincia: finalProvince,
      Cidade: finalCity,
      Setor_Industrial: finalSector,
      Nicho_Tag: (enriched && enriched.sectorTag) ? enriched.sectorTag : 'Industrial',
      Tags: updatedTags.join(', ')
    });
  }

  // Executar updates sequenciais usando pool transacional na porta 6543
  console.log(`💾 Atualizando ${updateList.length} leads no PostgreSQL (Porta 6543)...`);
  const BATCH_SIZE = 100;
  for (let i = 0; i < updateList.length; i += BATCH_SIZE) {
    const chunk = updateList.slice(i, i + BATCH_SIZE);
    
    // Constrói query em bloco para ultra velocidade
    const updatePromises = chunk.map(u => pool.query(`
      UPDATE core_comercial.leads 
      SET 
        company_name = COALESCE($1, company_name),
        legal_name = COALESCE($2, legal_name),
        tax_id = COALESCE($3, tax_id),
        phone = COALESCE($4, phone),
        website = COALESCE($5, website),
        province = COALESCE($6, province),
        city = COALESCE($7, city),
        sector = COALESCE($8, sector),
        tags = $9
      WHERE id = $10;
    `, [u.company_name, u.legal_name, u.tax_id, u.phone, u.website, u.province, u.city, u.sector, u.tags, u.id]));

    await Promise.all(updatePromises);
    process.stdout.write(`Progresso Salvamento DB: ${Math.min(i + BATCH_SIZE, updateList.length)}/${updateList.length} leads atualizados...\r`);
  }

  console.log(`\n✅ Atualização no banco de dados 100% concluída!`);

  // ETAPA 3: Salvar planilhas enriquecidas finais
  const wbKrEnriched = XLSX.utils.book_new();
  const wsKrEnriched = XLSX.utils.json_to_sheet(enrichedResults);
  XLSX.utils.book_append_sheet(wbKrEnriched, wsKrEnriched, 'Mailing Enriquecido');

  const outKrPath = path.join(KR_FOLDER, 'MAILING_KR_CAPTACION_ENRIQUECIDO_FINAL.xlsx');
  XLSX.writeFile(wbKrEnriched, outKrPath);
  console.log(`💾 Planilha Final Kr-Captacion salva em: ${outKrPath}`);

  const outStoccoPath = path.join(STOCCO_FOLDER, 'MAILING_STOCCO_ENRIQUECIDO_FINAL.xlsx');
  XLSX.writeFile(wbKrEnriched, outStoccoPath);
  console.log(`💾 Planilha Final Stocco salva em: ${outStoccoPath}`);

  await pool.end();
}

run().catch(console.error);
