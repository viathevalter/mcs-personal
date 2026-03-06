const xlsx = require('xlsx');

const workbook = xlsx.readFile('dados_sharepoint/Control Personal - ATUALIZADO.xlsx');
const worksheet = workbook.Sheets['Control de trabajadores'];

const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
let headerRowIndex = -1;

for (let i = 0; i < 10; i++) {
    const row = rawData[i];
    if (row && row.includes('CodColab')) {
        headerRowIndex = i;
        break;
    }
}

if (headerRowIndex !== -1) {
    const headers = rawData[headerRowIndex];
    console.log("Found headers at index", headerRowIndex);

    // Print first 5 data rows
    for (let i = headerRowIndex + 1; i < headerRowIndex + 6; i++) {
        const row = rawData[i];
        if (!row) continue;

        let rowObj = {};
        headers.forEach((h, idx) => {
            if (h) rowObj[h] = row[idx];
        });

        console.log(`Row ${i}:`, rowObj['CodColab'], '|', rowObj['NOMBRE'], '|', rowObj['STATUS TRABAJADOR'], '|', rowObj['STATUS']);
    }
} else {
    console.log("Could not find headers");
}
