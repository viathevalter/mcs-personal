import { supabase } from '@/shared/supabase/client';
import { mapSupabaseError } from '@/shared/api/supabaseError';
import type { SeguridadeStatus, SeguridadeStatusWithWorker, StatusWorkflowSeguridade } from '@/shared/types/corePersonal';

export async function fetchSeguridadeStatus(empresaId: string): Promise<SeguridadeStatusWithWorker[]> {
    const { data, error } = await supabase
        .schema('core_personal')
        .rpc('get_real_seguridade_status', { p_empresa_id: empresaId });

    if (error) {
        throw mapSupabaseError(error);
    }

    // The RPC returns a JSON array, parse it if it comes as a string, else use directly
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    return parsedData as SeguridadeStatusWithWorker[];
}

export async function updateSeguridadeStatus(
    id: string,
    status: StatusWorkflowSeguridade,
    dataEfetiva?: string,
    observacoes?: string
): Promise<SeguridadeStatus> {
    const updates: Partial<SeguridadeStatus> = { status };
    if (dataEfetiva !== undefined) updates.data_efetiva = dataEfetiva;
    if (observacoes !== undefined) updates.observacoes = observacoes;

    const { data, error } = await supabase
        .schema('core_personal')
        .from('seguridade_status')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw mapSupabaseError(error);
    }

    return data as SeguridadeStatus;
}

export async function fetchVidaLaboralByWorker(workerId: string): Promise<SeguridadeStatus[]> {
    const { data, error } = await supabase
        .schema('core_personal')
        .from('seguridade_status')
        .select('*')
        .eq('worker_id', workerId)
        .order('data_solicitacao', { ascending: false });

    if (error) {
        throw mapSupabaseError(error);
    }

    return data as SeguridadeStatus[];
}
