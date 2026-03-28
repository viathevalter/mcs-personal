const fs = require('fs');
const xlsx = require('xlsx');

const data = xlsx.readFile('C:\\Projetos IA\\Kotrik\\mcs-personal\\dados_sharepoint\\Trabalhadores_passaporte.xlsx');
const sheet = data.Sheets[data.SheetNames[0]];
const excelWorkers = xlsx.utils.sheet_to_json(sheet);

let cods = [];
let nomes = [];
let passports = [];

excelWorkers.forEach(w => {
    let cod = w['Cód. Colab'];
    let nome = w['Nome Completo'] || w['nome'];
    let passport = w['Passaporte'] || w['pasaporte'];
    
    if (cod && typeof cod === 'string') {
        // Enclose each string in single quotes and escape internal quotes
        const formatStr = (val) => "'" + (val ? val.toString().trim().replace(/'/g, "''") : "") + "'";
        cods.push(formatStr(cod));
        nomes.push(formatStr(nome));
        passports.push(formatStr(passport));
    }
});

const sql = `UPDATE core_personal.workers AS w 
SET nome = u.nome, pasaporte = u.pasaporte 
FROM (
  SELECT unnest(ARRAY[${cods.join(',')}]) AS cod, 
         unnest(ARRAY[${nomes.join(',')}]) AS nome, 
         unnest(ARRAY[${passports.join(',')}]) AS pasaporte
) AS u 
WHERE w.cod_colab = u.cod;`;

fs.writeFileSync('optimized_update.sql', sql);
console.log('Query size:', sql.length);
