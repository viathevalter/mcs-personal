const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envLines = envContent.split('\n');
const env = {};
for (const line of envLines) {
    const [key, ...vals] = line.split('=');
    if (key && vals.length > 0) {
        env[key.trim()] = vals.join('=').trim().replace(/['"]/g, '');
    }
}

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const pedidoId = '6c005d03-72db-4f22-a3d8-b0693b7626b1';
    
    console.log("Running query for pedido details...");
    const { data: items, error } = await supabase
        .schema('core_comercial')
        .from('pedido_items')
        .select(`
          *,
          job_function:job_functions(name)
        `)
        .eq('pedido_id', pedidoId);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Success! Items returned:", JSON.stringify(items, null, 2));
    }
}

run();
