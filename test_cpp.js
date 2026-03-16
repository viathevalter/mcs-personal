import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function main() {
    const { data, error } = await supabase
        .from('colaborador_por_pedido')
        .select('*')
        .limit(1);

    if (error) console.error(error);
    else console.log(Object.keys(data[0]));
}
main();
