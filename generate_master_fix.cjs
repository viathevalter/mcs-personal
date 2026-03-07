require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function generateMasterFix() {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

    const { data: workers, error: workersErr } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, empresa_id, nome, status_seguridad, status_trabajador')
        .or('status_trabajador.ilike.Ativo,status_trabajador.ilike.Activo');

    const relevantWorkers = workers.filter(w => {
        const s = (w.status_seguridad || '').toLowerCase();
        return s.includes('alta') || s.includes('pendente') || s.includes('pendiente');
    });

    const { data: segStatus } = await supabase
        .schema('core_personal')
        .from('seguridade_status')
        .select('worker_id, status');

    const workerCards = new Set(segStatus.map(st => st.worker_id));

    let sqlOutput = `-- SCRIPT DEFINITIVO DE CORREÇÃO (MASTER FIX)\n`;
    sqlOutput += `BEGIN;\n\n`;

    sqlOutput += `-- 1. CORREÇÃO DA FUNÇÃO DE CLIENTE NO SCHEMA CORRETO (core_personal)\n`;
    sqlOutput += `CREATE OR REPLACE FUNCTION core_personal.fn_get_active_client_for_worker(p_cod_colab text)\n`;
    sqlOutput += ` RETURNS text\n`;
    sqlOutput += ` LANGUAGE sql\n`;
    sqlOutput += ` STABLE\n`;
    sqlOutput += `AS $function$\n`;
    sqlOutput += `  SELECT cpp.cliente_nombre \n`;
    sqlOutput += `  FROM public.colaborador_por_pedido cpp \n`;
    sqlOutput += `  WHERE cpp.cod_colab = p_cod_colab \n`;
    sqlOutput += `  ORDER BY \n`;
    sqlOutput += `    CASE WHEN cpp.fechasalidatrabajador IS NULL OR cpp.fechasalidatrabajador >= CURRENT_DATE THEN 0 ELSE 1 END,\n`;
    sqlOutput += `    CASE WHEN cpp.fechafinpedido IS NULL OR cpp.fechafinpedido >= CURRENT_DATE THEN 0 ELSE 1 END,\n`;
    sqlOutput += `    cpp.inserted_at DESC,\n`;
    sqlOutput += `    cpp.fechainiciopedido DESC NULLS LAST\n`;
    sqlOutput += `  LIMIT 1;\n`;
    sqlOutput += `$function$;\n\n`;

    sqlOutput += `-- 2. INSERÇÃO DOS CARDS DE SEGURIDADE FALTANTES\n`;

    let insertedCount = 0;
    for (const worker of relevantWorkers) {
        if (!workerCards.has(worker.id)) {
            let workflowStatus = 'pendente';
            const secStr = (worker.status_seguridad || '').toLowerCase();

            if (secStr === 'alta' || secStr === 'alta confirmada') {
                workflowStatus = 'confirmado';
            } else if (secStr.includes('pendente') || secStr.includes('pendiente')) {
                workflowStatus = 'pendente';
            } else {
                workflowStatus = 'confirmado';
            }

            sqlOutput += `INSERT INTO core_personal.seguridade_status (worker_id, empresa_id, origem, status, tipo_evento, data_solicitacao) VALUES ('${worker.id}', '${worker.empresa_id}', 'Sistema / Excel Sync', '${workflowStatus}', 'alta', '${new Date().toISOString()}');\n`;
            insertedCount++;
        }
    }

    sqlOutput += `\nCOMMIT;\n`;

    fs.writeFileSync('master_fix.sql', sqlOutput);
    console.log(`Generated master_fix.sql with ${insertedCount} inserted Kanban cards.`);
}

generateMasterFix();
