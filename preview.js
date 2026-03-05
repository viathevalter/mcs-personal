import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const xlsx = require('xlsx');

const workbook = xlsx.readFile('dados_sharepoint/Control Personal - ATUALIZADO.xlsx');
console.log('Available sheets:', workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
    console.log(`\n\n=== SHEET: ${sheetName} ===`);
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: null });
    console.log(`Total rows: ${data.length}`);

    if (data.length > 0) {
        console.log('\n--- HEADERS ---');
        console.log(Object.keys(data[0]));

        console.log('\n--- ROW 1 SAMPLE ---');
        console.log(JSON.stringify(data[0], null, 2));
    }
}
