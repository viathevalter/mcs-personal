import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Inicialize com as chaves de PROD que estão no backend (ou passe hardcoded aqui para rodar dps deletar)
// Eu vou usar anon / service role mas pra este script rápido, posso usar o token de admin de Deno.env ou local
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { db: { schema: 'core_personal' } });

async function run() {
  const data = JSON.parse(fs.readFileSync('./dados_sharepoint/mapped_updates.json', 'utf8'));
  
  let successes = 0;
  let errors = 0;
  
  for (const row of data) {
    if (!row.cod_colab) continue;
    
    // Convert epoch to string
    let nasc = row.fecha_nacimiento;
    if (typeof nasc === 'number') {
      const d = new Date(nasc);
      const str = d.toLocaleDateString('es-ES', { timeZone: 'UTC' }); // it defaults to D/M/YYYY
      nasc = str;
    }
    
    const updatePayload = {};
    if (row.camiseta) updatePayload.camiseta = row.camiseta;
    if (row.pantalones) updatePayload.pantalones = row.pantalones;
    if (nasc) updatePayload.fecha_nacimiento = nasc;
    
    if (Object.keys(updatePayload).length > 0) {
      const { error } = await supabase
        .from('workers')
        .update(updatePayload)
        .eq('cod_colab', row.cod_colab);
        
      if (error) {
        console.log(`Failed to update ${row.cod_colab}:`, error.message);
        errors++;
      } else {
        successes++;
      }
    }
  }
  
  console.log(`Finalizados: ${successes} atualizados, ${errors} erros.`);
}

run();
