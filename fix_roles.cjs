const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        
        const users = (await prodClient.query("SELECT id, email FROM auth.users")).rows;
        const empresas = (await prodClient.query("SELECT id, nome FROM core_common.empresas")).rows;
        
        for (const user of users) {
            for (const emp of empresas) {
                try {
                    // role must be 'admin' in lowercase according to check constraint
                    await prodClient.query(`
                        INSERT INTO core_common.user_memberships (user_id, empresa_id, role, is_active)
                        VALUES ($1, $2, 'admin', true)
                        ON CONFLICT DO NOTHING;
                    `, [user.id, emp.id]);
                } catch(e) {
                    console.error(`Error for ${emp.nome}: ${e.message}`);
                }
            }
        }
        console.log("\n🚀 Permissões multi-company ('admin') injetadas com SUCESSO!");
        
    } catch(e) {
        console.error("Fatal:", e.message);
    } finally {
        await prodClient.end();
    }
}
run();
