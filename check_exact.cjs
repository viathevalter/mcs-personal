const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking E1492, the collaber user checked in UI:");
    const { data: b1, error: e1 } = await supabase.schema('core_personal').from('workers').select('cod_colab, status_trabajador, status_seguridad').eq('cod_colab', 'E1492').single();
    console.log('E1492:', b1);

    console.log("\nChecking total count of Activo workers:");
    const { data: c1, error: c1err } = await supabase.schema('core_personal').from('workers').select('cod_colab', { count: 'exact' }).eq('status_trabajador', 'Activo');
    console.log('Total Activo (case sensitive):', c1 ? c1.length : 0);

    const { data: c2, error: c2err } = await supabase.schema('core_personal').from('workers').select('cod_colab', { count: 'exact' }).ilike('status_trabajador', 'Activo');
    console.log('Total Activo (case insensitive):', c2 ? c2.length : 0);
}

check();
