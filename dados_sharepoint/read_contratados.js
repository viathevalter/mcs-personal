const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'contratados.xlsx');

try {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Converte a aba do excel para JSON (array de objetos)
  const data = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  
  // Filtra as informações importantes e converte chaves para facilitar 
  // O formato pode variar, então primeiro logamos algumas chaves.
  console.log("Colunas encontradas:", Object.keys(data[0]));
  
  const mapped = data.map(row => {
    return {
      codColab: row['Código'] || row['Codigo'] || row['CodColab'] || row['Id'] || row['cod_colab'] || row['codcolab'] || Object.values(row)[0],
      fechaNacimiento: row['Data Nascimento'] || row['Feha Nacimiento'] || row['Nascimento'] || row['Fecha nacimiento'] || '',
      camiseta: row['Camiseta'] || row['Talla Camiseta'] || row['Talla camiseta'] || '',
      pantalones: row['Pantalón'] || row['Pantalões'] || row['Talla pantalon'] || row['Talla pantalón'] || row['Pantalon'] || ''
    };
  }).filter(m => m.codColab);
  
  console.log(`\nLinhas lidas do Excel: ${mapped.length}`);
  
  // Mostra as 5 primeiras para verificar se as chaves estão corretas
  console.log("Primeiras 5 linhas mapeadas:");
  console.log(mapped.slice(0, 5));
  
  fs.writeFileSync(path.join(__dirname, 'contratados_parsed.json'), JSON.stringify(mapped, null, 2));

} catch (err) {
  console.error("Erro ao ler excel:", err);
}
