const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  // Find all tables with 'client' in table_name
  const clientTables = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_name ILIKE '%client%'
      AND table_schema NOT IN ('information_schema', 'pg_catalog')
  `);
  console.log("Client tables:", clientTables.rows);

  // Check each table for 320 and 430
  for (const t of clientTables.rows) {
    try {
      const q = `SELECT * FROM "${t.table_schema}"."${t.table_name}" LIMIT 1`;
      const res = await client.query(q);
      const cols = Object.keys(res.rows[0] || {});
      console.log(`Table ${t.table_schema}.${t.table_name} has cols:`, cols.slice(0, 10).join(', '));
      
      // If has codigo or code or id
      const searchCols = cols.filter(c => c.includes('cod') || c.includes('id') || c.includes('name') || c.includes('nif') || c.includes('tax'));
      for (const col of searchCols) {
        try {
          const match = await client.query(`
            SELECT * FROM "${t.table_schema}"."${t.table_name}" 
            WHERE CAST("${col}" AS TEXT) IN ('320', '430', 'C0320', 'C0430', 'C320', 'C430')
               OR CAST("${col}" AS TEXT) LIKE '%320%'
          `);
          if (match.rows.length > 0) {
            console.log(`MATCH in ${t.table_schema}.${t.table_name}.${col}:`, match.rows.map(r => ({
              col_val: r[col],
              name: r.name || r.trade_name || r.legal_name || r.nome || r.razao_social,
              id: r.id
            })));
          }
        } catch (e) {}
      }
    } catch (e) {
      console.log(`Could not query ${t.table_schema}.${t.table_name}:`, e.message);
    }
  }

  // Also check core_finance.faturas and core_finance.faturas_proforma, and pedidos
  const faturaCols = await client.query(`
    SELECT table_schema, table_name, column_name 
    FROM information_schema.columns 
    WHERE table_name IN ('faturas', 'faturas_proforma', 'pedidos')
      AND table_schema NOT IN ('information_schema', 'pg_catalog')
  `);
  console.log("Faturas/Pedidos columns:", faturaCols.rows.map(r => `${r.table_schema}.${r.table_name}.${r.column_name}`).join(', '));

  await client.end();
}

run().catch(console.error);
