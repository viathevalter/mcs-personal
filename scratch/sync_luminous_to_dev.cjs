const { Client } = require('pg');

const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to DEV DB.");

        const query = `
            INSERT INTO core_common.empresas (
                id, codigo, nome, is_active, created_at, trade_name, legal_name, proposal_sender_email
            ) VALUES (
                '847796c4-b253-4e53-9e6b-34a127ec7d85', 'LUM', 'Luminous', true, '2026-03-24T20:46:53.600Z', 'Luminous', 'Luminous', 'vendas@luminous.pt'
            ) ON CONFLICT (id) DO UPDATE SET 
                codigo = EXCLUDED.codigo,
                nome = EXCLUDED.nome,
                is_active = EXCLUDED.is_active,
                trade_name = EXCLUDED.trade_name,
                legal_name = EXCLUDED.legal_name,
                proposal_sender_email = EXCLUDED.proposal_sender_email;
        `;
        
        await client.query(query);
        console.log("Successfully synced Luminous to DEV database!");
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
