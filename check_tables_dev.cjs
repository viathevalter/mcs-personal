const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

const run = async () => {
    const devClient = new Client({ connectionString: devConnectionString });
    try {
        await devClient.connect();
        
        const tables = [
            'core_common.empresas',
            'public.clientes'
        ];
        
        for (const table of tables) {
            const res = await devClient.query(`SELECT COUNT(*) FROM ${table}`);
            console.log(`${table}: ${res.rows[0].count} rows`);
        }
        
        // Let's also search for 'functions', 'cargos', 'categories' to see what else exists
        const resTables = await devClient.query(`
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_schema IN ('public', 'core_common', 'core_personal')
              AND table_type = 'BASE TABLE'
            ORDER BY table_schema, table_name;
        `);
        console.log('\nAll tables:');
        for (const row of resTables.rows) {
            console.log(`- ${row.table_schema}.${row.table_name}`);
        }
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await devClient.end();
    }
};

run();
