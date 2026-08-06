const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWhjZ29ya3Z3ZndtbHpzcG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNDY3NTYsImV4cCI6MjA4NTYyMjc1Nn0.JM0y0qI83_i2T5UcC7GkTA2gwEY-h9n3MVIn2sH_xBc";
const supabaseUrl = "https://pyahcgorkvwfwmlzspnv.supabase.co";

async function run() {
  const clientName = 'TALLERS VIDAL AMILL, SLU';
  
  const url = `${supabaseUrl}/rest/v1/vw_worker_allocations?select=cod_colab,cliente_nombre,fechasalidatrabajador&cliente_nombre=eq.${encodeURIComponent(clientName)}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Accept-Profile': 'core_personal'
      }
    });
    
    const data = await response.json();
    console.log('Allocations for client:', data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

run();
