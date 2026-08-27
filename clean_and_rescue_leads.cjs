require('dotenv').config({ path: '.env' });
const fs = require('fs');
const { Client } = require('pg');

function rescueEmailSyntax(raw) {
  if (!raw) return null;
  let email = raw.trim().toLowerCase();

  // Remove prefixos como mailto:
  email = email.replace(/^mailto:/i, '');

  // Remove caracteres especiais de pontuação no início ou fim
  email = email.replace(/^[<"'\(\[\{]+|[>"'\)\]\}\.,;:]+$/g, '');

  // Se for imagem ou lixo de arquivo, descarta
  if (/\.(png|jpg|jpeg|avif|webp|svg|gif|bmp|ico|pdf|doc|docx)$/i.test(email)) {
    return { valid: false, reason: 'Arquivo de imagem/mídia capturado como e-mail' };
  }

  // Verifica se tem @
  if (!email.includes('@')) {
    return { valid: false, reason: 'Sem arroba (@)' };
  }

  const [user, domain] = email.split('@');
  if (!user || !domain) {
    return { valid: false, reason: 'Usuário ou domínio vazio' };
  }

  // Correção de texto grudado após TLDs conhecidos
  let cleanDomain = domain;
  
  // Lista de extensões comuns para desgrudar palavras coladas
  // Ex: orbitaler.comrespondemos -> orbitaler.com
  // Ex: tcalinox.esponte -> tcalinox.es
  const tlds = ['com.es', 'nom.es', 'org.es', 'gob.es', 'edu.es', 'com', 'es', 'pt', 'it', 'fr', 'net', 'org', 'eu', 'cat', 'gal', 'eus', 'info', 'biz', 'co', 'io'];
  
  for (const tld of tlds) {
    const escaped = tld.replace('.', '\\.');
    // Procura por .tld seguido de 3 ou mais letras coladas
    const regex = new RegExp(`^(.+\\.${escaped})[a-z]{3,}$`, 'i');
    if (regex.test(cleanDomain)) {
      const match = cleanDomain.match(regex);
      if (match) {
        console.log(`🔧 E-mail resgatado: ${email} -> ${user}@${match[1]}`);
        cleanDomain = match[1];
        break;
      }
    }
  }

  const rescuedEmail = `${user}@${cleanDomain}`.toLowerCase().trim();

  // Validação final de formato RFC básico
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  if (!emailRegex.test(rescuedEmail)) {
    return { valid: false, reason: 'Formato inválido após higienização', email: rescuedEmail };
  }

  return { valid: true, email: rescuedEmail, wasModified: rescuedEmail !== raw.trim().toLowerCase() };
}

async function runCleaning() {
  const c = new Client({ connectionString: process.env.VITE_PROD_SUPABASE_DB_URL });
  await c.connect();

  console.log('=== INICIANDO HIGIENIZAÇÃO E RESGATE DE LEADS ===\n');

  // 1. Ler todos os leads
  const leadsRes = await c.query('SELECT id, name, email, company_name, tags, notes, stage_id FROM core_comercial.leads;');
  const leads = leadsRes.rows;
  console.log(`Total de leads no banco: ${leads.length}`);

  let rescuedCount = 0;
  let invalidCount = 0;

  for (const lead of leads) {
    if (!lead.email) continue;

    const result = rescueEmailSyntax(lead.email);
    if (!result.valid) {
      invalidCount++;
      console.log(`❌ E-mail Inválido detectado: Lead ${lead.name} (${lead.email}) -> Motivo: ${result.reason}`);
      
      const currentTags = Array.isArray(lead.tags) ? lead.tags : [];
      if (!currentTags.includes('E-mail Inválido')) {
        currentTags.push('E-mail Inválido');
      }

      await c.query(`
        UPDATE core_comercial.leads 
        SET tags = $1, notes = COALESCE(notes, '') || '\n[Alerta Sistema: E-mail descartado por sintaxe inválida: ' || $2 || ']'
        WHERE id = $3;
      `, [currentTags, lead.email, lead.id]);

    } else if (result.wasModified) {
      rescuedCount++;
      console.log(`✅ Corrigindo no banco: ${lead.email} ➔ ${result.email}`);
      await c.query(`
        UPDATE core_comercial.leads 
        SET email = $1, updated_at = NOW() 
        WHERE id = $2;
      `, [result.email, lead.id]);
    }
  }

  // 2. Processar Bounces do CSV da Resend
  const csvPath = 'C:\\Projetos IA\\Kotrik\\mcs-personal\\temp-operacoes\\emails-sent-1787694135291.csv';
  let bounceFlaggedCount = 0;

  if (fs.existsSync(csvPath)) {
    console.log('\n=== PROCESSANDO HISTÓRICO DE BOUNCES DA RESEND ===');
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim().length > 0);

    const bouncedEmails = new Set();
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length >= 9) {
        const lastEvent = parts[8].trim().toLowerCase();
        const recipient = parts[4].trim().toLowerCase();
        if (lastEvent === 'bounced' || lastEvent === 'suppressed') {
          bouncedEmails.add(recipient);
        }
      }
    }

    console.log(`Total de e-mails únicos com Bounce/Suppression no histórico: ${bouncedEmails.size}`);

    // Identificar e marcar esses leads no banco de dados para evitar reenvios futuros
    for (const bEmail of bouncedEmails) {
      const match = await c.query('SELECT id, name, tags, notes FROM core_comercial.leads WHERE lower(email) = $1;', [bEmail]);
      for (const row of match.rows) {
        const currentTags = Array.isArray(row.tags) ? row.tags : [];
        if (!currentTags.includes('Bounce')) {
          currentTags.push('Bounce');
          bounceFlaggedCount++;
          await c.query(`
            UPDATE core_comercial.leads 
            SET tags = $1, notes = COALESCE(notes, '') || '\n[Resend: Caixa postal com erro de entrega (Bounce)]'
            WHERE id = $2;
          `, [currentTags, row.id]);
        }
      }
    }
  }

  console.log('\n=== RELATÓRIO FINAL DA LIMPEZA ===');
  console.log(`E-mails com Sintaxe Resgatada/Corrigida: ${rescuedCount}`);
  console.log(`E-mails Inválidos Marcados: ${invalidCount}`);
  console.log(`Leads Marcados com Tag 'Bounce' para Quarentena: ${bounceFlaggedCount}`);

  await c.end();
}

runCleaning();
