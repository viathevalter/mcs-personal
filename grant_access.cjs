const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        
        const usersRes = await prodClient.query("SELECT id, email FROM auth.users");
        const users = usersRes.rows;
        console.log(`\n✅ Encontrados ${users.length} usuários.`);

        const empsRes = await prodClient.query("SELECT id, nome FROM core_common.empresas");
        const empresas = empsRes.rows;
        console.log(`✅ Encontradas ${empresas.length} empresas integradoras.\n`);

        for (const user of users) {
            console.log(`🔧 Concedendo acesso global para: ${user.email} (${user.id})`);

            try {
                // Remove existing if any (just in case they got a default 'User' role via a trigger)
                await prodClient.query(`DELETE FROM public.user_roles WHERE user_id = $1`, [user.id]);
                
                await prodClient.query(`
                    INSERT INTO public.user_roles (user_id, email, role)
                    VALUES ($1, $2, 'Super Admin')
                `, [user.id, user.email]);
            } catch(e) {
                console.error(`  [public.user_roles] Erro para ${user.email}: ${e.message}`);
            }
            
            for (const emp of empresas) {
                try {
                    // Try to insert memberships
                    await prodClient.query(`
                        INSERT INTO core_common.user_memberships (user_id, empresa_id, role, is_active)
                        VALUES ($1, $2, 'Super Admin', true)
                        ON CONFLICT DO NOTHING;
                    `, [user.id, emp.id]);
                } catch(e) {
                    console.error(`  [core_common.user_memberships] Erro para ${emp.nome}: ${e.message}`);
                }
            }
        }

        console.log("\n🎉 Acesso GLOBAL concedido! O Frontend já deve liberar o login e a seleção de empresa.");

    } catch(e) {
        console.error("Fatal:", e.message);
    } finally {
        await prodClient.end();
    }
}
run();
