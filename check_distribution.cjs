const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        
        console.log("--- WORKERS PER COMPANY ---");
        const res = await prodClient.query(`
            SELECT e.nome as Empresa, COUNT(w.id) as Total 
            FROM core_personal.workers w 
            JOIN core_common.empresas e ON w.empresa_id = e.id 
            GROUP BY e.nome
        `);
        console.log(res.rows);

        console.log("--- USERS IN USER_ROLES ---");
        const u = await prodClient.query(`
            SELECT u.email, r.role
            FROM public.user_roles r
            JOIN auth.users u ON r.user_id = u.id
        `);
        console.log(u.rows);

    } catch(e) {
        console.error("Fatal:", e.message);
    } finally {
        await prodClient.end();
    }
}
run();
