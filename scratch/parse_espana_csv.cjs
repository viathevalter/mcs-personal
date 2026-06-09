const fs = require('fs');
const path = require('path');

const csvPath = 'C:\\Projetos IA\\Kotrik\\listassharepoint\\Espana.csv';
const content = fs.readFileSync(csvPath, 'utf-8');
const lines = content.split('\n');

const header = lines[0].replace(/"/g, '').split(';');
console.log("Headers:", header);

// Codigo: index 8
// Pais: index 9
// Provincia: index 10
// ValorDia: index 11
// CosteDeEnvio: index 12

const sqlInserts = [];
for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Simple split by ";" (handling quotes if needed, but since it's just semicolon separated and values don't have semicolons, simple split works)
    const cols = line.split(';').map(c => c.replace(/^"|"$/g, ''));
    if (cols.length < 13) continue;
    
    const codigo = cols[8];
    const pais = cols[9];
    const provincia = cols[10];
    const valorDia = parseFloat(cols[11]) || 0;
    const costeEnvio = parseFloat(cols[12]) || 0;
    
    if (codigo && provincia) {
        sqlInserts.push(`('${codigo}', '${pais.replace(/'/g, "''")}', '${provincia.replace(/'/g, "''")}', ${valorDia}, ${costeEnvio})`);
    }
}

const sql = `
-- Seed Spain Provinces
INSERT INTO core_comercial.spain_provinces (codigo, pais, provincia, valor_dia, coste_envio)
VALUES
${sqlInserts.join(',\n')}
ON CONFLICT (codigo) DO UPDATE 
SET pais = EXCLUDED.pais, 
    provincia = EXCLUDED.provincia, 
    valor_dia = EXCLUDED.valor_dia, 
    coste_envio = EXCLUDED.coste_envio;
`;

fs.writeFileSync('scratch/seed_spain_provinces.sql', sql);
console.log("Generated scratch/seed_spain_provinces.sql with", sqlInserts.length, "rows.");
