import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase
        .schema('core_common')
        .from('user_memberships')
        .upsert({
            user_id: 'e696f8c7-4348-4e1b-aff2-6d2c4b7f8e81',
            empresa_id: 'e696f8c7-4348-4e1b-aff2-6d2c4b7f8e81',
            role: 'user',
            is_active: true
        }, {
            onConflict: 'user_id, empresa_id'
        });

    console.log('Error:', error);
}

check();
