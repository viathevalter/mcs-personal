const xlsx = require('xlsx');

const namesToSearch = [
    "ELVIN AXEL POLO MANZANO",
    "DAVIDSON SOARES DE SOUZA",
    "JAIR PLAZA AGUILAR",
    "RICHARD ANTONIO GUERRA HERRERA",
    "ROMER DAVID RODRIGUEZ GONZALEZ",
    "FREDY GONZALEZ MAMANI",
    "ALEJANDRO RIOS"
];

// Let's also look for their variations
const searchTerms = [
    "ELVIN", "DAVIDSON", "JAIR PLAZA", "RICHARD ANTONIO", "ROMER DAVID", "FREDY GONZALEZ", "ALEJANDRO RIOS"
];

const files = [
    'dados_sharepoint/colaboradores_implantar.xlsx',
    'dados_sharepoint/Control Personal - ATUALIZADO.xlsx',
    'dados_sharepoint/atualiza_ss.xlsx'
];

let foundWorkers = [];

files.forEach(file => {
    try {
        const workbook = xlsx.readFile(file);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);
        
        data.forEach(row => {
            const values = Object.values(row).map(String).join(' ').toUpperCase();
            searchTerms.forEach(term => {
                if (values.includes(term.toUpperCase())) {
                    foundWorkers.push({ file, row });
                }
            });
        });
    } catch(e) {
        // ignore errors
    }
});

console.log(JSON.stringify(foundWorkers, null, 2));
