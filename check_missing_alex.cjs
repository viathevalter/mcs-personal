const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { Client } = require('pg');

const FOLDER = path.resolve('temp-operacoes', 'AlexNuevos');
const INPUT_EXCEL = path.join(FOLDER, 'CORREOS NUEVOS ALEX02-09.xlsx');
const prodConn = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';

async function checkMissing() {
  const wb = XLSX.readFile(INPUT_EXCEL);
  const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  
  const client = new Client({ connectionString: prodConn });
  await client.connect();

  const dbRes = await client.query('SELECT LOWER(TRIM(email)) as email FROM core_comercial.leads WHERE email IS NOT NULL;');
  const dbEmails = new Set(dbRes.rows.map(r => r.email));

  const missing = [];
  const inDb = [];

  for (const row of rawRows) {
    const rawEmail = String(row['Correo electrónico'] || row['Email'] || row['email'] || '').trim().toLowerCase();
    const company = String(row['Empresa'] || row['company_name'] || '').trim();
    const location = String(row['Localidad'] || row['city'] || '').trim();

    if (!rawEmail || !rawEmail.includes('@')) continue;

    if (dbEmails.has(rawEmail)) {
      inDb.push({ email: rawEmail, company, location });
    } else {
      missing.push({ email: rawEmail, company, location });
    }
  }

  console.log(`Total válidos na planilha: ${inDb.length + missing.length}`);
  console.log(`Já gravados no CRM: ${inDb.length}`);
  console.log(`Faltando gravar no CRM: ${missing.length}`);
  console.log(`Exemplos dos que faltavam:`, missing.slice(0, 10));

  await client.end();
}

checkMissing().catch(console.error);
