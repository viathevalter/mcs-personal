const fs = require('fs');

const path = 'C:\\Projetos IA\\Kotrik\\mcs-personal\\temp-operacoes\\emails-sent-1787694135291.csv';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n').filter(l => l.trim().length > 0);

const header = lines[0].split(',');
console.log('Total de Registros:', lines.length - 1);

const records = [];
for (let i = 1; i < lines.length; i++) {
  // Simple CSV parser handling quotes
  const row = [];
  let inQuotes = false;
  let current = '';
  for (let char of lines[i]) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  row.push(current.trim());

  if (row.length >= 9) {
    records.push({
      id: row[0],
      created_at: row[1],
      subject: row[2],
      from: row[3],
      to: row[4],
      last_event: row[8],
      sent_at: row[9]
    });
  }
}

// 1. Visão Geral de Todos os Disparos
const globalStatus = {};
records.forEach(r => {
  const st = r.last_event || 'desconhecido';
  globalStatus[st] = (globalStatus[st] || 0) + 1;
});

// 2. Disparos por Data
const byDate = {};
records.forEach(r => {
  const date = r.created_at ? r.created_at.substring(0, 10) : 'Sem Data';
  if (!byDate[date]) byDate[date] = {};
  const st = r.last_event || 'desconhecido';
  byDate[date][st] = (byDate[date][st] || 0) + 1;
  byDate[date].total = (byDate[date].total || 0) + 1;
});

// 3. Foco na Campanha de Hoje (2026-08-25)
const todayRecords = records.filter(r => r.created_at && r.created_at.startsWith('2026-08-25'));
const todayStatus = {};
const bouncedEmailsToday = [];
const todayDomains = {};

todayRecords.forEach(r => {
  const st = r.last_event || 'desconhecido';
  todayStatus[st] = (todayStatus[st] || 0) + 1;
  
  if (st === 'bounced') {
    bouncedEmailsToday.push(r.to);
  }

  const emailDomain = r.to.includes('@') ? r.to.split('@')[1].toLowerCase() : 'outro';
  if (!todayDomains[emailDomain]) todayDomains[emailDomain] = { total: 0, delivered: 0, bounced: 0 };
  todayDomains[emailDomain].total++;
  if (st === 'delivered') todayDomains[emailDomain].delivered++;
  if (st === 'bounced') todayDomains[emailDomain].bounced++;
});

console.log('\n======================================================');
console.log('📊 RELATÓRIO COMPLETO DE AUDITORIA RESEND (HISTÓRICO)');
console.log('======================================================');
console.log('Total Geral de E-mails Disparados no Histórico:', records.length);
console.log('\nStatus Global (Todos os tempos):');
console.table(Object.entries(globalStatus).map(([status, count]) => ({
  Status: status,
  Quantidade: count,
  Porcentagem: ((count / records.length) * 100).toFixed(2) + '%'
})));

console.log('\n======================================================');
console.log('📅 HISTÓRICO DE DISPAROS POR DIA:');
console.log('======================================================');
console.table(Object.entries(byDate).map(([date, stats]) => ({
  Data: date,
  Total: stats.total,
  Entregues: stats.delivered || 0,
  Bounced: stats.bounced || 0,
  Complained: stats.complained || 0,
  Opened: stats.opened || 0,
  Clicked: stats.clicked || 0,
  Taxa_Entrega: (((stats.delivered || 0) / stats.total) * 100).toFixed(1) + '%',
  Taxa_Bounce: (((stats.bounced || 0) / stats.total) * 100).toFixed(1) + '%'
})));

console.log('\n======================================================');
console.log('🎯 ANÁLISE DETALHADA DA CAMPANHA DE HOJE (25/08/2026):');
console.log('======================================================');
console.log('Total Disparado Hoje:', todayRecords.length);
console.table(Object.entries(todayStatus).map(([status, count]) => ({
  Status: status,
  Quantidade: count,
  Porcentagem: ((count / todayRecords.length) * 100).toFixed(2) + '%'
})));

console.log('\nTotal de Bounces Hoje:', bouncedEmailsToday.length);
if (bouncedEmailsToday.length > 0) {
  console.log('Amostra dos primeiros 10 e-mails com Bounce hoje:', bouncedEmailsToday.slice(0, 10));
}

// Bounces por TLD (.es, .com, .it, .pt, etc.)
const tldStats = {};
bouncedEmailsToday.forEach(email => {
  const parts = email.split('.');
  const tld = parts.length > 1 ? '.' + parts[parts.length - 1].toLowerCase() : 'outro';
  tldStats[tld] = (tldStats[tld] || 0) + 1;
});
console.log('\nDistribuição de Bounces por Extensão de Domínio (TLD):');
console.table(Object.entries(tldStats).map(([tld, count]) => ({
  Extensao: tld,
  Bounces: count,
  Porcentagem_do_Total_Bounces: ((count / bouncedEmailsToday.length) * 100).toFixed(1) + '%'
})).sort((a, b) => b.Bounces - a.Bounces));
