const fs = require('fs');

const csv = fs.readFileSync('C:/Projetos IA/Kotrik/PowerApps/Cobros/Categorias_de_receita.csv', 'utf8');
const lines = csv.split('\n').filter(l => l.trim() !== '');

let sql = `
-- 1. Tabela de Categorias de Receita / Despesa
CREATE TABLE IF NOT EXISTS financeiro_categorias (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  descricao text,
  tipo text DEFAULT 'Receita',
  ativo boolean DEFAULT true,
  criado_em timestamp with time zone DEFAULT now(),
  cod_snc text,
  categoria_dre text,
  nivel text,
  classe text
);

-- 2. Tabela de Obras (Centro de Custo)
CREATE TABLE IF NOT EXISTS obras (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  cliente_id text,
  status text DEFAULT 'Em Andamento',
  criado_em timestamp with time zone DEFAULT now()
);

-- 3. Adicionando as colunas relacionais na tabela contas_receber
ALTER TABLE contas_receber 
ADD COLUMN IF NOT EXISTS categoria_id uuid REFERENCES financeiro_categorias(id),
ADD COLUMN IF NOT EXISTS departamento_id text,
ADD COLUMN IF NOT EXISTS obra_id uuid REFERENCES obras(id),
ADD COLUMN IF NOT EXISTS anexo_url text;

-- Limpando caso já exista
DELETE FROM financeiro_categorias;

-- Inserindo os dados do CSV
INSERT INTO financeiro_categorias (cod_snc, nome, tipo, categoria_dre, nivel, classe) VALUES
`;

const values = [];
for (let i = 1; i < lines.length; i++) {
    const match = lines[i].match(/"(.*?)"/g);
    if (match && match.length >= 6) {
        const row = match.map(m => m.replace(/"/g, '').replace(/'/g, "''"));
        values.push(`('${row[0]}', '${row[1]}', '${row[2]}', '${row[3]}', '${row[4]}', '${row[5]}')`);
    }
}

sql += values.join(',\n') + ';\n';

fs.writeFileSync('C:/Projetos IA/Kotrik/mcs-personal/import_categorias_powerapps_full.sql', sql);
console.log('SQL generated!');
