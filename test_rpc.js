import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    { db: { schema: 'public' } }
);

async function run() {
    // 1. Fetch FREDERICK AU BLANQUICETT
    const { data: worker, error: wError } = await supabase
        .from('colaboradores')
        .select('id, cod_colab, nombre, contratante')
        .ilike('nombre', '%FREDERICK AU%')
        .limit(1);

    if (wError) {
        console.error('Error fetching worker:', wError);
        return;
    }
    console.log('Worker:', worker);

    if (worker && worker.length > 0) {
        // 2. Test RPC
        const { data: rpcData, error: rpcError } = await supabase
            .rpc('fn_get_active_client_for_worker_json', { p_cod_colab: worker[0].cod_colab });

        console.log('RPC Result:', rpcData);
        console.log('RPC Error:', rpcError);
        
        // 3. Let's see all assignments for this worker in colaborador_por_pedido
        const { data: assignments, error: aError } = await supabase
            .from('colaborador_por_pedido')
            .select('id, cliente_nombre, contratante, fechainiciopedido, fechasalidatrabajador')
            .eq('cod_colab', worker[0].cod_colab);
            
        console.log('Assignments:', assignments);
    }
}

run();
