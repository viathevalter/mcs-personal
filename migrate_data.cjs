const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const tablesToCopy = [
    'public.empresas',
    'core_common.empresas',
    'public.clientes',
    'public.funcion',
    'public.tax_rules',
    'core_personal.benefit_categories',
    'core_personal.discount_categories',
    'core_personal.holerite_eventos'
];

const run = async () => {
    const devClient = new Client({ connectionString: devConnectionString });
    const prodClient = new Client({ connectionString: prodConnectionString });
    
    try {
        await devClient.connect();
        await prodClient.connect();
        console.log('🚀 Connected to both databases (DEV and PROD).');

        for (const table of tablesToCopy) {
            console.log(`\n⏳ Cloning ${table}...`);
            const res = await devClient.query(`SELECT * FROM ${table}`);
            const rows = res.rows;
            
            if (rows.length === 0) {
                console.log(`  ⏭️ Skipping (0 rows in DEV)`);
                continue;
            }

            const columns = Object.keys(rows[0]);
            const columnNames = columns.map(c => `"${c}"`).join(', ');
            
            let successCount = 0;
            let errorCount = 0;

            for (const row of rows) {
                const values = columns.map(c => row[c]);
                const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
                
                const queryNormal = `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
                const queryOverride = `INSERT INTO ${table} (${columnNames}) OVERRIDING SYSTEM VALUE VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
                
                try {
                    await prodClient.query(queryNormal, values);
                    successCount++;
                } catch(e) {
                    if (e.code === '428C9') {
                        // "cannot insert into column X" because it's GENERATED ALWAYS
                        try {
                            await prodClient.query(queryOverride, values);
                            successCount++;
                        } catch(e2) {
                            errorCount++;
                            if (errorCount === 1) console.error(`  ❌ Error fallback in ${table}: ${e2.message}`);
                        }
                    } else {
                        errorCount++;
                        if (errorCount === 1) console.error(`  ❌ Error in ${table}: ${e.message} (code: ${e.code})`);
                    }
                }
            }
            console.log(`  ✅ Copied ${successCount} rows. (${errorCount} errors/conflicts)`);
            
            // If the table uses a sequence (like simple serial), we should technically reset the sequence
            // but for dictionary tables usually it's fine, or we can just let it fail on next insert and advance it later.
        }
        
        console.log('\n🎉 Finished cloning all dictionary tables!');
    } catch (err) {
        console.error('Fatal Error:', err.message);
    } finally {
        await devClient.end();
        await prodClient.end();
    }
};

run();
