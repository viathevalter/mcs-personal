const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function analyze() {
  console.log("=== ANALYZING EXCEL FILE ===");
  const possiblePaths = [
    'C:\\Projetos IA\\Kotrik\\mcs-personal\\temp-operacoes\\Mailing Leads_Marketing_ES_Todos_Setores_2026-08-18.xlsx',
    'C:\\Projetos IA\\Kotrik\\mcs-personal\\temp-operacoes\\Mailing\\Leads_Marketing_ES_Todos_Setores_2026-08-18.xlsx',
    'C:\\Projetos IA\\Kotrik\\mcs-personal\\temp-operacoes\\Leads_Marketing_ES_Todos_Setores_2026-08-18.xlsx',
  ];

  let filePath = '';
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }

  if (!filePath) {
    console.log("File not found in predefined paths. Searching temp-operacoes...");
    const dir = 'C:\\Projetos IA\\Kotrik\\mcs-personal\\temp-operacoes';
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir, { recursive: true });
      console.log("Files in temp-operacoes:", files);
      const found = files.find(f => f.includes('2026-08-18') || f.includes('.xlsx'));
      if (found) {
        filePath = path.join(dir, found);
      }
    }
  }

  if (filePath && fs.existsSync(filePath)) {
    console.log("Found Excel at:", filePath);
    const wb = xlsx.readFile(filePath);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    console.log("Total rows in Excel:", data.length);

    const emailCounts = {};
    const companyCounts = {};
    data.forEach(row => {
      const email = (row.email || row.Email || row['E-mail'] || '').toLowerCase().trim();
      const comp = (row.company_name || row.Empresa || row.name || '').toLowerCase().trim();
      if (email) emailCounts[email] = (emailCounts[email] || 0) + 1;
      if (comp) companyCounts[comp] = (companyCounts[comp] || 0) + 1;
    });

    const uniqueEmails = Object.keys(emailCounts).length;
    const uniqueCompanies = Object.keys(companyCounts).length;
    console.log(`Unique emails in Excel: ${uniqueEmails} / ${data.length}`);
    console.log(`Unique companies in Excel: ${uniqueCompanies} / ${data.length}`);

    // Top duplicates
    const topEmailDupes = Object.entries(emailCounts).filter(([e, c]) => c > 1).sort((a, b) => b[1] - a[1]).slice(0, 10);
    console.log("Top 10 duplicate emails in Excel:");
    console.table(topEmailDupes);
  } else {
    console.log("Could not locate Excel file directly. Checking database next.");
  }

  console.log("\n=== ANALYZING DATABASE core_comercial.leads ===");
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  const dbStats = await client.query(`
    SELECT 
      count(*) as total_rows,
      count(DISTINCT LOWER(TRIM(email))) as unique_emails,
      count(DISTINCT LOWER(TRIM(company_name))) as unique_companies
    FROM core_comercial.leads;
  `);
  console.table(dbStats.rows);

  const topDbDupes = await client.query(`
    SELECT 
      LOWER(TRIM(email)) as email,
      company_name,
      count(*) as count
    FROM core_comercial.leads
    GROUP BY LOWER(TRIM(email)), company_name
    HAVING count(*) > 1
    ORDER BY count DESC
    LIMIT 15;
  `);
  console.log("Top duplicates in database:");
  console.table(topDbDupes.rows);

  const sectorBreakdown = await client.query(`
    SELECT sector, count(*) as count, count(DISTINCT LOWER(TRIM(email))) as unique_emails
    FROM core_comercial.leads
    GROUP BY sector
    ORDER BY count DESC;
  `);
  console.log("Breakdown by sector in database:");
  console.table(sectorBreakdown.rows);

  await client.end();
}

analyze();
