const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function parseDate(dateStr) {
  if (!dateStr) return null;
  const cleanStr = dateStr.trim();
  if (!cleanStr) return null;
  const parts = cleanStr.split(/[\/\-]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  const parsed = new Date(cleanStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

async function run() {
  console.log('Checking for July 2026 due dates...');
  const { data, error } = await supabase
    .from('contas_receber')
    .select('id, dt_venc, status');
  
  if (error) {
    console.error('Error:', error.message);
    return;
  }

  let julyCount = 0;
  data.forEach(r => {
    const d = parseDate(r.dt_venc);
    if (d && d.getFullYear() === 2026 && d.getMonth() === 6) { // July is month 6 (0-indexed)
      julyCount++;
    }
  });

  console.log('Total records in July 2026:', julyCount);
}

run();
