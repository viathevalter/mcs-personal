import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

async function main() {
    const envFile = fs.readFileSync('.env.local', 'utf-8');
    const lines = envFile.split('\n');
    const supabaseUrl = lines.find(line => line.startsWith('VITE_SUPABASE_URL'))?.split('=')[1]?.trim();
    const supabaseKey = lines.find(line => line.startsWith('VITE_SUPABASE_ANON_KEY'))?.split('=')[1]?.trim();
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Search by Cod. Colab with RPC
    const { data: williamRpc } = await supabase.schema('core_personal').rpc('search_workers', {
        p_empresa_id: 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d',
        p_search: 'WILLIAM',
        p_status_trabajador_filter: ['ativos', 'inativos', 'pendientes_ingreso'],
        p_page: 1,
        p_page_size: 100
    });
    console.log("William RPC with 'ativos':", williamRpc);
    
    const { data: williamRpcActivo } = await supabase.schema('core_personal').rpc('search_workers', {
        p_empresa_id: 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d',
        p_search: 'WILLIAM',
        p_status_trabajador_filter: ['Activo', 'Inactivo', 'Pendiente de Ingreso'],
        p_page: 1,
        p_page_size: 100
    });
    console.log("William RPC with 'Activo':", williamRpcActivo);
}

main();
