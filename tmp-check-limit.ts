import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const env = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
let url = '';
let key = '';
for (const line of env.split('\n')) {
    if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/['"]/g, '');
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
}

const supabase = createClient(url, key);

async function main() {
    console.log("Fetching workers with limit(10000)...");
    const { data: workers, error } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, cod_colab, nome')
        .limit(10000);

    console.log("Total received:", workers?.length);
    console.log("Error:", error);
}
main();
