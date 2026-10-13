const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

const consolidations = [
  { inactive: 'C0009', active: 'C0679' },
  { inactive: 'C0082', active: 'C0214' },
  { inactive: 'C0260', active: 'C0710' },
  { inactive: 'C0210', active: 'C0209' },
  { inactive: 'C0019', active: 'C0020' },
  { inactive: 'C0268', active: 'C0253' },
  { inactive: 'C0687', active: 'C0074' },
  { inactive: 'C0678', active: 'C0225' },
  { inactive: 'C0720', active: 'C0225' },
  { inactive: 'C0590', active: 'C0591' },
  { inactive: 'C0699', active: 'C0685' },
  { inactive: 'C0705', active: 'C0686' },
  { inactive: 'C0704', active: 'C0690' },
  { inactive: 'C0716', active: 'C0715' },
  { inactive: 'C0718', active: 'C0717' },
];

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();

  const allCodes = Array.from(new Set(consolidations.flatMap(c => [c.inactive, c.active])));
  const cRes = await client.query(`
    SELECT id, codigo, trade_name, legal_name, tax_id
    FROM core_common.clients
    WHERE codigo = ANY($1)
  `, [allCodes]);
  const clientByCode = {};
  for (const r of cRes.rows) clientByCode[r.codigo] = r;

  console.log("=== CHECKING worker_assignments, solicitudes_operativas, estimaciones, leads ===");
  for (const pair of consolidations) {
    const inC = clientByCode[pair.inactive];
    const actC = clientByCode[pair.active];
    if (!inC || !actC) continue;

    const wa = await client.query(`
      SELECT wa.id, w.cod_colab, w.nome, wa.status, wa.start_date, wa.end_date
      FROM core_personal.worker_assignments wa
      JOIN core_personal.workers w ON w.id = wa.worker_id
      WHERE wa.client_id = $1
    `, [inC.id]);

    const so = await client.query(`
      SELECT count(*) FROM core_operacoes.solicitudes_operativas WHERE client_id = $1
    `, [inC.id]).catch(() => ({ rows: [{ count: 'err' }] }));

    const est = await client.query(`
      SELECT count(*) FROM core_comercial.estimaciones WHERE client_id = $1
    `, [inC.id]).catch(() => ({ rows: [{ count: 'err' }] }));

    const leads = await client.query(`
      SELECT count(*) FROM core_comercial.leads WHERE client_id = $1
    `, [inC.id]).catch(() => ({ rows: [{ count: 'err' }] }));

    if (wa.rows.length > 0 || Number(so.rows[0].count) > 0 || Number(est.rows[0].count) > 0 || Number(leads.rows[0].count) > 0) {
      console.log(`\n[${inC.codigo} "${inC.trade_name}" -> ${actC.codigo} "${actC.trade_name}"]`);
      console.log(`  worker_assignments: ${wa.rows.length} | solicitudes: ${so.rows[0].count} | estimaciones: ${est.rows[0].count} | leads: ${leads.rows[0].count}`);
      for (const r of wa.rows) {
        console.log(`    - Assignment: ${r.cod_colab} ${r.nome} (status: ${r.status}, start: ${r.start_date}, end: ${r.end_date})`);
      }
    }
  }

  // Also check ALL tables in all schemas that have a column of type uuid and contain any of the inactive client IDs!
  const inactiveIds = consolidations.map(c => clientByCode[c.inactive]?.id).filter(Boolean);
  console.log("\n=== SCANNING ALL UUID COLUMNS IN DB FOR INACTIVE CLIENT IDS ===");
  const uuidCols = await client.query(`
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema IN ('core_common', 'core_comercial', 'core_operacoes', 'core_personal', 'core_finance', 'public')
      AND data_type = 'uuid'
      AND (column_name ILIKE '%client%' OR column_name ILIKE '%cliente%')
  `);
  for (const col of uuidCols.rows) {
    try {
      const q = await client.query(`
        SELECT "${col.column_name}" as cid, count(*)
        FROM "${col.table_schema}"."${col.table_name}"
        WHERE "${col.column_name}" = ANY($1::uuid[])
        GROUP BY "${col.column_name}"
      `, [inactiveIds]);
      if (q.rows.length > 0) {
        console.log(`  Found in ${col.table_schema}.${col.table_name}.${col.column_name}:`, q.rows.map(r => {
          const code = Object.values(clientByCode).find(c => c.id === r.cid)?.codigo;
          return `${code}(${r.count})`;
        }));
      }
    } catch (e) {
      // skip views that fail or similar
    }
  }

  await client.end();
}
run().catch(console.error);
