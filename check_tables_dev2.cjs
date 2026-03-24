const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

const run = async () => {
    const devClient = new Client({ connectionString: devConnectionString });
    try {
        await devClient.connect();
        
        const tables = [
            'public.empresas',
            'public.funcion',
            'core_personal.benefit_categories',
            'core_personal.discount_categories',
            'core_personal.holerite_eventos',
            'public.tax_rules'
        ];
        
        for (const table of tables) {
            try {
                const res = await devClient.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`${table}: ${res.rows[0].count} rows`);
            } catch(e) {
                console.log(`${table}: Error ${e.message}`);
            }
        }
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await devClient.end();
    }
};

run();
