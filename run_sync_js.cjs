require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');
const path = require('path');

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
if (!url || !key) { console.error('Missing Supabase credentials'); process.exit(1); }

const supabase = createClient(url, key, { auth: { persistSession: false } });

const filePath = path.join('C:\\\\', 'Projetos IA', 'Kotrik', 'mcs-personal', 'dados_sharepoint', 'trabalhadores_alta.xlsx');
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('planilla'));
const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName || 'Planilla_3'], { header: 1 });

const header = rawData[0];
const data = rawData.slice(1);

function getColIdx(namePart) { return header.findIndex(h => h && h.toLowerCase().includes(namePart.toLowerCase())); }

const idxCodColab = getColIdx('CodColab');
const idxNombre = getColIdx('NOMBRE');
const idxStatusTrab = getColIdx('STATUS TRABAJADOR');
const idxStatusSeg = getColIdx('STATUSSEGURIDADE');
const idxEmpresa = getColIdx('EmpresaHo');
const idxCodCliente = getColIdx('cod_cliente');
const idxNomeCliente = getColIdx('NomeCliente');
const idxFuncion = getColIdx('Función Trabajador') > -1 ? getColIdx('Función Trabajador') : getColIdx('Funcion');

async function getAllRows(table, selectStr) {
    let allData = [];
    let start = 0;
    while(true) {
        let { data, error } = await supabase.from(table).select(selectStr).range(start, start + 999);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < 1000) break;
        start += 1000;
    }
    return allData;
}

async function run() {
    console.log('Fetching reference tables...');
    const dbEmpresas = await getAllRows('empresas', 'id, nome_pbi');
    const dbClientes = await getAllRows('clientes', 'sp_id, nombre_comercial');
    const dbColabs = await getAllRows('colaboradores', 'id, cod_colab');
    
    const { data: maxSpIdQuery } = await supabase.from('colaborador_por_pedido').select('sp_id').order('sp_id', { ascending: false }).limit(1);
    let currentSpId = maxSpIdQuery && maxSpIdQuery.length > 0 ? maxSpIdQuery[0].sp_id : 8161;

    const empresaMap = new Map();
    dbEmpresas?.forEach(e => empresaMap.set(e.nome_pbi.toLowerCase(), e.id));

    const clienteMap = new Map();
    dbClientes?.forEach(c => clienteMap.set(c.nombre_comercial.toLowerCase(), c.sp_id));

    const colabMap = new Map();
    dbColabs?.forEach(c => colabMap.set(c.cod_colab.toUpperCase(), c.id));

    console.log(`Loaded ${empresaMap.size} empresas, ${clienteMap.size} clientes, ${colabMap.size} colabs. Starting SP ID at ${currentSpId}`);

    let successCount = 0;
    let assignmentCount = 0;
    
    for (const row of data) {
        if (!row || row.length === 0) continue;
        const codColab = row[idxCodColab] ? String(row[idxCodColab]).trim().toUpperCase() : '';
        if (!codColab || !codColab.startsWith('E')) continue;

        const rawStatusTrabajador = row[idxStatusTrab] ? String(row[idxStatusTrab]).trim() : '';
        const rawStatusSeg = row[idxStatusSeg] ? String(row[idxStatusSeg]).trim() : '';
        const rawEmpresa = row[idxEmpresa] ? String(row[idxEmpresa]).trim() : '';
        const rawCodCliente = row[idxCodCliente] ? String(row[idxCodCliente]).trim() : '';
        const rawNomeCliente = row[idxNomeCliente] ? String(row[idxNomeCliente]).trim() : '';
        const rawNome = row[idxNombre] ? String(row[idxNombre]).trim() : '';
        const rawFuncion = row[idxFuncion] ? String(row[idxFuncion]).trim() : '';

        const lowerStatus = rawStatusTrabajador.toLowerCase();
        let cleanStatusTrab = 'Inativo';
        if (lowerStatus.includes('activo')) cleanStatusTrab = 'Ativo';
        else if (lowerStatus.includes('regulariza')) cleanStatusTrab = 'Em Regularização';
        else if (lowerStatus.includes('pending') || lowerStatus.includes('pendiente') || lowerStatus.includes('pendente')) cleanStatusTrab = 'Pendente Ingresso';

        const empresaSafe = rawEmpresa.replace(/'/g, "''");
        const funcSafe = rawFuncion.replace(/'/g, "''");
        const segSafe = rawStatusSeg.replace(/'/g, "''");

        const updateSql = `
            UPDATE public.colaboradores 
            SET status_trabajador = '${cleanStatusTrab}', 
                status_seguridad = '${segSafe}',
                contratante = NULLIF('${empresaSafe}', ''),
                funcion = COALESCE(NULLIF('${funcSafe}', ''), funcion)
            WHERE cod_colab = '${codColab}';
        `;

        const { error: errColab } = await supabase.rpc('fn_sys_execute_sql', { q: updateSql });
            
        if (errColab) {
            console.error(`Row error [${codColab}]:`, errColab.message);
            continue;
        }

        // 2. ASSIGNMENT
        if (cleanStatusTrab === 'Ativo' && rawNomeCliente) {
            const v_idcolab = colabMap.get(codColab);
            const v_idempresa = Array.from(empresaMap.entries()).find(([k]) => k.includes(rawEmpresa.toLowerCase()))?.[1];
            const v_idcliente = Array.from(clienteMap.entries()).find(([k]) => k.includes(rawNomeCliente.toLowerCase()))?.[1];

            if (v_idcolab) {
                // Check if already active on the SAME client
                const { data: activeCards } = await supabase
                    .from('colaborador_por_pedido')
                    .select('id, cliente_nombre, idcliente')
                    .eq('cod_colab', codColab)
                    .is('fechasalidatrabajador', null);
                
                let alreadyExists = false;
                if (activeCards && activeCards.length > 0) {
                    for (const card of activeCards) {
                        if (card.cliente_nombre?.toLowerCase() === rawNomeCliente.toLowerCase() ||
                            card.idcliente === v_idcliente) {
                            alreadyExists = true;
                        } else {
                            await supabase.rpc('fn_sys_execute_sql', { q: `UPDATE public.colaborador_por_pedido SET fechasalidatrabajador = CURRENT_DATE WHERE id = ${card.id};` });
                        }
                    }
                }

                if (!alreadyExists) {
                    currentSpId++;
                    const cNombreSafe = rawNomeCliente.replace(/'/g, "''");
                    const cRawSafe = rawNome.replace(/'/g, "''");
                    const insertSql = `
                        INSERT INTO public.colaborador_por_pedido 
                        (sp_id, idcolaborador, cod_colab, nome_colab, idcliente, codcliente, cliente_nombre, idempresa, contratante, fechainiciopedido)
                        VALUES 
                        (${currentSpId}, '${v_idcolab}', '${codColab}', '${cRawSafe}', ${v_idcliente || 'NULL'}, '${rawCodCliente}', '${cNombreSafe}', ${v_idempresa || 'NULL'}, '${empresaSafe}', CURRENT_DATE);
                    `;
                    const { error: errAssign } = await supabase.rpc('fn_sys_execute_sql', { q: insertSql });

                    if (errAssign) {
                        console.error(`Assignment error [${codColab}]:`, errAssign.message);
                    } else {
                        assignmentCount++;
                    }
                }
            }
        }
        successCount++;
        if (successCount % 50 === 0) console.log(`Processed ${successCount} records...`);
    }

    console.log(`Finished processing ${successCount} valid workers. Created ${assignmentCount} new assignments.`);
}

run();
