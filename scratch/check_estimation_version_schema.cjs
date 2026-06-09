const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        const tables = [
            { schema: 'core_comercial', name: 'estimacion_versions' },
            { schema: 'core_comercial', name: 'estimacion_items' }
        ];

        for (const t of tables) {
            console.log(`\n--- Schema of ${t.schema}.${t.name} ---`);
            const res = await client.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = $1 AND table_name = $2
                ORDER BY ordinal_position;
            `, [t.schema, t.name]);
            console.log(res.rows.map(r => `${r.column_name} (${r.data_type}) - Nullable: ${r.is_nullable}, Default: ${r.column_default}`).join('\n'));
        }
        
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
