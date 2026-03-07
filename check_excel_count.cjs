const xlsx = require('xlsx');

function checkExcel() {
    console.log("Reading excel...");
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
    let activeCount = 0;

    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;

        let rowObj = {};
        headers.forEach((h, idx) => {
            if (h) rowObj[h.trim()] = row[idx];
        });

        const statusTrab = rowObj['STATUS TRABAJADOR'] ? rowObj['STATUS TRABAJADOR'].toString().trim() : '';
        if (statusTrab.toLowerCase() === 'activo' || statusTrab.toLowerCase() === 'ativo') {
            activeCount++;
        }
    }
    console.log("Total Activo in Excel:", activeCount);
}

checkExcel();
