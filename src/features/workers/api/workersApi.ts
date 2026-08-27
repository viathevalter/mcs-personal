import { supabase } from '@/shared/supabase/client';
import { mapSupabaseError } from '@/shared/api/supabaseError';
import type { Worker } from '@/shared/types/corePersonal';

export interface ListWorkersParams {
    empresaId: string;
    search?: string;
    clienteNombre?: string[];
    statusTrabajador?: string[];
    statusSeguridad?: string[];
    contratante?: string;
    funcion?: string;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
    page: number;
    pageSize: number;
    periodMonth?: number;
    periodYear?: number;
}

export interface ListWorkersResponse {
    data: Worker[];
    count: number;
}

export async function listWorkers({ empresaId, search, clienteNombre, statusTrabajador, statusSeguridad, contratante, funcion, sortColumn, sortDirection, page, pageSize, periodMonth, periodYear }: ListWorkersParams): Promise<ListWorkersResponse> {
    const rpcArgs: any = {
        p_empresa_id: empresaId,
        p_search: search || null,
        p_cliente_nombre: clienteNombre && clienteNombre.length > 0 ? clienteNombre : null,
        p_status_trabajador_filter: statusTrabajador && statusTrabajador.length > 0 ? statusTrabajador : null,
        p_status_seguridad_filter: statusSeguridad && statusSeguridad.length > 0 ? statusSeguridad : null,
        p_contratante: contratante || null,
        p_funcion: funcion || null,
        p_sort_column: sortColumn || 'nome',
        p_sort_direction: sortDirection || 'asc',
        p_page: page,
        p_page_size: pageSize
    };

    if (periodMonth != null) rpcArgs.p_period_month = periodMonth;
    if (periodYear != null) rpcArgs.p_period_year = periodYear;

    const { data, error } = await supabase.schema('core_personal').rpc('search_workers', rpcArgs);

    if (error) {
        throw mapSupabaseError(error);
    }

    if (!data || data.length === 0) {
        return { data: [], count: 0 };
    }

    return {
        data: data as Worker[],
        count: Number(data[0].total_count) || 0,
    };
}

export async function getUniqueClients(): Promise<string[]> {
    const { data, error } = await supabase.schema('public').rpc('get_unique_clients');

    if (error) {
        throw mapSupabaseError(error);
    }

    return data ? data.map((row: any) => row.cliente_nombre) : [];
}

export interface GetHoursControlWorkersParams {
    empresaId: string;
    periodYear: number;
    periodMonth: number;
    contratante?: string | null;
    clienteNombre?: string | null;
}

export async function getHoursControlWorkers({ empresaId, periodYear, periodMonth, contratante, clienteNombre }: GetHoursControlWorkersParams): Promise<Worker[]> {
    const { data, error } = await supabase.schema('core_personal').rpc('get_hours_control_workers', {
        p_empresa_id: empresaId,
        p_period_year: periodYear,
        p_period_month: periodMonth,
        p_contratante: contratante || null,
        p_cliente_nombre: clienteNombre || null
    });

    if (error) {
        throw mapSupabaseError(error);
    }

    return (data || []) as Worker[];
}

import { normalizeEmpresaName, CANONICAL_EMPRESAS } from '@/shared/utils/empresaNormalizer';

