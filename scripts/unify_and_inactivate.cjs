const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

// Duplicates mapping: [inactive_code, active_code, reason]
const consolidations = [
  { inactive: 'C0009', active: 'C0679', name: 'ALUMINIO YACHT COSTS SL', tax: 'B75724161' },
  { inactive: 'C0082', active: 'C0214', name: 'AUTOMATISMES ELECTRICS GRANOLLERS, S.L.', tax: 'B64670995' },
  { inactive: 'C0260', active: 'C0710', name: 'Calderería La Noguera', tax: 'B25321597' },
  { inactive: 'C0210', active: 'C0209', name: 'TUBAL INSTALACIONES, SL', phone: '945265252' },
  { inactive: 'C0019', active: 'C0020', name: 'AZERO METALISTRY', tax: 'B65898405' },
  { inactive: 'C0268', active: 'C0253', name: 'UCALSA INDUSTRIAL VIGO S.L.', phone: '986238865' },
  { inactive: 'C0687', active: 'C0074', name: 'EMYPRO S.A', tax: 'A08716961' },
  { inactive: 'C0678', active: 'C0225', name: 'CARVISA CONTAINER S.L.U', tax: 'B50930528' },
  { inactive: 'C0720', active: 'C0225', name: 'CARVISA CONTAINER S.L.U', tax: 'B50930528' },
  { inactive: 'C0590', active: 'C0591', name: 'ANSA MONTAJES METALICOS', tax: 'B66163148' },
  { inactive: 'C0699', active: 'C0685', name: 'ETUDES ET FABRICATION DE PYLONES', tax: 'FR41821774148' },
  { inactive: 'C0705', active: 'C0686', name: 'EUROFESA', tax: 'A78360955' },
  { inactive: 'C0704', active: 'C0690', name: 'INCONAL', tax: 'A26106799' },
  { inactive: 'C0716', active: 'C0715', name: 'Inserpyme Global Sa', tax: 'A27742931' },
  { inactive: 'C0718', active: 'C0717', name: 'Metalica Dumar Sl', tax: 'B91150433' },
  { inactive: 'C0682', active: null, name: 'NÃO DEFINIDO', tax: null },
  { inactive: 'C0683', active: null, name: 'NÃO DEFINIDO', tax: null },
  { inactive: 'C0693', active: null, name: 'NÃO DEFINIDO', tax: null },
];

async function run() {
  const client = new Client({ connectionString: prodConnectionString });
  await client.connect();
  console.log("Connected to PROD DB");

  try {
    await client.query('BEGIN');

    for (const c of consolidations) {
      console.log(`\nProcessing: Inactive ${c.inactive} -> Active ${c.active || '(None)'}`);

      // 1. Get inactive client info
      const inRes = await client.query('SELECT id, codigo, trade_name, legal_name FROM core_common.clients WHERE codigo = $1', [c.inactive]);
      if (inRes.rows.length === 0) {
        console.log(`  Inactive client ${c.inactive} not found, skipping.`);
        continue;
      }
      const inClient = inRes.rows[0];

      let actClient = null;
      if (c.active) {
        const actRes = await client.query('SELECT id, codigo, trade_name, legal_name FROM core_common.clients WHERE codigo = $1', [c.active]);
        if (actRes.rows.length > 0) {
          actClient = actRes.rows[0];
        }
      }

      // 2. Set inactive in client_company_settings
      const updSettings = await client.query(`
        UPDATE core_common.client_company_settings
        SET status = 'inactive'
        WHERE client_id = $1
      `, [inClient.id]);
      console.log(`  Updated client_company_settings to 'inactive' for ${inClient.codigo} (${updSettings.rowCount} rows)`);

      // 3. If there is an active client, migrate faturas, contas_receber, client_sites
      if (actClient) {
        // A. Migrate faturas if any
        const updFaturas = await client.query(`
          UPDATE core_finance.faturas
          SET client_id = $1
          WHERE client_id = $2
        `, [actClient.id, inClient.id]);
        if (updFaturas.rowCount > 0) {
          console.log(`  Migrated ${updFaturas.rowCount} faturas from ${inClient.codigo} to ${actClient.codigo}`);
        }

        // B. Migrate contas_receber
        const updCR = await client.query(`
          UPDATE public.contas_receber
          SET cod_cliente = $1
          WHERE cod_cliente = $2
        `, [actClient.codigo, inClient.codigo]);
        if (updCR.rowCount > 0) {
          console.log(`  Migrated ${updCR.rowCount} contas_receber records from ${inClient.codigo} to ${actClient.codigo}`);
        }

        // C. Migrate client_sites
        const updSites = await client.query(`
          UPDATE core_common.client_sites
          SET client_id = $1
          WHERE client_id = $2
        `, [actClient.id, inClient.id]);
        if (updSites.rowCount > 0) {
          console.log(`  Migrated ${updSites.rowCount} client_sites from ${inClient.codigo} to ${actClient.codigo}`);
        }

        // D. Update notes
        const auditNote = `[Unificado em ${new Date().toISOString().split('T')[0]}] Histórico consolidado no código ativo ${actClient.codigo} (${actClient.trade_name}).`;
        await client.query(`
          UPDATE core_common.clients
          SET notes = COALESCE(notes || E'\\n', '') || $1
          WHERE id = $2
        `, [auditNote, inClient.id]);
      }
    }

    await client.query('COMMIT');
    console.log("\n>>> ALL CONSOLIDATIONS AND INACTIVATIONS COMMITTED SUCCESSFULLY! <<<");

  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Migration failed, rolled back:", e);
  } finally {
    await client.end();
  }
}

run();
