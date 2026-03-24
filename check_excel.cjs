const xlsx = require('xlsx');

try {
    const workbook = xlsx.readFile('dados_sharepoint/colaboradores_implantar.xlsx');
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    if (data.length > 0) {
        console.log(`Planilha: ${sheetName}`);
        console.log(`Total de Linhas: ${data.length}`);
        console.log('\nColunas Identificadas:');
        console.log(Object.keys(data[0]).map(c => `- ${c}`).join('\n'));
        console.log('\nExemplo Linha 1:');
        console.log(JSON.stringify(data[0], null, 2));
    } else {
        console.log("Planilha vazia.");
    }
} catch (e) {
    console.error('Erro ao ler Excel:', e.message);
}
