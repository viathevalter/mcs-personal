const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Read VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env.local
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

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const selectedEmpresaId = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'; // Login Pro ID as a test
    
    console.log("Testing with double quotes in not.in...");
    const { data: data1, error: error1 } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, status_trabajador')
        .eq('empresa_id', selectedEmpresaId)
        .or('status_trabajador.is.null,status_trabajador.not.in.("Ativo","Activo","ATIVO","ACTIVO")')
        .limit(5);

    if (error1) {
        console.error("Query 1 Error:", error1);
    } else {
        console.log("Query 1 Data size:", data1.length);
    }

    console.log("\nTesting without double quotes in not.in...");
    const { data: data2, error: error2 } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, status_trabajador')
        .eq('empresa_id', selectedEmpresaId)
        .or('status_trabajador.is.null,status_trabajador.not.in.(Ativo,Activo,ATIVO,ACTIVO)')
        .limit(5);

    if (error2) {
        console.error("Query 2 Error:", error2);
    } else {
        console.log("Query 2 Data size:", data2.length);
    }
}

run();
