const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const filePath = path.resolve('temp-operacoes', 'AlexNuevos', 'CORREOS NUEVOS ALEX02-09.xlsx');
const wb = XLSX.readFile(filePath);
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

console.log("First 20 rows:");
data.slice(0, 20).forEach((r, idx) => {
  console.log(`${idx + 1}. [${r['Empresa']}] - Localidad: ${r['Localidad']} - Email: ${r['Correo electrónico']}`);
});
