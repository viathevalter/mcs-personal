require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkCols() {
    const { data: workers, error: wError } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('*')
        .limit(1);

    if (wError) {
        console.error('Error fetching workers:', wError);
        return;
    }

    console.log(Object.keys(workers[0]));
}

checkCols();
