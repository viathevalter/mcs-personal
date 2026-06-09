const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        console.log("Connected to database. Performing cleanup from any previous runs...");

        // Robust cleanup first
        await client.query(`
            DELETE FROM core_operacoes.solicitud_tareas WHERE solicitud_id IN (
                SELECT id FROM core_operacoes.solicitudes_operativas WHERE client_id = 'b3113ee0-89cd-4c75-b4e7-63167c0a0af2' AND pedido_id IN (
                    SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id = '11111111-1111-1111-1111-111111111111'
                )
            );
            DELETE FROM core_operacoes.solicitud_timeline WHERE solicitud_id IN (
                SELECT id FROM core_operacoes.solicitudes_operativas WHERE client_id = 'b3113ee0-89cd-4c75-b4e7-63167c0a0af2' AND pedido_id IN (
                    SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id = '11111111-1111-1111-1111-111111111111'
                )
            );
            DELETE FROM core_operacoes.solicitudes_operativas WHERE client_id = 'b3113ee0-89cd-4c75-b4e7-63167c0a0af2' AND pedido_id IN (
                SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id = '11111111-1111-1111-1111-111111111111'
            );
            DELETE FROM core_comercial.pedido_status_history WHERE pedido_id IN (
                SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id = '11111111-1111-1111-1111-111111111111'
            );
            DELETE FROM core_comercial.pedido_events WHERE pedido_id IN (
                SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id = '11111111-1111-1111-1111-111111111111'
            );
            DELETE FROM core_comercial.pedido_items WHERE pedido_id IN (
                SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id = '11111111-1111-1111-1111-111111111111'
            );
            DELETE FROM core_comercial.pedidos WHERE source_estimacion_id = '11111111-1111-1111-1111-111111111111';
            DELETE FROM core_comercial.proposal_audit_logs WHERE proposal_signature_id = '44444444-4444-4444-4444-444444444444';
            DELETE FROM core_comercial.proposal_signatures WHERE id = '44444444-4444-4444-4444-444444444444';
            UPDATE core_comercial.estimaciones SET current_version_id = NULL WHERE id = '11111111-1111-1111-1111-111111111111';
            DELETE FROM core_comercial.estimacion_items WHERE estimacion_id = '11111111-1111-1111-1111-111111111111';
            DELETE FROM core_comercial.estimacion_versions WHERE estimacion_id = '11111111-1111-1111-1111-111111111111';
            DELETE FROM core_comercial.estimaciones WHERE id = '11111111-1111-1111-1111-111111111111';
        `);
        console.log("Cleanup done. Seeding test data...");

        // 1. Seed Estimacion
        await client.query(`
            INSERT INTO core_comercial.estimaciones (
                id, empresa_id, codigo, client_id, client_site_id, status, estimation_type, contact_name, contact_email, validity_date
            ) VALUES (
                '11111111-1111-1111-1111-111111111111',
                'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d',
                'EST-TEST-E2E-001',
                'b3113ee0-89cd-4c75-b4e7-63167c0a0af2',
                '7df7b76f-846c-42bc-9f76-cbe8afa97df1',
                'sent',
                'new_allocation',
                'John Client Test',
                'billing@client.com',
                NOW() + INTERVAL '10 days'
            )
        `);

        // 2. Seed Version
        await client.query(`
            INSERT INTO core_comercial.estimacion_versions (
                id, estimacion_id, empresa_id, version_number, status, total_cost, total_revenue, margin_percent, notes
            ) VALUES (
                '22222222-2222-2222-2222-222222222222',
                '11111111-1111-1111-1111-111111111111',
                'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d',
                1,
                'active',
                1000.00,
                1500.00,
                33.33,
                'Initial test version'
            )
        `);

        // Update Estimacion current_version_id
        await client.query(`
            UPDATE core_comercial.estimaciones
            SET current_version_id = '22222222-2222-2222-2222-222222222222'
            WHERE id = '11111111-1111-1111-1111-111111111111'
        `);

        // 3. Seed Items
        await client.query(`
            INSERT INTO core_comercial.estimacion_items (
                id, estimacion_id, estimacion_version_id, empresa_id, job_function_id, quantity,
                planned_hours_per_day, planned_days_per_week, planned_total_hours, base_cost_hour, sell_rate_hour, margin_percent, status
            ) VALUES (
                '33333333-3333-3333-3333-333333333333',
                '11111111-1111-1111-1111-111111111111',
                '22222222-2222-2222-2222-222222222222',
                'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d',
                'f5c00645-6fc2-41f7-9937-0f717a591b12',
                1,
                8.00,
                5,
                40.00,
                15.00,
                25.00,
                40.00,
                'active'
            )
        `);

        // 4. Seed Proposal Signature
        await client.query(`
            INSERT INTO core_comercial.proposal_signatures (
                id, empresa_id, estimacion_id, status, signature_token, otp_code, otp_expires_at, document_url
            ) VALUES (
                '44444444-4444-4444-4444-444444444444',
                'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d',
                '11111111-1111-1111-1111-111111111111',
                'pending_signature',
                '00000000-0000-0000-0000-000000000000',
                '123456',
                NOW() + INTERVAL '1 hour',
                'test-proposta.docx'
            )
        `);

        console.log("Seeding successful. Now executing the transaction to approve/convert estimation...");

        // 5. Run the transaction
        await client.query('BEGIN;');
        await client.query("SELECT set_config('request.jwt.claim.sub', 'ee4320ae-2d42-419e-a4a1-6f30f41d3680', true);");
        
        // Insert audit log
        await client.query(`
            INSERT INTO core_comercial.proposal_audit_logs (
                proposal_signature_id, ip_address, user_agent, verification_code,
                signature_image, email_or_phone_used
            ) VALUES (
                '44444444-4444-4444-4444-444444444444',
                '127.0.0.1',
                'Integration-Test',
                '123456',
                'data:image/png;base64,mockedSignatureImageBase64',
                'billing@client.com'
            )
        `);

        // Update proposal signature status
        await client.query(`
            UPDATE core_comercial.proposal_signatures
            SET status = 'signed', signed_at = NOW(), otp_code = null, otp_expires_at = null
            WHERE id = '44444444-4444-4444-4444-444444444444'
        `);

        // Call approval RPC
        const rpcRes = await client.query("SELECT core_comercial.aprovar_estimacion('11111111-1111-1111-1111-111111111111') AS result;");
        console.log("RPC Approval Result:", JSON.stringify(rpcRes.rows[0].result, null, 2));

        await client.query('COMMIT;');
        console.log("Transaction committed successfully!");

        // 6. Verify outputs in DB
        console.log("Verifying generated Pedido...");
        const pedRes = await client.query("SELECT id, codigo, source_estimacion_id, client_id, total_cost_snapshot FROM core_comercial.pedidos WHERE source_estimacion_id = '11111111-1111-1111-1111-111111111111';");
        console.log("Pedido details:", pedRes.rows);

        console.log("Verifying generated Solicitud Operativa...");
        const solRes = await client.query("SELECT id, codigo, tipo, status, client_id FROM core_operacoes.solicitudes_operativas WHERE pedido_id = $1;", [pedRes.rows[0].id]);
        console.log("Solicitud details:", solRes.rows);

        console.log("Verifying generated Playbook Tasks...");
        const tasksRes = await client.query("SELECT id, title, status FROM core_operacoes.solicitud_tareas WHERE solicitud_id = $1;", [solRes.rows[0].id]);
        console.log("Tasks created:", tasksRes.rows);

        console.log("Verification finished successfully!");

    } catch (err) {
        console.error("Test execution failed:", err);
    } finally {
        await client.end();
    }
}

run();
