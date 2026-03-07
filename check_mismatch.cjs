require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const EMPRESA_ID = '827bbf0d-5119-4e60-bc47-2938a2782472';
const EXCEL_PATH = 'C:\\Users\\theva\\Downloads\\Control Personal - ATUALIZADO.xlsx';

async function fetchAll(table, select) {
    let all = []; let from = 0;
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
    let all = []; let from = 0;
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

async function verifyMismatch() {
    console.log('Autenticando API via login service role pattern...');
    const { data: sessionData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'valter@gestaologinpro.com',
        password: 'stkrt@2026'
    });

    let dbWorkers = [];
    if (authError) {
        console.log('Login failed (Invalid credentials), extracting from search_workers RPC...');
        let from = 1;
        while (true) {
            const { data } = await supabase.schema('core_personal').rpc('search_workers', {
                p_empresa_id: EMPRESA_ID,
                p_status_trabajador_filter: ['ativos'],
                p_page_size: 1000,
                p_page: from
            });
            if (!data || data.length === 0) break;
            dbWorkers = dbWorkers.concat(data);
            if (data.length < 1000) break;
            from++;
        }
    } else {
        const workers = await fetchAllSchema('core_personal', 'workers', 'id, cod_colab, nome, pasaporte, nie, nif, dni, niss, email, status_trabajador, status_seguridad', { col: 'empresa_id', val: EMPRESA_ID });
        const assignments = await fetchAll('colaborador_por_pedido', 'cod_colab, cliente_nombre, fechafinpedido, fechasalidatrabajador, inserted_at, fechainiciopedido');

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

        for (const w of workers) {
            const s = (w.status_trabajador || '').toUpperCase();
            if (s.includes('ATIVO') || s.includes('ACTIVO')) {
                if (!s.includes('INATIVO') && !s.includes('INACTIVO')) {
                    w.cliente_nombre = activeClientMap[w.cod_colab] || 'SEM CLIENTE';
                    dbWorkers.push(w);
                }
            }
        }
    }

    console.log(`\n1. Encontrados ${dbWorkers.length} trabalhadores ATIVOS no Sistema (DB).`);

    let workbook;
    try {
        workbook = xlsx.readFile(EXCEL_PATH);
    } catch (e) {
        console.error('ERRO: Não encontrou o Excel:', e.message);
        return;
    }

    const sheetName = workbook.SheetNames[0];
    const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

    const targetClients = ['BACHILLER', 'HGL', 'CORDOBA'];
    const relatorio = {};

    for (const target of targetClients) {
        const sysList = dbWorkers.filter(w => (w.cliente_nombre || '').toUpperCase().includes(target));

        let excelList = rawData.filter(r => {
            const c = (r['CLIENTE'] || r['CLIENTE '] || '').toString().trim().toUpperCase();
            return c.includes(target);
        });

        const excelAtivos = excelList.filter(row => {
            const fBaja = (row['FECHA BAJA'] || row['FECHABAJA'] || '').toString().trim();
            return fBaja === '';
        });

        relatorio[target] = {
            sistema_ativos: sysList.length,
            excel_ativos: excelAtivos.length,
            no_excel_mas_sem_sistema: [],
            no_sistema_mas_sem_excel: []
        };

        const sysDocSet = new Set(sysList.map(w => (w.pasaporte || w.nif || w.nie || w.dni || w.cod_colab || '').trim().toUpperCase()));

        for (const row of excelAtivos) {
            const doc = (row['Pasaporte/NIE '] || row['Pasaporte/NIE'] || row['NIF'] || row['NIF / NIE'] || '').toString().trim().toUpperCase();
            const nome = (row['Nombre '] || row['Nombre'] || '').toString().trim();

            if (doc && !sysDocSet.has(doc)) {
                relatorio[target].no_excel_mas_sem_sistema.push({ nome, doc });
            }
        }

        const excelDocSet = new Set(excelAtivos.map(r => (r['Pasaporte/NIE '] || r['Pasaporte/NIE'] || r['NIF'] || r['NIF / NIE'] || '').toString().trim().toUpperCase()));
        for (const w of sysList) {
            const doc = (w.pasaporte || w.nif || w.nie || w.dni || w.cod_colab || '').trim().toUpperCase();
            if (doc && !excelDocSet.has(doc)) {
                relatorio[target].no_sistema_mas_sem_excel.push({ nome: w.nome, doc });
            }
        }
    }

    const fs = require('fs');
    fs.writeFileSync('divergencias.json', JSON.stringify(relatorio, null, 2));
    console.log('Finalizado. Salvo em divergencias.json.');
}

verifyMismatch();
