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

  // Check RPC definition of core_personal.get_hours_control_workers
  const rpcDef = await client.query(`
    SELECT pg_get_functiondef(p.oid) as def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'core_personal' AND p.proname = 'get_hours_control_workers'
  `);
  console.log("=== RPC get_hours_control_workers ===");
  console.log(rpcDef.rows[0]?.def);

  // Get client details for all codes in consolidations
  const allCodes = Array.from(new Set(consolidations.flatMap(c => [c.inactive, c.active])));
  const cRes = await client.query(`
    SELECT id, codigo, trade_name, legal_name, tax_id, vies_status, vies_valid
    FROM core_common.clients
    WHERE codigo = ANY($1)
  `, [allCodes]);
  const clientByCode = {};
  for (const r of cRes.rows) clientByCode[r.codigo] = r;

  console.log("\n=== CHECKING WORKERS, WORKER_HOURS, HORAS_TRABALHADAS, COLABORADOR_POR_PEDIDO FOR EACH PAIR ===");
  for (const pair of consolidations) {
    const inC = clientByCode[pair.inactive];
    const actC = clientByCode[pair.active];
    if (!inC || !actC) continue;

    console.log(`\n---------------------------------------------------------`);
    console.log(`INACTIVE: ${inC.codigo} "${inC.trade_name}" (id: ${inC.id})`);
    console.log(`ACTIVE:   ${actC.codigo} "${actC.trade_name}" (id: ${actC.id}, VIES: ${actC.vies_status})`);

    // 1. core_finance.horas_trabalhadas
    const htIn = await client.query(`SELECT count(*), min(data_trabalho), max(data_trabalho) FROM core_finance.horas_trabalhadas WHERE client_id = $1`, [inC.id]);
    const htAct = await client.query(`SELECT count(*), min(data_trabalho), max(data_trabalho) FROM core_finance.horas_trabalhadas WHERE client_id = $1`, [actC.id]);
    console.log(`  horas_trabalhadas -> Inactive(${inC.codigo}): ${htIn.rows[0].count} (${htIn.rows[0].min || '-'} to ${htIn.rows[0].max || '-'}) | Active(${actC.codigo}): ${htAct.rows[0].count}`);

    // 2. core_personal.workers
    const wIn = await client.query(`
      SELECT id, cod_colab, nome, cliente, cod_cliente, status_trabajador, contratante
      FROM core_personal.workers
      WHERE cod_cliente = $1 OR UPPER(TRIM(cliente)) = UPPER(TRIM($2)) OR UPPER(TRIM(cliente)) = UPPER(TRIM($3))
    `, [inC.codigo, inC.trade_name, inC.legal_name || '']);
    console.log(`  core_personal.workers matching Inactive(${inC.codigo} / "${inC.trade_name}"): ${wIn.rows.length}`);
    for (const w of wIn.rows) {
      console.log(`    - Worker ${w.cod_colab} ${w.nome} | cliente="${w.cliente}" | cod_cliente="${w.cod_cliente}" | status=${w.status_trabajador}`);
    }

    // 3. core_personal.worker_hours
    const whIn = await client.query(`
      SELECT id, worker_id, period_year, period_month, cliente_nombre, status, horas_totais
      FROM core_personal.worker_hours
      WHERE UPPER(TRIM(cliente_nombre)) = UPPER(TRIM($1)) OR UPPER(TRIM(cliente_nombre)) = UPPER(TRIM($2))
    `, [inC.trade_name, inC.legal_name || '']);
    console.log(`  core_personal.worker_hours matching Inactive("${inC.trade_name}"): ${whIn.rows.length}`);
    for (const wh of whIn.rows) {
      console.log(`    - Year/Month: ${wh.period_year}/${wh.period_month} | cliente_nombre="${wh.cliente_nombre}" | status=${wh.status}`);
    }

    // 4. public.colaborador_por_pedido
    const cppIn = await client.query(`
      SELECT id, cod_colab, nome_colab, codcliente, cliente_nombre, fechainiciopedido, fechafinpedido
      FROM public.colaborador_por_pedido
      WHERE codcliente = $1 OR UPPER(TRIM(cliente_nombre)) = UPPER(TRIM($2)) OR UPPER(TRIM(cliente_nombre)) = UPPER(TRIM($3))
    `, [inC.codigo, inC.trade_name, inC.legal_name || '']);
    console.log(`  public.colaborador_por_pedido matching Inactive: ${cppIn.rows.length}`);
    for (const cpp of cppIn.rows) {
      console.log(`    - Colab ${cpp.cod_colab} ${cpp.nome_colab} | codcliente="${cpp.codcliente}" | cliente_nombre="${cpp.cliente_nombre}"`);
    }

    // 5. core_common.client_tariffs & client_worker_tariffs
    const ctIn = await client.query(`SELECT count(*) FROM core_common.client_tariffs WHERE client_id = $1`, [inC.id]);
    const cwtIn = await client.query(`SELECT count(*) FROM core_common.client_worker_tariffs WHERE client_id = $1`, [inC.id]);
    console.log(`  client_tariffs: ${ctIn.rows[0].count} | client_worker_tariffs: ${cwtIn.rows[0].count}`);

    // 6. core_operacoes.pedidos & core_comercial.pedidos
    const opPed = await client.query(`SELECT count(*) FROM core_operacoes.pedidos WHERE client_id = $1`, [inC.id]);
    const comPed = await client.query(`SELECT count(*) FROM core_comercial.pedidos WHERE client_id = $1`, [inC.id]);
    console.log(`  core_operacoes.pedidos: ${opPed.rows[0].count} | core_comercial.pedidos: ${comPed.rows[0].count}`);
  }

  // Also check EUROCONTAINER specifically across ALL workers/hours using ILIKE '%EUROCONTAINER%' or '%CARVISA%'
  console.log("\n=== SPECIFIC SEARCH FOR EUROCONTAINER / CARVISA ===");
  const euroW = await client.query(`
    SELECT id, cod_colab, nome, cliente, cod_cliente, status_trabajador, contratante
    FROM core_personal.workers
    WHERE cliente ILIKE '%EUROCONTAINER%' OR cliente ILIKE '%CARVISA%' OR cod_cliente IN ('C0225', 'C0678', 'C0720')
  `);
  console.log("Workers with EUROCONTAINER/CARVISA:", euroW.rows);

  const euroWH = await client.query(`
    SELECT id, worker_id, period_year, period_month, cliente_nombre, status
    FROM core_personal.worker_hours
    WHERE cliente_nombre ILIKE '%EUROCONTAINER%' OR cliente_nombre ILIKE '%CARVISA%'
  `);
  console.log("Worker_hours with EUROCONTAINER/CARVISA:", euroWH.rows);

  const euroCPP = await client.query(`
    SELECT id, cod_colab, nome_colab, codcliente, cliente_nombre, contratante
    FROM public.colaborador_por_pedido
    WHERE cliente_nombre ILIKE '%EUROCONTAINER%' OR cliente_nombre ILIKE '%CARVISA%' OR codcliente IN ('C0225', 'C0678', 'C0720')
  `);
  console.log("colaborador_por_pedido with EUROCONTAINER/CARVISA:", euroCPP.rows);

  await client.end();
}
run().catch(console.error);
