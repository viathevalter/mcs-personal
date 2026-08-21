import { supabase } from '@/shared/supabase/client';
import { mapSupabaseError } from '@/shared/api/supabaseError';

export interface WorkerStatusHistory {
    id: string;
    worker_id: string;
    change_type: string;
    old_value: string;
    new_value: string;
    effective_date: string;
    comments?: string;
    changed_by?: string;
    created_at: string;
    changed_by_name?: string;
}

export interface UnifiedStatusPayload {
    workerId: string;
    statusTrabalhador: string;
    statusSeguridad: string;
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

    return (data || []).map((row: any) => ({
        ...row,
        changed_by_name: row.changed_by_user?.raw_user_meta_data?.full_name || row.changed_by_user?.email || 'Sistema',
    }));
}

export async function updateWorkerStatusUnified(payload: UnifiedStatusPayload): Promise<void> {
    const { workerId, statusTrabalhador, statusSeguridad, effectiveDate, comments } = payload;

    // 1. Obter dados atuais do trabalhador
    const { data: worker, error: fetchError } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('status_trabajador, status_seguridad, cod_colab, nome, nif, niss, dni, nie, contracts(empresa_id)')
        .eq('id', workerId)
        .single();

    if (fetchError) throw mapSupabaseError(fetchError);

    const oldStatusTrabalhador = worker.status_trabajador;
    const oldStatusSeguridad = worker.status_seguridad;

    const updateData: any = {
        status_trabajador: statusTrabalhador,
        status_seguridad: statusSeguridad
    };

    const statusTrabUpper = (statusTrabalhador || '').toUpperCase();
    const statusSegUpper = (statusSeguridad || '').toUpperCase();

    // Regras para Status do Trabalhador
    if (['INATIVO', 'INACTIVO', 'BAIXA', 'DESLIGADO', 'DESISTIU'].includes(statusTrabUpper)) {
        updateData.data_baixa = effectiveDate;
    } else if (['ATIVO', 'ACTIVO'].includes(statusTrabUpper)) {
        updateData.data_ingresso = effectiveDate;
        updateData.data_baixa = null;
    }

    // Regras para Status de Seguridade Social
    if (statusSegUpper.includes('BAIXA')) {
        updateData.data_baixa_seguridad = effectiveDate;
    } else if (statusSegUpper.includes('ALTA')) {
        updateData.data_alta_seguridad = effectiveDate;
    }

    // 2. Atualizar em core_personal.workers
    const { data: updatedWorker, error: updateError } = await supabase
        .schema('core_personal')
        .from('workers')
        .update(updateData)
        .eq('id', workerId)
        .select('id');

    if (updateError) throw mapSupabaseError(updateError);
    if (!updatedWorker || updatedWorker.length === 0) {
        throw new Error("Falha ao atualizar o trabalhador. Verifique suas permissões (RLS).");
    }

    // 3. Sincronizar com a tabela espelho public.colaboradores
    if (worker.cod_colab) {
        const { error: syncError } = await supabase
            .from('colaboradores')
            .update({
                status_trabajador: statusTrabalhador,
                status_seguridad: statusSeguridad
            })
            .eq('cod_colab', worker.cod_colab);

        if (syncError) {
            console.error("Erro ao sincronizar com public.colaboradores por cod_colab:", syncError);
        }
    } else if (worker.nome) {
        const { error: syncByNameError } = await supabase
            .from('colaboradores')
            .update({
                status_trabajador: statusTrabalhador,
                status_seguridad: statusSeguridad
            })
            .ilike('nombre', worker.nome);

        if (syncByNameError) {
            console.error("Erro ao sincronizar com public.colaboradores por nome:", syncByNameError);
        }
    }

    // 3.5 Se o trabalhador foi inativado/desligado/baixa, atualizar data de saída efetiva nas alocações ativas
    if (['INATIVO', 'INACTIVO', 'BAIXA', 'DESLIGADO', 'DESISTIU'].includes(statusTrabUpper)) {
        await supabase
            .schema('core_personal')
            .from('worker_assignments')
            .update({
                end_date: effectiveDate,
                status: 'completed'
            })
            .eq('worker_id', workerId)
            .eq('status', 'active');

        if (worker.cod_colab) {
            await supabase
                .from('colaborador_por_pedido')
                .update({
                    fechasalidatrabajador: effectiveDate
                })
                .eq('cod_colab', worker.cod_colab)
                .is('fechasalidatrabajador', null);
        }
    }

    // 4. Inserir histórico de alteração para cada status alterado
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const historyInserts: any[] = [];

    const isTrabChanged = (oldStatusTrabalhador || '').toLowerCase().trim() !== (statusTrabalhador || '').toLowerCase().trim();
    const isSegChanged = (oldStatusSeguridad || '').toLowerCase().trim() !== (statusSeguridad || '').toLowerCase().trim();

    if (isTrabChanged) {
        historyInserts.push({
            worker_id: workerId,
            change_type: 'TRABALHADOR',
            old_value: oldStatusTrabalhador || 'Sem Status',
            new_value: statusTrabalhador || 'Sem Status',
            effective_date: effectiveDate,
            comments: comments || null,
            changed_by: userId
        });
    }

    if (isSegChanged) {
        historyInserts.push({
            worker_id: workerId,
            change_type: 'SEGURIDADE',
            old_value: oldStatusSeguridad || 'Sem Status',
            new_value: statusSeguridad || 'Sem Status',
            effective_date: effectiveDate,
            comments: comments || null,
            changed_by: userId
        });
    }

    if (historyInserts.length > 0) {
        const { error: historyError } = await supabase
            .schema('core_personal')
            .from('worker_status_history')
            .insert(historyInserts);

        if (historyError) {
            console.error("Erro ao registrar histórico de status:", historyError);
        }
    }
}
