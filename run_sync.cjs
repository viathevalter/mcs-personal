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
    console.log('Reading sync_workers.sql...');
    const sqlContent = fs.readFileSync('sync_workers.sql', 'utf8');
    
    // Split by exact sequence using foolproof split
    const chunks = sqlContent.split(/COMMIT;/i);
    console.log(`Found ${chunks.length} chunks to execute.`);

    for (let i = 0; i < chunks.length; i++) {
        let chunk = chunks[i].trim();
        // Remove BEGIN and COMMIT as PL/pgSQL EXECUTE cannot handle explicit transaction control
        chunk = chunk.replace(/^BEGIN;/i, '').trim();
        chunk = chunk.replace(/COMMIT;$/i, '').trim();
        
        if (!chunk) continue;

        console.log(`Executing chunk ${i + 1}/${chunks.length}... (Length: ${chunk.length})`);
        
        const { error } = await supabase.rpc('fn_sys_execute_sql', { q: chunk });
        
        if (error) {
            console.error(`Error executing chunk ${i+1}:`, error);
            process.exit(1);
        } else {
            console.log(`Chunk ${i + 1} succeeded.`);
        }
    }
    
    console.log('All updates applied successfully!');
}

run();
