require('dotenv').config({ path: '.env' });
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const dns = require('dns').promises;
const { Client } = require('pg');

dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const MAILING_DIR = 'C:\\Projetos IA\\Kotrik\\PowerApps\\Mailing';
const empresaId = '847796c4-b253-4e53-9e6b-34a127ec7d85'; // LUMINOUS

const PUBLIC_DOMAINS = new Set([
  'gmail.com', 'hotmail.com', 'hotmail.es', 'yahoo.es', 'yahoo.com', 
  'outlook.com', 'outlook.es', 'icloud.com', 'live.com', 'msn.com',
  'telefonica.net', 'orange.es', 'movistar.es', 'terra.es', 'vodafone.es', 'ya.com'
]);

function extractEmailsFromText(text) {
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const matches = text.match(emailRegex) || [];
  return matches.map(e => e.trim().toLowerCase());
}

async function checkMx(domain) {
  if (!domain || !domain.includes('.')) return false;
  if (PUBLIC_DOMAINS.has(domain)) return true;
  try {
    const mx = await Promise.race([
      dns.resolveMx(domain),
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 1500))
    ]);
    return mx && mx.length > 0;
  } catch {
    try {
      const a = await Promise.race([
        dns.resolve4(domain),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 1200))
      ]);
      return a && a.length > 0;
    } catch {
      return false;
    }
  }
}

