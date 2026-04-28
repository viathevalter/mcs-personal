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

export async function getUniqueContratantes(): Promise<string[]> {
    const { data, error } = await supabase.schema('public').rpc('get_unique_contratantes');

    if (error) {
        throw mapSupabaseError(error);
    }

    return data ? data.map((row: any) => row.contratante) : [];
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
            camiseta: updates.camiseta,
            pantalones: updates.pantalones,
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

    return data as Worker;
}

export async function upsertWorker(payload: Partial<Worker> & { empresa_id: string }): Promise<Worker> {
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
    id: number;
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
        .schema('public')
        .from('colaborador_por_pedido')
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
    
    // First, check current worker status
    const { data: worker, error: fetchError } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('status_seguridad, status_trabajador, niss')
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

    const { error: workerError } = await supabase
        .schema('core_personal')
        .from('workers')
        .update({
            cliente: params.cliente_nombre,
            contratante: params.contratante,
            funcion: params.funcion,
            status_trabajador: 'Ativo',
            status_seguridad: newStatusSeguridad
        })
        .eq('cod_colab', params.workerCodColab);
        
    if (workerError) throw mapSupabaseError(workerError);
}

export interface UpdateWorkerAlocacaoParams {
    id: number;
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

    const { error: allocError } = await supabase
        .schema('public')
        .from('colaborador_por_pedido')
        .update(updates)
        .eq('id', id);

    if (allocError) throw mapSupabaseError(allocError);

    // Optional: If this is the most recent allocation, we might want to sync some fields back to the worker record.
    // For now, we update the worker if we are updating the allocation to keep it somewhat in sync
    // but a proper sync might check if it's the latest. We'll update the worker if cliente, contratante or funcion is provided.
    
    // We fetch the latest allocation to see if this is it.
    const { data: latestAlloc } = await supabase
        .schema('public')
        .from('colaborador_por_pedido')
        .select('id')
        .eq('cod_colab', workerCodColab)
        .order('inserted_at', { ascending: false })
        .limit(1)
        .single();

    if (latestAlloc?.id === id) {
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
        }
    }
}
