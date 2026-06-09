import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
    const { data, error } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, nif, dni, email, movil, status_trabajador, empresa_id')
        .limit(10);
        
    console.log("Error:", JSON.stringify(error, null, 2));
    console.log("Data sample:", JSON.stringify(data, null, 2));
}

testQuery();