function deriveCompanyName(domain, email) {
  if (!domain) return 'Empresa';
  if (PUBLIC_DOMAINS.has(domain)) {
    const userPart = email.split('@')[0];
    return userPart.replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  const mainPart = domain.split('.')[0];
  return mainPart.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

async function main() {
  console.log("=== 🔍 AUDITORIA E VALIDAÇÃO COMPLETA DO MAILING COMERCIAL 3 ===");
  
  const files = fs.readdirSync(MAILING_DIR).filter(f => f.toLowerCase().endsWith('.eml'));
  const rawEmailMap = new Map();

  for (const f of files) {
    const fullPath = path.join(MAILING_DIR, f);
    const content = fs.readFileSync(fullPath, 'utf8');
    const emails = extractEmailsFromText(content);

    for (const em of emails) {
      if (em.length < 6 || em.length > 80) continue;
      if (em.endsWith('.png') || em.endsWith('.jpg') || em.endsWith('.gif') || em.endsWith('.webp') || em.endsWith('.svg') || em.endsWith('.css') || em.endsWith('.js')) continue;
      if (em.includes('mailer-daemon') || em.includes('postmaster') || em.includes('noreply') || em.includes('no-reply') || em.includes('sentry') || em.includes('schema.org') || em.includes('example.com')) continue;

      const domain = em.split('@')[1];
      if (!domain || !domain.includes('.')) continue;

      if (!rawEmailMap.has(em)) {
        rawEmailMap.set(em, { email: em, domain: domain, files: [f] });
      } else {
        const item = rawEmailMap.get(em);
        if (!item.files.includes(f)) item.files.push(f);
      }
    }
  }

  console.log(`📊 Total de e-mails únicos extraídos: ${rawEmailMap.size}`);

  // Conectar ao Supabase para verificar e-mails existentes no CRM
  const pgClient = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await pgClient.connect();

  const crmLeadsRes = await pgClient.query("SELECT lower(trim(email)) as email FROM core_comercial.leads WHERE empresa_id = $1;", [empresaId]);
  const existingCrmEmails = new Set(crmLeadsRes.rows.map(r => r.email));
  console.log(`📦 E-mails já cadastrados na Luminous: ${existingCrmEmails.size}`);

  // Testar DNS MX de todos os domínios únicos
  const uniqueDomains = Array.from(new Set(Array.from(rawEmailMap.values()).map(d => d.domain)));
  console.log(`🌐 Total de domínios únicos para testar DNS: ${uniqueDomains.length}`);

  const domainMxMap = new Map();
  const concurrency = 80;
  let checked = 0;

  for (let i = 0; i < uniqueDomains.length; i += concurrency) {
    const chunk = uniqueDomains.slice(i, i + concurrency);
    await Promise.all(chunk.map(async (dom) => {
      const isValid = await checkMx(dom);
      domainMxMap.set(dom, isValid);
    }));
    checked += chunk.length;
    process.stdout.write(`\rVerificando MX: ${checked}/${uniqueDomains.length}...`);
  }
  console.log("\n✅ Verificação DNS MX concluída!");

  // Classificar e enriquecer
  const processedList = [];
  let validMxCount = 0;
  let invalidMxCount = 0;
  let alreadyInCrmCount = 0;
  let newValidSpainCount = 0;
  let newValidFranceCount = 0;
  let newValidOtherCount = 0;

  for (const [em, data] of rawEmailMap.entries()) {
    const isMxValid = domainMxMap.get(data.domain) || false;
    if (isMxValid) validMxCount++; else invalidMxCount++;

    const inCrm = existingCrmEmails.has(em);
    if (inCrm) alreadyInCrmCount++;

    let country = 'Espanha';
    if (data.domain.endsWith('.fr')) country = 'França';
    else if (data.domain.endsWith('.pt')) country = 'Portugal';
    else if (data.domain.endsWith('.it')) country = 'Itália';
    else if (data.domain.endsWith('.de')) country = 'Alemanha';
    else if (data.domain.endsWith('.uk') || data.domain.endsWith('.co.uk')) country = 'Reino Unido';
    else if (data.domain.endsWith('.es') || data.domain.endsWith('.cat') || data.domain.endsWith('.eus') || data.domain.endsWith('.gal')) country = 'Espanha';
    else {
      // Para .com / .net / .org ou provedores, assume foco Espanha se não for .fr
      country = 'Espanha (Corporativo .com / Provedor)';
    }

    if (isMxValid && !inCrm) {
      if (country.includes('Espanha')) newValidSpainCount++;
      else if (country === 'França') newValidFranceCount++;
      else newValidOtherCount++;
    }

    const companyName = deriveCompanyName(data.domain, em);
    const website = PUBLIC_DOMAINS.has(data.domain) ? null : `https://www.${data.domain}`;

    processedList.push({
      Email: em,
      Empresa: companyName,
      Website: website || 'N/A (Provedor Público)',
      Dominio: data.domain,
      Pais: country,
      Status_DNS_MX: isMxValid ? 'VÁLIDO (MX Ativo)' : 'INVÁLIDO / SEM MX',
      Ja_Existe_No_CRM: inCrm ? 'SIM' : 'NÃO',
      Apto_Para_Importar: (isMxValid && !inCrm) ? 'SIM' : 'NÃO',
      Arquivos_Origem: data.files.join(', ')
    });
  }

  console.log(`\n======================================================`);
  console.log(`📊 RELATÓRIO DE AUDITORIA (MAILING COMERCIAL 3)`);
  console.log(`======================================================`);
  console.log(`Total de E-mails Únicos Extraídos: ${processedList.length}`);
  console.log(`✅ Domínios com Servidor de E-mail Ativo (MX): ${validMxCount}`);
  console.log(`❌ Domínios Inválidos/Inexistentes/Sem MX: ${invalidMxCount}`);
  console.log(`📦 E-mails que já existiam no CRM: ${alreadyInCrmCount}`);
  console.log(`------------------------------------------------------`);
  console.log(`🇪🇸 NOVOS LEADS VÁLIDOS DA ESPANHA (Prontos para Inserir): ${newValidSpainCount}`);
  console.log(`🇫🇷 NOVOS LEADS VÁLIDOS DA FRANÇA: ${newValidFranceCount}`);
  console.log(`🌍 Outros Países Válidos: ${newValidOtherCount}`);
  console.log(`------------------------------------------------------`);

  // Salvar planilha detalhada
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(processedList);
  xlsx.utils.book_append_sheet(wb, ws, 'Mailing Comercial 3 Auditado');

  const exportPath = path.join(MAILING_DIR, 'MAILING_COMERCIAL_3_AUDITADO_COMPLETO.xlsx');
  xlsx.writeFile(wb, exportPath);
  console.log(`\n💾 Planilha detalhada e auditada salva em:\n${exportPath}`);

  await pgClient.end();
}

main();
