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

  // 1. Get all client records for inactive and active codes
  const codes = Array.from(new Set(consolidations.flatMap(c => [c.inactive, c.active])));
  const clientsRes = await client.query(`
    SELECT id, codigo, trade_name, legal_name, tax_id
    FROM core_common.clients
    WHERE codigo = ANY($1)
  `, [codes]);

  const byCode = {};
  for (const r of clientsRes.rows) byCode[r.codigo] = r;

  console.log("=== CHECKING ALL TABLES FOR WORKERS / HOURS / PEDIDOS LINKED TO INACTIVE CLIENTS ===");

  // Check tables in core_personal, core_operacoes, core_comercial, core_common, public
  const schemaCols = await client.query(`
    SELECT table_schema, table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema IN ('core_personal', 'core_operacoes', 'core_comercial', 'core_common', 'core_finance', 'public')
      AND (
        column_name ILIKE '%client%'
        OR column_name ILIKE '%cod_cliente%'
        OR column_name ILIKE '%codcliente%'
        OR table_name ILIKE '%worker%'
        OR table_name ILIKE '%hora%'
        OR table_name ILIKE '%alloc%'
        OR table_name ILIKE '%colaborador%'
        OR table_name ILIKE '%pedido%'
      )
    ORDER BY table_schema, table_name, column_name
  `);

  const tablesMap = {};
  for (const r of schemaCols.rows) {
    const key = `${r.table_schema}.${r.table_name}`;
    if (!tablesMap[key]) tablesMap[key] = [];
    tablesMap[key].push(r.column_name);
  }
  console.log("Tables with client/worker columns:", tablesMap);

  await client.end();
}
run().catch(console.error);
