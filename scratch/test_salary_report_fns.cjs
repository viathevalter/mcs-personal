const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        console.log("Connected to database.");

        const empresaId = 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d'; // Login Pro
        const year = 2026;
        const month = 5; // May

        console.log(`\n=== TESTING get_salary_report_kpis for ${month}/${year} ===`);
        const kpiRes = await client.query(
            `SELECT * FROM core_personal.get_salary_report_kpis($1, $2, $3, NULL, NULL, NULL)`,
            [empresaId, year, month]
        );
        console.log("KPIs result:", kpiRes.rows);

        console.log(`\n=== TESTING get_salary_report_workers for ${month}/${year} ===`);
        const workersRes = await client.query(
            `SELECT total_count, cod_colab, nome, contratante, cliente_nombre, dias_trabalhados, status_seguridad, data_ingresso, data_baixa 
             FROM core_personal.get_salary_report_workers($1, $2, $3, NULL, NULL, NULL, 'nome', 'asc', 1, 5)`,
            [empresaId, year, month]
        );
        console.log("Workers result (first 5):");
        console.table(workersRes.rows);

    } catch (err) {
        console.error("Test failed:", err.message);
    } finally {
        await client.end();
    }
}
run();
