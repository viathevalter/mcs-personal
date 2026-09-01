const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;
const XLSX = require('xlsx');
require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

// Public high-speed DNS resolvers
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4', '1.0.0.1']);

const FOLDER = path.resolve('temp-operacoes', 'Kr-captacion');

function extractEmailsFromText(text) {
  if (!text) return [];
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const matches = text.match(emailRegex) || [];
  return matches.map(m => m.toLowerCase().trim());
}

function cleanEmail(email) {
  if (!email) return null;
  let e = String(email).toLowerCase().trim();
  e = e.replace(/^[.<>("'\s]+/, '').replace(/[.>(),"':;\s]+$/, '');

  if (!e.includes('@') || !e.includes('.')) return null;
  const [user, domain] = e.split('@');
  if (!user || !domain) return null;
  if (domain.length < 3 || !domain.includes('.')) return null;

  // Filter out image/asset extensions
  const blacklistExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js', '.woff', '.ttf'];
  if (blacklistExts.some(ext => domain.endsWith(ext))) return null;

  // Filter out generic noreply / system emails
  const blacklistUsers = ['mailer-daemon', 'postmaster', 'no-reply', 'noreply', 'donotreply', 'sentry', 'daemon'];
  if (blacklistUsers.includes(user)) return null;

  return e;
}

function deriveCompanyName(email, domain) {
  if (!domain) return '';
  const parts = domain.split('.');
  const base = parts[0];
  if (['gmail', 'hotmail', 'outlook', 'yahoo', 'live', 'icloud', 'telefonica', 'movistar', 'orange', 'wanadoo'].includes(base)) {
    const user = email.split('@')[0].replace(/[0-9._-]+/g, ' ').trim();
    return user.toUpperCase() || 'CONTATO WEBMAIL';
  }
  return base.toUpperCase();
}

async function checkMxWithTimeout(domain, timeoutMs = 4000) {
  try {
    const mxPromise = dns.resolveMx(domain);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), timeoutMs)
    );
    const addresses = await Promise.race([mxPromise, timeoutPromise]);
    if (addresses && addresses.length > 0) {
      return { valid: true, mx: addresses[0].exchange, error: null };
    }
    return { valid: false, mx: null, error: 'NO_MX_RECORDS' };
  } catch (err) {
    return { valid: false, mx: null, error: err.code || err.message };
  }
}

