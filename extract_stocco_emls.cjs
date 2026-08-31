const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const FOLDER = path.resolve('temp-operacoes', 'STOCCO CAPTACIÓN');

function extractEmailsFromText(text) {
  if (!text) return [];
  // Regex capturing standard emails
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const matches = text.match(emailRegex) || [];
  return matches.map(m => m.toLowerCase().trim());
}

function cleanEmail(email) {
  let e = email.toLowerCase().trim();
  // Strip trailing punctuation
  e = e.replace(/^[.<>("']+/, '').replace(/[.>(),"':;]+$/, '');
  
  // Basic sanity check
  if (!e.includes('@') || !e.includes('.')) return null;
  const [user, domain] = e.split('@');
  if (!user || !domain) return null;
  if (domain.length < 3 || !domain.includes('.')) return null;
  
  // Filter out image assets or nonsense
  const blacklistExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js'];
  if (blacklistExts.some(ext => domain.endsWith(ext))) return null;
  
  // Filter system emails
  const blacklistUsers = ['mailer-daemon', 'postmaster', 'no-reply', 'noreply', 'donotreply'];
  if (blacklistUsers.includes(user)) return null;

  return e;
}

function deriveCompanyName(email, domain) {
  if (!domain) return '';
  const parts = domain.split('.');
  const base = parts[0];
  if (['gmail', 'hotmail', 'outlook', 'yahoo', 'live', 'icloud', 'telefonica', 'movistar', 'orange'].includes(base)) {
    // Free webmail, use username as hint
    const user = email.split('@')[0].replace(/[0-9._-]+/g, ' ').trim();
    return user.toUpperCase() || 'CONTATO GMAIL/WEBMAIL';
  }
  return base.toUpperCase();
}

async function run() {
  console.log(`📂 Lendo arquivos da pasta: ${FOLDER}`);
  if (!fs.existsSync(FOLDER)) {
    console.error('Pasta não encontrada!');
    return;
  }

  const files = fs.readdirSync(FOLDER).filter(f => f.toLowerCase().endsWith('.eml'));
  console.log(`📄 Total de arquivos .eml encontrados: ${files.length}`);

  const leadMap = new Map(); // email -> { email, domain, company, sources: Set(), count: number }

  let totalRawCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(FOLDER, file);
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
            domain: domain,
            company_candidate: deriveCompanyName(cleaned, domain),
            is_free_mail: ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.es', 'yahoo.com', 'live.com', 'icloud.com', 'telefonica.net'].includes(domain),
            sources: new Set([file]),
            occurrences: 1,
          });
        } else {
          const entry = leadMap.get(cleaned);
          entry.sources.add(file);
          entry.occurrences += 1;
        }
      }
    } catch (err) {
      console.error(`Erro ao ler ${file}:`, err.message);
    }
  }

  console.log(`\n========================================`);
  console.log(`📊 RESULTADOS DA EXTRAÇÃO:`);
  console.log(`Total de menções brutas de e-mail: ${totalRawCount}`);
  console.log(`Total de e-mails únicos extraídos: ${leadMap.size}`);
  console.log(`========================================\n`);

  const rows = Array.from(leadMap.values()).map(item => ({
    Email: item.email,
    Dominio: item.domain,
    Nome_Empresa_Estimado: item.company_candidate,
    Tipo_Email: item.is_free_mail ? 'Webmail Pessoal / Gratuito' : 'Corporativo / Domínio Próprio',
    Origem_Arquivos: Array.from(item.sources).join(', '),
    Qtd_Ocorrencias: item.occurrences
  }));

  // Save preliminary workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Leads Extraidos');
  
  const outPath = path.join(FOLDER, 'MAILING_STOCCO_EXTRAIDO_BRUTO.xlsx');
  XLSX.writeFile(wb, outPath);
  console.log(`💾 Planilha inicial salva em: ${outPath}`);
}

run();
