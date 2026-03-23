import { supabase } from './src/shared/supabase/client.ts';
import fs from 'fs';

async function importIbans() {
    console.log("Starting import...");
    const jsonStr = fs.readFileSync('ibans_to_import.json', 'utf-8');
    const pairs = JSON.parse(jsonStr);
    
    let inserted = 0;
    
    for (const p of pairs) {
        // 1. Find worker by name
        const { data: workers, error: searchError } = await supabase
            .schema('core_personal')
            .from('workers')
            .select('id, nome')
            .ilike('nome', `%${p.name.trim()}%`);
            
        if (searchError || !workers || workers.length === 0) {
            console.log(`Could not find worker: ${p.name}`);
            continue;
        }
        
        const workerId = workers[0].id;
        
        // 2. Check if IBAN already exists
        const { data: existing } = await supabase
            .schema('core_personal')
            .from('worker_ibans')
            .select('id')
            .eq('worker_id', workerId)
            .eq('iban', p.iban);
            
        if (existing && existing.length > 0) {
            console.log(`IBAN already exists for: ${p.name}`);
            continue;
        }
        
        // 3. Insert
        const { error: insertError } = await supabase
            .schema('core_personal')
            .from('worker_ibans')
            .insert({
                worker_id: workerId,
                banco: p.banco,
                iban: p.iban,
                status: 'ATIVO',
                observacoes: 'Importado via Planilha de Controle'
            });
            
        if (insertError) {
            console.error(`Error inserting for ${p.name}:`, insertError);
        } else {
            inserted++;
            console.log(`Successfully added IBAN for ${p.name}`);
        }
    }
    
    console.log(`Import finished. Successfully inserted: ${inserted} IBANs.`);
}

importIbans();
