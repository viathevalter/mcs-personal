import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
    // Simulando a mesma chamada do useClientHoursSummary
    const { data, error } = await supabase.schema('core_personal').rpc('get_hours_control_workers', {
        p_empresa_id: 'e6963e6e-213c-4b68-8092-d9bedfca03bb', // Luminous UUID hardcoded ou um null/invalido só pra trigger error
        p_period_year: 2026,
        p_period_month: 3,
        p_contratante: null,
        p_cliente_nombre: null
    });

    console.log("Error details:", JSON.stringify(error, null, 2));
    if (!error) {
       console.log("Row count:", data?.length);
    }
}
main();
