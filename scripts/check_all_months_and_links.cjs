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

  console.log("=== DETAILED CHECK OF ALL TABLES FOR INACTIVE CLIENTS ===");
  for (const pair of consolidations) {
    const inC = clientByCode[pair.inactive];
    const actC = clientByCode[pair.active];
    if (!inC || !actC) continue;

    // Check text-based tables where trade_name differ between inactive and active!
    const nameDiffers = inC.trade_name.trim().toLowerCase() !== actC.trade_name.trim().toLowerCase();
    console.log(`\nPair: ${inC.codigo} ("${inC.trade_name}") -> ${actC.codigo} ("${actC.trade_name}") [Name differs: ${nameDiffers}]`);

    // 1. core_personal.worker_assignments (by client_id)
    const wa = await client.query(`SELECT count(*) FROM core_personal.worker_assignments WHERE client_id = $1`, [inC.id]);
    if (Number(wa.rows[0].count) > 0) console.log(`  - core_personal.worker_assignments (client_id): ${wa.rows[0].count}`);

    // 2. core_personal.worker_compliance_status (by client_id)
    const wcs = await client.query(`SELECT count(*) FROM core_personal.worker_compliance_status WHERE client_id = $1`, [inC.id]);
    if (Number(wcs.rows[0].count) > 0) console.log(`  - core_personal.worker_compliance_status (client_id): ${wcs.rows[0].count}`);

    // 3. core_operacoes.pedidos (by client_id)
    const opP = await client.query(`SELECT count(*) FROM core_operacoes.pedidos WHERE client_id = $1`, [inC.id]);
    if (Number(opP.rows[0].count) > 0) console.log(`  - core_operacoes.pedidos (client_id): ${opP.rows[0].count}`);

    // 4. core_comercial.pedidos (by client_id)
    const comP = await client.query(`SELECT count(*) FROM core_comercial.pedidos WHERE client_id = $1`, [inC.id]);
    if (Number(comP.rows[0].count) > 0) console.log(`  - core_comercial.pedidos (client_id): ${comP.rows[0].count}`);

    // 5. core_comercial.estimaciones (by client_id)
    const est = await client.query(`SELECT count(*) FROM core_comercial.estimaciones WHERE client_id = $1`, [inC.id]);
    if (Number(est.rows[0].count) > 0) console.log(`  - core_comercial.estimaciones (client_id): ${est.rows[0].count}`);

    // 6. core_operacoes.solicitudes_operativas & solicitud_targets
    const sol = await client.query(`SELECT count(*) FROM core_operacoes.solicitudes_operativas WHERE client_id = $1`, [inC.id]);
    if (Number(sol.rows[0].count) > 0) console.log(`  - core_operacoes.solicitudes_operativas (client_id): ${sol.rows[0].count}`);
    const solT = await client.query(`SELECT count(*) FROM core_operacoes.solicitud_targets WHERE source_client_id = $1`, [inC.id]);
    if (Number(solT.rows[0].count) > 0) console.log(`  - core_operacoes.solicitud_targets (source_client_id): ${solT.rows[0].count}`);

    // 7. core_common.client_tariffs & client_worker_tariffs & client_contacts
    const ct = await client.query(`SELECT count(*) FROM core_common.client_tariffs WHERE client_id = $1`, [inC.id]);
    if (Number(ct.rows[0].count) > 0) console.log(`  - core_common.client_tariffs (client_id): ${ct.rows[0].count}`);
    const cwt = await client.query(`SELECT count(*) FROM core_common.client_worker_tariffs WHERE client_id = $1`, [inC.id]);
    if (Number(cwt.rows[0].count) > 0) console.log(`  - core_common.client_worker_tariffs (client_id): ${cwt.rows[0].count}`);
    const cc = await client.query(`SELECT count(*) FROM core_common.client_contacts WHERE client_id = $1`, [inC.id]);
    if (Number(cc.rows[0].count) > 0) console.log(`  - core_common.client_contacts (client_id): ${cc.rows[0].count}`);

    // 8. public.generated_documents
    const gd = await client.query(`SELECT count(*) FROM public.generated_documents WHERE client_id = $1`, [inC.id]);
    if (Number(gd.rows[0].count) > 0) console.log(`  - public.generated_documents (client_id): ${gd.rows[0].count}`);

    // 9. core_personal.workers (cod_cliente or cliente)
    const wCod = await client.query(`SELECT count(*) FROM core_personal.workers WHERE cod_cliente = $1`, [inC.codigo]);
    if (Number(wCod.rows[0].count) > 0) console.log(`  - core_personal.workers (cod_cliente=${inC.codigo}): ${wCod.rows[0].count}`);
    if (nameDiffers) {
      const wName = await client.query(`SELECT count(*) FROM core_personal.workers WHERE UPPER(TRIM(cliente)) = UPPER(TRIM($1))`, [inC.trade_name]);
      if (Number(wName.rows[0].count) > 0) console.log(`  - core_personal.workers (cliente="${inC.trade_name}"): ${wName.rows[0].count}`);
    }

    // 10. core_personal.worker_hours (cliente_nombre)
    if (nameDiffers) {
      const whName = await client.query(`SELECT count(*) FROM core_personal.worker_hours WHERE UPPER(TRIM(cliente_nombre)) = UPPER(TRIM($1))`, [inC.trade_name]);
      if (Number(whName.rows[0].count) > 0) console.log(`  - core_personal.worker_hours (cliente_nombre="${inC.trade_name}"): ${whName.rows[0].count}`);
    }

    // 11. public.colaborador_por_pedido (codcliente or cliente_nombre)
    const cppCod = await client.query(`SELECT count(*) FROM public.colaborador_por_pedido WHERE codcliente = $1`, [inC.codigo]);
    if (Number(cppCod.rows[0].count) > 0) console.log(`  - public.colaborador_por_pedido (codcliente=${inC.codigo}): ${cppCod.rows[0].count}`);
    if (nameDiffers) {
      const cppName = await client.query(`SELECT count(*) FROM public.colaborador_por_pedido WHERE UPPER(TRIM(cliente_nombre)) = UPPER(TRIM($1))`, [inC.trade_name]);
      if (Number(cppName.rows[0].count) > 0) console.log(`  - public.colaborador_por_pedido (cliente_nombre="${inC.trade_name}"): ${cppName.rows[0].count}`);
    }

    // 12. public.pedidos, reemplazos, reubicaciones, colaboradores_reemplazados, colaboradores_reubicados
    for (const [tbl, col] of [
      ['pedidos', 'cod_cliente'],
      ['reemplazos', 'codcliente'],
      ['colaboradores_reemplazados', 'cod_cliente'],
      ['reubicaciones', 'cod_cliente'],
      ['colaboradores_reubicados', 'cod_cliente'],
      ['cobranca_simulacoes', 'cod_cliente']
    ]) {
      const q = await client.query(`SELECT count(*) FROM public."${tbl}" WHERE "${col}" = $1`, [inC.codigo]);
      if (Number(q.rows[0].count) > 0) console.log(`  - public.${tbl} (${col}=${inC.codigo}): ${q.rows[0].count}`);
    }
  }

  await client.end();
}
run().catch(console.error);
