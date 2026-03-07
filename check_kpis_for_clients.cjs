require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const EMPRESA_ID = '827bbf0d-5119-4e60-bc47-2938a2782472';

async function fetchAll(table, select) {
    let all = [];
    let from = 0;
    while (true) {
        const { data, error } = await supabase.from(table).select(select).range(from, from + 999);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < 1000) break;
        from += 1000;
    }
    return all;
}

async function fetchAllSchema(schema, table, select, eqFilter) {
    let all = [];
    let from = 0;
    while (true) {
        let q = supabase.schema(schema).from(table).select(select).range(from, from + 999);
        if (eqFilter) q = q.eq(eqFilter.col, eqFilter.val);
        const { data, error } = await q;
        if (error) throw error;
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < 1000) break;
        from += 1000;
    }
    return all;
}

async function calculateClientSums() {
    const workers = await fetchAllSchema('core_personal', 'workers', 'cod_colab, status_trabajador, status_seguridad', { col: 'empresa_id', val: EMPRESA_ID });
    const assignments = await fetchAll('colaborador_por_pedido', 'cod_colab, cliente_nombre, fechafinpedido, fechasalidatrabajador, inserted_at, fechainiciopedido');

    console.log(`Loaded ${workers.length} workers and ${assignments.length} assignments.`);

    // Group assignments by cod_colab
    const assigMap = {};
    for (const a of assignments) {
        if (!assigMap[a.cod_colab]) assigMap[a.cod_colab] = [];
        assigMap[a.cod_colab].push(a);
    }

    const activeClientMap = {};
    for (const cod_colab in assigMap) {
        const list = assigMap[cod_colab];
        list.sort((a, b) => {
            const aSalida = (!a.fechasalidatrabajador || new Date(a.fechasalidatrabajador) >= new Date()) ? 0 : 1;
            const bSalida = (!b.fechasalidatrabajador || new Date(b.fechasalidatrabajador) >= new Date()) ? 0 : 1;
            if (aSalida !== bSalida) return aSalida - bSalida;

            const aFin = (!a.fechafinpedido || new Date(a.fechafinpedido) >= new Date()) ? 0 : 1;
            const bFin = (!b.fechafinpedido || new Date(b.fechafinpedido) >= new Date()) ? 0 : 1;
            if (aFin !== bFin) return aFin - bFin;

            const aInserted = new Date(a.inserted_at || 0).getTime();
            const bInserted = new Date(b.inserted_at || 0).getTime();
            if (aInserted !== bInserted) return bInserted - aInserted;

            const aInicio = new Date(a.fechainiciopedido || 0).getTime();
            const bInicio = new Date(b.fechainiciopedido || 0).getTime();
            return bInicio - aInicio;
        });
        activeClientMap[cod_colab] = list[0].cliente_nombre;
    }

    const checkClients = ['CORDOBA', 'BACHILLER', 'HGL'];
    console.log('--- NÚMEROS REAIS OBTIDOS DIRETAMENTE NO NODEJS ---');
    for (const client of checkClients) {
        let ativos = 0;
        for (const w of workers) {
            const wClient = activeClientMap[w.cod_colab] || '';
            if (wClient.toUpperCase().includes(client)) {
                const s = (w.status_trabajador || '').toUpperCase();
                if (s.includes('ATIVO') || s.includes('ACTIVO')) {
                    if (!s.includes('INATIVO') && !s.includes('INACTIVO')) {
                        ativos++;
                    }
                }
            }
        }
        console.log(`Cliente: ${client} | Trabalhadores Ativos: ${ativos}`);
    }
}

calculateClientSums();
