const { createClient } = require('@supabase/supabase-js');

const url = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const anonKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

const supabase = createClient(url, anonKey);

async function run() {
    const pedidoId = '6c005d03-72db-4f22-a3d8-b0693b7626b1';
    
    console.log("Fetching pedido_items in DEV...");
    const { data: items, error: itemsError } = await supabase
        .schema('core_comercial')
        .from('pedido_items')
        .select(`
          *,
          job_function:job_functions(name)
        `)
        .eq('pedido_id', pedidoId);

    if (itemsError) {
        console.error("QUERY ERROR:", itemsError);
    } else {
        console.log("QUERY SUCCESS! Items count:", items ? items.length : 0);
        console.log("Items details:");
        console.log(JSON.stringify(items, null, 2));
    }
}
run();
