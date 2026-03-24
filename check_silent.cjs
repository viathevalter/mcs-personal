const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

const run = async () => {
    const prodClient = new Client({ connectionString: prodConnectionString });
    try {
        await prodClient.connect();
        
        console.log("--- COUNT WORKERS ---");
        const c1 = await prodClient.query("SELECT COUNT(*) FROM core_personal.workers;");
        console.log("core_personal.workers count:", c1.rows[0].count);

        if (c1.rows[0].count == 0) {
            console.log("\n--- TEST INSERT ---");
            try {
                await prodClient.query(`
                    INSERT INTO core_personal.workers 
                    (empresa_id, cod_colab, nome, status_seguridad, status_trabajador)
                    VALUES ('dae64d51-2181-4510-b14f-e63d2f111a8e', '999999', 'TESTE SILENCIOSO', 'Alta', 'Ativo');
                `);
                console.log("Insert test passed!");
            } catch(e) {
                console.log("Insert test failed:", e.message);
            }
        }

    } catch(e) {
        console.error("Fatal:", e.message);
    } finally {
        await prodClient.end();
    }
}
run();
