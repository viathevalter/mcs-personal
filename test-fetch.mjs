import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

console.log("Using DB:", supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkServerside() {
    let output = "BENEFITS AND WORKERS\n==================\n";

    const { data: allBenefits, error: bErr } = await supabase
        .schema('core_personal')
        .from('worker_benefit_housing')
        .select('*');

    if (bErr) {
        output += `Error benefits: ${JSON.stringify(bErr)}\n`;
    } else {
        output += `Total Benefits: ${allBenefits?.length}\n`;
        for (const b of allBenefits || []) {
            const { data: w } = await supabase.schema('core_personal').from('workers').select('id, nome, status_trabajador').eq('id', b.worker_id).single();
            output += `Worker_ID: ${b.worker_id} -> Name: ${w ? w.nome : 'NOT FOUND'} (Status: ${w ? w.status_trabajador : 'N/A'})\n`;
        }
    }

    fs.writeFileSync('full_log.txt', output);
}

checkServerside();
