const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function check() {
    const { data, error } = await supabase.rpc('fn_sys_execute_sql', { 
        q: "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'search_workers';"
    });
    if (error) console.error(error);
    else console.log(data[0].pg_get_functiondef);
}
check();
