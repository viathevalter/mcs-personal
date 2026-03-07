require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function fixMissingCards() {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

    console.log("Fetching active workers...");
    // 1. Fetch all Active workers
    const { data: workers, error: workersErr } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, empresa_id, nome, status_seguridad, status_trabajador')
        .or('status_trabajador.ilike.Ativo,status_trabajador.ilike.Activo');

    if (workersErr) {
        console.error("Error fetching workers:", workersErr);
        return;
    }

    console.log(`Found ${workers.length} active workers. Checking seguridade status...`);

    // Filter for workers that have some form of "Alta" or "Pendente" security status (i.e. not "Baixa" and not empty)
    const relevantWorkers = workers.filter(w => {
        const s = (w.status_seguridad || '').toLowerCase();
        return s.includes('alta') || s.includes('pendente') || s.includes('pendiente');
    });

    console.log(`Of those, ${relevantWorkers.length} have a relevant Security Status ('Alta' or 'Pendente').`);

    // 2. Fetch all existing seguridade_status records
    const { data: segStatus, error: segErr } = await supabase
        .schema('core_personal')
        .from('seguridade_status')
        .select('worker_id, status');

    if (segErr) {
        console.error("Error fetching seguridade_status:", segErr);
        return;
    }

    // Create a map to quickly check if a worker has a card
    const workerCards = new Map();
    for (const st of segStatus) {
        if (!workerCards.has(st.worker_id)) {
            workerCards.set(st.worker_id, []);
        }
        workerCards.get(st.worker_id).push(st);
    }

    const fs = require('fs');
    let sqlOutput = 'BEGIN;\n\n';
    let insertedCount = 0;

    for (const worker of relevantWorkers) {
        const cards = workerCards.get(worker.id) || [];

        if (cards.length === 0) {
            let workflowStatus = 'pendente';
            const secStr = (worker.status_seguridad || '').toLowerCase();

            if (secStr === 'alta' || secStr === 'alta confirmada') {
                workflowStatus = 'confirmado';
            } else if (secStr.includes('pendente') || secStr.includes('pendiente')) {
                workflowStatus = 'pendente';
            } else {
                workflowStatus = 'confirmado'; // fallback
            }

            console.log(`User ${worker.nome} needs a ticket. Inserting as ${workflowStatus}...`);

            sqlOutput += `INSERT INTO core_personal.seguridade_status (worker_id, empresa_id, origem, status, tipo_evento, data_solicitacao) VALUES ('${worker.id}', '${worker.empresa_id}', 'Sistema / Excel Sync', '${workflowStatus}', 'alta', '${new Date().toISOString()}');\n`;
            insertedCount++;
        }
    }

    sqlOutput += '\nCOMMIT;';
    fs.writeFileSync('fix_missing_seguridade_cards.sql', sqlOutput);

    console.log(`\nFinished! Generated SQL script to insert ${insertedCount} missing Kanban cards.`);
}

fixMissingCards();
