-- Adicionando detalhes avançados de Faturamento
ALTER TABLE core_finance.horas_trabalhadas 
ADD COLUMN IF NOT EXISTS funcao_id UUID REFERENCES core_comercial.job_functions(id),
ADD COLUMN IF NOT EXISTS obra_id UUID REFERENCES core_common.client_sites(id),
ADD COLUMN IF NOT EXISTS tarifa_faturada NUMERIC(15,2);

-- Atualiza a view no PostgREST caso necessário
NOTIFY pgrst, 'reload schema';
