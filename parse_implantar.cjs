const fs = require('fs');
const XLSX = require('xlsx');

function excelDateToJSDate(serial) {
    if(!serial || typeof serial !== 'number') return null;
    const utc_days  = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400; 
    const date_info = new Date(utc_value * 1000);
    return date_info.toISOString().split('T')[0];
}

const workbook = XLSX.readFile('dados_sharepoint/colaboradores_implantar.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet);

let sqlStatements = [];

for(const row of rows) {
    const cod = row['CodColab'];
    if(!cod) continue;
    
    let fechaInicio = excelDateToJSDate(row['Fecha Inicio']);

    if(fechaInicio) {
        // Update their general profile start date
        sqlStatements.push("UPDATE core_personal.workers SET data_ingresso = '" + fechaInicio + "' WHERE cod_colab = '" + cod + "';");
        // Update their allocation start date so the timeline matches
        sqlStatements.push("UPDATE public.colaborador_por_pedido SET fechainiciopedido = '" + fechaInicio + "' WHERE cod_colab = '" + cod + "' AND codpedido = 'CARGA INICIAL';");
    }
}

const finalSql = 'BEGIN;\n' + sqlStatements.join('\n') + '\nCOMMIT;';
fs.writeFileSync('dados_sharepoint/update_implantar.sql', finalSql);
console.log('SQL generated. Total queries: ' + sqlStatements.length);
