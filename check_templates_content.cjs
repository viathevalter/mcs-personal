const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();

    console.log(`=== CHECKING EMAIL TEMPLATES IN PROD ===`);
    const res = await client.query(`
      SELECT id, title, subject, html_content 
      FROM core_comercial.marketing_templates 
      LIMIT 5;
    `);
    console.table(res.rows.map(r => ({ id: r.id, title: r.title, subject: r.subject, html_len: r.html_content?.length })));

    if (res.rows[0]) {
      console.log("\nSample HTML Template (First 500 chars):");
      console.log(res.rows[0].html_content?.slice(0, 500));
    }

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
