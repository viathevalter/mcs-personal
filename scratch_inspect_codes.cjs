const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://pyahcgorkvwfwmlzspnv.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWhjZ29ya3Z3ZndtbHpzcG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNDY3NTYsImV4cCI6MjA4NTYyMjc1Nn0.JM0y0qI83_i2T5UcC7GkTA2gwEY-h9n3MVIn2sH_xBc'
);

async function test() {
    const { data: allWorkers, error } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, cod_colab, nome, cliente, contratante');

    console.log("Total workers in core_personal.workers:", allWorkers?.length || 0, error?.message || '');

    const targetCodes = ['E2199', 'E2193', 'E0462', 'E0449', 'E1454', 'E1726'];
    const found = allWorkers?.filter(w => targetCodes.includes(w.cod_colab));
    console.log("Found target codes in direct query:", found);
}

test();
