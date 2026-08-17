const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const migrationSql = `
CREATE OR REPLACE FUNCTION core_comercial.fn_get_campaigns_stats(p_empresa_id UUID DEFAULT NULL)
RETURNS TABLE (
  campaign_id UUID,
  total BIGINT,
  sent BIGINT,
  pending BIGINT,
  failed BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, core_comercial, core_common
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS campaign_id,
    COALESCE(COUNT(q.id), 0) AS total,
    COALESCE(COUNT(q.id) FILTER (WHERE q.status = 'sent'), 0) AS sent,
    COALESCE(COUNT(q.id) FILTER (WHERE q.status = 'pending'), 0) AS pending,
    COALESCE(COUNT(q.id) FILTER (WHERE q.status = 'failed'), 0) AS failed
  FROM core_comercial.marketing_campaigns c
  LEFT JOIN core_comercial.marketing_campaign_queue q ON q.campaign_id = c.id
  WHERE (p_empresa_id IS NULL OR c.empresa_id = p_empresa_id)
  GROUP BY c.id;
END;
$$;

GRANT EXECUTE ON FUNCTION core_comercial.fn_get_campaigns_stats(UUID) TO authenticated, anon, service_role;
NOTIFY pgrst, 'reload schema';
`;

async function apply(name, connStr) {
  const client = new Client({ connectionString: connStr });
  try {
    await client.connect();
    console.log(`Applying fn_get_campaigns_stats on ${name}...`);
    await client.query(migrationSql);
    console.log(`Successfully created fn_get_campaigns_stats on ${name}!`);
  } catch (err) {
    console.error(`Error on ${name}:`, err.message);
  } finally {
    await client.end();
  }
}

async function run() {
  await apply('DEV', devConnectionString);
  await apply('PROD', prodConnectionString);
}

run();
