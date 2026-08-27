require('dotenv').config({ path: '.env' });
const xlsx = require('xlsx');
const { Client } = require('pg');

function cleanEmail(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let str = raw.trim().toLowerCase();
  
  // Se contiver múltiplos e-mails separados por vírgula, ponto e vírgula, barra ou espaço
  str = str.split(/[,;\/\s]+/)[0].trim();
  
  // Remover caracteres estranhos no início ou fim
  str = str.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
  
  // Corrigir missing @ se tiver padrão infoempresa.es -> info@empresa.es
  if (!str.includes('@')) {
    const commonPrefixes = ['info', 'comercial', 'administracion', 'contacto', 'direccion', 'compras', 'ventas', 'taller', 'oficina', 'rrhh', 'pedidos'];
    for (const p of commonPrefixes) {
      if (str.startsWith(p) && str.length > p.length + 3) {
        const rest = str.slice(p.length);
        if (rest.includes('.')) {
          str = `${p}@${rest}`;
          break;
        }
      }
    }
  }

  // Validação básica de regex RFC 5322 simplificada
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  if (!emailRegex.test(str)) {
    return null;
  }

  // Descartar extensões inválidas de imagem
  if (/\.(png|jpg|jpeg|gif|webp|svg|avif|pdf|doc|css|js)$/i.test(str)) {
    return null;
  }

  return str;
}

function cleanPhone(raw) {
  if (!raw) return null;
  let str = String(raw).trim();
  // Limpar formatação
  str = str.replace(/[^\d+]/g, '');
  if (!str) return null;
  // Se for 9 dígitos da Espanha (começa com 6, 7, 8, 9), adiciona +34 se não tiver
  if (str.length === 9 && ['6', '7', '8', '9'].includes(str[0])) {
    return `+34 ${str.slice(0, 3)} ${str.slice(3, 6)} ${str.slice(6)}`;
  }
  return str;
}

async function analyze() {
  const wb = xlsx.readFile('dados_sharepoint/ALEX_MAILING.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);

  console.log(`📊 Total de linhas na planilha: ${rows.length}`);

  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  // Buscar todos os e-mails existentes da Luminous no banco
  const existingRes = await c.query("SELECT email FROM core_comercial.leads WHERE empresa_id = '847796c4-b253-4e53-9e6b-34a127ec7d85';");
  const existingEmails = new Set(existingRes.rows.map(r => (r.email || '').trim().toLowerCase()));
  console.log(`🏦 Total de leads já existentes no CRM da Luminous: ${existingEmails.size}`);

  let validEmails = 0;
  let invalidEmails = 0;
  let internalDuplicates = 0;
  let alreadyInDb = 0;
  let newToImport = [];

  const seenInSheet = new Set();

  for (const row of rows) {
    const rawCompany = row['EMPRESA'] ? String(row['EMPRESA']).trim() : '';
    const rawSector = row['SETOR'] ? String(row['SETOR']).trim() : '';
    const rawEmail = row['E-MAIL'] ? String(row['E-MAIL']).trim() : '';
    const rawPhone = row['TELÉFONO'] ? String(row['TELÉFONO']).trim() : '';

    const cleanedMail = cleanEmail(rawEmail);

    if (!cleanedMail) {
      invalidEmails++;
      continue;
    }

    validEmails++;

    if (seenInSheet.has(cleanedMail)) {
      internalDuplicates++;
      continue;
    }
    seenInSheet.add(cleanedMail);

    if (existingEmails.has(cleanedMail)) {
      alreadyInDb++;
      continue;
    }

    newToImport.push({
      company_name: rawCompany || 'Empresa Industrial',
      name: rawCompany || 'Responsável',
      sector: rawSector || 'Metalurgia / Industrial',
      email: cleanedMail,
      phone: cleanPhone(rawPhone) || rawPhone,
      tags: ['Mailing Alex', 'Mailing Alex 2026', rawSector].filter(Boolean),
      origen_lead: 'Mailing Alex',
      notes: `Lead importado do arquivo ALEX_MAILING.xlsx (${rawSector || 'Geral'}).`
    });
  }

  console.log('\n--- RESULTADO DA ANÁLISE ---');
  console.log(`✅ E-mails válidos/resgatados: ${validEmails}`);
  console.log(`❌ E-mails inválidos/descartados: ${invalidEmails}`);
  console.log(`⚠️ Duplicatas internas na planilha: ${internalDuplicates}`);
  console.log(`🔄 Já existentes no CRM (não serão duplicados): ${alreadyInDb}`);
  console.log(`🚀 NOVOS LEADS INÉDITOS PRONTOS PARA IMPORTAR: ${newToImport.length}`);

  if (newToImport.length > 0) {
    console.log('\nExemplos de novos leads para inclusão:');
    console.table(newToImport.slice(0, 5));
  }

  await c.end();
}

analyze();
