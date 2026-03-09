import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://pyahcgorkvwfwmlzspnv.supabase.co',
    'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx'
);

async function describeTable() {
    console.log("Fetching worker structure...");
    // A trick to get columns if swagger is not easily readable is just fetching 1 row
    const { data, error } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Supabase Error:", error);
    } else {
        console.log("Columns:", Object.keys(data?.[0] || {}));
    }
}

describeTable();
