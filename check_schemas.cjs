const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
// Need service_role key to query information_schema or perform admin tasks via REST,
// but we might not have it. Let's try with ANON_KEY calling a standard Postgres rpc if one exists,
// or check for core_* schemas.
const supabase = createClient(supabaseUrl, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || supabaseKey);

async function checkSchemas() {
  const schemas = ['public', 'core_financeiro', 'core_comercial', 'financeiro', 'cobros'];
  const tables = ['grupos', 'categoria_receita', 'centro_custo', 'categorias', 'obras'];

  for (const schema of schemas) {
    for (const table of tables) {
      const { data, error } = await supabase.schema(schema).from(table).select('*').limit(1);
      if (!error) {
        console.log(`FOUND: schema=${schema}, table=${table}`);
      }
    }
  }
}

checkSchemas();