export async function getUniqueContratantes(): Promise<string[]> {
    const { data, error } = await supabase.schema('public').rpc('get_unique_contratantes');

    if (error) {
        console.error("Error calling get_unique_contratantes RPC:", error);
    }

    const set = new Set<string>();
    CANONICAL_EMPRESAS.forEach(c => set.add(c));

    if (data) {
        data.forEach((row: any) => {
            const norm = normalizeEmpresaName(row.contratante || row);
            if (norm && norm !== 'LOGIN PRO') set.add(norm);
        });
    }

    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export async function updateWorker(id: string, updates: Partial<Worker>): Promise<void> {
    const { data: updatedWorker, error } = await supabase
        .schema('core_personal')
        .from('workers')
        .update({
            nome: updates.nome,
            email: updates.email,
            movil: updates.movil,
            niss: updates.niss,
            nif: updates.nif,
            nie: updates.nie,
            dni: updates.dni,
            pasaporte: updates.pasaporte,
            licencia_conducir: updates.licencia_conducir,
            nacionalidade: updates.nacionalidade,
            fecha_nacimiento: updates.fecha_nacimiento,
            nuss: updates.nuss,
            foto: updates.foto,
            status_trabajador: updates.status_trabajador,
            status_seguridad: updates.status_seguridad,
            camiseta: updates.camiseta,
            pantalones: updates.pantalones,
            funcion: updates.funcion,
        })
        .eq('id', id)
        .select('id');

    if (error) {
        throw mapSupabaseError(error);
    }
    
    if (!updatedWorker || updatedWorker.length === 0) {
        throw new Error("Falha ao atualizar o trabalhador. Verifique suas permissões (RLS).");
    }
}

export async function getUniqueFunciones(): Promise<string[]> {
    const { data, error } = await supabase.schema('public').rpc('get_unique_funciones');

    if (error) {
        throw mapSupabaseError(error);
    }

    return data ? data.map((row: any) => row.funcion) : [];
}

export interface ClientWorkerKpi {
    ativos: number;
    inativos: number;
    pendentes_ingreso: number;
    seguridade_alta: number;
    seguridade_pendente_alta: number;
    seguridade_em_regularizacao: number;
    seguridade_baixa: number;
    seguridade_pendente_baixa: number;
}

export async function getClientWorkerKpis(
    empresaId: string,
    search: string | null,
    clienteNombre: string[] | null,
    contratante: string | null,
    funcion: string | null
): Promise<ClientWorkerKpi> {
    const { data, error } = await supabase.schema('core_personal').rpc('get_client_worker_kpis', {
        p_empresa_id: empresaId,
        p_search: search || null,
        p_cliente_nombre: clienteNombre && clienteNombre.length > 0 ? clienteNombre : null,
        p_contratante: contratante || null,
        p_funcion: funcion || null
    });

    if (error) {
        throw mapSupabaseError(error);
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
        return {
            ativos: 0,
            inativos: 0,
            pendentes_ingreso: 0,
            seguridade_alta: 0,
            seguridade_pendente_alta: 0,
            seguridade_em_regularizacao: 0,
            seguridade_baixa: 0,
            seguridade_pendente_baixa: 0
        };
    }

    return data[0] as ClientWorkerKpi;
}

export async function getWorker(id: string): Promise<Worker | null> {
    const { data, error } = await supabase
        .schema('core_personal').from('workers')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw mapSupabaseError(error);
    }

    // Resolve empresa_id from contracts or assignments
    const { data: contractData } = await supabase
        .schema('core_personal')
        .from('contracts')
        .select('empresa_id')
        .eq('worker_id', id)
        .limit(1);

    let empresaId = contractData?.[0]?.empresa_id || null;

    if (!empresaId) {
        const { data: assignmentData } = await supabase
            .schema('core_personal')
            .from('worker_assignments')
            .select('empresa_id')
            .eq('worker_id', id)
            .limit(1);
        empresaId = assignmentData?.[0]?.empresa_id || null;
    }

    return {
        ...(data as Worker),
        empresa_id: empresaId || (data as Worker).empresa_id
    };
}

export async function upsertWorker(payload: Partial<Worker>): Promise<Worker> {
    const { data, error } = await supabase
        .schema('core_personal').from('workers')
        .upsert(payload)
        .select('*')
        .single();

    if (error) {
        throw mapSupabaseError(error);
    }

    return data as Worker;
}

export interface WorkerAlocacao {
    id: string | number;
    codpedido: string;
    cliente_nombre: string;
    contratante: string;
    tiposervico: string;
    fechainiciopedido: string | null;
    fechafinpedido: string | null;
    fechasalidatrabajador: string | null;
    funcion?: string | null;
    inserted_at: string;
    updated_at: string;
}

