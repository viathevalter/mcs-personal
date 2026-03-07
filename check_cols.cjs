require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkCols() {
    const { data: w } = await supabase.schema('core_personal').from('seguridade_status').select('*').limit(1);
    console.log("Keys:", Object.keys(w[0]));
}
checkCols();
