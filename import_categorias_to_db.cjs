const { Client } = require('pg');
const fs = require('fs');

const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    await prodClient.connect();
    console.log("Connected to Supabase DB.");

    try {
        const sql = fs.readFileSync('C:/Projetos IA/Kotrik/mcs-personal/import_categorias_powerapps_full.sql', 'utf8');
        await prodClient.query(sql);
        console.log("Data imported successfully!");
    } catch (e) {
        console.error("Failed to import data:", e);
    } finally {
        await prodClient.end();
    }
}
run();
