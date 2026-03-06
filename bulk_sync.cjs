const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function standardizeStatus(status) {
    if (status === undefined || status === null) return null;
    return status.toString().trim();
}

async function run() {
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'valter@gestaologinpro.com',
        password: 'stkrt@2026'
    });
    if (authErr) {
        console.error("Auth Error:", authErr.message);
        return;
    }
    console.log("Logged in as Valter.");

    const workbook = xlsx.readFile('dados_sharepoint/Control Personal - ATUALIZADO.xlsx');
    const worksheet = workbook.Sheets['Control de trabajadores'];
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    let headerRowIndex = -1;
    for (let i = 0; i < 10; i++) {
        if (rawData[i] && rawData[i].includes('CodColab')) {
            headerRowIndex = i;
            break;
        }
    }

    if (headerRowIndex === -1) {
        console.error("Could not find headers in Excel.");
        return;
    }

    const headers = rawData[headerRowIndex];
    const excelWorkers = {};
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;
        let rowObj = {};
        headers.forEach((h, idx) => {
            if (h) rowObj[h] = row[idx];
        });

        const codColab = standardizeStatus(rowObj['CodColab']);
        if (codColab) {
            excelWorkers[codColab] = {
                nome: standardizeStatus(rowObj['NOMBRE']),
                statusTrabajador: standardizeStatus(rowObj['STATUS TRABAJADOR']),
                statusSeguridad: standardizeStatus(rowObj['STATUS'])
            };
        }
    }

    console.log(`Parsed ${Object.keys(excelWorkers).length} workers from Excel.`);

    let allWorkers = [];
    let page = 0;
    while (true) {
        const { data, error } = await supabase
            .schema('core_personal')
            .from('workers')
            .select('id, empresa_id, cod_colab, status_trabajador, status_seguridad')
            .range(page * 1000, (page + 1) * 1000 - 1);

        if (error) {
            console.error("Fetch workers error:", error.message);
            return;
        }
        if (!data || data.length === 0) break;
        allWorkers = allWorkers.concat(data);
        if (data.length < 1000) break;
        page++;
    }
    console.log(`Fetched ${allWorkers.length} workers from DB.`);

    const { data: pendingSeguridade, error: pendErr } = await supabase
        .schema('core_personal')
        .from('seguridade_status')
        .select('*')
        .eq('status', 'pendente');

    if (pendErr) {
        console.error("Fetch pending seguridade error:", pendErr.message);
        return;
    }
    const pendingByWorkerId = {};
    for (const p of pendingSeguridade) {
        if (!pendingByWorkerId[p.worker_id]) pendingByWorkerId[p.worker_id] = [];
        pendingByWorkerId[p.worker_id].push(p);
    }
    console.log(`Fetched ${pendingSeguridade.length} pending seguridade cards from DB.`);

    let workersUpdatedCount = 0;
    let cardsCreated = 0;
    let cardsCancelled = 0;

    for (const dbWorker of allWorkers) {
        const excelData = excelWorkers[dbWorker.cod_colab];
        if (!excelData) continue;

        let newTrab = excelData.statusTrabajador;
        let newSeg = excelData.statusSeguridad;

        const isInactive = newTrab && (newTrab.toLowerCase().includes('inativo') || newTrab.toLowerCase().includes('inactivo'));
        const isPendingSeg = newSeg && (newSeg.toLowerCase().includes('pendente') || newSeg.toLowerCase().includes('pendiente'));

        // Apply business rule: If inactive, cannot be pending in seguridade
        if (isInactive && isPendingSeg) {
            console.log(`Worker ${dbWorker.cod_colab} is inactive but has pending seguridade in Excel. Changing security status to 'Anulado'.`);
            newSeg = 'Anulado';
        }

        let needsUpdate = false;
        if (newTrab && newTrab !== dbWorker.status_trabajador) needsUpdate = true;
        if (newSeg && newSeg !== dbWorker.status_seguridad) needsUpdate = true;

        // Also sometimes Excel has 'null' text if user wrote it, handle actual null equivalence if needed
        if (!newTrab && dbWorker.status_trabajador) needsUpdate = true;
        if (!newSeg && dbWorker.status_seguridad) needsUpdate = true;

        if (needsUpdate) {
            const { error: updErr } = await supabase
                .schema('core_personal')
                .from('workers')
                .update({ status_trabajador: newTrab, status_seguridad: newSeg })
                .eq('id', dbWorker.id);
            if (updErr) {
                console.error(`Error updating worker ${dbWorker.cod_colab}:`, updErr.message);
            } else {
                workersUpdatedCount++;
            }
        }

        const existingCards = pendingByWorkerId[dbWorker.id] || [];

        if (isInactive) {
            // Cancel any existing pending cards for this worker
            for (const card of existingCards) {
                const { error: cancErr } = await supabase
                    .schema('core_personal')
                    .from('seguridade_status')
                    .update({ status: 'cancelado', observacoes: 'Cancelado via sync (Trabalhador inativo)' })
                    .eq('id', card.id);
                if (cancErr) {
                    console.error(`Error cancelling card ${card.id}:`, cancErr.message);
                } else {
                    cardsCancelled++;
                }
            }
        } else {
            // Check if we need to create a card
            const shouldBePendingAlta = newSeg && (newSeg.toLowerCase().includes('pendente alta') || newSeg.toLowerCase().includes('pendiente alta'));
            const shouldBePendingBaixa = newSeg && (newSeg.toLowerCase().includes('pendente baixa') || newSeg.toLowerCase().includes('pendiente baja'));

            if (shouldBePendingAlta || shouldBePendingBaixa) {
                const tipoEvento = shouldBePendingAlta ? 'alta' : 'baixa';
                const hasCard = existingCards.some(c => c.tipo_evento === tipoEvento);
                if (!hasCard) {
                    const { error: creErr } = await supabase
                        .schema('core_personal')
                        .from('seguridade_status')
                        .insert({
                            empresa_id: dbWorker.empresa_id,
                            worker_id: dbWorker.id,
                            tipo_evento: tipoEvento,
                            status: 'pendente',
                            origem: 'Importação Excel',
                            data_solicitacao: new Date().toISOString()
                        });
                    if (creErr) {
                        console.error(`Error creating card for ${dbWorker.cod_colab}:`, creErr.message);
                    } else {
                        cardsCreated++;
                    }
                }
            }
        }
    }

    console.log(`\n============================`);
    console.log(`Sync completed!`);
    console.log(`Workers updated in DB: ${workersUpdatedCount}`);
    console.log(`Seguridade Cards created: ${cardsCreated}`);
    console.log(`Seguridade Cards cancelled: ${cardsCancelled}`);
    console.log(`============================\n`);
}

run();
