import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

// The app's exact query
const query = createClient(supabaseUrl, supabaseKey).schema('core_personal').from('workers');

async function check() {
    const passportInput = "GH281425";
    const nomeInput = "WILLIAM MORAIS DA SILVA";

    const { data, error } = await query
        .select('id, empresa_id, cod_colab, nome, pasaporte, status_trabajador, cliente_nombre')
        .ilike('pasaporte', `${passportInput.trim()}%`);

    console.log("Error:", error);
    console.log("Data length:", data?.length);
    if (data && data.length > 0) {
        console.log("First match:", data[0]);
    }
}
check();
