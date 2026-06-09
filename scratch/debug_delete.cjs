const { Client } = require('pg');
const devConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

const ESTIMACION_ID = '11111111-1111-1111-1111-111111111111';
const SIGNATURE_ID = '44444444-4444-4444-4444-444444444444';

const queries = [
  {
    name: 'solicitud_tareas delete',
    sql: `DELETE FROM core_operacoes.solicitud_tareas WHERE solicitud_id IN (
        SELECT id FROM core_operacoes.solicitudes_operativas WHERE client_id = 'b3113ee0-89cd-4c75-b4e7-63167c0a0af2' AND pedido_id IN (
            SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id = '${ESTIMACION_ID}'
        )
    );`
  },
  {
    name: 'solicitud_timeline delete',
    sql: `DELETE FROM core_operacoes.solicitud_timeline WHERE solicitud_id IN (
        SELECT id FROM core_operacoes.solicitudes_operativas WHERE client_id = 'b3113ee0-89cd-4c75-b4e7-63167c0a0af2' AND pedido_id IN (
            SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id = '${ESTIMACION_ID}'
        )
    );`
  },
  {
    name: 'solicitudes_operativas delete',
    sql: `DELETE FROM core_operacoes.solicitudes_operativas WHERE client_id = 'b3113ee0-89cd-4c75-b4e7-63167c0a0af2' AND pedido_id IN (
        SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id = '${ESTIMACION_ID}'
    );`
  },
  {
    name: 'pedido_status_history delete',
    sql: `DELETE FROM core_comercial.pedido_status_history WHERE pedido_id IN (
        SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id = '${ESTIMACION_ID}'
    );`
  },
  {
    name: 'pedido_events delete',
    sql: `DELETE FROM core_comercial.pedido_events WHERE pedido_id IN (
        SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id = '${ESTIMACION_ID}'
    );`
  },
  {
    name: 'pedido_items delete',
    sql: `DELETE FROM core_comercial.pedido_items WHERE pedido_id IN (
        SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id = '${ESTIMACION_ID}'
    );`
  },
  {
    name: 'pedidos delete',
    sql: `DELETE FROM core_comercial.pedidos WHERE source_estimacion_id = '${ESTIMACION_ID}';`
  },
  {
    name: 'proposal_audit_logs delete',
    sql: `DELETE FROM core_comercial.proposal_audit_logs WHERE proposal_signature_id = '${SIGNATURE_ID}';`
  },
  {
    name: 'proposal_signatures delete',
    sql: `DELETE FROM core_comercial.proposal_signatures WHERE id = '${SIGNATURE_ID}';`
  },
  {
    name: 'estimaciones update current_version_id',
    sql: `UPDATE core_comercial.estimaciones SET current_version_id = NULL WHERE id = '${ESTIMACION_ID}';`
  },
  {
    name: 'estimacion_items delete',
    sql: `DELETE FROM core_comercial.estimacion_items WHERE estimacion_id = '${ESTIMACION_ID}';`
  },
  {
    name: 'estimacion_versions delete',
    sql: `DELETE FROM core_comercial.estimacion_versions WHERE estimacion_id = '${ESTIMACION_ID}';`
  },
  {
    name: 'estimaciones delete',
    sql: `DELETE FROM core_comercial.estimaciones WHERE id = '${ESTIMACION_ID}';`
  }
];

async function run() {
    const client = new Client({ connectionString: devConnectionString });
    try {
        await client.connect();
        for (const query of queries) {
            console.log(`Running: ${query.name}...`);
            try {
                const res = await client.query(query.sql);
                console.log(`Success: ${res.rowCount} rows affected.`);
            } catch (err) {
                console.error(`FAILED: ${query.name}:`, err.message);
            }
        }
    } catch (e) {
        console.error("ERROR:", e);
    } finally {
        await client.end();
    }
}
run();
