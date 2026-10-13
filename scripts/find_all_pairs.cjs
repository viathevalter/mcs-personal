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
  console.log(`Analyzing ${clients.length} clients...`);

  // Helper functions
  const normTax = (t) => t ? t.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : null;
  const normName = (n) => n ? n.toLowerCase()
    .replace(/\b(sl|slu|sa|sau|srl|lda|unipessoal|sociedad|limitada|anonima|cv|spa|gmbh|co)\b/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() : null;
  const normPhone = (p) => p ? p.replace(/[^0-9]/g, '').slice(-8) : null;

  // Find duplicates
  const duplicateGroups = [];

  for (let i = 0; i < clients.length; i++) {
    for (let j = i + 1; j < clients.length; j++) {
      const c1 = clients[i];
      const c2 = clients[j];

      let matchReason = null;

      // 1. Same Tax ID
      const t1 = normTax(c1.tax_id);
      const t2 = normTax(c2.tax_id);
      if (t1 && t2 && t1.length >= 6 && t1 === t2) {
        matchReason = `Same Tax ID (${t1})`;
      }

      // 2. Same Name
      const n1 = normName(c1.trade_name) || normName(c1.legal_name);
      const n2 = normName(c2.trade_name) || normName(c2.legal_name);
      if (!matchReason && n1 && n2 && n1.length >= 4 && (n1 === n2 || (n1.length > 6 && n2.length > 6 && (n1.includes(n2) || n2.includes(n1))))) {
        // Exclude common generic false positives
        if (!n1.includes('nao definido') && !n1.includes('empresa')) {
          matchReason = `Similar Name ("${c1.trade_name}" vs "${c2.trade_name}")`;
        }
      }

      // 3. Same Phone
      const p1 = normPhone(c1.phone) || normPhone(c1.mobile);
      const p2 = normPhone(c2.phone) || normPhone(c2.mobile);
      if (!matchReason && p1 && p2 && p1.length >= 8 && p1 === p2) {
        matchReason = `Same Phone (${p1} - "${c1.trade_name}" vs "${c2.trade_name}")`;
      }

      if (matchReason) {
        duplicateGroups.push({
          reason: matchReason,
          c1,
          c2,
          bothHaveFaturas: (Number(c1.faturas_count) > 0 || Number(c1.cr_count) > 0) && (Number(c2.faturas_count) > 0 || Number(c2.cr_count) > 0)
        });
      }
    }
  }

  console.log(`\nFound ${duplicateGroups.length} duplicate pairs:\n`);
  for (const g of duplicateGroups) {
    const f1 = `Faturas:${g.c1.faturas_count}, CR:${g.c1.cr_count}`;
    const f2 = `Faturas:${g.c2.faturas_count}, CR:${g.c2.cr_count}`;
    console.log(`------------------------------------------------------------------------`);
    console.log(`REASON: ${g.reason}`);
    console.log(`  [1] Codigo: ${g.c1.codigo} | Name: "${g.c1.trade_name}" | Tax: ${g.c1.tax_id} | VIES: ${g.c1.vies_status} (valid: ${g.c1.vies_valid}) | Status: ${g.c1.statuses} | ${f1}`);
    if (g.c1.faturas_list && g.c1.faturas_list.length > 0) {
      console.log(`      Faturas:`, g.c1.faturas_list.map(f => f.fatura).join(', '));
    }
    console.log(`  [2] Codigo: ${g.c2.codigo} | Name: "${g.c2.trade_name}" | Tax: ${g.c2.tax_id} | VIES: ${g.c2.vies_status} (valid: ${g.c2.vies_valid}) | Status: ${g.c2.statuses} | ${f2}`);
    if (g.c2.faturas_list && g.c2.faturas_list.length > 0) {
      console.log(`      Faturas:`, g.c2.faturas_list.map(f => f.fatura).join(', '));
    }
    if (g.bothHaveFaturas) {
      console.log(`  >>> ATTENTION: BOTH CODES HAVE INVOICES / BILLING! <<<`);
    }
  }

  await client.end();
}

run().catch(console.error);
