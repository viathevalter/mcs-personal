const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function inspectUsersAndCreators() {
  console.log('=== CHECKING PROFILES / AUTH USERS ===');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*');

  console.log('Profiles:', profiles);

  console.log('\n=== CHECKING OPEN_POSITIONS CREATED_BY ===');
  const { data: positions } = await supabase
    .schema('core_personal')
    .from('open_positions')
    .select('id, created_by, updated_by, created_at')
    .limit(10);

  console.log('Open positions sample:', positions);

  console.log('\n=== CHECKING WORKER_ASSIGNMENTS CREATED_BY ===');
  const { data: assignments } = await supabase
    .schema('core_personal')
    .from('worker_assignments')
    .select('id, created_by, created_at')
    .limit(10);

  console.log('Worker assignments sample:', assignments);

  console.log('\n=== CHECKING WORKERS CREATED_BY / NOTES / COMMENTS ===');
  const { data: workers } = await supabase
    .schema('core_personal')
    .from('workers')
    .select('id, cod_colab, nome, contractor, notes, created_at')
    .limit(10);

  console.log('Workers sample:', workers);
}

inspectUsersAndCreators();
