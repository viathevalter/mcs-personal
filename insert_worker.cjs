const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'valter@gestaologinpro.com',
        password: 'stkrt@2026'
    });
    if (authErr) {
        console.error("Auth Error:", authErr.message);
        return;
    }
    
    console.log("Logged in.");

    // Find empresa WISEOWE
    const { data: empresas, error: errEmp } = await supabase
        .schema('core_personal')
        .from('empresas')
        .select('id, nome')
        .ilike('nome', '%WISEOWE%');
    console.log("Empresas:", empresas);
    
    // Find cliente AEB DRYTECH SRL
    const { data: clientes, error: errCli } = await supabase
        .schema('core_personal')
        .from('clientes')
        .select('id, nome')
        .ilike('nome', '%AEB DRYTECH%');
    console.log("Clientes:", clientes);

    if (empresas && empresas.length > 0 && clientes && clientes.length > 0) {
        const empresa_id = empresas[0].id;
        const cliente_id = clientes[0].id;
        
        const newWorker = {
            nome: "VICTOR ALEJANDRO EULOGIO",
            cod_colab: "E2158",
            empresa_id: empresa_id,
            cliente_id: cliente_id,
            status_trabajador: "Ativo",
        };
        
        console.log("Inserting:", newWorker);
        
        const { data: inserted, error: insertErr } = await supabase
            .schema('core_personal')
            .from('workers')
            .insert(newWorker)
            .select();
            
        if (insertErr) {
            console.error("Insert error:", JSON.stringify(insertErr, null, 2));
        } else {
            console.log("Success! Inserted Worker:", inserted);
        }
    } else {
        console.error("Could not find Empresa or Cliente ID.");
    }
}

run();
