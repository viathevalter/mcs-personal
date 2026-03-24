const xlsx = require('xlsx');

const run = async () => {
    const workbook = xlsx.readFile('dados_sharepoint/colaboradores_implantar.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    console.log("Total rows found in Excel:", data.length);
    if (data.length > 1) {
        console.log("Row 2:", data[1]['CodColab'], "-", data[1]['Colaborador']);
        console.log("Row 427:", data[data.length - 1]['CodColab'], "-", data[data.length - 1]['Colaborador']);
    }
}
run();
