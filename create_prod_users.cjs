const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const emails = [
    'alex@gestaologinpro.com',
    'ana@gestaologinpro.com',
    'andres@gestaologinpro.com',
    'christian@gestaologinpro.com',
    'imel@gestaologinpro.com',
    'kawan@gestaologinpro.com',
    'luis@gestaologinpro.com',
    'maria.rabelo@gestaologinpro.com',
    'nairelis@gestaologinpro.com',
    'olga@gestaologinpro.com',
    'rebecca@gestaologinpro.com',
    'wolmer@gestaologinpro.com',
    'leidys@gestaologinpro.com'
];

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        await client.query('BEGIN');
        await client.query('SET session_replication_role = replica');

        console.log("Checking which users are missing from PROD...");
        
        for (const email of emails) {
            const authRes = await client.query(`SELECT id FROM auth.users WHERE email = $1`, [email]);
            let userId;

            if (authRes.rows.length === 0) {
                console.log(`[CREATING] ${email} - generating auth.users record...`);
                // Create user in auth.users with password 'stkrt@2026'
                const insertRes = await client.query(`
                    INSERT INTO auth.users (
                        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, 
                        last_sign_in_at, app_metadata, user_metadata, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
                    ) 
                    VALUES (
                        '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1, extensions.crypt('stkrt@2026', extensions.gen_salt('bf')), now(), NULL, 
                        NULL, '{"provider":"email","providers":["email"]}', '{"role":"user"}', now(), now(), '', '', '', ''
                    )
                    RETURNING id
                `, [email]);
                
                userId = insertRes.rows[0].id;
                
                await client.query(`
                    INSERT INTO auth.identities (id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
                    VALUES (gen_random_uuid(), $1, format('{"sub":"%s","email":"%s"}', $1::text, $2::text)::jsonb, 'email', now(), now(), now())
                `, [userId, email]);

            } else {
                console.log(`[EXISTS] ${email} is already in auth.users. Resetting password just in case...`);
                userId = authRes.rows[0].id;
                await client.query(`
                    UPDATE auth.users SET encrypted_password = extensions.crypt('stkrt@2026', extensions.gen_salt('bf')) WHERE id = $1
                `, [userId]);
            }
            
            // 0. Get ghost UUID
            const oldIdRes = await client.query(`SELECT user_id FROM public.mcs_department_members WHERE correoempresarial = $1 AND user_id != $2 LIMIT 1`, [email, userId]);
            const ghostId = oldIdRes.rows.length > 0 ? oldIdRes.rows[0].user_id : null;

            // 1. Update user_roles to visualizador
            await client.query(`
                INSERT INTO public.user_roles (user_id, email, role) 
                VALUES ($1, $2, 'visualizador')
                ON CONFLICT (user_id) DO UPDATE SET role = 'visualizador'
            `, [userId, email]);
            
            await client.query(`
                DELETE FROM public.user_roles WHERE email = $1 AND user_id != $2
            `, [email, userId]);
            
            if (ghostId) {
                 await client.query(`DELETE FROM core_common.user_memberships WHERE user_id = $1`, [ghostId]);
            }
            
            // 2. Sync mcs_users
            await client.query(`
                UPDATE public.mcs_users 
                SET id = $1 
                WHERE email = $2 AND id != $1
            `, [userId, email]);
            
            // 3. Sync mcs_department_members
            await client.query(`
                UPDATE public.mcs_department_members 
                SET user_id = $1 
                WHERE correoempresarial = $2 AND user_id != $1
            `, [userId, email]);
        }
        
        await client.query('SET session_replication_role = DEFAULT');
        await client.query('COMMIT');
        console.log("SUCCESSFULLY PROVISIONED PROD USERS!");
        
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