export async function getWorkerAlocacoes(workerCodColab: string): Promise<WorkerAlocacao[]> {
    const { data, error } = await supabase
        .schema('core_personal')
        .from('vw_worker_allocations')
        .select('*')
        .eq('cod_colab', workerCodColab)
        .order('inserted_at', { ascending: false });

    if (error) {
        throw mapSupabaseError(error);
    }

    return data as WorkerAlocacao[];
}

export interface AddManualAllocationParams {
    workerCodColab: string;
    workerName: string;
    cliente_nombre: string;
    contratante: string;
    funcion: string;
    fechainiciopedido: string;
    codpedido?: string;
}

export async function addManualAllocation(params: AddManualAllocationParams): Promise<void> {
    const fakeSpId = 9900000 + Math.floor(Math.random() * 100000); // 9.9M range to avoid collisions
    
    // First, check current worker status and retrieve ID
    const { data: worker, error: fetchError } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, status_seguridad, status_trabajador, niss')
        .eq('cod_colab', params.workerCodColab)
        .single();
        
    if (fetchError) throw mapSupabaseError(fetchError);

    // Determine if we need to trigger a Pendente Alta
    let newStatusSeguridad = worker.status_seguridad;
    
    // If worker was inactive or their security is Baixa/Pendente Baixa, they need a new Alta!
    // We only trigger this if they have a NISS. If no NISS, they go to Em Regularização typically? 
    // Actually, safest is to put Pendente Alta so the Kanban catches it.
    if (!worker.status_seguridad || worker.status_seguridad.toLowerCase().includes('baixa')) {
        newStatusSeguridad = worker.niss ? 'Pendente Alta' : 'Em Regularização';
    }

    const { error: allocError } = await supabase
        .schema('public')
        .from('colaborador_por_pedido')
        .insert({
            sp_id: fakeSpId,
            cod_colab: params.workerCodColab,
            nome_colab: params.workerName,
            cliente_nombre: params.cliente_nombre,
            contratante: params.contratante,
            fechainiciopedido: params.fechainiciopedido,
            tiposervico: 'Pedido Manual',
            codpedido: params.codpedido || `MANUAL-${fakeSpId}`,
            funcion: params.funcion
        });

    if (allocError) throw mapSupabaseError(allocError);

    // Resolve the company UUID from core_common.empresas matching params.contratante
    const { data: empresa } = await supabase
        .schema('core_common')
        .from('empresas')
        .select('id')
        .ilike('nome', params.contratante)
        .maybeSingle();

    const companyId = empresa?.id;

    const workerUpdates: any = {
        cliente: params.cliente_nombre,
        contratante: params.contratante,
        funcion: params.funcion,
        status_trabajador: 'Ativo',
        status_seguridad: newStatusSeguridad
    };

    // No empresa_id on global workers table

    const { error: workerError } = await supabase
        .schema('core_personal')
        .from('workers')
        .update(workerUpdates)
        .eq('cod_colab', params.workerCodColab);
        
    if (workerError) throw mapSupabaseError(workerError);

    // If companyId is resolved, update any active/pending or error tickets for the worker
    if (companyId && worker) {
        await supabase
            .schema('core_personal')
            .from('seguridade_status')
            .update({
                empresa_id: companyId,
                origem_cliente_nome: params.cliente_nombre,
                origem_contratante: params.contratante
            })
            .eq('worker_id', worker.id)
            .in('status', ['pendente', 'erro']);
    }
}

export interface UpdateWorkerAlocacaoParams {
    id: string | number;
    workerCodColab: string;
    cliente_nombre?: string;
    contratante?: string;
    funcion?: string;
    fechainiciopedido?: string;
    fechafinpedido?: string | null;
    fechasalidatrabajador?: string | null;
    codpedido?: string;
}

