import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

async function main() {
    const envFile = fs.readFileSync('.env.local', 'utf-8');
    const lines = envFile.split('\n');
    const supabaseUrl = lines.find(line => line.startsWith('VITE_SUPABASE_URL'))?.split('=')[1]?.trim();
    const supabaseKey = lines.find(line => line.startsWith('VITE_SUPABASE_ANON_KEY'))?.split('=')[1]?.trim();
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    console.log("Fetching ALL workers without search str to test limit...");
    const { data: allRpc, error: allRpcError } = await supabase.schema('core_personal').rpc('search_workers', {
        p_empresa_id: 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d', // Assuming this is Mastercorp or similar
        p_search: null,
        p_status_trabajador_filter: ['ativos', 'inativos', 'pendientes_ingreso'],
        p_page: 1,
        p_page_size: 100000
    });

    if (allRpcError) {
        console.error("Error from RPC:", allRpcError);
    } else {
        console.log("RPC returned length:", allRpc?.length);
        if (allRpc && allRpc.length > 0) {
            console.log("Total Count reported by first row:", allRpc[0].total_count);
        }
        const william = allRpc?.find((w: any) => w.nome?.toUpperCase().includes('WILLIAM MORAIS'));
        console.log("Is William in the full list?", !!william);
    }
}

main();
