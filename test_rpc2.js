import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
    const selectedEmpresaId = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d';
    const periodYear = 2026;
    const periodMonth = 3;

    try {
        console.log("1. RPC get_hours_control_workers");
        const { data: workers, error: errorRpc } = await supabase.schema('core_personal').rpc('get_hours_control_workers', {
            p_empresa_id: selectedEmpresaId,
            p_period_year: periodYear,
            p_period_month: periodMonth,
            p_contratante: null,
            p_cliente_nombre: null
        });

        if (errorRpc) {
           console.log("ERRO RPC:", errorRpc);
           return;
        }

        console.log(`Sucesso RPC. Workers size: ${workers?.length}`);
        
        const workerIds = workers?.map(w => w.id) || [];
        console.log(`2. Tabela worker_hours com .in(${workerIds.length} IDs)`);

        if (workerIds.length > 0) {
             const { data: hours, error: hoursError } = await supabase
                .schema('core_personal')
                .from('worker_hours')
                .select('worker_id, status')
                .eq('empresa_id', selectedEmpresaId)
                .eq('period_year', periodYear)
                .eq('period_month', periodMonth)
                .in('worker_id', workerIds);

            if (hoursError) {
                console.log("ERRO GET HOURS:", hoursError);
            } else {
                console.log("Sucesso Hours. Size:", hours?.length);
            }
        }
    } catch(err) {
        console.log("CATCH FATAL:", err);
    }
}
main();
