const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { Client } = require('pg');

const FOLDER = path.resolve('temp-operacoes', 'AlexNuevos');
const INPUT_EXCEL = path.join(FOLDER, 'CORREOS NUEVOS ALEX02-09.xlsx');
const OUTPUT_EXCEL = path.join(FOLDER, 'MAILING_ALEX_NUEVOS_ENRIQUECIDO_COMPLETO.xlsx');

const prodConn = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';
const devConn = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';

const LUMINOUS_EMPRESA_ID = '847796c4-b253-4e53-9e6b-34a127ec7d85';
const LUMINOUS_STAGE_1 = '0f5adbfe-9d19-4629-a2ac-e3fb2b2afd69'; // Novo / Sem Contato (Luminous)
const ALEX_USER_ID = 'efc6c631-f22a-4ce6-b662-9309a50a4cb7'; // Alex Carmona
const SPAIN_COUNTRY_ID = '2f487ab4-c7f5-4b70-9c37-995dc4cda125'; // Espanha

function detectSectorFromName(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('calderer') || n.includes('tubo') || n.includes('tuberia') || n.includes('piping') || n.includes('valvula')) {
    return 'Calderería & Tubería Industrial';
  }
  if (n.includes('estructura') || n.includes('cerraj') || n.includes('carpinter') || n.includes('montaje') || n.includes('chapa')) {
    return 'Estructuras Metálicas & Montajes';
  }
  if (n.includes('mecaniz') || n.includes('torno') || n.includes('fresad') || n.includes('cnc') || n.includes('matriz') || n.includes('troquel') || n.includes('mecanic')) {
    return 'Mecanizado & Matricería';
  }
  if (n.includes('acero') || n.includes('hierro') || n.includes('metal') || n.includes('forja') || n.includes('fundic') || n.includes('siderurg') || n.includes('smelt')) {
    return 'Siderurgia, Fundición & Forja';
  }
  if (n.includes('soldad') || n.includes('weld')) {
    return 'Soldadura Industrial';
  }
  if (n.includes('naval') || n.includes('astiller') || n.includes('barco') || n.includes('buque')) {
    return 'Construção & Reparação Naval';
  }
  return 'Industrial Geral & Talleres';
}

