const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const filePath = path.join('C:', 'Projetos IA', 'Kotrik', 'mcs-personal', 'dados_sharepoint', 'Trabalhadores_passaporte.xlsx');
const data = xlsx.readFile(filePath);
const sheet = data.Sheets[data.SheetNames[0]];
const excelWorkers = xlsx.utils.sheet_to_json(sheet);

let sql = '';
excelWorkers.forEach(w => {
    const cod = w['Cód. Colab'];
    let nome = w['Nome Completo'] || w['nome'];
    let passport = w['Passaporte'] || w['pasaporte'];
    
    // Convert undefined to empty string
    if (cod && typeof cod === 'string') {
        const safeCod = cod.trim().replace(/'/g, "''");
        const safeNome = nome ? nome.toString().trim().replace(/'/g, "''") : '';
        const safePassport = passport ? passport.toString().trim().replace(/'/g, "''") : '';
        
        sql += `UPDATE core_personal.workers SET nome = '${safeNome}', pasaporte = '${safePassport}' WHERE cod_colab = '${safeCod}';\n`;
    }
});

fs.writeFileSync('C:\\Projetos IA\\Kotrik\\mcs-personal\\update_workers.sql', sql);
console.log('Created update_workers.sql with ' + excelWorkers.length + ' updates.');
