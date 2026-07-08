const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkJobFunctions() {
  const { data, error } = await supabase
    .schema('core_comercial')
    .from('job_functions')
    .select('*');
    
  if (error) {
    console.error(error);
  } else {
    console.log("Job functions inside core_comercial.job_functions:", data);
  }
}

checkJobFunctions();
