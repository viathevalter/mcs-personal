const { Client } = require('pg');

const prodConnectionString = 'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function run() {
    const client = new Client({ connectionString: prodConnectionString });
    try {
        await client.connect();
        console.log("Connected to PRODUCTION DB.");

        await client.query("BEGIN");

        // 1. Find duplicate groups (same company and normalized name)
        const resDupGroups = await client.query(`
            SELECT LOWER(TRIM(trade_name)) as norm_name, c.empresa_id, COUNT(*)
            FROM core_common.clients c
            WHERE trade_name IS NOT NULL AND trade_name <> ''
            GROUP BY LOWER(TRIM(trade_name)), c.empresa_id
            HAVING COUNT(*) > 1
        `);

        console.log(`Found ${resDupGroups.rows.length} client name/company groups with duplicates in PRODUCTION.`);

        let totalDeleted = 0;
        let totalMerged = 0;

        for (const group of resDupGroups.rows) {
            const { norm_name, empresa_id } = group;

            // Fetch all client records in this group sorted by created_at or id
            const resClients = await client.query(`
                SELECT id, trade_name, created_at 
                FROM core_common.clients
                WHERE LOWER(TRIM(trade_name)) = $1 AND empresa_id = $2
                ORDER BY created_at ASC, id ASC
            `, [norm_name, empresa_id]);

            const clientsInGroup = resClients.rows;
            const primaryClient = clientsInGroup[0];
            const duplicateClients = clientsInGroup.slice(1);

            console.log(`Merging group "${norm_name}" (Company ID: ${empresa_id})`);
            console.log(` - Keeping primary client ID: ${primaryClient.id} (Created: ${primaryClient.created_at})`);

            for (const dup of duplicateClients) {
                console.log(`   - Merging duplicate client ID: ${dup.id} (Created: ${dup.created_at})`);

                // Re-link references in client_sites
                await client.query(`
                    UPDATE core_common.client_sites 
                    SET client_id = $1 
                    WHERE client_id = $2
                `, [primaryClient.id, dup.id]);
                
                // Re-link references in client_vies_checks
                await client.query(`
                    UPDATE core_common.client_vies_checks 
                    SET client_id = $1 
                    WHERE client_id = $2
                `, [primaryClient.id, dup.id]);

                // Re-link references in client_contacts
                await client.query(`
                    UPDATE core_common.client_contacts 
                    SET client_id = $1 
                    WHERE client_id = $2
                `, [primaryClient.id, dup.id]);

                // Re-link references in horas_trabalhadas
                await client.query(`
                    UPDATE core_finance.horas_trabalhadas 
                    SET client_id = $1 
                    WHERE client_id = $2
                `, [primaryClient.id, dup.id]);

                // Re-link references in faturas
                await client.query(`
                    UPDATE core_finance.faturas 
                    SET client_id = $1 
                    WHERE client_id = $2
                `, [primaryClient.id, dup.id]);

                // Delete the duplicate client record
                await client.query(`
                    DELETE FROM core_common.clients 
                    WHERE id = $1
                `, [dup.id]);

                totalDeleted++;
            }
            totalMerged++;
        }

        await client.query("COMMIT");
        console.log(`Deduplication completed successfully on PRODUCTION! Merged ${totalMerged} groups, deleted ${totalDeleted} duplicate client records.`);

    } catch (e) {
        await client.query("ROLLBACK");
        console.error("Deduplication failed on PRODUCTION:", e);
    } finally {
        await client.end();
    }
}

run();
