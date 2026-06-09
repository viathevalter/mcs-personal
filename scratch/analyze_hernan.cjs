const { Client } = require('pg');
const fs = require('fs');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        
        console.log("Searching for Hernan Rodriguez in core_personal.workers...");
        const workerRes = await client.query(`
            SELECT id, nome, status_trabajador, status_seguridad, data_ingresso, data_baixa, data_alta_seguridad, data_baixa_seguridad, created_at
            FROM core_personal.workers
            WHERE nome ILIKE '%Hernan Rodriguez%'
        `);
        
        const workerRecords = workerRes.rows;
        
        if (workerRecords.length === 0) {
            fs.writeFileSync('scratch/hernan_data.json', JSON.stringify({ error: "No worker found" }, null, 2), 'utf8');
            return;
        }
        
        const workerIds = workerRecords.map(w => w.id);
        const workerIdsPlaceholder = workerIds.map((_, idx) => `$${idx + 1}`).join(',');
        
        const historyRes = await client.query(`
            SELECT 
                h.id, 
                h.worker_id, 
                h.change_type, 
                h.old_value, 
                h.new_value, 
                h.effective_date, 
                h.comments, 
                h.changed_by, 
                h.created_at,
                u.email as changed_by_email,
                u.raw_user_meta_data->>'full_name' as changed_by_name
            FROM core_personal.worker_status_history h
            LEFT JOIN auth.users u ON h.changed_by = u.id
            WHERE h.worker_id IN (${workerIdsPlaceholder})
            ORDER BY h.created_at DESC
        `, workerIds);
        
        const historyRecords = historyRes.rows;
        
        fs.writeFileSync('scratch/hernan_data.json', JSON.stringify({
            workers: workerRecords,
            history: historyRecords
        }, null, 2), 'utf8');
        
        console.log("Data saved to scratch/hernan_data.json successfully.");

    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
