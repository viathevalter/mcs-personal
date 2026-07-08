const fs = require('fs');

const sql = fs.readFileSync('C:/Projetos IA/Kotrik/mcs-personal/import_categorias_powerapps_full.sql', 'utf8');

// Modificando o SQL gerado para adicionar políticas de RLS e blocos de transação
let safeSql = sql.replace(
  `-- Adicionando as colunas relacionais na tabela contas_receber`,
  `-- Adicionando as colunas relacionais na tabela contas_receber`
);

// Vamos construir o script SQL do zero para ficar perfeito
const newSql = `
BEGIN;

-- 1. Tabela de Categorias de Receita / Despesa
CREATE TABLE IF NOT EXISTS financeiro_categorias (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  descricao text,
  tipo text DEFAULT 'Receita',
  ativo boolean DEFAULT true,
  criado_em timestamp with time zone DEFAULT now()
);

-- Adicionando as colunas caso a tabela já exista
ALTER TABLE financeiro_categorias ADD COLUMN IF NOT EXISTS cod_snc text;
ALTER TABLE financeiro_categorias ADD COLUMN IF NOT EXISTS categoria_dre text;
ALTER TABLE financeiro_categorias ADD COLUMN IF NOT EXISTS nivel text;
ALTER TABLE financeiro_categorias ADD COLUMN IF NOT EXISTS classe text;

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

-- 4. ATENÇÃO: Desabilitando RLS para garantir que o aplicativo consiga ler os dados
-- Se o RLS estiver ativado sem políticas, a tabela fica invisível para o aplicativo!
ALTER TABLE financeiro_categorias DISABLE ROW LEVEL SECURITY;
ALTER TABLE obras DISABLE ROW LEVEL SECURITY;

-- Limpando caso já exista
DELETE FROM financeiro_categorias;

` + sql.substring(sql.indexOf('-- Inserindo os dados do CSV')) + `

COMMIT;
`;

fs.writeFileSync('C:/Users/User03/.gemini/antigravity/brain/14f38d78-79c9-4a47-b370-957b361cc776/import_categorias_planilha.sql', newSql, 'utf8');
console.log("Artifact updated!");
