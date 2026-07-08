
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
('8111', 'IRC do período', 'Resultado', 'Impostos sobre o Lucro', '3', '8'),
('8831', 'Resultado líquido do exercício', 'Resultado', 'Resultado do Período', '3', '8'),
('71', 'Vendas', 'Receita', 'Receita Operacional', '2', '7'),
('72', 'Prestação de serviços', 'Receita', 'Receita Operacional', '2', '7'),
('78', 'Rendimentos e ganhos financeiros', 'Receita', 'Receita Financeira', '2', '7'),
('7111', 'Venda de mercadorias', 'Receita', 'Receita Operacional', '3', '7'),
('7121', 'Venda de produtos próprios', 'Receita', 'Receita Operacional', '3', '7'),
('7211', 'Serviços industriais', 'Receita', 'Receita Operacional', '3', '7'),
('7212', 'Serviços administrativos/gestão', 'Receita', 'Receita Operacional', '3', '7'),
('7213', 'Aluguer de equipamentos', 'Receita', 'Receita Operacional', '3', '7'),
('7811', 'Juros recebidos', 'Receita', 'Receita Financeira', '3', '7'),
('7831', 'Diferenças cambiais favoráveis', 'Receita', 'Receita Financeira', '3', '7'),
('62', 'Fornecimentos e serviços externos (FSE)', 'Despesa', 'Despesas Operacionais', '2', '6'),
('64', 'Gastos com pessoal', 'Despesa', 'Custos de Pessoal', '2', '6'),
('68', 'Gastos de financiamento e amortizações', 'Despesa', 'Despesas Financeiras', '2', '6'),
('621', 'Energia e fluidos (agregador)', 'Despesa', 'Despesas Operacionais', '3', '6'),
('6211', 'Energia elétrica', 'Despesa', 'Despesas Operacionais', '3', '6'),
('6212', 'Água e saneamento', 'Despesa', 'Despesas Operacionais', '3', '6'),
('6213', 'Gás natural', 'Despesa', 'Despesas Operacionais', '3', '6'),
('622', 'Telecomunicações (agregador)', 'Despesa', 'Despesas Operacionais', '3', '6'),
('6221', 'Internet', 'Despesa', 'Despesas Operacionais', '3', '6'),
('6222', 'Telemóveis e comunicações', 'Despesa', 'Despesas Operacionais', '3', '6'),
('6223', 'Assinaturas e softwares SaaS', 'Despesa', 'Despesas Operacionais', '3', '6'),
('623', 'Rendas e alugueres (agregador)', 'Despesa', 'Despesas Operacionais', '3', '6'),
('6231', 'Aluguer de veículos', 'Despesa', 'Despesas Operacionais', '3', '6'),
('6232', 'Aluguer de imóveis', 'Despesa', 'Despesas Operacionais', '3', '6'),
('6233', 'Condomínio', 'Despesa', 'Despesas Operacionais', '3', '6'),
('624', 'Materiais e consumíveis (agregador)', 'Despesa', 'Despesas Operacionais', '3', '6'),
('6241', 'Material de escritório', 'Despesa', 'Despesas Operacionais', '3', '6'),
('6242', 'EPI e consumíveis operacionais', 'Despesa', 'Custos Diretos', '3', '6'),
('625', 'Deslocações e estadias (agregador)', 'Despesa', 'Despesas Operacionais', '3', '6'),
('6251', 'Viagens e bilhetes', 'Despesa', 'Despesas Operacionais', '3', '6'),
('6252', 'Alojamento', 'Despesa', 'Despesas Operacionais', '3', '6'),
('6253', 'Refeições em serviço', 'Despesa', 'Despesas Operacionais', '3', '6'),
('626', 'Serviços profissionais (agregador)', 'Despesa', 'Despesas Operacionais', '3', '6'),
('6261', 'Contabilidade e fiscalidade', 'Despesa', 'Despesas Operacionais', '3', '6'),
('6262', 'Consultoria', 'Despesa', 'Despesas Operacionais', '3', '6'),
('6263', 'Assessoria jurídica/advocacia', 'Despesa', 'Despesas Operacionais', '3', '6'),
('627', 'Seguros (agregador)', 'Despesa', 'Despesas Operacionais', '3', '6'),
('6271', 'Seguro de acidentes de trabalho', 'Despesa', 'Custos de Pessoal', '3', '6'),
('6272', 'Seguro de responsabilidade civil', 'Despesa', 'Despesas Operacionais', '3', '6'),
('6273', 'Seguro de frota', 'Despesa', 'Despesas Operacionais', '3', '6'),
('629', 'Outros FSE (agregador)', 'Despesa', 'Despesas Operacionais', '3', '6'),
('6291', 'Fianças e cauções (devolvíveis)', 'Despesa', 'Despesas Operacionais', '3', '6'),
('6292', 'Taxas, licenças e certificações', 'Despesa', 'Despesas Operacionais', '3', '6'),
('6411', 'Salários base', 'Despesa', 'Custos de Pessoal', '3', '6'),
('6412', 'Horas extra', 'Despesa', 'Custos de Pessoal', '3', '6'),
('6413', 'Subsídio de alimentação', 'Despesa', 'Custos de Pessoal', '3', '6'),
('6414', 'Subsídio de transporte', 'Despesa', 'Custos de Pessoal', '3', '6'),
('6421', 'Segurança Social (empresa)', 'Despesa', 'Custos de Pessoal', '3', '6'),
('6431', 'Seguros de acidentes de trabalho', 'Despesa', 'Custos de Pessoal', '3', '6'),
('6441', 'Recrutamento e formação', 'Despesa', 'Custos de Pessoal', '3', '6'),
('6811', 'Juros bancários', 'Despesa', 'Despesas Financeiras', '3', '6'),
('6812', 'Comissões bancárias', 'Despesa', 'Despesas Financeiras', '3', '6'),
('6813', 'Taxas e transferências', 'Despesa', 'Despesas Financeiras', '3', '6'),
('6814', 'Leasing / Renting', 'Despesa', 'Despesas Financeiras', '3', '6'),
('6831', 'Diferenças cambiais desfavoráveis', 'Despesa', 'Despesas Financeiras', '3', '6'),
('6841', 'Amortizações e depreciações', 'Despesa', 'Despesas Não Monetárias', '3', '6'),
('9110', 'Custos – Centro de Custo Padrão', 'Analítica', 'Gestão Interna', '3', '9'),
('9210', 'Receitas – Centro de Custo Padrão', 'Analítica', 'Gestão Interna', '3', '9');
