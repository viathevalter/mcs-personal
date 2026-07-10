const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        console.log("Connected to PROD.");

        // Query public.profiles
        const resProfiles = await client.query("SELECT id, email, full_name FROM public.profiles WHERE email ILIKE '%valter%'");
        console.log("PROD Profiles matching valter:", resProfiles.rows.length);
        resProfiles.rows.forEach(r => console.log(` - ID: ${r.id}, Email: ${r.email}, Name: ${r.full_name}`));

        // Query auth.users
        const resAuth = await client.query("SELECT id, email FROM auth.users WHERE email ILIKE '%valter%'");
        console.log("PROD Auth users matching valter:", resAuth.rows.length);
        resAuth.rows.forEach(r => console.log(` - ID: ${r.id}, Email: ${r.email}`));

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
