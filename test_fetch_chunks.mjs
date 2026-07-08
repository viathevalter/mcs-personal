import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const urlMatch = envFile.match(/VITE_SUPABASE_URL="([^"]+)"/);
const keyMatch = envFile.match(/VITE_SUPABASE_ANON_KEY="([^"]+)"/);
const supabaseUrl = urlMatch ? urlMatch[1] : '';
const supabaseKey = keyMatch ? keyMatch[1] : '';

const supabase = createClient(supabaseUrl, supabaseKey);

// Define fetchInChunks helper
async function fetchInChunks(ids, chunkSize, fetchFn) {
  const results = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const chunkResults = await fetchFn(chunk);
    results.push(...chunkResults);
  }
  return results;
}

async function run() {
  try {
    // Fetch 25 client IDs from the database
    const { data: clients, error: err } = await supabase
      .schema('core_common')
      .from('clients')
      .select('id')
      .limit(25);

    if (err) throw err;
    const ids = clients.map(c => c.id);
    console.log(`Fetched ${ids.length} test client IDs.`);

    // Run fetchInChunks
    const sites = await fetchInChunks(ids, 10, async (chunk) => {
      console.log(`Querying chunk of size: ${chunk.length}`);
      const { data, error } = await supabase
        .schema('core_common')
        .from('client_sites')
        .select('id, name')
        .in('client_id', chunk);
      if (error) throw error;
      return data || [];
    });

    console.log(`Successfully fetched ${sites.length} client sites.`);

  } catch (e) {
    console.error("Test failed:", e);
  }
}

run();
