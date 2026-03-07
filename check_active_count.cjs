const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { count, error } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('*', { count: 'exact', head: true })
        .ilike('status_trabajador', 'activ%'); // matches Activo, activo, Activos, etc.

    if (error) console.error(error);
    console.log('Active workers in DB:', count);

    const { count: total, error: err2 } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('*', { count: 'exact', head: true });
    console.log('Total workers in DB:', total);

    // let's check exact match case
    const { count: c3 } = await supabase.schema('core_personal').from('workers').select('*', { count: 'exact', head: true }).eq('status_trabajador', 'Activo');
    console.log('Exact Activo count:', c3);
}

check();
