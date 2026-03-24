const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        
        console.log("--- auth.users ---");
        const users = await prodClient.query("SELECT id, email FROM auth.users");
        console.log(users.rows);

        console.log("\n--- core_common.empresas ---");
        const emps = await prodClient.query("SELECT id, nome FROM core_common.empresas");
        console.log(emps.rows);
        
        console.log("\n--- Columns in user_roles ---");
        const rCols = await prodClient.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'user_roles'");
        console.log(rCols.rows.map(r => r.column_name));

        console.log("\n--- Columns in user_memberships ---");
        const mCols = await prodClient.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'user_memberships'");
        console.log(mCols.rows.map(r => r.column_name));

    } catch(e) {
        console.error(e.message);
    } finally {
        await prodClient.end();
    }
}
run();