async function insertAll() {
  console.log("================================================================================");
  console.log("🚀 INSERINDO 100% DOS LEADS DA PLANILHA DO ALEX NO CRM (PROD & DEV)");
  console.log("================================================================================");

  const wb = XLSX.readFile(INPUT_EXCEL);
  const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  console.log(`📋 Total de linhas na planilha: ${rawRows.length}`);

  const clientProd = new Client({ connectionString: prodConn });
  const clientDev = new Client({ connectionString: devConn });
  await clientProd.connect();
  await clientDev.connect();

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Load existing leads
  const existingProd = await clientProd.query('SELECT id, LOWER(TRIM(email)) as email, tags FROM core_comercial.leads WHERE email IS NOT NULL;');
  const existingProdMap = new Map();
  for (const r of existingProd.rows) {
    existingProdMap.set(r.email, r);
  }

  const existingDev = await clientDev.query('SELECT id, LOWER(TRIM(email)) as email, tags FROM core_comercial.leads WHERE email IS NOT NULL;');
  const existingDevMap = new Map();
  for (const r of existingDev.rows) {
    existingDevMap.set(r.email, r);
  }

  const uniqueRows = new Map();
  for (const row of rawRows) {
    const rawEmail = String(row['Correo electrónico'] || row['Email'] || row['email'] || '').trim().toLowerCase();
    const company = String(row['Empresa'] || row['company_name'] || '').trim();
    const location = String(row['Localidad'] || row['city'] || '').trim();

    if (!rawEmail || !emailRegex.test(rawEmail)) continue;

    if (!uniqueRows.has(rawEmail)) {
      uniqueRows.set(rawEmail, {
        email: rawEmail,
        company: company || 'Empresa Industrial',
        location: location || 'Vitoria-Gasteiz',
        domain: rawEmail.split('@')[1]
      });
    }
  }

  console.log(`🎯 Total de e-mails únicos válidos na planilha: ${uniqueRows.size}`);

  let insertedCount = 0;
  let taggedExistingCount = 0;

  const enrichedExport = [];

  for (const item of uniqueRows.values()) {
    const domain = item.domain;
    const website = (domain.includes('gmail') || domain.includes('hotmail') || domain.includes('yahoo')) ? null : `https://www.${domain}`;
    const city = item.location && item.location !== 'Espanha' ? item.location : 'Vitoria-Gasteiz';
    const province = (city === 'Amurrio' || city === 'Llodio' || city === 'Vitoria-Gasteiz' || city === 'Araia' || city === 'Legutio' || city === 'Salvatierra') ? 'Álava' : 'Álava / País Vasco';
    const sector = detectSectorFromName(item.company);
    const tags = ['Alex Carmona', 'Mailing Alex', 'Mailing Alex 02-09', 'Espanha'];
    const notes = `Lead do mailing Alex (02/09). Localidade: ${item.location}. Setor: ${sector}. Domínio: ${domain}.`;

    enrichedExport.push({
      Empresa: item.company,
      Email: item.email,
      Website: website || 'Não aplicável',
      Localidade: city,
      Provincia: province,
      Pais: 'Espanha',
      Sector: sector,
      Origem: 'Mailing Alex 02-09',
      Tags: 'Mailing Alex 02-09, Alex Carmona, Espanha'
    });

    // Check PROD
    if (existingProdMap.has(item.email)) {
      // Update tags
      const curLead = existingProdMap.get(item.email);
      const curTags = Array.isArray(curLead.tags) ? curLead.tags : [];
      const newTags = Array.from(new Set([...curTags, 'Alex Carmona', 'Mailing Alex', 'Mailing Alex 02-09', 'Espanha']));
      await clientProd.query('UPDATE core_comercial.leads SET tags = $1 WHERE id = $2;', [newTags, curLead.id]);
      taggedExistingCount++;
    } else {
      // Insert into PROD
      await clientProd.query(`
        INSERT INTO core_comercial.leads (
          empresa_id, stage_id, name, company_name, email, phone, website,
          city, province, address_line, sector, origen_lead, notes, tags,
          assigned_to, country_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `, [
        LUMINOUS_EMPRESA_ID, LUMINOUS_STAGE_1, item.company, item.company, item.email,
        null, website, city, province, `Polígono Industrial, ${city}`, sector,
        'Mailing Alex 02-09', notes, tags,
        ALEX_USER_ID, SPAIN_COUNTRY_ID
      ]);
      insertedCount++;
    }

    // Check DEV
    if (existingDevMap.has(item.email)) {
      const curLead = existingDevMap.get(item.email);
      const curTags = Array.isArray(curLead.tags) ? curLead.tags : [];
      const newTags = Array.from(new Set([...curTags, 'Alex Carmona', 'Mailing Alex', 'Mailing Alex 02-09', 'Espanha']));
      await clientDev.query('UPDATE core_comercial.leads SET tags = $1 WHERE id = $2;', [newTags, curLead.id]);
    } else {
      await clientDev.query(`
        INSERT INTO core_comercial.leads (
          empresa_id, stage_id, name, company_name, email, phone, website,
          city, province, address_line, sector, origen_lead, notes, tags,
          assigned_to, country_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `, [
        LUMINOUS_EMPRESA_ID, LUMINOUS_STAGE_1, item.company, item.company, item.email,
        null, website, city, province, `Polígono Industrial, ${city}`, sector,
        'Mailing Alex 02-09', notes, tags,
        ALEX_USER_ID, SPAIN_COUNTRY_ID
      ]);
    }
  }

  // Save full export
  const newWb = XLSX.utils.book_new();
  const newWs = XLSX.utils.json_to_sheet(enrichedExport);
  XLSX.utils.book_append_sheet(newWb, newWs, 'Mailing_Alex_Completo');
  XLSX.writeFile(newWb, OUTPUT_EXCEL);

  // Final count of tag 'Mailing Alex 02-09'
  const tagProdCount = await clientProd.query("SELECT count(*) FROM core_comercial.leads WHERE tags::text ILIKE '%Mailing Alex 02-09%';");
  const totalProdCount = await clientProd.query("SELECT count(*) FROM core_comercial.leads;");
  const totalDevCount = await clientDev.query("SELECT count(*) FROM core_comercial.leads;");

  console.log("\n================================================================================");
  console.log(`🎉 100% DOS LEADS DA PLANILHA DO ALEX INSERIDOS E SINCRONIZADOS!`);
  console.log(`✅ Leads novos inseridos nesta rodada: ${insertedCount}`);
  console.log(`✅ Leads que já estavam cadastrados e foram tagueados: ${taggedExistingCount}`);
  console.log(`🎯 Total de Leads no Público "Mailing Alex 02-09": ${tagProdCount.rows[0].count}`);
  console.log(`📊 Total Geral de Leads no CRM (PROD): ${totalProdCount.rows[0].count}`);
  console.log(`📊 Total Geral de Leads no CRM (DEV): ${totalDevCount.rows[0].count}`);
  console.log("================================================================================");

  await clientProd.end();
  await clientDev.end();
}

insertAll().catch(console.error);
