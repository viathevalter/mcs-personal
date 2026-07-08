const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
let supabaseUrl = '';
let supabaseAnonKey = '';

for (const line of envContent.split('\n')) {
  if (line.startsWith('VITE_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim().replace(/['"]/g, '');
  }
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) {
    supabaseAnonKey = line.split('=')[1].trim().replace(/['"]/g, '');
  }
}

async function run() {
  const { Client } = require('pg');
  const pgClient = new Client({ connectionString: 'postgresql://postgres.pyahcgorkvwfwmlzspnv:Stkrt%40Dev2026@aws-1-eu-central-1.pooler.supabase.com:5432/postgres' });
  await pgClient.connect();

  // Find a client ID with a settings row having a payment term
  const checkRes = await pgClient.query(`
    SELECT client_id, empresa_id, payment_term_id 
    FROM core_common.client_company_settings 
    WHERE payment_term_id IS NOT NULL 
    LIMIT 1
  `);
  await pgClient.end();

  if (checkRes.rows.length === 0) {
    console.log("No client settings found with a non-null payment term in database.");
    return;
  }

  const target = checkRes.rows[0];
  console.log(`Found target in database -> client_id: ${target.client_id}, empresa_id: ${target.empresa_id}, payment_term_id: ${target.payment_term_id}`);

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log("\nTesting exact clients select join query on target client...");
  const { data, error } = await supabase
    .schema('core_common')
    .from('clients')
    .select(`
      id,
      trade_name,
      client_company_settings (
        empresa_id,
        payment_term_id,
        status,
        credit_limit,
        payment_term:payment_term_id ( id, name, days )
      )
    `)
    .eq('id', target.client_id);

  if (error) {
    console.error("Supabase query FAILED:", error);
  } else {
    console.log("Supabase query SUCCESS!");
    console.log("Result:", JSON.stringify(data, null, 2));
  }
}

run();
