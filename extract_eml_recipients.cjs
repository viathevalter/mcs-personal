const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const MAILING_DIR = 'C:\\Projetos IA\\Kotrik\\PowerApps\\Mailing';

function extractEmailsFromText(text) {
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const matches = text.match(emailRegex) || [];
  return matches.map(e => e.trim().toLowerCase());
}

function parseEmlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extrair cabeçalhos To, Cc, Bcc
  const emails = new Set();
  
  // Pegar linhas de To, Cc, Bcc (podem ser multi-linhas se tiver continuação com espaço/tab)
  const lines = content.split(/\r?\n/);
  let capturingHeader = null;
  let headerBuffer = '';

  for (let i = 0; i < Math.min(lines.length, 5000); i++) {
    const line = lines[i];
    
    // Fim dos headers no formato RFC 822 é uma linha em branco
    if (line.trim() === '' && i > 20) {
      break;
    }

    if (/^(To|Cc|Bcc|From|Reply-To):/i.test(line)) {
      if (capturingHeader && headerBuffer) {
        const found = extractEmailsFromText(headerBuffer);
        found.forEach(e => emails.add(e));
      }
      capturingHeader = line.split(':')[0].toLowerCase();
      headerBuffer = line.slice(line.indexOf(':') + 1);
    } else if (capturingHeader && /^\s+/.test(line)) {
      headerBuffer += ' ' + line.trim();
    } else {
      if (capturingHeader && headerBuffer) {
        const found = extractEmailsFromText(headerBuffer);
        found.forEach(e => emails.add(e));
        capturingHeader = null;
        headerBuffer = '';
      }
    }
  }

  if (capturingHeader && headerBuffer) {
    const found = extractEmailsFromText(headerBuffer);
    found.forEach(e => emails.add(e));
  }

  // Se o número de e-mails nos cabeçalhos for pequeno, vasculhar todo o conteúdo
  const allFound = extractEmailsFromText(content);
  allFound.forEach(e => emails.add(e));

  return Array.from(emails);
}

function main() {
  console.log("=== EXTRAINDO E-MAILS DE DESTINATÁRIOS DOS ARQUIVOS EML ===");
  const files = fs.readdirSync(MAILING_DIR).filter(f => f.toLowerCase().endsWith('.eml'));
  console.log(`Arquivos encontrados: ${files.length}`);

  const globalEmailMap = new Map(); // email -> { files: [], domain: '', countryHint: '' }

  const IGNORED_EMAILS = new Set([
    'mailer-daemon@googlemail.com', 'postmaster@', 'noreply@', 'no-reply@',
    'sentry@', 'schema@', 'example@', 'wixpress.com'
  ]);

  for (const f of files) {
    const fullPath = path.join(MAILING_DIR, f);
    const emails = parseEmlFile(fullPath);
    console.log(`📄 [${f}] Encontrados: ${emails.length} e-mails brutos.`);

    for (const em of emails) {
      if (em.length < 6 || em.length > 80) continue;
      if (em.endsWith('.png') || em.endsWith('.jpg') || em.endsWith('.gif') || em.endsWith('.webp')) continue;
      
      let isIgnored = false;
      for (const ign of IGNORED_EMAILS) {
        if (em.includes(ign)) { isIgnored = true; break; }
      }
      if (isIgnored) continue;

      const domain = em.split('@')[1];
      if (!domain || !domain.includes('.')) continue;

      if (!globalEmailMap.has(em)) {
        let countryHint = 'Outros / Genérico';
        if (domain.endsWith('.es')) countryHint = 'Espanha (.es)';
        else if (domain.endsWith('.fr')) countryHint = 'França (.fr)';
        else if (domain.endsWith('.pt')) countryHint = 'Portugal (.pt)';
        else if (domain.endsWith('.it')) countryHint = 'Itália (.it)';
        else if (['gmail.com', 'hotmail.com', 'hotmail.es', 'yahoo.es', 'yahoo.com', 'outlook.com', 'outlook.es', 'telefonica.net', 'orange.es'].includes(domain)) {
          countryHint = domain.includes('.es') ? 'Espanha (Provedor .es)' : 'Genérico (Gmail/Hotmail/Yahoo)';
        }

        globalEmailMap.set(em, {
          email: em,
          domain: domain,
          countryHint: countryHint,
          files: [f]
        });
      } else {
        const item = globalEmailMap.get(em);
        if (!item.files.includes(f)) item.files.push(f);
      }
    }
  }

  console.log(`\n======================================================`);
  console.log(`📊 TOTAL DE E-MAILS ÚNICOS DEDUPLICADOS: ${globalEmailMap.size}`);
  console.log(`======================================================\n`);

  // Distribuição por país/provedor
  const countryCounts = {};
  for (const [em, data] of globalEmailMap.entries()) {
    countryCounts[data.countryHint] = (countryCounts[data.countryHint] || 0) + 1;
  }
  console.log("Distribuição geográfica e de domínios:");
  console.table(countryCounts);

  // Criar planilha Excel com todos os e-mails extraídos
  const rows = Array.from(globalEmailMap.values()).map(d => ({
    Email: d.email,
    Dominio: d.domain,
    Pais_Estimado: d.countryHint,
    Arquivos_Origem: d.files.join(', ')
  }));

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);
  xlsx.utils.book_append_sheet(wb, ws, 'Mailing Comercial 3');

  const exportPath = path.join(MAILING_DIR, 'MAILING_COMERCIAL_3_CONSOLIDADO.xlsx');
  xlsx.writeFile(wb, exportPath);
  console.log(`\n💾 Planilha consolidada salva com sucesso em:\n${exportPath}`);
}

main();
