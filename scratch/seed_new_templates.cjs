const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWhjZ29ya3Z3ZndtbHpzcG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjx2YWx1ZT4sImV4cCI6MjA4NTYyMjc1Nn0.JM0y0qI83_i2T5UcC7GkTA2gwEY-h9n3MVIn2sH_xBc'; // Clean anon key
const anonKeyCleaned = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWhjZ29ya3Z3ZndtbHpzcG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNDY3NTYsImV4cCI6MjA4NTYyMjc1Nn0.JM0y0qI83_i2T5UcC7GkTA2gwEY-h9n3MVIn2sH_xBc';

const supabase = createClient(supabaseUrl, anonKeyCleaned, {
  auth: {
    persistSession: false
  }
});

const localDir = 'C:\\Projetos IA\\Kotrik\\mcs-personal\\temp-operacoes\\Presupuestos';

const mappings = [
  { file: 'modelo_presupuesto_stocco_es.docx', comp: 'stocco' },
  { file: 'modelo_presupuesto_triangulo_es.docx', comp: 'triangulo' },
  { file: 'modelo_presupuesto_luminous_valley_es.docx', comp: 'luminous' },
  { file: 'modelo_presupuesto_wise_services_es.docx', comp: 'wiseowe' }
];

async function uploadFile(comp, localPath, storagePath) {
  console.log(`Uploading ${localPath} to ${storagePath}...`);
  const fileBuffer = fs.readFileSync(localPath);
  
  const { error } = await supabase.storage
    .from('proposal-templates')
    .upload(storagePath, fileBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true
    });
    
  if (error) {
    console.error(`  Error uploading ${storagePath}:`, error.message);
  } else {
    console.log(`  Successfully uploaded ${storagePath}`);
  }
}

async function run() {
  console.log("Logging in as valter@gestaologinpro.com...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'valter@gestaologinpro.com',
    password: 'vitor@2004'
  });

  if (authError) {
    throw new Error(`Auth failed: ${authError.message}`);
  }
  console.log("Authenticated successfully!");

  for (const map of mappings) {
    const localPath = path.join(localDir, map.file);
    if (!fs.existsSync(localPath)) {
      console.warn(`Local file not found: ${localPath}`);
      continue;
    }
    
    // Upload to es, pt and root
    await uploadFile(map.comp, localPath, `${map.comp}/es/proposta.docx`);
    await uploadFile(map.comp, localPath, `${map.comp}/pt/proposta.docx`);
    await uploadFile(map.comp, localPath, `${map.comp}/proposta.docx`);
  }
}

run().catch(err => console.error(err));
