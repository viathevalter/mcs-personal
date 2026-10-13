const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  const clientsRes = await client.query(`
    SELECT 
      c.id, c.codigo, c.trade_name, c.legal_name, c.tax_id, c.phone, c.mobile, c.email, 
      c.vies_status, c.vies_valid, c.financial_status, c.created_at,
      COALESCE(bool_or(s.status = 'active'), false) as is_active,
      string_agg(DISTINCT s.status, ', ') as statuses,
      (SELECT COUNT(*) FROM core_finance.faturas f WHERE f.client_id = c.id) as faturas_count,
      (SELECT COUNT(*) FROM public.contas_receber cr WHERE cr.cod_cliente = c.codigo) as cr_count,
      (SELECT json_agg(json_build_object('fatura', f.fatura_numero, 'date', f.data_emissao, 'status', f.status)) FROM core_finance.faturas f WHERE f.client_id = c.id) as faturas_list
    FROM core_common.clients c
    LEFT JOIN core_common.client_company_settings s ON s.client_id = c.id
    GROUP BY c.id, c.codigo, c.trade_name, c.legal_name, c.tax_id, c.phone, c.mobile, c.email, c.vies_status, c.vies_valid, c.financial_status, c.created_at
    ORDER BY c.codigo ASC
  `);

  const clients = clientsRes.rows;

  const normTax = (t) => t ? t.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : null;
  const normName = (n) => n ? n.toLowerCase()
    .replace(/\b(sl|slu|sa|sau|srl|lda|unipessoal|sociedad|limitada|anonima|cv|spa|gmbh|co)\b/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() : null;
  const normPhone = (p) => p ? p.replace(/[^0-9]/g, '').slice(-8) : null;

  const pairs = [];
  for (let i = 0; i < clients.length; i++) {
    for (let j = i + 1; j < clients.length; j++) {
      const c1 = clients[i];
      const c2 = clients[j];

      let matchReason = null;
      const t1 = normTax(c1.tax_id);
      const t2 = normTax(c2.tax_id);
      if (t1 && t2 && t1.length >= 6 && t1 === t2) {
        matchReason = `Same Tax ID (${t1})`;
      }

      const n1 = normName(c1.trade_name) || normName(c1.legal_name);
      const n2 = normName(c2.trade_name) || normName(c2.legal_name);
      if (!matchReason && n1 && n2 && n1.length >= 4 && (n1 === n2 || (n1.length > 6 && n2.length > 6 && (n1.includes(n2) || n2.includes(n1))))) {
        if (!n1.includes('nao definido') && !n1.includes('empresa')) {
          matchReason = `Similar Name ("${c1.trade_name}" vs "${c2.trade_name}")`;
        }
      }

      const p1 = normPhone(c1.phone) || normPhone(c1.mobile);
      const p2 = normPhone(c2.phone) || normPhone(c2.mobile);
      if (!matchReason && p1 && p2 && p1.length >= 8 && p1 === p2) {
        matchReason = `Same Phone (${p1})`;
      }

      if (matchReason) {
        const hasBilling1 = Number(c1.faturas_count) > 0 || Number(c1.cr_count) > 0;
        const hasBilling2 = Number(c2.faturas_count) > 0 || Number(c2.cr_count) > 0;
        pairs.push({
          reason: matchReason,
          c1,
          c2,
          hasBilling1,
          hasBilling2,
          bothHaveBilling: hasBilling1 && hasBilling2
        });
      }
    }
  }

  console.log("=== PAIRS WHERE BOTH HAVE BILLING / INVOICES ===");
  const bothBilling = pairs.filter(p => p.bothHaveBilling);
  for (const p of bothBilling) {
    console.log(`\nMatch: ${p.reason}`);
    console.log(`  Code 1: ${p.c1.codigo} | Name: ${p.c1.trade_name} | VIES: ${p.c1.vies_status} (valid: ${p.c1.vies_valid}) | Faturas: ${p.c1.faturas_count}, CR: ${p.c1.cr_count}`);
    console.log(`  Code 2: ${p.c2.codigo} | Name: ${p.c2.trade_name} | VIES: ${p.c2.vies_status} (valid: ${p.c2.vies_valid}) | Faturas: ${p.c2.faturas_count}, CR: ${p.c2.cr_count}`);
  }

  console.log("\n=== ALL DUPLICATE PAIRS SUMMARY ===");
  console.log(`Total duplicate pairs detected: ${pairs.length}`);
  for (const p of pairs) {
    console.log(`[${p.c1.codigo} & ${p.c2.codigo}] - Reason: ${p.reason} | BothBilling: ${p.bothHaveBilling} | (F1:${p.c1.faturas_count}, CR1:${p.c1.cr_count}) vs (F2:${p.c2.faturas_count}, CR2:${p.c2.cr_count})`);
  }

  await client.end();
}

run().catch(console.error);
