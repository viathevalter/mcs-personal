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
  { inactive: 'C0682', active: null },
  { inactive: 'C0683', active: null },
  { inactive: 'C0693', active: null },
];

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();
  console.log("Connected to PROD DB");

  try {
    await client.query('BEGIN');

    // Get all empresas
    const empRes = await client.query(`SELECT id, nome FROM core_common.empresas`);
    const allEmpresaIds = empRes.rows.map(r => r.id);

    for (const pair of consolidations) {
      const inRes = await client.query(`
        SELECT id, codigo, trade_name, legal_name, tax_id
        FROM core_common.clients WHERE codigo = $1
      `, [pair.inactive]);

      if (inRes.rows.length === 0) continue;
      const inC = inRes.rows[0];

      let actC = null;
      if (pair.active) {
        const actRes = await client.query(`
          SELECT id, codigo, trade_name, legal_name, tax_id
          FROM core_common.clients WHERE codigo = $1
        `, [pair.active]);
        if (actRes.rows.length > 0) actC = actRes.rows[0];
      }

      console.log(`\n=== Consolidating ${inC.codigo} ("${inC.trade_name}") -> ${actC ? `${actC.codigo} ("${actC.trade_name}")` : 'INACTIVE ONLY'} ===`);

      // 1. Set status = 'inactive' in client_company_settings across ALL empresas so it never shows as Active in any company
      for (const empId of allEmpresaIds) {
        await client.query(`
          INSERT INTO core_common.client_company_settings (client_id, empresa_id, status)
          VALUES ($1, $2, 'inactive')
          ON CONFLICT (client_id, empresa_id) DO UPDATE SET status = 'inactive'
        `, [inC.id, empId]);
      }
      console.log(`  - Set status='inactive' across all ${allEmpresaIds.length} empresas for ${inC.codigo}`);

      if (!actC) continue;

      // 2. Ensure active client is 'active' in LUMINOUS and existing settings
      // Also if inactive client was linked to an empresa where active client had no setting, ensure active client has status='active'
      for (const empId of allEmpresaIds) {
        await client.query(`
          INSERT INTO core_common.client_company_settings (client_id, empresa_id, status)
          VALUES ($1, $2, 'active')
          ON CONFLICT (client_id, empresa_id) DO UPDATE SET status = 'active'
        `, [actC.id, empId]);
      }

      // 3. Migrate core_personal.worker_assignments
      const updWA = await client.query(`
        UPDATE core_personal.worker_assignments
        SET client_id = $1
        WHERE client_id = $2
      `, [actC.id, inC.id]);
      if (updWA.rowCount > 0) console.log(`  - Migrated ${updWA.rowCount} worker_assignments to ${actC.codigo}`);

      // 4. Migrate core_personal.worker_compliance_status (avoiding unique conflicts)
      await client.query(`
        DELETE FROM core_personal.worker_compliance_status wcs_old
        WHERE wcs_old.client_id = $1
          AND EXISTS (
            SELECT 1 FROM core_personal.worker_compliance_status wcs_new
            WHERE wcs_new.client_id = $2
              AND wcs_new.empresa_id = wcs_old.empresa_id
              AND wcs_new.worker_id = wcs_old.worker_id
              AND COALESCE(wcs_new.client_site_id::text, '') = COALESCE(wcs_old.client_site_id::text, '')
          )
      `, [inC.id, actC.id]);
      const updWCS = await client.query(`
        UPDATE core_personal.worker_compliance_status
        SET client_id = $1
        WHERE client_id = $2
      `, [actC.id, inC.id]);
      if (updWCS.rowCount > 0) console.log(`  - Migrated ${updWCS.rowCount} worker_compliance_status to ${actC.codigo}`);

      // 5. Migrate core_comercial.pedidos (which also updates view core_operacoes.pedidos)
      const updComP = await client.query(`
        UPDATE core_comercial.pedidos
        SET client_id = $1
        WHERE client_id = $2
      `, [actC.id, inC.id]);
      if (updComP.rowCount > 0) console.log(`  - Migrated ${updComP.rowCount} core_comercial.pedidos to ${actC.codigo}`);

      // 7. Migrate core_comercial.estimaciones & leads
      const updEst = await client.query(`
        UPDATE core_comercial.estimaciones
        SET client_id = $1
        WHERE client_id = $2
      `, [actC.id, inC.id]);
      if (updEst.rowCount > 0) console.log(`  - Migrated ${updEst.rowCount} core_comercial.estimaciones to ${actC.codigo}`);

      const updLeads = await client.query(`
        UPDATE core_comercial.leads
        SET client_id = $1
        WHERE client_id = $2
      `, [actC.id, inC.id]);
      if (updLeads.rowCount > 0) console.log(`  - Migrated ${updLeads.rowCount} core_comercial.leads to ${actC.codigo}`);

      // 8. Migrate core_operacoes.solicitudes_operativas & solicitud_targets
      const updSol = await client.query(`
        UPDATE core_operacoes.solicitudes_operativas
        SET client_id = $1
        WHERE client_id = $2
      `, [actC.id, inC.id]);
      if (updSol.rowCount > 0) console.log(`  - Migrated ${updSol.rowCount} solicitudes_operativas to ${actC.codigo}`);

      const updSolT = await client.query(`
        UPDATE core_operacoes.solicitud_targets
        SET source_client_id = $1
        WHERE source_client_id = $2
      `, [actC.id, inC.id]);
      if (updSolT.rowCount > 0) console.log(`  - Migrated ${updSolT.rowCount} solicitud_targets to ${actC.codigo}`);

      // 9. Migrate core_common.client_tariffs, client_worker_tariffs, client_contacts
      const updCT = await client.query(`
        UPDATE core_common.client_tariffs
        SET client_id = $1
        WHERE client_id = $2
      `, [actC.id, inC.id]);
      if (updCT.rowCount > 0) console.log(`  - Migrated ${updCT.rowCount} client_tariffs to ${actC.codigo}`);

      const updCWT = await client.query(`
        UPDATE core_common.client_worker_tariffs
        SET client_id = $1
        WHERE client_id = $2
      `, [actC.id, inC.id]);
      if (updCWT.rowCount > 0) console.log(`  - Migrated ${updCWT.rowCount} client_worker_tariffs to ${actC.codigo}`);

      const updCC = await client.query(`
        UPDATE core_common.client_contacts
        SET client_id = $1
        WHERE client_id = $2
      `, [actC.id, inC.id]);
      if (updCC.rowCount > 0) console.log(`  - Migrated ${updCC.rowCount} client_contacts to ${actC.codigo}`);

      // 10. Migrate core_finance.horas_trabalhadas & public.generated_documents
      const updHT = await client.query(`
        UPDATE core_finance.horas_trabalhadas
        SET client_id = $1
        WHERE client_id = $2
      `, [actC.id, inC.id]);
      if (updHT.rowCount > 0) console.log(`  - Migrated ${updHT.rowCount} horas_trabalhadas to ${actC.codigo}`);

      const updGD = await client.query(`
        UPDATE public.generated_documents
        SET client_id = $1
        WHERE client_id = $2
      `, [actC.id, inC.id]);
      if (updGD.rowCount > 0) console.log(`  - Migrated ${updGD.rowCount} generated_documents to ${actC.codigo}`);

      // 11. Migrate core_personal.workers (cod_cliente and cliente)
      const updW1 = await client.query(`
        UPDATE core_personal.workers
        SET cod_cliente = $1
        WHERE cod_cliente = $2
      `, [actC.codigo, inC.codigo]);
      if (updW1.rowCount > 0) console.log(`  - Updated cod_cliente on ${updW1.rowCount} workers to ${actC.codigo}`);

      const updW2 = await client.query(`
        UPDATE core_personal.workers
        SET cliente = $1, cod_cliente = COALESCE(cod_cliente, $2)
        WHERE UPPER(TRIM(cliente)) = UPPER(TRIM($3))
      `, [actC.trade_name, actC.codigo, inC.trade_name]);
      if (updW2.rowCount > 0) console.log(`  - Updated cliente name on ${updW2.rowCount} workers from "${inC.trade_name}" to "${actC.trade_name}"`);

      // 12. Migrate core_personal.worker_hours (cliente_nombre)
      const updWH = await client.query(`
        UPDATE core_personal.worker_hours
        SET cliente_nombre = $1
        WHERE UPPER(TRIM(cliente_nombre)) = UPPER(TRIM($2))
      `, [actC.trade_name, inC.trade_name]);
      if (updWH.rowCount > 0) console.log(`  - Updated cliente_nombre on ${updWH.rowCount} worker_hours from "${inC.trade_name}" to "${actC.trade_name}"`);

      // 13. Migrate public.colaborador_por_pedido (codcliente and cliente_nombre)
      const updCPP1 = await client.query(`
        UPDATE public.colaborador_por_pedido
        SET codcliente = $1, cliente_nombre = $2
        WHERE codcliente = $3 OR UPPER(TRIM(cliente_nombre)) = UPPER(TRIM($4))
      `, [actC.codigo, actC.trade_name, inC.codigo, inC.trade_name]);
      if (updCPP1.rowCount > 0) console.log(`  - Updated ${updCPP1.rowCount} colaborador_por_pedido records to ${actC.codigo} ("${actC.trade_name}")`);

      // 14. Migrate public.cobranca_simulacoes, pedidos, reemplazos, reubicaciones
      for (const [tbl, col] of [
        ['cobranca_simulacoes', 'cod_cliente'],
        ['pedidos', 'cod_cliente'],
        ['reemplazos', 'codcliente'],
        ['colaboradores_reemplazados', 'cod_cliente'],
        ['reubicaciones', 'cod_cliente'],
        ['colaboradores_reubicados', 'cod_cliente']
      ]) {
        const u = await client.query(`UPDATE public."${tbl}" SET "${col}" = $1 WHERE "${col}" = $2`, [actC.codigo, inC.codigo]);
        if (u.rowCount > 0) console.log(`  - Updated ${u.rowCount} public.${tbl} records to ${actC.codigo}`);
      }
    }

    // Also fix METALLIC SOLUTIONS in colaborador_por_pedido / worker_hours to match C0136 ("ESTRUCTURES, MUNTATGES I SOLDADURES JS SLU - METALLIC SOLUTIONS")
    const c0136 = await client.query(`SELECT id, codigo, trade_name FROM core_common.clients WHERE codigo = 'C0136'`);
    if (c0136.rows.length > 0) {
      const targetName = c0136.rows[0].trade_name;
      const uMet = await client.query(`
        UPDATE public.colaborador_por_pedido
        SET codcliente = 'C0136', cliente_nombre = $1
        WHERE UPPER(TRIM(cliente_nombre)) = 'METALLIC SOLUTIONS'
      `, [targetName]);
      if (uMet.rowCount > 0) console.log(`\nAligned ${uMet.rowCount} colaborador_por_pedido records for METALLIC SOLUTIONS -> C0136`);
    }

    await client.query('COMMIT');
    console.log("\n>>> COMPLETE WORKER, ALLOCATION, PEDIDO & BILLING CONSOLIDATION COMMITTED! <<<");
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Error, rolled back:", e);
  } finally {
    await client.end();
  }
}

run();
