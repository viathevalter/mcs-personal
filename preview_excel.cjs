const xlsx = require('xlsx');

const workbook = xlsx.readFile('dados_sharepoint/Control Personal - ATUALIZADO.xlsx');
console.log("Sheet names:", workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`\nSheet: ${sheetName}`);
    if (data.length > 0) {
        console.log("Headers:", data[0]);
        console.log("First row data:", data[1]);
    }
}
