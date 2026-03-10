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
    console.log("Procurando por E0615 (Exact)...");
    const { data: w1, error: e1 } = await supabase.schema('core_personal').from('workers').select('id, cod_colab, nome').eq('cod_colab', 'E0615');
    console.log("Resultado exato E0615:", w1, e1?.message || '');

    console.log("Procurando por %0615% (Like)...");
    const { data: w2, error: e2 } = await supabase.schema('core_personal').from('workers').select('id, cod_colab, nome').ilike('cod_colab', '%0615%');
    console.log("Resultado Like 0615:", w2, e2?.message || '');

    console.log("Procurando por E1416 (Exact)...");
    const { data: w3, error: e3 } = await supabase.schema('core_personal').from('workers').select('id, cod_colab, nome').eq('cod_colab', 'E1416');
    console.log("Resultado exato E1416:", w3, e3?.message || '');

    const { count } = await supabase.schema('core_personal').from('workers').select('*', { count: 'exact', head: true });
    console.log("Total workers in core_personal.workers:", count);
}
main();
