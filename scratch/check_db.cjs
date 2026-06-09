const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

const run = async () => {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        
        console.log("=== CONTRACTS TABLE STATUS COLUMN ===");
        const res = await client.query(`
            SELECT column_name, data_type, udt_name 
            FROM information_schema.columns 
            WHERE table_schema = 'core_personal' AND table_name = 'contracts' AND column_name = 'status'
        `);
        console.log(res.rows);

        // Also check check constraints
        const constraints = await client.query(`
            SELECT conname, pg_get_constraintdef(oid) 
            FROM pg_constraint 
            WHERE conrelid = 'core_personal.contracts'::regclass
        `);
        console.log("Constraints:", constraints.rows);

    } catch(e) {
        console.error("Error executing query:", e);
    } finally {
        await client.end();
    }
}
run();