async function run() {
  console.log(`==========================================================`);
  console.log(`⚡ EXTRAÇÃO E HIGIENIZAÇÃO DE MAILING (KR-CAPTACION / ROSA)`);
  console.log(`==========================================================`);
  console.log(`📂 Pasta alvo: ${FOLDER}`);

  const files = fs.readdirSync(FOLDER);
  const emlFiles = files.filter(f => f.toLowerCase().endsWith('.eml'));
  const excelFiles = files.filter(f => f.toLowerCase().endsWith('.xlsx') || f.toLowerCase().endsWith('.xls'));

  console.log(`📄 Arquivos EML encontrados: ${emlFiles.length}`);
  console.log(`📊 Arquivos Excel encontrados: ${excelFiles.length}`);

  const leadMap = new Map(); // email -> { email, domain, company, sources: Set(), count: number }
  let totalRawCount = 0;

  // 1. Processar Arquivos Excel
  for (const excelFile of excelFiles) {
    const filePath = path.join(FOLDER, excelFile);
    try {
      const wb = XLSX.readFile(filePath);
      for (const sheetName of wb.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
        for (const row of rows) {
          if (Array.isArray(row)) {
            for (const cell of row) {
              if (cell && typeof cell === 'string') {
                const found = extractEmailsFromText(cell);
                totalRawCount += found.length;
                for (const raw of found) {
                  const cleaned = cleanEmail(raw);
                  if (!cleaned) continue;
                  const domain = cleaned.split('@')[1];
                  if (!leadMap.has(cleaned)) {
                    leadMap.set(cleaned, {
                      email: cleaned,
                      domain,
                      company_candidate: deriveCompanyName(cleaned, domain),
                      is_free_mail: ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.es', 'yahoo.com', 'live.com', 'icloud.com', 'telefonica.net'].includes(domain),
                      sources: new Set([excelFile]),
                      occurrences: 1,
                    });
                  } else {
                    const entry = leadMap.get(cleaned);
                    entry.sources.add(excelFile);
                    entry.occurrences += 1;
                  }
                }
              }
            }
          }
        }
      }
      console.log(`✅ Excel processado: ${excelFile}`);
    } catch (err) {
      console.error(`Erro ao ler ${excelFile}:`, err.message);
    }
  }

  // 2. Processar Arquivos EML
  for (let i = 0; i < emlFiles.length; i++) {
    const emlFile = emlFiles[i];
    const filePath = path.join(FOLDER, emlFile);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const found = extractEmailsFromText(content);
      totalRawCount += found.length;

      for (const raw of found) {
        const cleaned = cleanEmail(raw);
        if (!cleaned) continue;
        const domain = cleaned.split('@')[1];
        if (!leadMap.has(cleaned)) {
          leadMap.set(cleaned, {
            email: cleaned,
            domain,
            company_candidate: deriveCompanyName(cleaned, domain),
            is_free_mail: ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.es', 'yahoo.com', 'live.com', 'icloud.com', 'telefonica.net'].includes(domain),
            sources: new Set([emlFile]),
            occurrences: 1,
          });
        } else {
          const entry = leadMap.get(cleaned);
          entry.sources.add(emlFile);
          entry.occurrences += 1;
        }
      }
    } catch (err) {
      console.error(`Erro ao ler ${emlFile}:`, err.message);
    }
    if ((i + 1) % 10 === 0 || i === emlFiles.length - 1) {
      process.stdout.write(`Progresso EML: ${i + 1}/${emlFiles.length} arquivos lidos...\r`);
    }
  }
  console.log(`\n✅ Leitura de todos os arquivos concluída!`);

  console.log(`\n========================================`);
  console.log(`📊 DADOS BRUTOS EXTRAÍDOS:`);
  console.log(`Total de menções brutas de e-mail: ${totalRawCount}`);
  console.log(`Total de e-mails únicos extraídos: ${leadMap.size}`);
  console.log(`========================================\n`);

  // 3. Auditoria DNS MX de todos os domínios únicos
  const uniqueDomains = Array.from(new Set(Array.from(leadMap.values()).map(l => l.domain).filter(Boolean)));
  console.log(`🌐 Total de domínios únicos a auditar via DNS: ${uniqueDomains.length}`);

  const domainResults = new Map();
  const CONCURRENCY = 40;
  let processedDomains = 0;

  for (let i = 0; i < uniqueDomains.length; i += CONCURRENCY) {
    const chunk = uniqueDomains.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (domain) => {
        const res = await checkMxWithTimeout(domain);
        domainResults.set(domain, res);
      })
    );
    processedDomains += chunk.length;
    if (processedDomains % 200 === 0 || processedDomains === uniqueDomains.length) {
      process.stdout.write(`Progresso DNS: ${processedDomains}/${uniqueDomains.length} domínios verificados...\r`);
    }
  }
  console.log(`\n✅ Varredura DNS de servidores MX concluída!`);

  // 4. Cruzamento com base de dados existente no CRM Supabase
  console.log(`💾 Consultando base do CRM Supabase para cruzamento...`);
  const crmEmails = new Set();
  try {
    const client = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
    await client.connect();
    const res = await client.query('SELECT LOWER(email) as email FROM core_comercial.leads WHERE email IS NOT NULL;');
    res.rows.forEach(r => crmEmails.add(r.email.trim()));
    await client.end();
    console.log(`💾 Base do CRM carregada: ${crmEmails.size} e-mails existentes no banco.`);
  } catch (dbErr) {
    console.warn(`Aviso DB (não impeditivo):`, dbErr.message);
  }

  // 5. Classificar leads
  const validLeads = [];
  const invalidLeads = [];

  for (const item of leadMap.values()) {
    const domainAudit = domainResults.get(item.domain) || { valid: false, mx: null, error: 'UNKNOWN' };
    const existsInCrm = crmEmails.has(item.email.toLowerCase());

    const enrichedRow = {
      Email: item.email,
      Dominio: item.domain,
      Nome_Empresa_Estimado: item.company_candidate,
      Tipo_Email: item.is_free_mail ? 'Webmail Pessoal / Gratuito' : 'Corporativo / Domínio Próprio',
      Status_DNS_MX: domainAudit.valid ? 'VÁLIDO (Servidor MX Ativo)' : `INVÁLIDO (${domainAudit.error})`,
      Servidor_MX_Principal: domainAudit.mx || 'Nenhum',
      Status_CRM: existsInCrm ? 'Já Cadastrado no CRM' : 'Novo Lead Inédito',
      Origem_Arquivos: Array.from(item.sources).join(', '),
      Qtd_Ocorrencias: item.occurrences
    };

    if (domainAudit.valid) {
      validLeads.push(enrichedRow);
    } else {
      invalidLeads.push(enrichedRow);
    }
  }

  const newLeadsCount = validLeads.filter(l => l.Status_CRM === 'Novo Lead Inédito').length;
  const existingLeadsCount = validLeads.filter(l => l.Status_CRM === 'Já Cadastrado no CRM').length;

  console.log(`\n======================================================`);
  console.log(`🎯 RESULTADO DA HIGIENIZAÇÃO (KR-CAPTACION):`);
  console.log(`✅ E-mails VÁLIDOS (MX Ativo / Entregáveis): ${validLeads.length} (${((validLeads.length/leadMap.size)*100).toFixed(1)}%)`);
  console.log(`❌ E-mails INVÁLIDOS / DOMÍNIOS MORTOS:      ${invalidLeads.length} (${((invalidLeads.length/leadMap.size)*100).toFixed(1)}%)`);
  console.log(`🆕 Novos Leads Inéditos para o CRM:        ${newLeadsCount}`);
  console.log(`🔄 Leads que já existem no CRM:            ${existingLeadsCount}`);
  console.log(`======================================================\n`);

  // 6. Gerar Planilhas Finais
  // A. Planilha Completa Multi-Aba
  const wbFull = XLSX.utils.book_new();

  const summaryRows = [
    { Metrica: 'Total de Menções Brutas nos Arquivos', Valor: totalRawCount },
    { Metrica: 'Total de E-mails Únicos Extraídos', Valor: leadMap.size },
    { Metrica: 'E-mails VÁLIDOS com Servidor MX Ativo', Valor: validLeads.length },
    { Metrica: 'E-mails INVÁLIDOS / Descartados', Valor: invalidLeads.length },
    { Metrica: 'Novos Leads Inéditos para o CRM', Valor: newLeadsCount },
    { Metrica: 'Leads Já Existentes no CRM', Valor: existingLeadsCount },
    { Metrica: 'Taxa de Aproveitamento e Higiene', Valor: `${((validLeads.length/leadMap.size)*100).toFixed(1)}%` },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wbFull, wsSummary, 'Resumo Auditoria');

  const wsValid = XLSX.utils.json_to_sheet(validLeads);
  XLSX.utils.book_append_sheet(wbFull, wsValid, 'Leads Validados (MX OK)');

  const wsInvalid = XLSX.utils.json_to_sheet(invalidLeads);
  XLSX.utils.book_append_sheet(wbFull, wsInvalid, 'Descartados (Sem MX)');

  const outFull = path.join(FOLDER, 'MAILING_KR_CAPTACION_AUDITADO_COMPLETO.xlsx');
  XLSX.writeFile(wbFull, outFull);
  console.log(`📁 Planilha Completa salva em: ${outFull}`);

  // B. Planilha Pronta para Importação / Disparo
  const wbProntos = XLSX.utils.book_new();
  const wsProntos = XLSX.utils.json_to_sheet(validLeads);
  XLSX.utils.book_append_sheet(wbProntos, wsProntos, 'Mailing KR Valido');
  const outProntos = path.join(FOLDER, 'MAILING_KR_CAPTACION_VALIDOS_PRONTOS.xlsx');
  XLSX.writeFile(wbProntos, outProntos);
  console.log(`📁 Planilha de Prontos salva em: ${outProntos}`);
}

run();
