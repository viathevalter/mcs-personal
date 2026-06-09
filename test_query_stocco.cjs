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
    const selectedEmpresaId = '441f1f5d-aed3-40e3-8c77-7b1217757251'; // Stocco ID
    
    console.log("Running query with Stocco ID...");
    const { data, error } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, status_trabajador')
        .eq('empresa_id', selectedEmpresaId)
        .or('status_trabajador.is.null,status_trabajador.not.in.("Ativo","Activo","ATIVO","ACTIVO")');

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Success! Returned workers count:", data.length);
        console.log("Workers sample:", data.slice(0, 5));
    }
}

run();
