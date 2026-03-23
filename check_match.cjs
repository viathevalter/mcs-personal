require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(url, key, {auth:{persistSession:false}});

async function run() {
    const pairs = JSON.parse(fs.readFileSync('ibans_to_import.json', 'utf8'));
    let matched = 0;
    
    for (const p of pairs) {
        const { data } = await supabase
            .schema('core_personal')
            .from('workers')
            .select('id, nome')
            .ilike('nome', `%${p.name.replace(/'/g, "''").trim()}%`);
            
        if (data && data.length > 0) {
            matched++;
            // console.log(`Matched: ${p.name} -> ${data[0].nome}`);
        } else {
            console.log(`Not Matched: ${p.name}`);
        }
    }
    console.log(`Total Matched: ${matched} / ${pairs.length}`);
}
run();
