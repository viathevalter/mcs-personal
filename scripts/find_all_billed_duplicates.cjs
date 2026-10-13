const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  const query = `
    SELECT 
      c.id, c.codigo, c.trade_name, c.legal_name, c.tax_id, c.phone, c.vies_status, c.vies_valid,
      COUNT(f.id) as faturas_count,
      COALESCE(json_agg(json_build_object('fatura_numero', f.fatura_numero, 'status', f.status, 'data_emissao', f.data_emissao)) FILTER (WHERE f.id IS NOT NULL), '[]'::json) as faturas
    FROM core_common.clients c
    LEFT JOIN core_finance.faturas f ON f.client_id = c.id
    GROUP BY c.id, c.codigo, c.trade_name, c.legal_name, c.tax_id, c.phone, c.vies_status, c.vies_valid
    ORDER BY c.codigo ASC
  `;
  const { rows } = await client.query(query);

  const cleanTax = (t) => t ? t.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : null;
  const cleanName = (n) => n ? n.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim() : '';

  // Group by tax_id
  const taxMap = new Map();
  for (const r of rows) {
    const t = cleanTax(r.tax_id);
    if (!t || t.length < 5) continue;
    if (!taxMap.has(t)) taxMap.set(t, []);
    taxMap.get(t).push(r);
  }

  console.log("=== DUPLICATES BY TAX_ID ===");
  for (const [tax, list] of taxMap.entries()) {
    if (list.length > 1) {
      console.log(`\nTax ID: ${tax} (${list.length} records):`);
      for (const item of list) {
        console.log(`  -> Codigo: ${item.codigo} | Name: "${item.trade_name}" | Legal: "${item.legal_name}" | VIES: ${item.vies_status} (valid: ${item.vies_valid}) | Faturas: ${item.faturas_count}`);
        if (Number(item.faturas_count) > 0) {
          console.log(`     Invoices:`, item.faturas);
        }
      }
    }
  }

  // Also group by name similarity
  console.log("\n=== CHECKING ALL WITH FATURAS > 0 FOR DUPLICATES BY NAME ===");
  const billed = rows.filter(r => Number(r.faturas_count) > 0);
  for (const b of billed) {
    // Find any other client with similar name
    const bName = cleanName(b.trade_name);
    const bLegal = cleanName(b.legal_name);
    for (const other of rows) {
      if (other.id === b.id) continue;
      const oName = cleanName(other.trade_name);
      const oLegal = cleanName(other.legal_name);
      
      const match = (bName && oName && (bName.includes(oName) || oName.includes(bName)) && Math.min(bName.length, oName.length) > 5)
                 || (bLegal && oLegal && (bLegal.includes(oLegal) || oLegal.includes(bLegal)) && Math.min(bLegal.length, oLegal.length) > 5);
      
      if (match) {
        console.log(`Potential Duplicate with Billed Client:`);
        console.log(`  BILLED: ${b.codigo} - "${b.trade_name}" (Tax: ${b.tax_id}, Faturas: ${b.faturas_count}, VIES: ${b.vies_status})`);
        console.log(`  OTHER:  ${other.codigo} - "${other.trade_name}" (Tax: ${other.tax_id}, Faturas: ${other.faturas_count}, VIES: ${other.vies_status})`);
      }
    }
  }

  await client.end();
}

run().catch(console.error);
