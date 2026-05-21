const fs = require('fs');
const XLSX = require('xlsx');

function excelDateToJSDate(serial) {
    if(!serial || typeof serial !== 'number') return null;
    const utc_days  = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400; 
    const date_info = new Date(utc_value * 1000);
    // return YYYY-MM-DD
    return date_info.toISOString().split('T')[0];
}

const workbook = XLSX.readFile('dados_sharepoint/atualiza_ss.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet);

let sqlUpdates = [];
let sqlInserts = [];

for(const row of rows) {
    const cod = row['Cód. Colab'];
    if(!cod) continue;
    
    let alta = excelDateToJSDate(row['Data Alta Segurança']);
    let baixa = excelDateToJSDate(row['Data Baixa Segurança'] || row['Data Baixa']);
    let nasc = excelDateToJSDate(row['Data Nascimento']);

    if(alta || baixa || nasc) {
        let setParts = [];
        if(alta) setParts.push("data_alta_seguridad = '" + alta + "'");
        if(baixa) setParts.push("data_baixa_seguridad = '" + baixa + "'");
        if(nasc) setParts.push("fecha_nacimiento = '" + nasc + "'");
        
        sqlUpdates.push("UPDATE core_personal.workers SET " + setParts.join(', ') + " WHERE cod_colab = '" + cod + "';");
    }

    if(alta) {
        sqlInserts.push("INSERT INTO core_personal.seguridade_status (empresa_id, worker_id, tipo_evento, status, origem, origem_cliente_nome, data_solicitacao, data_efetiva) SELECT empresa_id, id, 'alta', 'confirmado', 'CARGA INICIAL', cliente, '" + alta + "', '" + alta + "' FROM core_personal.workers WHERE cod_colab = '" + cod + "';");
    }
    
    if(baixa) {
        sqlInserts.push("INSERT INTO core_personal.seguridade_status (empresa_id, worker_id, tipo_evento, status, origem, origem_cliente_nome, data_solicitacao, data_efetiva) SELECT empresa_id, id, 'baixa', 'confirmado', 'CARGA INICIAL', cliente, '" + baixa + "', '" + baixa + "' FROM core_personal.workers WHERE cod_colab = '" + cod + "';");
    }
}

const finalSql = 'BEGIN;\n' + sqlUpdates.join('\n') + '\n' + sqlInserts.join('\n') + '\nCOMMIT;';
fs.writeFileSync('dados_sharepoint/update_script.sql', finalSql);
console.log('SQL generated. Total queries: ' + (sqlUpdates.length + sqlInserts.length));
