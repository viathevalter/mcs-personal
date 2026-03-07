const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Testing specific failing statement from Part 1:");
    const { data: b1, error: e1 } = await supabase.rpc('execute_sql_test', { query: "UPDATE core_personal.workers SET status_trabajador = 'Inactivo', status_seguridad = 'Anulado' WHERE cod_colab = 'E1923'" });
    console.log("RPC Error?", e1);

    const { data: b2, error: e2 } = await supabase.from('workers').update({ status_trabajador: 'Inactivo', status_seguridad: 'Anulado' }).eq('cod_colab', 'E1923');
    console.log("API Update error?", e2);
}

check();
