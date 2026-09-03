const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const sql = `
BEGIN;

GRANT USAGE ON SCHEMA core_comercial TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA core_comercial TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA core_comercial TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA core_comercial TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA core_comercial GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA core_comercial GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA core_comercial GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- Grant permissions specifically on the dialer tables
GRANT ALL ON TABLE core_comercial.dialer_campaigns TO anon, authenticated, service_role;
GRANT ALL ON TABLE core_comercial.dialer_queue_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE core_comercial.lead_call_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE core_comercial.sales_scripts TO anon, authenticated, service_role;

-- Ensure RLS allows anon and authenticated users
DROP POLICY IF EXISTS "Permitir leitura de scripts da empresa" ON core_comercial.sales_scripts;
CREATE POLICY "Permitir leitura de scripts da empresa" ON core_comercial.sales_scripts FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Permitir gestao de scripts" ON core_comercial.sales_scripts;
CREATE POLICY "Permitir gestao de scripts" ON core_comercial.sales_scripts FOR ALL TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Permitir leitura de campanhas da empresa" ON core_comercial.dialer_campaigns;
CREATE POLICY "Permitir leitura de campanhas da empresa" ON core_comercial.dialer_campaigns FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Permitir gestao de campanhas" ON core_comercial.dialer_campaigns;
CREATE POLICY "Permitir gestao de campanhas" ON core_comercial.dialer_campaigns FOR ALL TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Permitir leitura de itens de fila" ON core_comercial.dialer_queue_items;
CREATE POLICY "Permitir leitura de itens de fila" ON core_comercial.dialer_queue_items FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Permitir gestao de itens de fila" ON core_comercial.dialer_queue_items;
CREATE POLICY "Permitir gestao de itens de fila" ON core_comercial.dialer_queue_items FOR ALL TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Permitir leitura de call logs" ON core_comercial.lead_call_logs;
CREATE POLICY "Permitir leitura de call logs" ON core_comercial.lead_call_logs FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Permitir gestao de call logs" ON core_comercial.lead_call_logs;
CREATE POLICY "Permitir gestao de call logs" ON core_comercial.lead_call_logs FOR ALL TO anon, authenticated USING (true);

COMMIT;
`;

async function main() {
  for (const [name, conn] of [['DEV', devConnectionString], ['PROD', prodConnectionString]]) {
    const client = new Client({ connectionString: conn });
    try {
      await client.connect();
      await client.query(sql);
      console.log('Granted permissions successfully on ' + name);
    } catch (e) {
      console.error('Error on ' + name, e);
    } finally {
      await client.end();
    }
  }
}
main();
