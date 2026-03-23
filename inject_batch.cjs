require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(url, key, {
    auth: { persistSession: false }
});

async function run() {
    console.log('Reading ibans_batch.json...');
    const payload = JSON.parse(fs.readFileSync('ibans_batch.json', 'utf8'));
    
    console.log(`Payload loaded with ${payload.length} records. Sending to database RPC...`);
    
    const { error, data } = await supabase.rpc('fn_import_ibans_batch', { payload });
    
    if (error) {
        console.error(`Error executing bulk import:`, error);
        process.exit(1);
    } else {
        console.log(`IBANs bulk import applied successfully! No errors returned from RPC.`);
    }
}

run();
