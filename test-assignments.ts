import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
    // Log in as Valter
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'valter@gestaologinpro.com',
        password: 'stkrt@2026'
    });
    if (authErr) {
        console.error("Auth Error:", authErr.message);
        return;
    }
    console.log("Logged in successfully.");

    console.log("\nTesting search_workers for Shelby (E1733):");
    const { data: workers, error: workersErr } = await supabase
        .schema('core_personal')
        .rpc('search_workers', {
            p_empresa_id: 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d',
            p_search: 'SHELBY'
        });
    
    if (workersErr) {
        console.error("search_workers error:", workersErr);
    } else {
        console.log("Shelby record from search_workers:", workers);
    }

    console.log("\nTesting search_workers for Pedro (E0486):");
    const { data: workers2, error: workersErr2 } = await supabase
        .schema('core_personal')
        .rpc('search_workers', {
            p_empresa_id: 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d',
            p_search: 'PEDRO SARMIENTO'
        });
    
    if (workersErr2) {
        console.error("search_workers error:", workersErr2);
    } else {
        console.log("Pedro record from search_workers:", workers2);
    }
}

testQuery();
