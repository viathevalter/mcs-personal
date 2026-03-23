import { supabase } from './src/shared/supabase/client.ts';

async function listWorkers() {
    console.log("Fetching workers...");
    const { data: workers, error: searchError } = await supabase
        .from('workers')
        .select('id, nome, cpf')
        .limit(10);
        
    if (searchError || !workers) {
        console.error("Error fetching workers:", searchError);
        return;
    }
    
    console.log("First 10 workers in DB:");
    for (const w of workers) {
        console.log(`- ID: ${w.id} | NOME: "${w.nome}"`);
    }
}

listWorkers();
