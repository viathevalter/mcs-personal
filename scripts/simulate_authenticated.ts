import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
const env: Record<string, string> = {};
for (const line of envLines) {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) {
        env[key.trim()] = vals.join('=').trim().replace(/['"]/g, '');
    }
}

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function runSim() {
    console.log("Attempting to login to get an authenticated session...");

    // We don't have the user's password, but we can check if the anon key alone is the issue
    // The anon key role is 'anon', not 'authenticated'. 
    // IF the RLS policy says "TO authenticated", then anonymous queries will fail with 42501.
    // However, the frontend should be logged in and sending a Bearer token with role 'authenticated'.

    console.log("Testing with pure Service Role to confirm data exists...");
    const serviceKey = env['SUPABASE_SERVICE_ROLE_KEY'];
    if (!serviceKey) {
        console.log("No service key found to verify.");
        return;
    }

    const adminSupabase = createClient(supabaseUrl!, serviceKey);

    const { data: adminData, error: adminErr } = await adminSupabase
        .schema('core_personal')
        .from('worker_beneficios_settings')
        .select('*')
        .limit(1);

    console.log("Service Role Query Error:", adminErr);
    console.log("Service Role Data:", adminData);
}

runSim();
