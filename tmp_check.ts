import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking workers...");
    const { data, error } = await supabase.schema('core_personal').from('workers')
        .select('*')
        .ilike('nome', '%FREDIS ANTONIO MORELOS COLON%');
    console.log("By Name:", JSON.stringify(data, null, 2));
    if (error) console.error("Error1:", error);

    const { data: data2, error: error2 } = await supabase.schema('core_personal').from('workers')
        .select('*')
        .ilike('pasaporte', '%BE962974%');
    console.log("By Passport (ilike):", JSON.stringify(data2, null, 2));
    if (error2) console.error("Error2:", error2);
}

check();
