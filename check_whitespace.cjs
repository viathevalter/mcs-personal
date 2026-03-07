const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking exact length of E0194 in DB:");
    const { data: b1, error: e1 } = await supabase.schema('core_personal').from('workers').select('cod_colab').ilike('cod_colab', '%E0194%').single();
    if (b1) {
        console.log(`cod_colab: "${b1.cod_colab}" (Length: ${b1.cod_colab.length})`);
    } else {
        console.log("E0194 not found via ilike.");
    }
}

check();
