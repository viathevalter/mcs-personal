const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { Client } = require('pg');

const filePath = path.resolve('temp-operacoes', 'AlexNuevos', 'CORREOS NUEVOS ALEX02-09.xlsx');
const prodConn = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';

async function inspect() {
  const wb = XLSX.readFile(filePath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(sheet);
  console.log(`Total rows in Excel: ${rawRows.length}`);
  console.log(`Keys in row 0:`, Object.keys(rawRows[0]));

  // Connect to DB to check duplicates
  const client = new Client({ connectionString: prodConn });
  await client.connect();

  const existingRes = await client.query('SELECT id, LOWER(TRIM(email)) as email, company_name, tags FROM core_comercial.leads WHERE email IS NOT NULL AND email != \'\';');
  const existingMap = new Map();
  for (const r of existingRes.rows) {
    existingMap.set(r.email, r);
  }
  console.log(`Existing leads in DB: ${existingMap.size}`);

  let validSyntax = 0;
  let invalidSyntax = 0;
  let alreadyInDb = 0;
  let newToInsert = 0;

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const uniqueNewEmails = new Map();
  const existingToTag = [];

  for (const row of rawRows) {
    const rawEmail = String(row['Correo electrónico'] || row['Email'] || row['email'] || '').trim().toLowerCase();
    const company = String(row['Empresa'] || row['company_name'] || '').trim();
    const location = String(row['Localidad'] || row['city'] || '').trim();

    if (!rawEmail || !emailRegex.test(rawEmail)) {
      invalidSyntax++;
      continue;
    }
    validSyntax++;

    if (existingMap.has(rawEmail)) {
      alreadyInDb++;
      existingToTag.push({ email: rawEmail, dbLead: existingMap.get(rawEmail), row });
    } else {
      if (!uniqueNewEmails.has(rawEmail)) {
        uniqueNewEmails.set(rawEmail, { email: rawEmail, company, location, row });
        newToInsert++;
      }
    }
  }

  console.log(`\n=== RELATÓRIO PRELIMINAR ===`);
  console.log(`Total de linhas lidas: ${rawRows.length}`);
  console.log(`E-mails com sintaxe válida: ${validSyntax}`);
  console.log(`E-mails com sintaxe inválida: ${invalidSyntax}`);
  console.log(`E-mails que JÁ EXISTEM no banco de dados: ${alreadyInDb}`);
  console.log(`E-mails INÉDITOS / NOVOS para cadastrar: ${uniqueNewEmails.size}`);

  await client.end();
}

inspect().catch(console.error);
