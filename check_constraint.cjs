require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(url, key, {auth:{persistSession:false}});

async function checkConstraint() {
    const query = `
        SELECT pg_get_constraintdef(c.oid) AS def
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE c.conname = 'worker_ibans_status_check';
    `;
    const { data, error } = await supabase.rpc('fn_sys_execute_sql', { q: query });
    console.log(error ? error : data);
}

checkConstraint();
