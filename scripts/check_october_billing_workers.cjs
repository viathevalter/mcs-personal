const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  const empresas = await client.query(`SELECT id, nome FROM core_common.empresas`);
  const clients = await client.query(`
    SELECT c.id, c.codigo, c.trade_name, c.legal_name, c.tax_id, c.vies_status, c.vies_valid,
           json_agg(json_build_object('empresa_id', s.empresa_id, 'status', s.status)) as settings
    FROM core_common.clients c
    LEFT JOIN core_common.client_company_settings s ON s.client_id = c.id
    WHERE c.deleted_at IS NULL
    GROUP BY c.id
  `);

  console.log("=== CHECKING OCTOBER 2026 WORKERS ACROSS ALL EMPRESAS ===");
  for (const emp of empresas.rows) {
    const res = await client.query(`
      SELECT * FROM core_personal.get_hours_control_workers($1, 2026, 10, NULL, NULL)
    `, [emp.id]);

    if (res.rows.length === 0) continue;
    console.log(`\nEmpresa: ${emp.nome} (${res.rows.length} workers in Oct 2026)`);

    // Group workers by cliente_nombre
    const byClientName = {};
    for (const w of res.rows) {
      const cn = (w.cliente_nombre || 'NÃO DEFINIDO').trim();
      if (!byClientName[cn]) byClientName[cn] = [];
      byClientName[cn].push(w);
    }

    for (const [cn, wList] of Object.entries(byClientName)) {
      // Find matching client(s) in core_common.clients
      const matches = clients.rows.filter(c =>
        (c.trade_name && c.trade_name.trim().toLowerCase() === cn.toLowerCase()) ||
        (c.legal_name && c.legal_name.trim().toLowerCase() === cn.toLowerCase())
      );

      const activeMatches = matches.filter(c => {
        const empSetting = c.settings.find(s => s.empresa_id === emp.id);
        const anyActive = c.settings.some(s => s.status === 'active');
        return empSetting ? empSetting.status === 'active' : anyActive;
      });

      if (activeMatches.length === 0) {
        console.log(`  [!] UNMATCHED OR INACTIVE CLIENT NAME: "${cn}" (${wList.length} workers: ${wList.map(w => w.cod_colab + ' ' + w.nome).join(', ')})`);
        if (matches.length > 0) {
          console.log(`      Matches found in DB (all inactive):`, matches.map(m => `${m.codigo} "${m.trade_name}" (tax: ${m.tax_id}, settings: ${JSON.stringify(m.settings)})`));
        } else {
          console.log(`      No exact name match in core_common.clients!`);
        }
      }
    }
  }

  await client.end();
}
run().catch(console.error);
