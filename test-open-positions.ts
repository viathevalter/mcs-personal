import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
    const { data: items, error } = await supabase
        .schema('core_comercial')
        .from('pedido_items')
        .select(`
          id,
          pedido_id,
          job_function_id,
          job_function_name_snapshot,
          quantity_requested,
          quantity_fulfilled,
          status,
          pedidos!inner (
            codigo,
            client_id,
            client_site_id
          )
        `)
        .neq('status', 'fulfilled')
        .neq('status', 'cancelled');
        
    console.log("Error:", JSON.stringify(error, null, 2));
    console.log("Data count:", items?.length);
    console.log("Data sample:", JSON.stringify(items?.[0], null, 2));
}

testQuery();
