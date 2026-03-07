const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .schema('core_personal')
        .from('seguridade_status')
        .select('status')
        .limit(100);

    if (error) {
        console.error('Error fetching:', error);
        return;
    }

    const uniqueStatuses = [...new Set(data.map(d => d.status))];
    console.log('Existing status values in DB:', uniqueStatuses);

    // also check if any are null
    const nulls = data.filter(d => d.status === null);
    console.log('Nulls found:', nulls.length);
}

check();
