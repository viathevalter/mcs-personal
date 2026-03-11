import { supabase } from '@/shared/supabase/client';
import { mapSupabaseError } from '@/shared/api/supabaseError';

export interface WorkerStatusHistory {
    id: string;
    worker_id: string;
    change_type: 'TRABALHADOR' | 'SEGURIDADE';
    old_value: string | null;
    new_value: string;
    effective_date: string;
    comments: string | null;
    changed_by: string | null;
    created_at: string;
    // Joined user info
    changed_by_name?: string;
}

export interface ChangeStatusPayload {
    workerId: string;
    changeType: 'TRABALHADOR' | 'SEGURIDADE';
    newValue: string;
    effectiveDate: string;
    comments?: string;
}

export async function getWorkerStatusHistory(workerId: string): Promise<WorkerStatusHistory[]> {
    const { data, error } = await supabase
        .schema('core_personal')
        .from('worker_status_history')
        .select(`
            *,
            changed_by_user:changed_by (
                email,
                raw_user_meta_data
            )
        `)
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false });

    if (error) {
        throw mapSupabaseError(error);
    }

    // Map user data
    return (data || []).map((row: any) => ({
        ...row,
        changed_by_name: row.changed_by_user?.raw_user_meta_data?.full_name || row.changed_by_user?.email || 'Sistema',
    }));
}

export async function changeWorkerStatus(payload: ChangeStatusPayload): Promise<void> {
    const { workerId, changeType, newValue, effectiveDate, comments } = payload;

    // We do this in a Supabase transaction-like approach using an RPC, OR we do it client side if RPC is not available.
    // For safety and speed since we can't easily deploy a new RPC right now, we will do two sequential operations.
    // 1. Get the current worker to find the old_value and validate
    const { data: worker, error: fetchError } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('status_trabajador, status_seguridad')
        .eq('id', workerId)
        .single();

    if (fetchError) throw mapSupabaseError(fetchError);

    const oldValue = changeType === 'TRABALHADOR' ? worker.status_trabajador : worker.status_seguridad;

    // 2. Update the worker table
    const updateData: any = {};
    if (changeType === 'TRABALHADOR') {
        updateData.status_trabajador = newValue;
        if (newValue.toUpperCase() === 'INATIVO' || newValue.toUpperCase() === 'BAIXA') {
            updateData.data_baixa = effectiveDate;
        } else if (newValue.toUpperCase() === 'ATIVO') {
            updateData.data_ingresso = effectiveDate;
            updateData.data_baixa = null; // Clear if re-hired
        }
    } else {
        updateData.status_seguridad = newValue;
        if (newValue.toUpperCase().includes('BAIXA')) {
            updateData.data_baixa_seguridad = effectiveDate;
        } else if (newValue.toUpperCase().includes('ALTA')) {
            updateData.data_alta_seguridad = effectiveDate;
        }
    }

    const { error: updateError } = await supabase
        .schema('core_personal')
        .from('workers')
        .update(updateData)
        .eq('id', workerId);

    if (updateError) throw mapSupabaseError(updateError);

    // 3. Insert history record
    const { error: historyError } = await supabase
        .schema('core_personal')
        .from('worker_status_history')
        .insert({
            worker_id: workerId,
            change_type: changeType,
            old_value: oldValue,
            new_value: newValue,
            effective_date: effectiveDate,
            comments: comments || null,
            changed_by: (await supabase.auth.getUser()).data.user?.id
        });

    if (historyError) throw mapSupabaseError(historyError);
}
