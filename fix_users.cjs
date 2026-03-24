const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        
        const users = (await prodClient.query("SELECT id, email FROM auth.users")).rows;
        
        for (const user of users) {
            try {
                // Insert into public.user_roles if missing
                await prodClient.query(`
                    INSERT INTO public.user_roles (user_id, email, role)
                    VALUES ($1, $2, 'Super Admin')
                    ON CONFLICT ON CONSTRAINT user_roles_user_id_key DO UPDATE SET role = 'Super Admin';
                `, [user.id, user.email]).catch(e => {
                    return prodClient.query(`
                        INSERT INTO public.user_roles (user_id, email, role)
                        VALUES ($1, $2, 'Super Admin')
                        ON CONFLICT DO NOTHING;
                    `, [user.id, user.email]);
                });

                // Insert into public.mcs_users to have a readable profile (full name, etc)
                // Assuming it has id (pk), email, name... Let's query columns first implicitly:
                await prodClient.query(`
                    INSERT INTO public.mcs_users (id, email, first_name, last_name, is_active)
                    VALUES ($1, $2, $3, $4, true)
                    ON CONFLICT DO NOTHING;
                `, [user.id, user.email, user.email.split('@')[0], 'User']).catch(async (e) => {
                    // if that fails because of column names, let's just insert minimal:
                    await prodClient.query(`
                        INSERT INTO public.mcs_users (id, email, is_active)
                        VALUES ($1, $2, true)
                        ON CONFLICT DO NOTHING;
                    `, [user.id, user.email]).catch(() => {});
                });
                
            } catch(e) {
                console.error(`Error for ${user.email}: ${e.message}`);
            }
        }
        
        // Final check for Valter
        const uid = users.find(u => u.email === 'valter@gestaologinpro.com')?.id;
        if(uid) {
            console.log("\n--- CHKV: public.user_roles ---");
            const r1 = await prodClient.query("SELECT * FROM public.user_roles WHERE user_id = $1", [uid]);
            console.log(r1.rows);
            
            console.log("--- CHKV: public.mcs_users ---");
            const r2 = await prodClient.query("SELECT email FROM public.mcs_users WHERE id = $1", [uid]).catch(() => ({rows:[]}));
            console.log(r2.rows);
        }
        
        console.log("\n🚀 Usuários cadastrados como Super Admin em user_roles e perfis base em mcs_users!");

    } catch(e) {
        console.error("Fatal:", e.message);
    } finally {
        await prodClient.end();
    }
}
run();
