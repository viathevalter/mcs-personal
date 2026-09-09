const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const sql = `
BEGIN;

-- 1. Add priority column to dialer_queue_items if not exists
ALTER TABLE core_comercial.dialer_queue_items 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';

-- 2. Grant permissions on estimacion tables
GRANT ALL ON TABLE core_comercial.estimaciones TO anon, authenticated, service_role;
GRANT ALL ON TABLE core_comercial.estimacion_versions TO anon, authenticated, service_role;
GRANT ALL ON TABLE core_comercial.estimacion_items TO anon, authenticated, service_role;
GRANT ALL ON TABLE core_comercial.estimacion_costs TO anon, authenticated, service_role;

-- 3. Ensure RLS policies allow insertion/management of estimaciones
DROP POLICY IF EXISTS "Permitir gestao de estimaciones para usuarios" ON core_comercial.estimaciones;
CREATE POLICY "Permitir gestao de estimaciones para usuarios" ON core_comercial.estimaciones FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir gestao de estimacion_versions para usuarios" ON core_comercial.estimacion_versions;
CREATE POLICY "Permitir gestao de estimacion_versions para usuarios" ON core_comercial.estimacion_versions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir gestao de estimacion_items para usuarios" ON core_comercial.estimacion_items;
CREATE POLICY "Permitir gestao de estimacion_items para usuarios" ON core_comercial.estimacion_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir gestao de estimacion_costs para usuarios" ON core_comercial.estimacion_costs;
CREATE POLICY "Permitir gestao de estimacion_costs para usuarios" ON core_comercial.estimacion_costs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

COMMIT;
`;

async function main() {
  for (const [name, conn] of [['DEV', devConnectionString], ['PROD', prodConnectionString]]) {
    const client = new Client({ connectionString: conn });
    try {
      await client.connect();
      await client.query(sql);
      console.log('Applied estimaciones & priority fixes successfully on ' + name);
    } catch (e) {
      console.error('Error on ' + name, e);
    } finally {
      await client.end();
    }
  }
}
main();
