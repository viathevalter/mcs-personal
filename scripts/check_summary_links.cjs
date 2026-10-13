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
    SELECT id, codigo, trade_name, legal_name, tax_id, vies_status, vies_valid
    FROM core_common.clients
    WHERE codigo = ANY($1)
  `, [allCodes]);
  const clientByCode = {};
  for (const r of cRes.rows) clientByCode[r.codigo] = r;

  for (const pair of consolidations) {
    const inC = clientByCode[pair.inactive];
    const actC = clientByCode[pair.active];
    if (!inC || !actC) continue;

    const htIn = await client.query(`SELECT count(*) FROM core_finance.horas_trabalhadas WHERE client_id = $1`, [inC.id]);
    const htAct = await client.query(`SELECT count(*) FROM core_finance.horas_trabalhadas WHERE client_id = $1`, [actC.id]);

    const wIn = await client.query(`
      SELECT id, cod_colab, nome, cliente, cod_cliente, status_trabajador, contratante
      FROM core_personal.workers
      WHERE cod_cliente = $1 OR UPPER(TRIM(cliente)) = UPPER(TRIM($2)) OR UPPER(TRIM(cliente)) = UPPER(TRIM($3))
    `, [inC.codigo, inC.trade_name, inC.legal_name || '']);

    const whIn = await client.query(`
      SELECT count(*)
      FROM core_personal.worker_hours
      WHERE UPPER(TRIM(cliente_nombre)) = UPPER(TRIM($1)) OR UPPER(TRIM(cliente_nombre)) = UPPER(TRIM($2))
    `, [inC.trade_name, inC.legal_name || '']);

    const cppIn = await client.query(`
      SELECT count(*)
      FROM public.colaborador_por_pedido
      WHERE codcliente = $1 OR UPPER(TRIM(cliente_nombre)) = UPPER(TRIM($2)) OR UPPER(TRIM(cliente_nombre)) = UPPER(TRIM($3))
    `, [inC.codigo, inC.trade_name, inC.legal_name || '']);

    const ctIn = await client.query(`SELECT count(*) FROM core_common.client_tariffs WHERE client_id = $1`, [inC.id]);
    const cwtIn = await client.query(`SELECT count(*) FROM core_common.client_worker_tariffs WHERE client_id = $1`, [inC.id]);
    const opPed = await client.query(`SELECT count(*) FROM core_operacoes.pedidos WHERE client_id = $1`, [inC.id]);
    const comPed = await client.query(`SELECT count(*) FROM core_comercial.pedidos WHERE client_id = $1`, [inC.id]);

    console.log(`[${inC.codigo} "${inC.trade_name}" -> ${actC.codigo} "${actC.trade_name}"]`);
    console.log(`  horas_trabalhadas(in/act): ${htIn.rows[0].count}/${htAct.rows[0].count} | workers: ${wIn.rows.length} | worker_hours: ${whIn.rows[0].count} | colab_pedido: ${cppIn.rows[0].count} | tariffs: ${ctIn.rows[0].count}/${cwtIn.rows[0].count} | pedidos(op/com): ${opPed.rows[0].count}/${comPed.rows[0].count}`);
    if (wIn.rows.length > 0) {
      console.log(`  Workers in inactive:`, wIn.rows.map(w => `${w.cod_colab} ${w.nome} (cliente="${w.cliente}", cod="${w.cod_cliente}", status=${w.status_trabajador})`));
    }
  }

  await client.end();
}
run().catch(console.error);
