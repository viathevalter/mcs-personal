const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://pyahcgorkvwfwmlzspnv.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWhjZ29ya3Z3ZndtbHpzcG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNDY3NTYsImV4cCI6MjA4NTYyMjc1Nn0.JM0y0qI83_i2T5UcC7GkTA2gwEY-h9n3MVIn2sH_xBc'
);

async function test() {
    const { data: empresas } = await supabase.from('empresas').select('*');
    console.log("All empresas:", empresas);

    const { data: workerCodes } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, cod_colab, nome, empresa_id, contratante')
        .in('cod_colab', ['E2199', 'E2193', 'E0462', 'E0449', 'E1454', 'E1726']);

    console.log("Target workers empresa_id:", workerCodes);
}

test();
