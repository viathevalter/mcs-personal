import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking worker: ALIRIO ORTIZ MOLINA");

    // Check by name
    const { data: byName, error: err1 } = await supabase.schema('core_personal').from('workers')
        .select('id, nome, pasaporte, status_trabajador')
        .ilike('nome', '%ALIRIO ORTIZ MOLINA%');
    console.log("By Name:", JSON.stringify(byName, null, 2));
    if (err1) console.error("Error1:", err1);

    // Check by passport
    const { data: byPassport, error: err2 } = await supabase.schema('core_personal').from('workers')
        .select('id, nome, pasaporte, status_trabajador')
        .ilike('pasaporte', '%BE286208%');
    console.log("By Passport (ilike):", JSON.stringify(byPassport, null, 2));
    if (err2) console.error("Error2:", err2);

    // Let's also check if there are any other ALIRIOs just in case
    const { data: wildcard, error: err3 } = await supabase.schema('core_personal').from('workers')
        .select('id, nome, pasaporte, status_trabajador')
        .ilike('nome', '%ALIRIO%');
    console.log("Any Alirio:", JSON.stringify(wildcard, null, 2));
    if (err3) console.error("Error3:", err3);
}

check();
