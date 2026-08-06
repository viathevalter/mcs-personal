const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWhjZ29ya3Z3ZndtbHpzcG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNDY3NTYsImV4cCI6MjA4NTYyMjc1Nn0.JM0y0qI83_i2T5UcC7GkTA2gwEY-h9n3MVIn2sH_xBc";
const supabaseUrl = "https://pyahcgorkvwfwmlzspnv.supabase.co";

async function run() {
  const codColab = 'E1816';
  const url = `${supabaseUrl}/rest/v1/colaborador_por_pedido?select=*&cod_colab=eq.${codColab}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    
    const data = await response.json();
    console.log('colaborador_por_pedido rows:', data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
