const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;
const XLSX = require('xlsx');
require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

// Use fast public DNS servers
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

const FOLDER = path.resolve('temp-operacoes', 'STOCCO CAPTACIÓN');
const RAW_EXCEL = path.join(FOLDER, 'MAILING_STOCCO_EXTRAIDO_BRUTO.xlsx');

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
  console.log(`⚡ INICIANDO HIGIENIZAÇÃO E AUDITORIA DNS MX (STOCCO CAPTACIÓN)`);
  
  const wbRaw = XLSX.readFile(RAW_EXCEL);
  const sheetName = wbRaw.SheetNames[0];
  const leads = XLSX.utils.sheet_to_json(wbRaw.Sheets[sheetName]);
  console.log(`📋 Total de e-mails para auditar: ${leads.length}`);

  // 1. Extrair domínios únicos
  const uniqueDomains = Array.from(new Set(leads.map(l => l.Dominio).filter(Boolean)));
  console.log(`🌐 Total de domínios únicos a auditar via DNS: ${uniqueDomains.length}`);

  const domainResults = new Map(); // domain -> { valid, mx, error }
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
  console.log(`\n✅ Varredura DNS de todos os domínios concluída!`);

  // 2. Verificar duplicados no CRM Supabase
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

  // 3. Classificar leads
  const validLeads = [];
  const invalidLeads = [];

  for (const item of leads) {
    const domainAudit = domainResults.get(item.Dominio) || { valid: false, mx: null, error: 'UNKNOWN' };
    const existsInCrm = crmEmails.has(item.Email.toLowerCase());

    const enrichedRow = {
      Email: item.Email,
      Dominio: item.Dominio,
      Nome_Empresa_Estimado: item.Nome_Empresa_Estimado,
      Tipo_Email: item.Tipo_Email,
      Status_DNS_MX: domainAudit.valid ? 'VÁLIDO (Servidor MX Ativo)' : `INVÁLIDO (${domainAudit.error})`,
      Servidor_MX_Principal: domainAudit.mx || 'Nenhum',
      Status_CRM: existsInCrm ? 'Já Cadastrado no CRM' : 'Novo Lead Inédito',
      Origem_Arquivos: item.Origem_Arquivos,
      Qtd_Envios_Outlook: item.Qtd_Ocorrencias
    };

    if (domainAudit.valid) {
      validLeads.push(enrichedRow);
    } else {
      invalidLeads.push(enrichedRow);
    }
  }

  console.log(`\n======================================================`);
  console.log(`🎯 RESULTADO DA HIGIENIZAÇÃO STOCCO:`);
  console.log(`✅ E-mails VÁLIDOS (MX Ativo / Entregáveis): ${validLeads.length} (${((validLeads.length/leads.length)*100).toFixed(1)}%)`);
  console.log(`❌ E-mails INVÁLIDOS / DOMÍNIOS MORTOS:      ${invalidLeads.length} (${((invalidLeads.length/leads.length)*100).toFixed(1)}%)`);
  console.log(`🆕 Novos Leads Inéditos para o CRM:        ${validLeads.filter(l => l.Status_CRM === 'Novo Lead Inédito').length}`);
  console.log(`🔄 Leads que já existem no CRM:            ${validLeads.filter(l => l.Status_CRM === 'Já Cadastrado no CRM').length}`);
  console.log(`======================================================\n`);

  // 4. Gerar Planilhas Finais
  // A. Planilha Completa Multi-Aba
  const wbFull = XLSX.utils.book_new();
  
  // Resumo
  const summaryRows = [
    { Metrica: 'Total de Menções Brutas nos EMLs', Valor: 13714 },
    { Metrica: 'Total de E-mails Únicos Extraídos', Valor: leads.length },
    { Metrica: 'E-mails VÁLIDOS com Servidor MX Ativo', Valor: validLeads.length },
    { Metrica: 'E-mails INVÁLIDOS / Descartados', Valor: invalidLeads.length },
    { Metrica: 'Leads Inéditos para o CRM', Valor: validLeads.filter(l => l.Status_CRM === 'Novo Lead Inédito').length },
    { Metrica: 'Leads Já Existentes no CRM', Valor: validLeads.filter(l => l.Status_CRM === 'Já Cadastrado no CRM').length },
    { Metrica: 'Taxa de Aproveitamento e Higiene', Valor: `${((validLeads.length/leads.length)*100).toFixed(1)}%` },
  ];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  XLSX.utils.book_append_sheet(wbFull, wsSummary, 'Resumo Auditoria');

  const wsValid = XLSX.utils.json_to_sheet(validLeads);
  XLSX.utils.book_append_sheet(wbFull, wsValid, 'Leads Validados (MX OK)');

  const wsInvalid = XLSX.utils.json_to_sheet(invalidLeads);
  XLSX.utils.book_append_sheet(wbFull, wsInvalid, 'Descartados (Sem MX)');

  const outFull = path.join(FOLDER, 'MAILING_STOCCO_AUDITADO_COMPLETO.xlsx');
  XLSX.writeFile(wbFull, outFull);
  console.log(`📁 Planilha Completa salva em: ${outFull}`);

  // B. Planilha Pronta para Importação / Disparo
  const wbProntos = XLSX.utils.book_new();
  const wsProntos = XLSX.utils.json_to_sheet(validLeads);
  XLSX.utils.book_append_sheet(wbProntos, wsProntos, 'Mailing Estoko Valido');
  const outProntos = path.join(FOLDER, 'MAILING_STOCCO_VALIDOS_PRONTOS.xlsx');
  XLSX.writeFile(wbProntos, outProntos);
  console.log(`📁 Planilha de Prontos salva em: ${outProntos}`);
}

run();
