require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkWilliamMorais() {
    console.log('Fetching worker William Morais...');
    const { data: workers, error: wError } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, status_trabajador, status_seguridad')
        .ilike('nome', '%WILLIAM MORAIS%');

    if (wError) {
        console.error('Error fetching worker:', wError);
        return;
    }

    console.log('Worker found:', workers);

    if (!workers || workers.length === 0) return;

    const workerId = workers[0].id;

    console.log(`\nFetching seguridade_status entries for worker_id ${workerId}...`);
    const { data: segStatus, error: sError } = await supabase
        .schema('core_personal')
        .from('seguridade_status')
        .select('*')
        .eq('worker_id', workerId)
        .order('data_solicitacao', { ascending: false });

    if (sError) {
        console.error('Error fetching seguridade_status:', sError);
        return;
    }

    console.log('Seguridade Status Entries:', segStatus);
}

checkWilliamMorais();
