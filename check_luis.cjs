const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        
        console.log("Checking auth.users...");
        const auth = await prodClient.query("SELECT id, email FROM auth.users WHERE email = 'luis@gestaologinpro.com'");
        console.log("AUTH.USERS:", auth.rows);
        
        console.log("Checking mcs_department_members...");
        const mcs = await prodClient.query("SELECT id, user_id, correoempresarial as email, nombrecompleto FROM public.mcs_department_members WHERE correoempresarial = 'luis@gestaologinpro.com'");
        console.log("MCS_MEMBERS:", mcs.rows);

        if (auth.rows.length > 0 && mcs.rows.length > 0) {
            const authId = auth.rows[0].id;
            const mcsUserId = mcs.rows[0].user_id;
            console.log(`\nauthId: ${authId} | mcsUserId: ${mcsUserId}`);
            console.log("Ids match?", authId === mcsUserId);
            
            if (authId !== mcsUserId) {
                console.log("Fixing mcs_department_members.user_id...");
                try {
                    // Update old user to free email constraint
                    await prodClient.query("UPDATE public.mcs_users SET email = email || '_old' WHERE email = 'luis@gestaologinpro.com'");
                    console.log("Freed email from old mcs_users record.");

                    // Insert the new correct UUID
                    await prodClient.query(`
                        INSERT INTO public.mcs_users (id, email)
                        VALUES ($1, $2)
                    `, [authId, 'luis@gestaologinpro.com']);
                    console.log("Inserted new authId into mcs_users.");

                } catch(e) {
                    console.error("Failed to insert into mcs_users:", e.message);
                    return;
                }
                
                await prodClient.query("UPDATE public.mcs_department_members SET user_id = $1 WHERE correoempresarial = 'luis@gestaologinpro.com'", [authId]);
                console.log("Fixed! Now the UI will use the correct UUID.");
                
                // Cleanup old mcs_users if possible
                await prodClient.query("DELETE FROM public.mcs_users WHERE email = 'luis@gestaologinpro.com_old'").catch(e => console.log("Could not delete old mcs_users (fkey attached elsewhere)."));
            }
        } else if (auth.rows.length === 0) {
            console.log("LUIS NOT FOUND IN AUTH.USERS!! He indeed needs to be invited or sign up.");
        }
        
    } catch(e) { 
        console.error(e) 
    } finally { 
        await prodClient.end() 
    }
}
run();
