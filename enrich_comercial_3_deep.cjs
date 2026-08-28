require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { Client } = require('pg');

const MAILING_DIR = 'C:\\Projetos IA\\Kotrik\\PowerApps\\Mailing';
const empresaId = '847796c4-b253-4e53-9e6b-34a127ec7d85'; // LUMINOUS

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
    sector: null
  };

  const urlsToTry = [
    baseUrl,
    baseUrl.replace(/\/$/, '') + '/aviso-legal',
    baseUrl.replace(/\/$/, '') + '/contacto'
  ];

  for (const url of urlsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) continue;
      const html = await res.text();

      // 1. Extrair Title e OG Name
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

      // 2. Extrair Razão Social Oficial e CIF (S.L., S.A., etc.)
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

      const cifMatch = html.match(/\b([A-HJ-NP-SUVW][0-9]{7}[0-9A-J])\b/);
      if (cifMatch && cifMatch[1]) {
        result.cif = cifMatch[1];
      }

      // 3. Extrair Telefone Espanhol
      if (!result.phone) {
        const phoneMatch = html.match(/(?:\+34|0034)?[\s.-]?([689][0-9]{2}[\s.-]?[0-9]{3}[\s.-]?[0-9]{3})/);
        if (phoneMatch && phoneMatch[1]) {
          result.phone = `+34 ${phoneMatch[1].replace(/[\s.-]/g, '')}`;
        }
      }

      // 4. Extrair Província / Cidade Espanhola
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

      // 5. Detectar Setor Industrial
      if (!result.sector) {
        const textLower = cleanHtml(html).toLowerCase();
        if (textLower.includes('calderer') || textLower.includes('tuber') || textLower.includes('soldadur')) {
          result.sector = 'Calderería & Tubería Industrial';
        } else if (textLower.includes('mecaniz') || textLower.includes('torno') || textLower.includes('fresa')) {
          result.sector = 'Mecanizado & Matricería';
        } else if (textLower.includes('estructur') || textLower.includes('cerrajer') || textLower.includes('metal')) {
          result.sector = 'Estructuras Metálicas & Cerrajería';
        } else if (textLower.includes('electr') || textLower.includes('automatiz') || textLower.includes('cuadros')) {
          result.sector = 'Instalaciones Eléctricas & Automatización';
        } else if (textLower.includes('climatiz') || textLower.includes('frío') || textLower.includes('conductos')) {
          result.sector = 'Climatización & Frío Industrial';
        } else if (textLower.includes('mantenim') || textLower.includes('montaj')) {
          result.sector = 'Mantenimiento & Montajes Industriales';
        }
      }

      if (result.legalName && result.phone && result.province) break;
    } catch {
      // Ignore network timeout
    }
  }

  return result;
}

async function runEnrichment() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  console.log("==========================================================");
  console.log("🔍 ENRIQUECIMENTO PROFUNDO DOS LEADS DO COMERCIAL 3");
  console.log("==========================================================");

  const leadsRes = await c.query(`
    SELECT id, email, company_name, website, phone, province, city, sector, legal_name, tax_id
    FROM core_comercial.leads 
    WHERE empresa_id = $1 AND 'Comercial 3' = ANY(tags);
  `, [empresaId]);

  console.log(`📋 Total de leads do Comercial 3 encontrados: ${leadsRes.rows.length}`);

  const enrichedLeads = [];
  const concurrency = 25;
  let processed = 0;

  for (let i = 0; i < leadsRes.rows.length; i += concurrency) {
    const chunk = leadsRes.rows.slice(i, i + concurrency);

    await Promise.all(chunk.map(async (lead) => {
      let website = lead.website;
      if (!website && lead.email && !lead.email.includes('@gmail') && !lead.email.includes('@hotmail') && !lead.email.includes('@yahoo') && !lead.email.includes('@outlook')) {
        const dom = lead.email.split('@')[1];
        website = `https://www.${dom}`;
      }

      if (website && website.startsWith('http')) {
        const scraped = await scrapeWebsiteDetails(website);
        if (scraped) {
          const updatedName = scraped.realName || lead.company_name;
          const updatedLegal = scraped.legalName || lead.legal_name;
          const updatedCif = scraped.cif || lead.tax_id;
          const updatedPhone = scraped.phone || lead.phone;
          const updatedProv = scraped.province || lead.province;
          const updatedCity = scraped.city || lead.city;
          const updatedSector = scraped.sector || lead.sector || 'Industrial';

          await c.query(`
            UPDATE core_comercial.leads
            SET company_name = COALESCE($1, company_name),
                legal_name = COALESCE($2, legal_name),
                tax_id = COALESCE($3, tax_id),
                phone = COALESCE($4, phone),
                province = COALESCE($5, province),
                city = COALESCE($6, city),
                sector = COALESCE($7, sector),
                website = COALESCE($8, website),
                updated_at = NOW()
            WHERE id = $9;
          `, [
            updatedName, updatedLegal, updatedCif, updatedPhone,
            updatedProv, updatedCity, updatedSector, website, lead.id
          ]);

          enrichedLeads.push({
            id: lead.id,
            email: lead.email,
            company_name: updatedName,
            legal_name: updatedLegal,
            tax_id: updatedCif,
            phone: updatedPhone,
            website: website,
            province: updatedProv,
            city: updatedCity,
            sector: updatedSector
          });
        }
      }
    }));

    processed += chunk.length;
    process.stdout.write(`\rProgresso do Enriquecimento: ${processed}/${leadsRes.rows.length}...`);
  }

  console.log(`\n\n✅ Enriquecimento concluído com sucesso!`);
  console.log(`📊 Leads com dados corporativos enriquecidos: ${enrichedLeads.length}`);

  // Atualizar a planilha Excel com todos os dados novos
  const finalLeadsRes = await c.query(`
    SELECT email, company_name, legal_name, tax_id, phone, website, province, city, sector, tags
    FROM core_comercial.leads 
    WHERE empresa_id = $1 AND 'Comercial 3' = ANY(tags)
    ORDER BY created_at DESC;
  `, [empresaId]);

  const rows = finalLeadsRes.rows.map(r => ({
    Email: r.email,
    Nome_Empresa: r.company_name,
    Razao_Social_Oficial: r.legal_name || 'N/D',
    CIF_NIF: r.tax_id || 'N/D',
    Telefone: r.phone || 'N/D',
    Website: r.website || 'N/D',
    Provincia: r.province || 'Espanha',
    Cidade: r.city || 'Espanha',
    Setor: r.sector || 'Industrial',
    Tags: (r.tags || []).join(', ')
  }));

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, 'Comercial 3 Enriquecido');

  const finalExcelPath = path.join(MAILING_DIR, 'MAILING_COMERCIAL_3_ENRIQUECIDO_FINAL.xlsx');
  xlsx.writeFile(wb, finalExcelPath);
  console.log(`💾 Planilha final enriquecida salva em:\n${finalExcelPath}`);

  await c.end();
}

runEnrichment();
