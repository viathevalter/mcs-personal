const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5YWhjZ29ya3Z3ZndtbHpzcG52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNDY3NTYsImV4cCI6MjA4NTYyMjc1Nn0.JM0y0qI83_i2T5UcC7GkTA2gwEY-h9n3MVIn2sH_xBc';

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

const companies = ['stocco', 'triangulo', 'luminous', 'wiseowe'];

async function copyTemplate(comp) {
  const sourcePath = `${comp}/es/proposta.docx`;
  const destPaths = [
    `${comp}/proposta.docx`,
    `${comp}/pt/proposta.docx`
  ];
  
  console.log(`Downloading source template for ${comp}: ${sourcePath}`);
  const { data, error } = await supabase.storage
    .from('proposal-templates')
    .download(sourcePath);
    
  if (error) {
    console.warn(`Source template not found or error for ${comp}:`, error.message);
    return;
  }
  
  for (const dest of destPaths) {
    console.log(`Uploading to: ${dest}`);
    const { error: uploadErr } = await supabase.storage
      .from('proposal-templates')
      .upload(dest, data, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      });
      
    if (uploadErr) {
      console.error(`Error uploading to ${dest}:`, uploadErr.message);
    } else {
      console.log(`Successfully copied to ${dest}`);
    }
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

  for (const comp of companies) {
    await copyTemplate(comp);
  }
}

run().catch(err => console.error(err));
