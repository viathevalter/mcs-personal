require('dotenv').config({ path: '.env.vercel.production' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function uploadLogo() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const s = createClient(supabaseUrl, supabaseKey);

  const svgPath = 'C:\\Projetos IA\\Luminous\\luminous-alley-premium\\public\\assets\\logo\\luminous-logo.svg';
  const svgContent = fs.readFileSync(svgPath);

  const { data, error } = await s.storage
    .from('company-logos')
    .upload('public/luminous-logo-official.svg', svgContent, {
      contentType: 'image/svg+xml',
      upsert: true
    });

  console.log('Upload resultado:', data, error);

  const { data: urlData } = s.storage.from('company-logos').getPublicUrl('public/luminous-logo-official.svg');
  console.log('URL Pública Oficial da Nova Logomarca:', urlData.publicUrl);
}

uploadLogo();
