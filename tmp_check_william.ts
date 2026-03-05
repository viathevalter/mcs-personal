import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: 'core_personal' } });

async function check() {
    console.log("Checking worker: WILLIAM");

    // Check by name
    const { data: byName } = await supabase.from('workers')
        .select('nome, pasaporte')
        .ilike('nome', '%WILLIAM%');
    console.log("WILLIAM workers:");
    console.log(JSON.stringify(byName, null, 2));

    const { data: byPass } = await supabase.from('workers')
        .select('nome, pasaporte')
        .ilike('pasaporte', '%GH281425%');
    console.log("GH281425 workers:");
    console.log(JSON.stringify(byPass, null, 2));

    const { data: byNameLast } = await supabase.from('workers')
        .select('nome, pasaporte')
        .ilike('nome', '%MORAIS DA SILVA%');
    console.log("MORAIS DA SILVA workers:");
    console.log(JSON.stringify(byNameLast, null, 2));
}

check();
