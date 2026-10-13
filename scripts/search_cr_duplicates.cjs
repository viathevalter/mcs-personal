const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  console.log("Checking all distinct clients in contas_receber:");
  const distinctCR = await client.query(`
    SELECT DISTINCT cod_cliente, cliente 
    FROM public.contas_receber 
    ORDER BY cod_cliente
  `);
  console.log(`Total distinct pairs in contas_receber: ${distinctCR.rows.length}`);
  
  // Find if same cliente name has multiple cod_cliente
  const byName = {};
  for (const r of distinctCR.rows) {
    const name = (r.cliente || '').trim().toUpperCase();
    if (!byName[name]) byName[name] = [];
    byName[name].push(r.cod_cliente);
  }
  for (const [name, codes] of Object.entries(byName)) {
    if (codes.length > 1) {
      console.log(`Duplicate in contas_receber by name "${name}":`, codes);
    }
  }

  // Let's also search across all tables in public for '320' and '430' as numbers
  const allCols = await client.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND data_type IN ('text', 'character varying', 'integer', 'bigint')
  `);
  
  console.log("\nSearching for exact '320' and '430' in public tables with client in col name:");
  for (const col of allCols.rows) {
    if (col.column_name.toLowerCase().includes('client') || col.column_name.toLowerCase().includes('cod')) {
      try {
        const res = await client.query(`
          SELECT DISTINCT "${col.column_name}" 
          FROM public."${col.table_name}" 
          WHERE CAST("${col.column_name}" AS TEXT) IN ('320', '430', 'C0320', 'C0430', 'C320', 'C430')
        `);
        if (res.rows.length > 0) {
          console.log(`Found in public.${col.table_name}.${col.column_name}:`, res.rows);
        }
      } catch (e) {}
    }
  }

  await client.end();
}
run().catch(console.error);
