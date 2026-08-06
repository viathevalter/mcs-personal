const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://pyahcgorkvwfwmlzspnv.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWhjZ29ya3Z3ZndtbHpzcG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNDY3NTYsImV4cCI6MjA4NTYyMjc1Nn0.JM0y0qI83_i2T5UcC7GkTA2gwEY-h9n3MVIn2sH_xBc'
);

async function test() {
    const { data: mcsUsers, error: err1 } = await supabase.from('mcs_users').select('*');
    console.log("mcs_users count:", mcsUsers?.length || 0, err1?.message || '');
    if (mcsUsers && mcsUsers.length > 0) {
        console.log("Sample mcs_users:", mcsUsers.map(u => ({ id: u.id, email: u.email, name: u.display_name || u.nome || u.name, phone: u.phone || u.telefone })));
    }

    const { data: workers, error: err2 } = await supabase.schema('core_personal').from('workers').select('id, nome, cod_colab, email, telefone').limit(10);
    console.log("workers sample count:", workers?.length || 0, err2?.message || '');
    if (workers && workers.length > 0) {
        console.log("Sample workers:", workers.map(w => ({ id: w.id, nome: w.nome, email: w.email, phone: w.telefone })));
    }
}

test();
