require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkState() {
    console.log("Checking fn_get_active_client_for_worker for William ('E0091')...");

    const { data: w, error: we } = await supabase.schema('core_personal').rpc('search_workers', {
        p_empresa_id: "dbbd4a3a-1ed4-4c8d-8a8b-118fa3fc31b8",
        p_search: "WILLIAM MORAIS"
    });

    if (we) console.error("Error search_workers:", we);
    else console.log("search_workers result for William:", JSON.stringify(w, null, 2));

    console.log("\nChecking seguridade_status for William...");
    const { data: q1, error: e1 } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id')
        .eq('cod_colab', 'E0091')
        .limit(1);

    if (q1 && q1.length > 0) {
        const { data: s, error: se } = await supabase
            .schema('core_personal')
            .from('seguridade_status')
            .select('*')
            .eq('worker_id', q1[0].id);

        if (se) console.error("Error seguridade_status:", se);
        else console.log(`seguridade_status entries for William (${q1[0].id}):`, s);
    }
}

checkState();
