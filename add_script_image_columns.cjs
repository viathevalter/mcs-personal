const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const sql = `
BEGIN;

ALTER TABLE core_comercial.sales_scripts 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS rich_content_html TEXT;

COMMIT;
`;

async function main() {
  for (const [name, conn] of [['DEV', devConnectionString], ['PROD', prodConnectionString]]) {
    const client = new Client({ connectionString: conn });
    try {
      await client.connect();
      await client.query(sql);
      console.log('Columns added successfully on ' + name);
    } catch (e) {
      console.error('Error on ' + name, e);
    } finally {
      await client.end();
    }
  }
}
main();