export async function updateWorkerAlocacao(params: UpdateWorkerAlocacaoParams): Promise<void> {
    const { id, workerCodColab, ...updates } = params;

    const idStr = String(id);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idStr);

    let companyId: string | undefined = undefined;
    if (updates.contratante) {
        const { data: empresa } = await supabase
            .schema('core_common')
            .from('empresas')
            .select('id')
            .ilike('nome', `%${updates.contratante}%`)
            .maybeSingle();
        if (empresa?.id) {
            companyId = empresa.id;
        }
    }

    if (isUuid) {
        // Alocação vinda de core_personal.worker_assignments
        const waUpdates: any = {};

        if (updates.fechainiciopedido !== undefined) {
            const dateStr = updates.fechainiciopedido || '';
            waUpdates.planned_start_date = dateStr || null;
            
            const todayStr = new Date().toISOString().split('T')[0];
            if (dateStr && dateStr > todayStr) {
                waUpdates.start_date = null;
                if (!updates.fechasalidatrabajador) {
                    waUpdates.status = 'planned';
                }
            } else {
                waUpdates.start_date = dateStr || null;
                if (!updates.fechasalidatrabajador && dateStr) {
                    waUpdates.status = 'active';
                }
            }
        }
        if (updates.fechafinpedido !== undefined) {
            waUpdates.planned_end_date = updates.fechafinpedido || null;
        }
        if (updates.fechasalidatrabajador !== undefined) {
            waUpdates.end_date = updates.fechasalidatrabajador || null;
            if (updates.fechasalidatrabajador) {
                waUpdates.status = 'completed';
            }
        }
        if (updates.funcion !== undefined) {
            waUpdates.job_function_name_snapshot = updates.funcion;
        }

        // Resolver empresa contratante (empresa_id)
        if (companyId) {
            waUpdates.empresa_id = companyId;
        }

        // Resolver cliente (client_id)
        if (updates.cliente_nombre) {
            const { data: client } = await supabase
                .schema('core_common')
                .from('clients')
                .select('id')
                .or(`trade_name.ilike.%${updates.cliente_nombre}%,legal_name.ilike.%${updates.cliente_nombre}%`)
                .maybeSingle();
            if (client?.id) {
                waUpdates.client_id = client.id;
            }
        }

        // Resolver pedido por código (pedido_id)
        if (updates.codpedido) {
            const { data: pedido } = await supabase
                .schema('core_comercial')
                .from('pedidos')
                .select('id, client_id, empresa_id')
                .ilike('codigo', `%${updates.codpedido}%`)
                .maybeSingle();
            if (pedido?.id) {
                waUpdates.pedido_id = pedido.id;
                if (pedido.client_id) waUpdates.client_id = pedido.client_id;
                if (pedido.empresa_id) waUpdates.empresa_id = pedido.empresa_id;
            }
        }

        const { error: waError } = await supabase
            .schema('core_personal')
            .from('worker_assignments')
            .update(waUpdates)
            .eq('id', idStr);

        if (waError) throw mapSupabaseError(waError);
    } else {
        // Alocação vinda da tabela legada public.colaborador_por_pedido
        const { error: allocError } = await supabase
            .schema('public')
            .from('colaborador_por_pedido')
            .update(updates)
            .eq('id', Number(id));

        if (allocError) throw mapSupabaseError(allocError);
    }

    // Sincronizar dados principais do trabalhador no perfil
    const workerUpdates: any = {};
    if (updates.cliente_nombre) workerUpdates.cliente = updates.cliente_nombre;
    if (updates.contratante) workerUpdates.contratante = updates.contratante;
    if (updates.funcion) workerUpdates.funcion = updates.funcion;

    if (Object.keys(workerUpdates).length > 0) {
        await supabase
            .schema('core_personal')
            .from('workers')
            .update(workerUpdates)
            .eq('cod_colab', workerCodColab);

        const colabUpdates: any = {};
        if (updates.contratante) colabUpdates.contratante = updates.contratante;
        if (updates.funcion) colabUpdates.funcion = updates.funcion;

        if (Object.keys(colabUpdates).length > 0) {
            await supabase
                .schema('public')
                .from('colaboradores')
                .update(colabUpdates)
                .eq('cod_colab', workerCodColab);
        }
    }

    // If we updated the contractor, sync the tickets too
    if (companyId) {
        const { data: worker } = await supabase
            .schema('core_personal')
            .from('workers')
            .select('id')
            .eq('cod_colab', workerCodColab)
            .single();

        if (worker) {
            const ticketUpdates: any = {
                empresa_id: companyId
            };
            if (updates.cliente_nombre) ticketUpdates.origem_cliente_nome = updates.cliente_nombre;
            if (updates.contratante) ticketUpdates.origem_contratante = updates.contratante;

            await supabase
                .schema('core_personal')
                .from('seguridade_status')
                .update(ticketUpdates)
                .eq('worker_id', worker.id)
                .in('status', ['pendente', 'erro']);
        }
    }
}

