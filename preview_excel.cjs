import * as xlsx from 'xlsx';

const workbook = xlsx.readFile('dados_sharepoint/Control Personal - ATUALIZADO.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

const data = xlsx.utils.sheet_to_json(sheet, { defval: null });
console.log(`Total rows: ${data.length}`);

if (data.length > 0) {
    console.log('\n--- HEADERS ---');
    console.log(Object.keys(data[0]));

    console.log('\n--- ROW 1 SAMPLE ---');
    console.log(JSON.stringify(data[0], null, 2));

    console.log('\n--- ROW 2 SAMPLE ---');
    console.log(JSON.stringify(data[1], null, 2));
}

// Check how many have 'Estado Seguridad Social', 'Cod Colab'
const withCod = data.filter(d => d['Codigo Colaborador'] || d['Cod Colab']);
console.log(`\nRows with Codigo Colaborador: ${withCod.length}`);

const withDni = data.filter(d => d['DNI'] || d['NIE'] || d['PASAPORTE']);
console.log(`Rows with DNI/NIE/Pasaporte: ${withDni.length}`);
