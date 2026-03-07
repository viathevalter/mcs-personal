const xlsx = require('xlsx');

function checkExcel() {
    console.log("Checking for duplicate CodColabs in Excel...");
    const workbook = xlsx.readFile('dados_sharepoint/Control Personal - ATUALIZADO.xlsx');
    const worksheet = workbook.Sheets['Control de trabajadores'];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    let headerRowIndex = -1;
    for (let i = 0; i < 10; i++) {
        if (rawData[i] && rawData[i].includes('CodColab')) {
            headerRowIndex = i;
            break;
        }
    }

    const headers = rawData[headerRowIndex];
    let codcolabs = {};
    let duplicates = 0;

    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;

        let rowObj = {};
        headers.forEach((h, idx) => {
            if (h) rowObj[h.trim()] = row[idx];
        });

        const cc = rowObj['CodColab'] ? rowObj['CodColab'].toString().trim() : '';
        if (cc) {
            if (!codcolabs[cc]) {
                codcolabs[cc] = [];
            }
            codcolabs[cc].push(rowObj['STATUS TRABAJADOR']);
        }
    }

    console.log("E0002 statuses in Excel:", codcolabs['E0002']);
    console.log("E0003 statuses in Excel:", codcolabs['E0003']);
    console.log("E0001 statuses in Excel:", codcolabs['E0001']);
}

checkExcel();
