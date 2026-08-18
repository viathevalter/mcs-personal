const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function testInsert() {
  const client = new Client({ connectionString: prodConnectionString });
  try {
    await client.connect();

    console.log(`=== CHECKING UNIQUE CONSTRAINTS ON core_comercial.leads ===`);
    const constraints = await client.query(`
      SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'core_comercial.leads'::regclass;
    `);
    console.table(constraints.rows);

    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'core_comercial' AND tablename = 'leads';
    `);
    console.table(indexes.rows);

    // Try a test insert
    const empRes = await client.query('SELECT id FROM core_common.empresas LIMIT 1;');
    const empresaId = empRes.rows[0].id;
    console.log("Using empresaId:", empresaId);

    const testRes = await client.query(`
      INSERT INTO core_comercial.leads (
        empresa_id, name, company_name, email, phone, website,
        address_line, city, province, sector, origen_lead, notes, tags
      ) VALUES (
        $1, 'Test Company SRL', 'Test Company SRL', 'test_validator@domain.it',
        '+39 02 123456', 'https://www.testcompany.it', 'Via Roma 1', 'Milano',
        'Milano (MI)', 'Caldareria', 'Teste', 'Nota', ARRAY['Itália']
      )
      RETURNING id;
    `, [empresaId]);
    console.log("Insert result ID:", testRes.rows[0]?.id);

    // Delete test
    await client.query(`DELETE FROM core_comercial.leads WHERE email = 'test_validator@domain.it';`);
    console.log("Test lead cleaned up successfully.");

  } catch (err) {
    console.error("Test insert error:", err);
  } finally {
    await client.end();
  }
}

testInsert();
