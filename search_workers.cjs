const { Client } = require('pg');

const mastercorpStr = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const namesToSearch = [
    "ELVIN ALEX POLO",
    "DAVIDSON SOARES DE SOUZA",
    "JAIR PLAZA AGUILAR",
    "RICHARD ANTONIO GUERRA HERRERA",
    "ROMER DAVID RODRIGUEZ GONZALEZ",
    "FREDY GONZALEZ MAMANI",
    "ALEJANDRO RIOS"
];

async function run() {
    const client = new Client({ connectionString: mastercorpStr });
    await client.connect();
    console.log("Connected to Mastercorp DB");

    for (const name of namesToSearch) {
        // Find in workers or colaboradores table
        // We will try public.colaboradores first or core_personal.workers
        try {
            // First let's see available tables just in case
            const { rows } = await client.query(`
                SELECT table_schema, table_name 
                FROM information_schema.tables 
                WHERE table_name IN ('colaboradores', 'workers')
            `);

            // Let's query public.colaboradores
            const queryCols = await client.query(`
                SELECT * FROM public.colaboradores
                WHERE nombre_y_apellidos ILIKE $1 OR nombre_y_apellidos ILIKE $2
            `, ['%' + name + '%', '%' + name.split(' ')[0] + '%']);

            console.log('\n--- Searching for ' + name + ' ---');
            if (queryCols.rows.length > 0) {
                console.log("Found in public.colaboradores:", queryCols.rows.map(r => ({ cod: r.cod_colab, nome: r.nombre_y_apellidos })));
            } else {
                console.log("NOT found in public.colaboradores");
            }

            // query core_personal.workers
            const queryWorkers = await client.query(`
                SELECT * FROM core_personal.workers
                WHERE nome ILIKE $1 OR nome ILIKE $2
            `, ['%' + name + '%', '%' + name.split(' ')[0] + '%']);

            if (queryWorkers.rows.length > 0) {
                console.log("Found in core_personal.workers:", queryWorkers.rows.map(r => ({ cod: r.cod_colab, nome: r.nome })));
            } else {
                console.log("NOT found in core_personal.workers");
            }

        } catch (e) {
            console.error("Error querying:", e.message);
        }
    }
    
    await client.end();
}

run();
