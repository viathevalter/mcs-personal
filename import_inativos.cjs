const xlsx = require('xlsx');
const fs = require('fs');

function standardizeStatus(status) {
    if (status === undefined || status === null) return null;
    return status.toString().trim().replace(/'/g, "''"); // escape for SQL
}

function excelDateToJSDate(excelDate) {
    if (!excelDate) return null;
    if (typeof excelDate === 'string') {
        if (excelDate.includes('/')) {
            const parts = excelDate.split('/');
            if (parts.length === 3) {
                return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }
        return excelDate;
    }
    return new Date((excelDate - (25567 + 2)) * 86400 * 1000).toISOString().split('T')[0];
}

async function run() {
    const workbook = xlsx.readFile('dados_sharepoint/colaboradores_inativos.xlsx');
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(worksheet);

    let sql = 'BEGIN;\n';
    
    for (const row of rawData) {
        const codColab = standardizeStatus(row['CodColab']);
        if (!codColab) continue;

        const dateSalida = excelDateToJSDate(row['FECHA SALIDA TRABAJADOR']);
        const statusTrabajador = standardizeStatus(row['STATUS TRABAJADOR']);
        const statusSeguridad = standardizeStatus(row['Status Seguridade']);

        sql += `
UPDATE core_personal.workers
SET status_trabajador = ${statusTrabajador ? `'${statusTrabajador}'` : 'NULL'},
    status_seguridad = ${statusSeguridad ? `'${statusSeguridad}'` : 'NULL'},
    data_baixa = ${dateSalida ? `'${dateSalida}'` : 'NULL'}
WHERE cod_colab = '${codColab}';
`.trim() + '\n';
    }
    
    sql += 'COMMIT;\n';
    
    fs.writeFileSync('update_inativos.sql', sql, 'utf8');
}

run();
