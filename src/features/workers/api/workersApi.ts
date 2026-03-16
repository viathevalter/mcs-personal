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
}

export interface ListWorkersResponse {
    data: Worker[];
    count: number;
}

export async function listWorkers({ empresaId, search, clienteNombre, statusTrabajador, statusSeguridad, contratante, funcion, sortColumn, sortDirection, page, pageSize }: ListWorkersParams): Promise<ListWorkersResponse> {
    const { data, error } = await supabase.schema('core_personal').rpc('search_workers', {
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
    });

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
    const { error } = await supabase
        .schema('core_personal')
        .from('workers')
        .update({
            nome: updates.nome,
            email: updates.email,
            movil: updates.movil,
            niss: updates.niss,
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
        })
        .eq('id', id);

    if (error) {
        throw mapSupabaseError(error);
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
    tiposervico: string;
    fechainiciopedido: string | null;
    fechafinpedido: string | null;
    fechasalidatrabajador: string | null;
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
