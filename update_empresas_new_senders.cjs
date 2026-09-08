const { Client } = require('pg');

const prodConn = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:6543/postgres';
const devConn = 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';

async function updateSenders() {
  const clientProd = new Client({ connectionString: prodConn });
  const clientDev = new Client({ connectionString: devConn });

  await clientProd.connect();
  await clientDev.connect();

  console.log("================================================================================");
  console.log("🚀 ATUALIZANDO REMETENTES DAS EMPRESAS TRIÂNGULO E WISEOWE NO SUPABASE (PROD & DEV)");
  console.log("================================================================================");

  // 1. Atualizar no PROD
  await clientProd.query(`
    UPDATE core_common.empresas 
    SET marketing_sender_email = 'comercial2@es.triangulolda.com',
        proposal_sender_email = 'comercial2@es.triangulolda.com'
    WHERE trade_name ILIKE '%TRIANGULO%' OR nome ILIKE '%Triangulo%';

    UPDATE core_common.empresas 
    SET marketing_sender_email = 'comercial3@fr.wiseowe.com',
        proposal_sender_email = 'comercial3@fr.wiseowe.com'
    WHERE trade_name ILIKE '%WISEOWE%' OR nome ILIKE '%WISEOWE%';
  `);

  // 2. Atualizar no DEV
  await clientDev.query(`
    UPDATE core_common.empresas 
    SET marketing_sender_email = 'comercial2@es.triangulolda.com',
        proposal_sender_email = 'comercial2@es.triangulolda.com'
    WHERE trade_name ILIKE '%TRIANGULO%' OR nome ILIKE '%Triangulo%';

    UPDATE core_common.empresas 
    SET marketing_sender_email = 'comercial3@fr.wiseowe.com',
        proposal_sender_email = 'comercial3@fr.wiseowe.com'
    WHERE trade_name ILIKE '%WISEOWE%' OR nome ILIKE '%WISEOWE%';
  `);

  console.log("✅ Remetentes atualizados com sucesso!");

  // Conferir
  const resProd = await clientProd.query("SELECT id, nome, trade_name, marketing_sender_email, proposal_sender_email FROM core_common.empresas WHERE trade_name IN ('TRIANGULO', 'WISEOWE', 'LUMINOUS');");
  console.log("\n📋 Empresas Atualizadas em PROD:");
  console.table(resProd.rows);

  await clientProd.end();
  await clientDev.end();
}

updateSenders().catch(console.error);
