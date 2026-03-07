const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    // E0001 is Active in Excel but inactive in DB. Let's see its raw record.
    const { data: before, error: err1 } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, cod_colab, status_trabajador, status_seguridad')
        .eq('cod_colab', 'E0001')
        .single();

    console.log('Record E0001 BEFORE:', before);

    // Try a direct minimal update simulating the SQL
    const { data: updated, error: err2 } = await supabase
        .schema('core_personal')
        .from('workers')
        .update({ status_trabajador: 'Activo', status_seguridad: 'Alta' })
        .eq('cod_colab', 'E0001')
        .select();

    if (err2) {
        console.error('Update failed:', err2);
    } else {
        console.log('Record E0001 UPDATE API RESULT:', updated);
    }

    const { data: after, error: err3 } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, cod_colab, status_trabajador, status_seguridad')
        .eq('cod_colab', 'E0001')
        .single();

    console.log('Record E0001 AFTER:', after);
}

check();
