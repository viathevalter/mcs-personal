const { createClient } = require('@supabase/supabase-js');

const prodUrl = 'https://unbepkdzvsfvylnysrcq.supabase.co';
const prodAnonKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

async function testRpc() {
  const supabase = createClient(prodUrl, prodAnonKey);

  console.log("Testing supabase.rpc('fn_get_campaigns_stats')...");
  const { data, error } = await supabase.rpc('fn_get_campaigns_stats');
  console.log("Result data:", data);
  console.log("Result error:", error);

  console.log("\nTesting with schema specified or public...");
}

testRpc();
