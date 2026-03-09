import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://pyahcgorkvwfwmlzspnv.supabase.co',
    'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx'
);

import fs from 'fs';

async function checkSevero() {
    console.log("Checking SEVERO PABON CASTRO...");

    // 1. Get the worker
    const { data: workers, error: wError } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('*')
        .ilike('nome', '%SEVERO PABON CASTRO%');

    if (wError) {
        console.error("Error fetching worker:", wError);
        return;
    }

    console.log("Found Workers:", workers?.length);
    if (!workers || workers.length === 0) return;

    for (const worker of workers) {
        console.log("-------------------");
        console.log("Worker ID:", worker.id);
        console.log("Worker Empresa ID:", worker.empresa_id);
        console.log("Status Trabalhador:", worker.status_trabajador);
        console.log("Status Seguridad:", worker.status_seguridad);

        // 2. Get the housing benefit
        const { data: housing, error: hError } = await supabase
            .schema('core_personal')
            .from('worker_benefit_housing')
            .select('*')
            .eq('worker_id', worker.id);

        if (hError) console.error("Error fetching housing:", hError);
        else console.log("Housing benefits found:", housing?.length ? housing : "None in worker_benefit_housing");

        // Test saving the benefit to see the error
        console.log("Attempting to upsert benefit...");
        const payload = {
            empresa_id: worker.empresa_id,
            worker_id: worker.id,
            monthly_amount: 300,
            start_date: '2026-02-01',
            end_date: '2026-02-28',
            proration_method: 'daily_30'
        };
        const { data: upsertData, error: uError } = await supabase
            .schema('core_personal')
            .from('worker_benefit_housing')
            .upsert(payload)
            .select('*')
            .single();

        if (uError) {
            fs.writeFileSync('error_log.json', JSON.stringify(uError, null, 2));
            console.log("Wrote error to error_log.json");
        } else {
            console.log("UPSERT SUCCESS:", upsertData);
        }

        // 3. Test RPC search_workers output
        const { data: rpcOutput, error: rpcError } = await supabase
            .schema('core_personal')
            .rpc('search_workers', {
                p_empresa_id: worker.empresa_id,
                p_search: 'SEVERO',
                p_page: 1,
                p_page_size: 10
            });

        if (rpcError) console.error("Error RPC:", rpcError);
        else console.log("search_workers output length for SEVERO:", rpcOutput?.length, "Found:", rpcOutput?.[0]?.nome, "with id:", rpcOutput?.[0]?.id);
    }
}

checkSevero();
