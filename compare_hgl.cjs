const fs = require('fs');
const xlsx = require('xlsx');

function normalize(str) {
    return (str || '').toString().trim().toUpperCase().replace(/\\s+/g, ' ');
}

// OS 26 DA CONSULTA DO BANCO DE DADOS (HGL ATIVOS)
const systemList = [
    "ALBEIRO CARDOZO HEREDIA",
    "ALEXANDER ANTHONY ZAMORA ALMENDARIZ",
    "ARLEY GUTIERREZ CORREDOR",
    "CARLOS AUGUSTO SALDARRIAGA MONTEALBAN",
    "EDWARD IGNACIO DIAZ AVILA",
    "GONZALO QUINTANA PIMIENTO",
    "HAYDER RAFAEL DIAZ MANAURE",
    "JHON JAIRO CASTAÑO POSADA",
    "JOSE ANTONIO RUEDA CAMARGO",
    "JOSE LISARDO LINARES",
    "JUAN SEBASTIAN GARCIA GARCIA",
    "JULIAN JAVIER PEARSON GUERRERO",
    "LEISER DONCEL AVILA",
    "LUCAS VINICIUS FRANCO NOVAKOWSKI",
    "LUIS FERNANDO BENJUMEA ORTIZ",
    "LUYSMER DAVID PEÑARANDA CABRERA",
    "MARIO FERNANDO ALBERCA PUICON",
    "MIGUEL ANGEL CHUQUIZAPON VASQUEZ",
    "NELSON RODRIGO MOSSOS ANDRADE",
    "NICOLAS RAUL MACIAS MEJIA",
    "NORVEY GONZALEZ LOPEZ",
    "RAFAEL ARTURO REYES ROMERO",
    "RICHAR TAYLOR JIMENEZ CORONADO",
    "RICHARD ANTONIO GUERRA HERRERA",
    "RUBEN DARIO RINCON CORTES",
    "ULISES HERNAN CORDOVA HERNANDEZ"
].map(normalize);

const EXCEL_PATH = 'C:/Projetos IA/Kotrik/mcs-personal/dados_sharepoint/Control Personal - ATUALIZADO.xlsx';
const workbook = xlsx.readFile(EXCEL_PATH);
const sheetName = 'Control de trabajadores';

// Extrair a partir da linha 2 (range: 1)
const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '', range: 1 });

const hglExcel = rawData.filter(r => normalize(r['CLIENTE']).includes('HGL'));
const hglExcelAtivosStatus = hglExcel.filter(row => {
    const s = normalize(row['STATUS TRABAJADOR'] || row['STATUS'] || row['STATUS SE']);
    return (s.includes('ATIVO') || s.includes('ACTIVO')) && (!s.includes('INATIVO') && !s.includes('INACTIVO'));
});
const excelNamesAtivos = hglExcelAtivosStatus.map(r => normalize(r['NOMBRE']));

const missingInSystem = excelNamesAtivos.filter(n => !systemList.includes(n) && n !== '');
const missingInExcel = systemList.filter(n => !excelNamesAtivos.includes(n) && n !== '');

const output = {
    totalExcelActivos: excelNamesAtivos.length,
    totalDB: systemList.length,
    missingInSystem_Quantidade: missingInSystem.length,
    missingInSystem: missingInSystem,
    missingInExcel_Quantidade: missingInExcel.length,
    missingInExcel: missingInExcel
};

fs.writeFileSync('compare_hgl_output_final.json', JSON.stringify(output, null, 2));
console.log('\\n--- COMPARACAO FINALIZADA (STATUS TRABAJADOR) ---');
console.log('Total Excel Ativos:', excelNamesAtivos.length);
console.log('Faltam no Sistema:', missingInSystem.length);
console.log('Faltam no Excel:', missingInExcel.length);
