import { supabase } from '@/shared/supabase/client';
import { mapSupabaseError } from '@/shared/api/supabaseError';
import type { WorkerStatusHistory } from './workerStatusApi';

export interface GlobalWorkerStatusHistory extends WorkerStatusHistory {
    worker_nome: string;
    worker_cod_colab: string;
    empresa_nome: string;
    cliente_nome: string;
    changed_by_name: string;
}

export type MovementHistoryFilters = {
    empresaId?: string;
    clienteNome?: string;
    startDate?: string;
    endDate?: string;
}

export async function getGlobalWorkerStatusHistory(filters: MovementHistoryFilters = {}): Promise<GlobalWorkerStatusHistory[]> {
    const { empresaId, clienteNome, startDate, endDate } = filters;
    const { data, error } = await supabase
        .schema('core_personal')
        .rpc('get_global_movement_history', {
            p_empresa_id: empresaId || null,
            p_cliente_nome: clienteNome || null,
            p_start_date: startDate || null,
            p_end_date: endDate || null
        });

    if (error) {
        throw mapSupabaseError(error);
    }

    return (data || []).map((row: any) => ({
        ...row,
        worker_nome: row.worker_nome || 'Desconhecido',
        worker_cod_colab: row.worker_cod_colab || 'N/A',
        empresa_nome: row.empresa_nome || 'Não definida',
        cliente_nome: row.cliente_nome || 'Não alocado',
        changed_by_name: row.changed_by_name || 'Sistema',
    }));
}
