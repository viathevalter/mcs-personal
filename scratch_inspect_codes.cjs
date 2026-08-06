const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://pyahcgorkvwfwmlzspnv.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWhjZ29ya3Z3ZndtbHpzcG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNDY3NTYsImV4cCI6MjA4NTYyMjc1Nn0.JM0y0qI83_i2T5UcC7GkTA2gwEY-h9n3MVIn2sH_xBc'
);

async function test() {
    const { data: allWorkers } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, cod_colab, nome');

    console.log("Total workers fetched:", allWorkers?.length || 0);

    const testTargets = ['E2199', 'E2193', 'E0462', 'E0449', 'E1454', 'E1726'];

    for (const t of testTargets) {
        const exact = allWorkers.find(w => w.cod_colab === t);
        const trimmed = allWorkers.find(w => w.cod_colab && w.cod_colab.trim() === t);
        const upper = allWorkers.find(w => w.cod_colab && w.cod_colab.trim().toUpperCase() === t);
        const digits = allWorkers.find(w => w.cod_colab && w.cod_colab.replace(/\D/g, '') === t.replace(/\D/g, ''));

        console.log(`Searching '${t}':`, {
            exact: exact ? `${exact.cod_colab} (${exact.nome})` : 'NOT FOUND',
            trimmed: trimmed ? `${trimmed.cod_colab} (${trimmed.nome})` : 'NOT FOUND',
            upper: upper ? `${upper.cod_colab} (${upper.nome})` : 'NOT FOUND',
            digits: digits ? `${digits.cod_colab} (${digits.nome})` : 'NOT FOUND'
        });
    }
}

test();
