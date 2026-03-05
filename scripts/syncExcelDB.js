import { createRequire } from 'module';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const xlsx = require('xlsx');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function bulkUpsert() {
    console.log('Reading Excel file...');
    const workbook = xlsx.readFile('dados_sharepoint/Control Personal - ATUALIZADO.xlsx');
    const sheet = workbook.Sheets['Control de trabajadores'];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    let headerRowIndex = -1;
    let headers = [];
    for (let i = 0; i < Math.min(20, rawData.length); i++) {
        if (rawData[i].some(col => String(col).includes('CodColab') || String(col).includes('NOMBRE') || String(col).includes('Cod Colab'))) {
            headerRowIndex = i;
            headers = rawData[i];
            break;
        }
    }

    const workersFromExcelMap = new Map();
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || !row.length) continue;

        let codColab = null, statusSeguridad = null, fechaAlta = null, fechaBaja = null, statusTrabajador = null;
        let contratante = null, ubicacion = null;
        for (let j = 0; j < headers.length; j++) {
            const head = headers[j]?.trim();
            const val = row[j];
            if (!head || val === undefined || val === null) continue;

            if (head === 'CodColab') codColab = String(val).trim();
            if (head === 'STATUS') statusSeguridad = String(val).trim();
            if (head === 'FECHA ALTA') fechaAlta = val;
            if (head === 'FECHA BAJA') fechaBaja = val;
            if (head === 'STATUS TRABAJADOR') statusTrabajador = String(val).trim();
            if (head === 'CONTRATANTE') contratante = String(val).trim();
            if (head.includes('UBICACI')) ubicacion = String(val).trim();
        }

        const statusPriority = {
            'ACTIVO': 3,
            'PENDIENTE INGRESAR': 2,
            'INACTIVO': 1
        };

        const getPriority = (status) => {
            const upperStatus = String(status || '').toUpperCase();
            return statusPriority[upperStatus] || 0;
        };

        if (codColab) {
            const currentPriority = getPriority(statusTrabajador);
            const existing = workersFromExcelMap.get(codColab);

            let shouldUpdate = false;
            if (!existing) {
                shouldUpdate = true;
            } else {
                const existingPriority = getPriority(existing.status_trabajador);
                if (currentPriority > existingPriority) {
                    shouldUpdate = true;
                } else if (currentPriority === existingPriority) {
                    const currentIn = Number(fechaAlta) || 0;
                    const existingIn = Number(existing.raw_fecha_alta) || 0;
                    if (currentIn > existingIn) {
                        shouldUpdate = true;
                    }
                }
            }

            if (shouldUpdate) {
                const parseDate = (d) => {
                    if (typeof d === 'number') {
                        const date = new Date((d - (25567 + 2)) * 86400 * 1000);
                        return date.toISOString().split('T')[0];
                    }
                    return d ? String(d) : null;
                };

                let normalizedContratante = contratante;
                if (contratante) {
                    const upper = contratante.toUpperCase();
                    if (upper.includes('KOTRIK & ROSAS') || upper.includes('KOTRIK ROSAS')) {
                        normalizedContratante = 'KOTRIK ROSAS';
                    } else if (upper.includes('KOTRIK INDUSTRIAL')) {
                        normalizedContratante = 'KOTRIK INDUSTRIAL';
                    } else if (upper.includes('TRIANGULO')) {
                        normalizedContratante = 'TRIANGULO';
                    } else if (upper.includes('STOCCO')) {
                        normalizedContratante = 'STOCCO';
                    } else if (upper.includes('WISEOWE')) {
                        normalizedContratante = 'WISEOWE';
                    } else if (upper.includes('LUMINOUS')) {
                        normalizedContratante = 'LUMINOUS';
                    } else if (upper.includes('MAGENTECHO')) {
                        normalizedContratante = 'MAGENTECHO';
                    } else {
                        normalizedContratante = upper;
                    }
                }

                workersFromExcelMap.set(codColab, {
                    cod_colab: codColab,
                    status_seguridad: statusSeguridad,
                    fecha_alta: parseDate(fechaAlta),
                    fecha_baja: parseDate(fechaBaja),
                    status_trabajador: statusTrabajador,
                    contratante: normalizedContratante,
                    ubicacion,
                    raw_fecha_alta: fechaAlta
                });
            }
        }
    }

    const workersFromExcel = Array.from(workersFromExcelMap.values());

    console.log(`Parsed ${workersFromExcel.length} workers from Excel.`);

    // 1. Fetch all IDs using pagination
    console.log('Fetching all IDs from database...');
    let allDbRecords = [];
    let from = 0;
    let limit = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data: dbRecords, error: dbError } = await supabase
            .from('colaboradores')
            .select('id, cod_colab')
            .range(from, from + limit - 1);

        if (dbError) throw dbError;

        if (dbRecords.length > 0) {
            allDbRecords = allDbRecords.concat(dbRecords);
            from += limit;
        }
        if (dbRecords.length < limit) {
            hasMore = false;
        }
    }

    const dbMap = new Map();
    allDbRecords.forEach(r => dbMap.set(r.cod_colab, r.id));

    // 2. Build upsert array
    const toUpsert = [];
    for (const w of workersFromExcel) {
        const id = dbMap.get(w.cod_colab);
        if (id) {
            toUpsert.push({
                id: id,
                cod_colab: w.cod_colab,
                status_seguridad: w.status_seguridad,
                fecha_alta: w.fecha_alta,
                fecha_baja: w.fecha_baja,
                status_trabajador: w.status_trabajador,
                contratante: w.contratante,
                ubicacion: w.ubicacion
            });
        }
    }

    console.log(`Prepared ${toUpsert.length} records for upserting.`);

    // 3. Chunked Updates using Promise.all
    const batchSize = 100;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < toUpsert.length; i += batchSize) {
        const chunk = toUpsert.slice(i, i + batchSize);
        console.log(`Updating batch ${i / batchSize + 1} / ${Math.ceil(toUpsert.length / batchSize)} (${chunk.length} items)...`);

        const promises = chunk.map(w => {
            return supabase
                .from('colaboradores')
                .update({
                    status_seguridad: w.status_seguridad,
                    fecha_alta: w.fecha_alta,
                    fecha_baja: w.fecha_baja,
                    status_trabajador: w.status_trabajador,
                    contratante: w.contratante,
                    ubicacion: w.ubicacion
                })
                .eq('id', w.id);
        });

        const results = await Promise.all(promises);

        for (const res of results) {
            if (res.error) {
                failCount++;
                // console.error(res.error.message);
            } else {
                successCount++;
            }
        }
    }

    console.log(`\nCompleted all concurrent updates! Success: ${successCount}. Failures: ${failCount}.`);
}

bulkUpsert().catch(console.error);
