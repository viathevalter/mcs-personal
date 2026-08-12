const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xndmwyfuhqwvefkslrcx.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuZG13eWZ1aHF3dmVma3NscmN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzODU0NDAsImV4cCI6MjA1NTk2MTQ0MH0.z0E3fBvKxZ0Q6tY9sN8_L_6f6YJk_X2E1W2V3U4T5S6';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('Testing query for INSTALACIONES Y SISTEMAS HIDRAULICOS S.L. in July 2026...');

    // 1. Get client by name
    const { data: clients } = await supabase
        .schema('core_common')
        .from('clients')
        .select('*');

    console.log('Found clients:', clients?.map(c => ({ id: c.id, name: c.name, code: c.code })));

    const client = clients?.find(c => c.name?.toLowerCase().includes('instalaciones y sistemas hidraulicos'));
    console.log('Matched client:', client);

    // 2. Query workers with cliente_nombre ilike '%INSTALACIONES%'
    const { data: workers } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, funcion, cliente_nombre, status_trabajador, data_baixa')
        .ilike('cliente_nombre', '%INSTALACIONES Y SISTEMAS HIDRAULICOS%');

    console.log('Found workers count on workers table:', workers?.length);

    // 3. Query worker_hours for period 2026-07
    const { data: workerHours } = await supabase
        .schema('core_personal')
        .from('worker_hours')
        .select('*')
        .eq('period_year', 2026)
        .eq('period_month', 7);

    console.log('Found worker_hours count in 2026-07:', workerHours?.length);

    // 4. Query faturas in core_finance for client
    if (client) {
        const { data: faturas } = await supabase
            .schema('core_finance')
            .from('faturas')
            .select('*')
            .eq('client_id', client.id);
        console.log('Found faturas for client:', faturas);
    }
}

run().catch(console.error);
