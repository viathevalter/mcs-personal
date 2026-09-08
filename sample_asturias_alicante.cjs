const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const filePath = path.resolve('temp-operacoes', 'CRM ALEX NUEVOS ASTURIAS-ALICANTE.xlsx');
const wb = XLSX.readFile(filePath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

console.log("Total rows:", data.length);
console.log("\nFirst 25 rows:");
data.slice(0, 25).forEach((r, idx) => {
  console.log(`${idx + 1}. [${r['Empresa']}] - Email: ${r['Correo electrónico']} - Zona: ${r['Zona']}`);
});
