const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  // 1. Get all clients and their settings and faturas count
  const allClients = await client.query(`
    SELECT 
      c.id, 
      c.codigo, 
      c.trade_name, 
      c.legal_name, 
      c.tax_id, 
      c.phone, 
      c.mobile, 
      c.email, 
      c.vies_status, 
      c.vies_valid,
      c.deleted_at,
      c.created_at,
      s.status as company_status,
      s.empresa_id,
      COUNT(f.id) as faturas_count
    FROM core_common.clients c
    LEFT JOIN core_common.client_company_settings s ON s.client_id = c.id
    LEFT JOIN core_finance.faturas f ON f.client_id = c.id
    GROUP BY c.id, c.codigo, c.trade_name, c.legal_name, c.tax_id, c.phone, c.mobile, c.email, c.vies_status, c.vies_valid, c.deleted_at, c.created_at, s.status, s.empresa_id
    ORDER BY c.codigo ASC
  `);

  console.log(`Loaded ${allClients.rows.length} client rows.`);

  // Let's also check if any client or fatura has 320 or 430
  console.log("\n--- Checking for 320 or 430 anywhere in clients ---");
  for (const r of allClients.rows) {
    const str = `${r.codigo} ${r.trade_name} ${r.legal_name} ${r.tax_id} ${r.id}`;
    if (str.includes('320') || str.includes('430')) {
      console.log(`Match 320/430: codigo=${r.codigo}, trade_name="${r.trade_name}", legal="${r.legal_name}", tax_id=${r.tax_id}, faturas=${r.faturas_count}, vies_valid=${r.vies_valid}, status=${r.company_status}`);
    }
  }

  // Let's normalize functions
  const cleanTaxId = (t) => t ? t.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : null;
  const cleanPhone = (p) => p ? p.replace(/[^0-9]/g, '').slice(-9) : null; // last 9 digits usually
  const cleanName = (n) => n ? n.toLowerCase()
    .replace(/\b(sl|slu|sa|srl|lda|unipessoal|sociedad|limitada|anonima|cv|spa|gmbh)\b/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() : null;

  // Let's group by tax_id
  const byTaxId = {};
  const byName = {};
  const byPhone = {};

  // Deduplicate client objects by id first (since client_company_settings could have multiple empresas)
  const uniqueClientsMap = new Map();
  for (const r of allClients.rows) {
    if (!uniqueClientsMap.has(r.id)) {
      uniqueClientsMap.set(r.id, {
        ...r,
        faturas_count: Number(r.faturas_count),
        settings: [{ empresa_id: r.empresa_id, status: r.company_status }]
      });
    } else {
      const existing = uniqueClientsMap.get(r.id);
      existing.settings.push({ empresa_id: r.empresa_id, status: r.company_status });
    }
  }

  const clients = Array.from(uniqueClientsMap.values());
  console.log(`Total unique clients: ${clients.length}`);

  // Also query faturas details for each client that has faturas
  const faturasRes = await client.query(`
    SELECT f.id, f.client_id, f.fatura_numero, f.status, f.data_emissao, f.empresa_id, f.created_at
    FROM core_finance.faturas f
  `);
  const faturasByClient = {};
  for (const f of faturasRes.rows) {
    if (!faturasByClient[f.client_id]) faturasByClient[f.client_id] = [];
    faturasByClient[f.client_id].push(f);
  }

  for (const c of clients) {
    c.faturas = faturasByClient[c.id] || [];
    c.faturas_count = c.faturas.length;

    const t = cleanTaxId(c.tax_id);
    if (t && t.length >= 5) {
      if (!byTaxId[t]) byTaxId[t] = [];
      byTaxId[t].push(c);
    }

    const n1 = cleanName(c.trade_name);
    const n2 = cleanName(c.legal_name);
    const names = Array.from(new Set([n1, n2].filter(Boolean)));
    for (const n of names) {
      if (n.length >= 4) {
        if (!byName[n]) byName[n] = [];
        byName[n].push(c);
      }
    }

    const p1 = cleanPhone(c.phone);
    const p2 = cleanPhone(c.mobile);
    const phones = Array.from(new Set([p1, p2].filter(Boolean)));
    for (const p of phones) {
      if (p.length >= 8) {
        if (!byPhone[p]) byPhone[p] = [];
        byPhone[p].push(c);
      }
    }
  }

  console.log("\n==========================================");
  console.log("1. DUPLICATES BY TAX_ID (NIF/CIF/VAT):");
  console.log("==========================================");
  let taxDupCount = 0;
  for (const [tax, list] of Object.entries(byTaxId)) {
    if (list.length > 1) {
      taxDupCount++;
      console.log(`\n[TAX_ID: ${tax}] - ${list.length} clients:`);
      for (const c of list) {
        console.log(`  - Codigo: ${c.codigo} | Name: "${c.trade_name}" / "${c.legal_name}" | Tax: ${c.tax_id} | VIES: ${c.vies_status} (valid: ${c.vies_valid}) | Faturas: ${c.faturas_count} | Status: ${c.settings.map(s => s.status).join(',')}`);
        if (c.faturas.length > 0) {
          console.log(`    Faturas: ${c.faturas.map(f => `${f.fatura_numero} (${f.status})`).join(', ')}`);
        }
      }
    }
  }
  console.log(`Total duplicate groups by Tax ID: ${taxDupCount}`);

  console.log("\n==========================================");
  console.log("2. DUPLICATES BY NAME (NORMALIZED):");
  console.log("==========================================");
  let nameDupCount = 0;
  for (const [name, list] of Object.entries(byName)) {
    // only if different IDs and not already identical tax
    const uniqueIds = Array.from(new Set(list.map(c => c.id)));
    if (uniqueIds.length > 1) {
      // check if all have same tax_id
      const taxes = Array.from(new Set(list.map(c => cleanTaxId(c.tax_id)).filter(Boolean)));
      nameDupCount++;
      console.log(`\n[NAME: "${name}"] - ${list.length} clients (taxes: ${taxes.join(', ')}):`);
      for (const c of list) {
        console.log(`  - Codigo: ${c.codigo} | Name: "${c.trade_name}" / "${c.legal_name}" | Tax: ${c.tax_id} | Phone: ${c.phone} | VIES: ${c.vies_status} (valid: ${c.vies_valid}) | Faturas: ${c.faturas_count} | Status: ${c.settings.map(s => s.status).join(',')}`);
      }
    }
  }

  console.log("\n==========================================");
  console.log("3. DUPLICATES BY PHONE:");
  console.log("==========================================");
  let phoneDupCount = 0;
  for (const [phone, list] of Object.entries(byPhone)) {
    const uniqueIds = Array.from(new Set(list.map(c => c.id)));
    if (uniqueIds.length > 1) {
      phoneDupCount++;
      console.log(`\n[PHONE: ${phone}] - ${list.length} clients:`);
      for (const c of list) {
        console.log(`  - Codigo: ${c.codigo} | Name: "${c.trade_name}" | Tax: ${c.tax_id} | Phone: ${c.phone}/${c.mobile} | Faturas: ${c.faturas_count}`);
      }
    }
  }

  await client.end();
}

run().catch(console.error);
