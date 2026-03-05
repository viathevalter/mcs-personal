-- 1. Libera o uso e o tráfego do esquema core_personal
GRANT USAGE ON SCHEMA core_personal TO anon, authenticated;

-- 2. Assegura que todas as tabelas lá de dentro são manipuláveis pelo app
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA core_personal TO anon, authenticated;

-- 3. Caso a Row Level Security esteja ocultando as linhas da tabela workers, 
-- isso recarregará a tabela garantindo que a consulta SELECT funcione pra todos.
DROP POLICY IF EXISTS "Enable read access for all workers" ON core_personal.workers;
CREATE POLICY "Enable read access for all workers" ON core_personal.workers FOR SELECT USING (true);

-- (Opcional) Tentar forçar a Segurança de Nível de Linha a aceitar as requisições normais
ALTER TABLE core_personal.workers ENABLE ROW LEVEL SECURITY;
