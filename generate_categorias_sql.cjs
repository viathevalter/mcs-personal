const fs = require('fs');

const csv = fs.readFileSync('C:/Projetos IA/Kotrik/PowerApps/Cobros/Categorias_de_receita.csv', 'utf8');
const lines = csv.split('\n').filter(l => l.trim() !== '');

let sql = `-- Atualizando a estrutura da tabela
ALTER TABLE financeiro_categorias ADD COLUMN IF NOT EXISTS cod_snc text;
ALTER TABLE financeiro_categorias ADD COLUMN IF NOT EXISTS categoria_dre text;
ALTER TABLE financeiro_categorias ADD COLUMN IF NOT EXISTS nivel text;
ALTER TABLE financeiro_categorias ADD COLUMN IF NOT EXISTS classe text;

-- Limpando as categorias padrão criadas anteriormente
DELETE FROM financeiro_categorias WHERE cod_snc IS NULL;

-- Inserindo os dados do CSV
INSERT INTO financeiro_categorias (cod_snc, nome, tipo, categoria_dre, nivel, classe) VALUES
`;

const values = [];
for (let i = 1; i < lines.length; i++) {
    // "8111","IRC do período","Resultado","Impostos sobre o Lucro","3","8"
    const match = lines[i].match(/"(.*?)"/g);
    if (match && match.length >= 6) {
        const row = match.map(m => m.replace(/"/g, '').replace(/'/g, "''"));
        values.push(`('${row[0]}', '${row[1]}', '${row[2]}', '${row[3]}', '${row[4]}', '${row[5]}')`);
    }
}

sql += values.join(',\n') + ';\n';

fs.writeFileSync('C:/Projetos IA/Kotrik/mcs-personal/import_categorias_powerapps.sql', sql);
console.log('SQL generated!');
