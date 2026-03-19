import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
    const { data, error } = await supabase.schema('core_personal').rpc('get_real_seguridade_status', {
        p_empresa_id: 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'
    });

    console.log("Error details:", JSON.stringify(error, null, 2));
    if (!error) {
       console.log("Type of data:", typeof data);
       console.log("Data length:", data?.length);
    }
}
main();
