const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://pyahcgorkvwfwmlzspnv.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWhjZ29ya3Z3ZndtbHpzcG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNDY3NTYsImV4cCI6MjA4NTYyMjc1Nn0.JM0y0qI83_i2T5UcC7GkTA2gwEY-h9n3MVIn2sH_xBc'
);

async function test() {
    const { data: workers } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, cod_colab, nome, data_ingresso, data_alta_seguridad, created_at, cliente, contratante')
        .not('data_ingresso', 'is', null)
        .limit(10);

    console.log("Workers with data_ingresso:", workers);

    const { data: recentWorkers } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, cod_colab, nome, data_ingresso, data_alta_seguridad, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

    console.log("Recent workers by created_at:", recentWorkers);
}

test();
