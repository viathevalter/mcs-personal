const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const usersInfo = [
    {
        email: 'joao@gestaologinpro.com',
        displayName: 'Joao Vitor',
        roleMcsUsers: 'admin',
        roleUserRoles: 'super_admin'
    },
    {
        email: 'valtencir@gestaologinpro.com',
        displayName: 'Valtencir Kotrik',
        roleMcsUsers: 'admin',
        roleUserRoles: 'super_admin'
    },
    {
        email: 'thalia@gestaologinpro.com',
        displayName: 'Thalia Pzivitovski',
        roleMcsUsers: 'admin',
        roleUserRoles: 'super_admin'
    }
];

const targetCompanyIds = [
    'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d',
    '441f1f5d-aed3-40e3-8c77-7b1217757251',
    'dae64d51-2181-4510-b14f-e63d2f111a8e',
    'f5d32323-4d68-4a54-8fb8-0ba670dcaecf',
    'a798620a-358a-4c6c-9db2-3a507c583cac'
];

async function processDb(name, connStr) {
    console.log(`\n==============================================`);
    console.log(`STARTING EXECUTION FOR DATABASE: ${name}`);
    console.log(`==============================================`);
    
    const client = new Client({ connectionString: connStr });
    try {
        await client.connect();
        await client.query('BEGIN');
        await client.query('SET session_replication_role = replica');

        for (const user of usersInfo) {
            console.log(`\nProcessing user: ${user.email}`);
            
            // 1. Check if user exists in auth.users
            const authRes = await client.query('SELECT id FROM auth.users WHERE email = $1', [user.email]);
            let userId;
            
            if (authRes.rows.length === 0) {
                console.log(`  [INSERT] Creating in auth.users...`);
                const insertRes = await client.query(`
                    INSERT INTO auth.users (
                        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, 
                        last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
                    ) 
                    VALUES (
                        '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1, extensions.crypt('stkrt@2026', extensions.gen_salt('bf')), now(), NULL, 
                        NULL, '{"provider":"email","providers":["email"]}', '{"role":"user"}', now(), now(), '', '', '', ''
                    )
                    RETURNING id
                `, [user.email]);
                
                userId = insertRes.rows[0].id;
                console.log(`  [INSERT] Created auth.users with ID: ${userId}`);
                
                await client.query(`
                    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
                    VALUES (
                        gen_random_uuid(), 
                        $1, 
                        format('{"sub":"%s","email":"%s","email_verified":false,"phone_verified":false}', $3::text, $2::text)::jsonb, 
                        'email', 
                        $3, 
                        now(), 
                        now(), 
                        now()
                    )
                `, [userId, user.email, userId]);
                console.log(`  [INSERT] Created auth.identities record.`);
            } else {
                userId = authRes.rows[0].id;
                console.log(`  [EXISTS] Found in auth.users with ID: ${userId}. Updating password to stkrt@2026...`);
                await client.query(`
                    UPDATE auth.users 
                    SET encrypted_password = extensions.crypt('stkrt@2026', extensions.gen_salt('bf')),
                        updated_at = now()
                    WHERE id = $1
                `, [userId]);
            }
            
            // 2. ID Mismatch Fix (specifically for Thalia in PROD where public.mcs_users had devId instead of prodId)
            // Let's search if there's an entry in public.mcs_users for this email with a different ID.
            const mcsCheck = await client.query('SELECT id FROM public.mcs_users WHERE email = $1', [user.email]);
            if (mcsCheck.rows.length > 0 && mcsCheck.rows[0].id !== userId) {
                const oldId = mcsCheck.rows[0].id;
                console.log(`  [WARNING] ID mismatch in public.mcs_users! Found ID: ${oldId}, Auth ID: ${userId}. Fixing...`);
                
                // Update public.mcs_users ID
                await client.query('UPDATE public.mcs_users SET id = $1 WHERE email = $2', [userId, user.email]);
                console.log(`  [FIX] Updated ID in public.mcs_users to ${userId}`);
                
                // Update public.mcs_department_members user_id
                const deptRes = await client.query('UPDATE public.mcs_department_members SET user_id = $1 WHERE correoempresarial = $2', [userId, user.email]);
                console.log(`  [FIX] Updated ID in public.mcs_department_members (affected rows: ${deptRes.rowCount})`);
            } else if (mcsCheck.rows.length === 0) {
                // Insert into public.mcs_users if missing
                console.log(`  [INSERT] Creating record in public.mcs_users...`);
                await client.query(`
                    INSERT INTO public.mcs_users (id, email, display_name, role, language, active, created_at, managed_departments)
                    VALUES ($1, $2, $3, $4, 'pt', true, now(), ARRAY[]::text[])
                `, [userId, user.email, user.displayName, user.roleMcsUsers]);
                console.log(`  [INSERT] Created public.mcs_users record.`);
            } else {
                // Ensure correct role and display name
                console.log(`  [UPDATE] Ensuring correct role/displayName in public.mcs_users...`);
                await client.query(`
                    UPDATE public.mcs_users 
                    SET role = $1, display_name = $2, active = true
                    WHERE id = $3
                `, [user.roleMcsUsers, user.displayName, userId]);
            }
            
            // 3. Ensure role in public.user_roles is 'super_admin'
            console.log(`  [SYNC] Ensuring public.user_roles is 'super_admin'...`);
            // Delete any user_roles for this email with a different user_id
            await client.query('DELETE FROM public.user_roles WHERE email = $1 AND user_id != $2', [user.email, userId]);
            
            await client.query(`
                INSERT INTO public.user_roles (user_id, email, role, created_at, updated_at)
                VALUES ($1, $2, $3, now(), now())
                ON CONFLICT (user_id) DO UPDATE 
                SET role = $3, email = $2, updated_at = now()
            `, [userId, user.email, user.roleUserRoles]);
            console.log(`  [SYNC] public.user_roles is set.`);
            
            // 4. Ensure memberships in core_common.user_memberships
            console.log(`  [SYNC] Ensuring company memberships in core_common.user_memberships...`);
            // Clean up any ghost memberships for this email if they belong to a different user ID
            // Wait, core_common.user_memberships has a user_id column but no email column. So we don't need to delete by email.
            
            for (const companyId of targetCompanyIds) {
                const memRes = await client.query(`
                    SELECT id FROM core_common.user_memberships 
                    WHERE user_id = $1 AND empresa_id = $2
                `, [userId, companyId]);
                
                if (memRes.rows.length === 0) {
                    await client.query(`
                        INSERT INTO core_common.user_memberships (id, user_id, empresa_id, role, is_active, created_at)
                        VALUES (gen_random_uuid(), $1, $2, 'admin', true, now())
                    `, [userId, companyId]);
                    console.log(`    Joined company: ${companyId}`);
                } else {
                    await client.query(`
                        UPDATE core_common.user_memberships 
                        SET role = 'admin', is_active = true 
                        WHERE user_id = $1 AND empresa_id = $2
                    `, [userId, companyId]);
                }
            }
        }
        
        await client.query('SET session_replication_role = DEFAULT');
        await client.query('COMMIT');
        console.log(`SUCCESSFULLY FINISHED DATABASE: ${name}`);
    } catch (e) {
        await client.query('SET session_replication_role = DEFAULT');
        await client.query('ROLLBACK');
        console.error(`ERROR IN DATABASE ${name}:`, e);
        throw e;
    } finally {
        await client.end();
    }
}

async function run() {
    try {
        await processDb('DEV', devConnectionString);
        await processDb('PROD', prodConnectionString);
        console.log('\n==============================================');
        console.log('ALL DATABASES SUCCESSFULLY PROVISIONED!');
        console.log('==============================================');
    } catch (e) {
        console.error('PROVISIONING FAILED.');
        process.exit(1);
    }
}

run();
