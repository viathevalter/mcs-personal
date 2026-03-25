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
        
        console.log("Fetching Auth Users. Disabling triggers...");
        // Disable triggers to bypass foreign key checks temporarily for this transaction
        await client.query('SET session_replication_role = replica');
        
        const authRes = await client.query(`SELECT id, email FROM auth.users WHERE email = ANY($1)`, [emails]);
        const authUsers = authRes.rows;
        
        for (const u of authUsers) {
            console.log(`Synchronizing ${u.email} to Auth UUID: ${u.id}...`);
            
            // 0. Get the OLD ghost UUID from mcs_department_members before we overwrite it
            const oldIdRes = await client.query(`SELECT user_id FROM public.mcs_department_members WHERE correoempresarial = $1 AND user_id != $2 LIMIT 1`, [u.email, u.id]);
            const ghostId = oldIdRes.rows.length > 0 ? oldIdRes.rows[0].user_id : null;

            // 1. Update user_roles to visualizador
            await client.query(`
                INSERT INTO public.user_roles (user_id, email, role) 
                VALUES ($1, $2, 'visualizador')
                ON CONFLICT (user_id) DO UPDATE SET role = 'visualizador'
            `, [u.id, u.email]);
            
            // 2. Clear any stray old roles that might be mapping by email to the old ID
            await client.query(`
                DELETE FROM public.user_roles WHERE email = $1 AND user_id != $2
            `, [u.email, u.id]);
            
            if (ghostId) {
                console.log(`  -> Found ghost ID ${ghostId}. Cleaning up user_memberships...`);
                // Clear any memberships tied to the ghost ID so the UI can save fresh ones
                await client.query(`DELETE FROM core_common.user_memberships WHERE user_id = $1`, [ghostId]);
            }
            
            // 3. Sync mcs_users
            await client.query(`
                UPDATE public.mcs_users 
                SET id = $1 
                WHERE email = $2 AND id != $1
            `, [u.id, u.email]);
            
            // 4. Sync mcs_department_members
            await client.query(`
                UPDATE public.mcs_department_members 
                SET user_id = $1 
                WHERE correoempresarial = $2 AND user_id != $1
            `, [u.id, u.email]);
        }
        
        await client.query('SET session_replication_role = DEFAULT');
        await client.query('COMMIT');
        console.log("SUCCESSFULLY SYNCED PROD!");
        
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