export interface ListSalaryReportWorkersParams {
    empresaId: string;
    periodYear: number;
    periodMonth: number;
    search?: string;
    contratante?: string;
    clienteNombre?: string[];
    statusSeguridad?: string[];
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
    page: number;
    pageSize: number;
}

export interface SalaryReportWorker extends Worker {
    dias_trabalhados: number;
    data_alta_seguridad: string | null;
    data_baixa_seguridad: string | null;
}

export interface ListSalaryReportWorkersResponse {
    data: SalaryReportWorker[];
    count: number;
}

export interface SalaryReportKpis {
    total_ativos_periodo: number;
    novos_admitidos: number;
    desligados: number;
}

export async function listSalaryReportWorkers(params: ListSalaryReportWorkersParams): Promise<ListSalaryReportWorkersResponse> {
    const { empresaId, periodYear, periodMonth, search, contratante, clienteNombre, statusSeguridad, sortColumn, sortDirection, page, pageSize } = params;
    
    const rpcArgs: any = {
        p_empresa_id: empresaId,
        p_period_year: periodYear,
        p_period_month: periodMonth,
        p_search: search || null,
        p_contratante: contratante || null,
        p_cliente_nombre: clienteNombre && clienteNombre.length > 0 ? clienteNombre : null,
        p_sort_column: sortColumn || 'nome',
        p_sort_direction: sortDirection || 'asc',
        p_page: page,
        p_page_size: pageSize,
        p_status_seguridad_filter: statusSeguridad && statusSeguridad.length > 0 ? statusSeguridad : null
    };

    const { data, error } = await supabase.schema('core_personal').rpc('get_salary_report_workers', rpcArgs);

    if (error) {
        throw mapSupabaseError(error);
    }

    if (!data || data.length === 0) {
        return { data: [], count: 0 };
    }

    return {
        data: data as SalaryReportWorker[],
        count: Number(data[0].total_count) || 0,
    };
}

export async function getSalaryReportKpis(
    empresaId: string,
    periodYear: number,
    periodMonth: number,
    search: string | null,
    contratante: string | null,
    clienteNombre: string[] | null,
    statusSeguridad: string[] | null
): Promise<SalaryReportKpis> {
    const { data, error } = await supabase.schema('core_personal').rpc('get_salary_report_kpis', {
        p_empresa_id: empresaId,
        p_period_year: periodYear,
        p_period_month: periodMonth,
        p_search: search || null,
        p_contratante: contratante || null,
        p_cliente_nombre: clienteNombre && clienteNombre.length > 0 ? clienteNombre : null,
        p_status_seguridad_filter: statusSeguridad && statusSeguridad.length > 0 ? statusSeguridad : null
    });

    if (error) {
        throw mapSupabaseError(error);
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
        return {
            total_ativos_periodo: 0,
            novos_admitidos: 0,
            desligados: 0
        };
    }

    return {
        total_ativos_periodo: Number(data[0].total_ativos_periodo) || 0,
        novos_admitidos: Number(data[0].novos_admitidos) || 0,
        desligados: Number(data[0].desligados) || 0
    };
}
