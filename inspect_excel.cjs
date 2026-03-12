const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join('C:\\', 'Projetos IA', 'Kotrik', 'mcs-personal', 'dados_sharepoint', 'trabalhadores_alta.xlsx');

if (!fs.existsSync(filePath)) {
    console.error('File does not exist:', filePath);
    process.exit(1);
}

const workbook = xlsx.readFile(filePath);

console.log('\\n--- SHEETS ---');
console.log(workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    // try header: 1 to get array of arrays
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`\\n--- SHEET: ${sheetName} ---`);
    console.log(`TOTAL ROWS: ${rawData.length}`);
    
    if (rawData.length > 0) {
        console.log('FIRST 5 ROWS:');
        for (let i = 0; i < Math.min(5, rawData.length); i++) {
            console.log(`ROW ${i}:`, rawData[i]);
        }
    }
});
