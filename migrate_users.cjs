const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const tablesToCopy = [
    'auth.users',
    'auth.identities',
    'public.mcs_users',
    'public.mcs_departments',
    'public.mcs_department_members',
    'public.user_roles',
    'core_common.user_memberships'
];

const run = async () => {
    const devClient = new Client({ connectionString: devConnectionString });
    const prodClient = new Client({ connectionString: prodConnectionString });
    
    try {
        await devClient.connect();
        await prodClient.connect();
        console.log('🚀 Connected to both databases (DEV and PROD) for Users Auth.');

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
        }
        
        console.log('\n🎉 Finished cloning Users & Auth tables!');
    } catch (err) {
        console.error('Fatal Error:', err.message);
    } finally {
        await devClient.end();
        await prodClient.end();
    }
};

run();
