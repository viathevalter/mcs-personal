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

  for (const month of [8, 9, 10]) {
    console.log(`\n=== CHECKING MONTH ${month}/2026 ===`);
    for (const emp of empresas.rows) {
      const res = await client.query(`
        SELECT * FROM core_personal.get_hours_control_workers($1, 2026, $2, NULL, NULL)
      `, [emp.id, month]);

      if (res.rows.length === 0) continue;

      const byClientName = {};
      for (const w of res.rows) {
        const cn = (w.cliente_nombre || 'NÃO DEFINIDO').trim();
        if (!byClientName[cn]) byClientName[cn] = [];
        byClientName[cn].push(w);
      }

      for (const [cn, wList] of Object.entries(byClientName)) {
        if (cn === 'NÃO DEFINIDO') continue;
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
          console.log(`  [${emp.nome} - ${month}/2026] UNMATCHED/INACTIVE: "${cn}" (${wList.length} workers: ${wList.map(w => w.cod_colab).join(', ')})`);
        }
      }
    }
  }

  await client.end();
}
run().catch(console.error);
