const xlsx = require('xlsx');
const p = require('path');
const fs = require('fs');

const f = p.join(process.cwd(), 'dados_sharepoint', 'Control Personal - ATUALIZADO.xlsx');
const wb = xlsx.readFile(f);
const ws = wb.Sheets['Control de trabajadores'];
const data = xlsx.utils.sheet_to_json(ws, {header: 1});

let sql = '';
let count = 0;

for(let i = 1; i < data.length; i++) {
    const row = data[i];
    const codColab = row[0];
    const status = row[26];
    
    if(status === 'Activo' && codColab) {
        sql += `UPDATE core_personal.workers SET status_trabajador = '${status}' WHERE cod_colab = '${codColab}';\n`;
        sql += `UPDATE public.colaboradores SET status_trabajador = '${status}' WHERE cod_colab = '${codColab}';\n`;
        count++;
    }
}

console.log('Processed', count, 'workers with status Activo');
fs.writeFileSync('update_activo.sql', sql);
