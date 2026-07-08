const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const targetEmail = 'contratacao@wolterscontratacao.com';
const targetDisplayName = 'Wolters Contratação';
const targetPassword = 'stkrt@2026';

async function run() {
    console.log(`\n==============================================`);
    console.log(`STARTING PROVISIONING FOR VIEWER USER IN PROD`);
    console.log(`==============================================`);
    
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        await client.query('BEGIN');
        await client.query('SET session_replication_role = replica');

        console.log(`Checking user in auth.users: ${targetEmail}`);
        const authRes = await client.query('SELECT id FROM auth.users WHERE email = $1', [targetEmail]);
        if (authRes.rows.length === 0) {
            throw new Error(`User ${targetEmail} not found in auth.users! Please create them in Supabase Auth first.`);
        }
        
        const userId = authRes.rows[0].id;
        console.log(`Found user in auth.users with ID: ${userId}`);

        // 1. Update password to stkrt@2026
        console.log(`Updating password to: ${targetPassword}`);
        await client.query(`
            UPDATE auth.users 
            SET encrypted_password = extensions.crypt($1, extensions.gen_salt('bf')),
                updated_at = now()
            WHERE id = $2
        `, [targetPassword, userId]);
        console.log(`Password updated successfully.`);

        // 2. Check and upsert public.mcs_users
        console.log(`Synchronizing public.mcs_users record...`);
        const mcsRes = await client.query('SELECT id FROM public.mcs_users WHERE email = $1', [targetEmail]);
        if (mcsRes.rows.length === 0) {
            await client.query(`
                INSERT INTO public.mcs_users (id, email, display_name, role, language, active, created_at, managed_departments)
                VALUES ($1, $2, $3, 'user', 'pt', true, now(), ARRAY[]::text[])
            `, [userId, targetEmail, targetDisplayName]);
            console.log(`Created new record in public.mcs_users.`);
        } else {
            const existingId = mcsRes.rows[0].id;
            if (existingId !== userId) {
                console.log(`[WARNING] ID mismatch in public.mcs_users! Existing: ${existingId}, Auth: ${userId}. Overwriting...`);
                await client.query('UPDATE public.mcs_users SET id = $1, display_name = $2, role = \'user\', active = true WHERE email = $3', [userId, targetDisplayName, targetEmail]);
            } else {
                await client.query('UPDATE public.mcs_users SET display_name = $1, role = \'user\', active = true WHERE id = $2', [targetDisplayName, userId]);
            }
            console.log(`Updated existing record in public.mcs_users.`);
        }

        // 3. Ensure public.user_roles is 'visualizador'
        console.log(`Ensuring public.user_roles is 'visualizador'...`);
        await client.query('DELETE FROM public.user_roles WHERE email = $1 AND user_id != $2', [targetEmail, userId]);
        await client.query(`
            INSERT INTO public.user_roles (user_id, email, role, created_at, updated_at)
            VALUES ($1, $2, 'visualizador', now(), now())
            ON CONFLICT (user_id) DO UPDATE 
            SET role = 'visualizador', email = $2, updated_at = now()
        `, [userId, targetEmail]);
        console.log(`public.user_roles record set.`);

        // 4. Fetch all companies and create memberships
        console.log(`Fetching all companies in core_common.empresas...`);
        const compRes = await client.query('SELECT id, nome FROM core_common.empresas');
        console.log(`Found ${compRes.rows.length} companies.`);

        for (const company of compRes.rows) {
            const memRes = await client.query(`
                SELECT id FROM core_common.user_memberships 
                WHERE user_id = $1 AND empresa_id = $2
            `, [userId, company.id]);

            if (memRes.rows.length === 0) {
                await client.query(`
                    INSERT INTO core_common.user_memberships (id, user_id, empresa_id, role, is_active, created_at)
                    VALUES (gen_random_uuid(), $1, $2, 'user', true, now())
                `, [userId, company.id]);
                console.log(`  Joined company: ${company.nome} (Active: true)`);
            } else {
                await client.query(`
                    UPDATE core_common.user_memberships 
                    SET role = 'user', is_active = true 
                    WHERE user_id = $1 AND empresa_id = $2
                `, [userId, company.id]);
                console.log(`  Updated membership for company: ${company.nome} to Active: true`);
            }
        }

        await client.query('SET session_replication_role = DEFAULT');
        await client.query('COMMIT');
        console.log(`\n==============================================`);
        console.log(`SUCCESSFULLY PROVISIONED VIEWER USER IN PROD!`);
        console.log(`==============================================`);
    } catch (e) {
        await client.query('SET session_replication_role = DEFAULT');
        await client.query('ROLLBACK');
        console.error("PROVISIONING FAILED:", e);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();
