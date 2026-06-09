const { Client } = require('pg');
const prodConnectionString = 'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        
        console.log("=== STARTING TRANSACTION ===");
        await client.query('BEGIN');

        // 1. Update empresa_id for JAVIER SAUL PEREA CAMARGO (E0067)
        console.log("Updating Javier's empresa_id to Wiseowe...");
        const updateJavierWorker = await client.query(`
            UPDATE core_personal.workers
            SET empresa_id = 'dae64d51-2181-4510-b14f-e63d2f111a8e'
            WHERE id = '9efc8658-a3c9-4304-9eda-d03b928a8f68'
            RETURNING id, nome, empresa_id
        `);
        console.log("Updated worker:", updateJavierWorker.rows);

        // 2. Reactivate and correct JAVIER SAUL PEREA CAMARGO (E0067) ticket
        console.log("Reactivating Javier's ticket...");
        const reactivateJavierTicket = await client.query(`
            UPDATE core_personal.seguridade_status
            SET status = 'pendente',
                empresa_id = 'dae64d51-2181-4510-b14f-e63d2f111a8e',
                origem_cliente_nome = 'INSTALACIONES Y SISTEMAS HIDRÁULICOS',
                origem_contratante = 'WISEOWE',
                observacoes = 'Reativado e corrigido para WISEOWE / INSTALACIONES Y SISTEMAS HIDRÁULICOS'
            WHERE id = '0b1290f4-e885-45f7-875c-d12b0015e421'
            RETURNING id, worker_id, status, empresa_id, origem_cliente_nome, origem_contratante
        `);
        console.log("Updated ticket:", reactivateJavierTicket.rows);

        // 3. Reactivate and correct JUAN SEBASTIAN GARCIA GARCIA (E0102) ticket
        console.log("Reactivating Juan's ticket...");
        const reactivateJuanTicket = await client.query(`
            UPDATE core_personal.seguridade_status
            SET status = 'pendente',
                empresa_id = 'dae64d51-2181-4510-b14f-e63d2f111a8e',
                origem_cliente_nome = 'INSTALACIONES Y SISTEMAS HIDRÁULICOS',
                origem_contratante = 'WISEOWE',
                observacoes = 'Reativado e corrigido para WISEOWE / INSTALACIONES Y SISTEMAS HIDRÁULICOS'
            WHERE id = 'cfc05dc3-e81c-4b5b-bf4c-5036437dfa48'
            RETURNING id, worker_id, status, empresa_id, origem_cliente_nome, origem_contratante
        `);
        console.log("Updated ticket:", reactivateJuanTicket.rows);

        // 4. Reactivate and correct RICHARD ANTONIO GUERRA HERRERA (E1906) ticket
        console.log("Reactivating Richard's ticket...");
        const reactivateRichardTicket = await client.query(`
            UPDATE core_personal.seguridade_status
            SET status = 'pendente',
                empresa_id = 'dae64d51-2181-4510-b14f-e63d2f111a8e',
                origem_cliente_nome = 'INSTALACIONES Y SISTEMAS HIDRÁULICOS',
                origem_contratante = 'WISEOWE',
                observacoes = 'Reativado e corrigido para WISEOWE / INSTALACIONES Y SISTEMAS HIDRÁULICOS'
            WHERE id = 'c2fb2eba-8847-4dff-a60a-495e85085b7b'
            RETURNING id, worker_id, status, empresa_id, origem_cliente_nome, origem_contratante
        `);
        console.log("Updated ticket:", reactivateRichardTicket.rows);

        await client.query('COMMIT');
        console.log("=== TRANSACTION COMMITTED SUCCESSFULLY ===");

    } catch (e) {
        await client.query('ROLLBACK');
        console.error("TRANSACTION FAILED, ROLLED BACK:", e);
    } finally {
        await client.end();
    }
}
run();
