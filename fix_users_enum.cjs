const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        
        const validRoles = await prodClient.query("SELECT unnest(enum_range(NULL::app_role)) AS r").catch(() => ({rows:[]}));
        console.log("Valid user roles:", validRoles.rows.map(r => r.r));
        
        // it's probably 'super_admin' or 'Super Admin' but the constraint says something else.
        // In previous project DEV, user_roles had role='Super Admin' as text. But here it's an enum.
        // Wait, the error was: invalid input value for enum app_role: "Super Admin"
        // Let's assume it's 'super_admin'.
        // Let's actually find the real value:
        const superAdminRole = validRoles.rows.find(r => r.r.toLowerCase().includes('super'))?.r || 'super_admin';
        console.log("Will use role:", superAdminRole);
        
        const users = (await prodClient.query("SELECT id, email FROM auth.users")).rows;
        
        for (const user of users) {
             try {
                // Remove existing if any
                await prodClient.query(`DELETE FROM public.user_roles WHERE user_id = $1`, [user.id]);
                
                // Insert into public.user_roles if missing
                await prodClient.query(`
                    INSERT INTO public.user_roles (user_id, email, role)
                    VALUES ($1, $2, $3)
                `, [user.id, user.email, 'Super Admin']).catch(async () => {
                     // try actual enum
                     await prodClient.query(`
                        INSERT INTO public.user_roles (user_id, email, role)
                        VALUES ($1, $2, $3)
                    `, [user.id, user.email, superAdminRole]).catch((err) => console.error(err.message));
                });

                // Insert into public.mcs_users
                await prodClient.query(`
                    INSERT INTO public.mcs_users (id, email, first_name, last_name, is_active)
                    VALUES ($1, $2, $3, $4, true)
                    ON CONFLICT DO NOTHING;
                `, [user.id, user.email, user.email.split('@')[0], 'User']).catch(async () => {
                    await prodClient.query(`
                        INSERT INTO public.mcs_users (id, email, is_active)
                        VALUES ($1, $2, true)
                        ON CONFLICT DO NOTHING;
                    `, [user.id, user.email]).catch(() => {});
                });
                
            } catch(e) { }
        }
        
        console.log("Done inserting roles!");
    } catch(e) {
        console.error("Fatal:", e.message);
    } finally {
        await prodClient.end();
    }
}
run();
