import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSchemaBuilder() {
    const query = supabase.schema('core_personal').from('workers');
    const { data, error } = await query
        .select('id')
        .limit(1);

    if (error) {
        console.error("Schema builder error:", error.message);
    } else {
        console.log("Schema builder SUCCESS, data:", data);
    }
}

testSchemaBuilder();
