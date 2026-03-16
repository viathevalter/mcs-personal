import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function run() {
    const { data: cols, error } = await supabase
        .from('colaboradores')
        .select('*')
        .limit(2);

    if (error) {
        console.error('Error fetching colaboradores:', error);
    } else {
        console.log('--- DB Connection Successful ---');
        console.log(`Connected to: ${process.env.VITE_SUPABASE_URL}`);
        console.log('Sample colaboradores from DB (1st row):');
        console.log(cols[0]);
    }
}

run();
