require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(url, key, {
    auth: {
        persistSession: false
    }
});

async function run() {
    console.log('Reading import_ibans.sql...');
    const sqlContent = fs.readFileSync('import_ibans.sql', 'utf8');
    
    console.log(`Executing SQL Import... (Length: ${sqlContent.length})`);
    
    // As in run_sync.cjs, using the fn_sys_execute_sql RPC
    const { error } = await supabase.rpc('fn_sys_execute_sql', { q: sqlContent });
    
    if (error) {
        console.error(`Error executing import:`, error);
        process.exit(1);
    } else {
        console.log(`IBANs import applied successfully!`);
    }
}

run();
