const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
const devConnectionString = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres';

function normalizeSectorName(raw) {
  if (!raw || typeof raw !== 'string') return 'Industrial Geral';
  const str = raw.toLowerCase().trim();

  if (str.includes('naval') || str.includes('astillero') || str.includes('armador')) {
    return 'Construção & Reparação Naval';
  }
  if (str.includes('calderer') || str.includes('tuberia') || str.includes('presión') || str.includes('paradas de planta')) {
    return 'Calderería & Tubería Industrial';
  }
  if (str.includes('estructura') || str.includes('metalúrg') || str.includes('mecaniz') || str.includes('montaje') || str.includes('talleres')) {
    return 'Estructuras Metálicas & Montajes';
  }
  if (str.includes('químic') || str.includes('petroquímic')) {
    return 'Industria Química & Petroquímica';
  }
  if (str.includes('ingenier') || str.includes('epc') || str.includes('subcontratac')) {
    return 'Ingeniería & Contratistas EPC';
  }
  if (str.includes('construcc')) {
    return 'Construcción & Obras';
  }

  return 'Industrial Geral';
}

async function cleanSectorsInDb(connStr, envName) {
  const client = new Client({ connectionString: connStr });
  await client.connect();

  try {
    console.log(`\n=== INSPECIONANDO SETORES EM [${envName}] ===`);
    const resSectors = await client.query(`
      SELECT sector, COUNT(*) as cnt 
      FROM core_comercial.leads 
      GROUP BY sector 
      ORDER BY cnt DESC;
    `);
    console.table(resSectors.rows);

    const allLeads = await client.query(`SELECT id, sector FROM core_comercial.leads;`);
    let updatedCount = 0;

    for (const lead of allLeads.rows) {
      const cleanSector = normalizeSectorName(lead.sector);
      if (cleanSector !== lead.sector) {
        await client.query(`
          UPDATE core_comercial.leads 
          SET sector = $1, updated_at = NOW() 
          WHERE id = $2;
        `, [cleanSector, lead.id]);
        updatedCount++;
      }
    }

    console.log(`✅ [${envName}] Atualizados ${updatedCount} leads para setores padronizados!`);

    const resClean = await client.query(`
      SELECT sector, COUNT(*) as cnt 
      FROM core_comercial.leads 
      GROUP BY sector 
      ORDER BY cnt DESC;
    `);
    console.table(resClean.rows);

    await client.query("NOTIFY pgrst, 'reload schema';");
  } catch (err) {
    console.error(`Erro em [${envName}]:`, err);
  } finally {
    await client.end();
  }
}

async function run() {
  await cleanSectorsInDb(devConnectionString, 'DEV');
  await cleanSectorsInDb(prodConnectionString, 'PROD');
}

run();
