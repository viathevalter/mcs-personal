const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function searchInDb(name, connStr) {
    const client = new Client({ connectionString: connStr });
    await client.connect();
    
    const results = {};
    
    // Check public.colaboradores
    try {
        const resColab = await client.query(`
            SELECT * FROM public.colaboradores
            WHERE cod_colab = $1 OR nombre_y_apellidos ILIKE $2
        `, ['E1481', '%EDINSON MANUEL%']);
        results.colaboradores = resColab.rows;
    } catch (e) {
        results.colaboradores_error = e.message;
    }
    
    // Check core_personal.workers
    try {
        const resWorkers = await client.query(`
            SELECT * FROM core_personal.workers
            WHERE cod_colab = $1 OR nome ILIKE $2
        `, ['E1481', '%EDINSON MANUEL%']);
        results.workers = resWorkers.rows;
    } catch (e) {
        results.workers_error = e.message;
    }
    
    await client.end();
    return results;
}

async function run() {
    console.log("Searching in DEV...");
    const devResults = await searchInDb('E1481', devConnectionString);
    console.log("DEV Results:", JSON.stringify(devResults, null, 2));
    
    console.log("\nSearching in PROD...");
    const prodResults = await searchInDb('E1481', prodConnectionString);
    console.log("PROD Results:", JSON.stringify(prodResults, null, 2));
}

run();
