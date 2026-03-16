const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function run() {
    console.log('Zeroing March (2026-03)...');
    const deleteSql = `
        DELETE FROM core_personal.worker_hours
        WHERE period_year = 2026 AND period_month = 3;
    `;
    const res1 = await supabase.rpc('fn_sys_execute_sql', { q: deleteSql });
    if (res1.error) console.error('Error deleting March:', res1.error);
    else console.log('March zeroed successfully.');

    console.log('Setting February (2026-02) as enviado for existing records...');
    const updateSql = `
        UPDATE core_personal.worker_hours
        SET status = 'enviado', updated_at = now()
        WHERE period_year = 2026 AND period_month = 2;
    `;
    const res2 = await supabase.rpc('fn_sys_execute_sql', { q: updateSql });
    if (res2.error) console.error('Error updating February:', res2.error);
    else console.log('February existing records updated.');

    console.log('Inserting missing February (2026-02) records as enviado for Active workers...');
    const insertSql = `
        INSERT INTO core_personal.worker_hours (
            worker_id, 
            empresa_id, 
            period_year, 
            period_month, 
            status,
            created_at,
            updated_at
        )
        SELECT 
            w.id,
            w.empresa_id,
            2026,
            2,
            'enviado',
            now(),
            now()
        FROM core_personal.workers w
        WHERE w.status_trabajador IN ('Ativo', 'Activo')
          AND NOT EXISTS (
              SELECT 1 FROM core_personal.worker_hours h
              WHERE h.worker_id = w.id
                AND h.period_year = 2026 
                AND h.period_month = 2
          );
    `;
    const res3 = await supabase.rpc('fn_sys_execute_sql', { q: insertSql });
    if (res3.error) console.error('Error inserting February:', res3.error);
    else console.log('Missing February records inserted successfully.');

    console.log('Done.');
}
run();
