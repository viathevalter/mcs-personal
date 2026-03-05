import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking worker: ALIRIO ORTIZ MOLINA");

    // Check by name
    const { data: byName } = await supabase.schema('core_personal').from('workers')
        .select('nome, pasaporte')
        .ilike('nome', '%ALIRIO%');
    console.log("ALIRIO workers:");
    console.log(JSON.stringify(byName, null, 2));

    const { data: byPass } = await supabase.schema('core_personal').from('workers')
        .select('nome, pasaporte')
        .ilike('pasaporte', '%BE286208%');
    console.log("BE286208 workers:");
    console.log(JSON.stringify(byPass, null, 2));
}

check();
