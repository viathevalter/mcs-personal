const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWhjZ29ya3Z3ZndtbHpzcG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNDY3NTYsImV4cCI6MjA4NTYyMjc1Nn0.JM0y0qI83_i2T5UcC7GkTA2gwEY-h9n3MVIn2sH_xBc";
const supabaseUrl = "https://pyahcgorkvwfwmlzspnv.supabase.co";

async function run() {
  const names = [
    'RAFAEL CALDERON CAVIEDES',
    'ROBINSON DE FEX DIAZ'
  ];

  for (const name of names) {
    console.log(`\n=== Info for ${name} ===`);
    const url = `${supabaseUrl}/rest/v1/workers?select=id,nome,cod_colab&nome=ilike.*${encodeURIComponent(name)}*`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Accept-Profile': 'core_personal'
        }
      });
      
      const workers = await response.json();
      for (const w of workers) {
        console.log('Worker:', w);
        // Query allocations
        const aUrl = `${supabaseUrl}/rest/v1/colaborador_por_pedido?select=contratante,cliente_nombre&cod_colab=eq.${w.cod_colab}`;
        const aRes = await fetch(aUrl, {
          headers: {
            'apikey': anonKey,
            'Authorization': `Bearer ${anonKey}`
          }
        });
        console.log('Allocations:', await aRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  }
}

run();
