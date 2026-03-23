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
        .select('status_trabajador, status_seguridad, cod_colab, empresa_id, nif, niss, dni, nie')
        .eq('id', workerId)
        .single();

    if (fetchError) throw mapSupabaseError(fetchError);

    const oldValue = changeType === 'TRABALHADOR' ? worker.status_trabajador : worker.status_seguridad;

    const updateData: any = {};
    if (changeType === 'TRABALHADOR') {
        updateData.status_trabajador = newValue;
        if (newValue.toUpperCase() === 'INATIVO' || newValue.toUpperCase() === 'BAIXA' || newValue.toUpperCase() === 'DESLIGADO') {
            updateData.data_baixa = effectiveDate;
            
            // Regra 4: Casamento com Seguridade Social
            if (worker.status_seguridad?.toUpperCase() === 'ALTA') {
                updateData.status_seguridad = 'Pendente Baixa';
            } else if (worker.status_seguridad?.toUpperCase() === 'EM REGULARIZAÇÃO') {
                updateData.status_seguridad = null;
            }
        } else if (newValue.toUpperCase() === 'ATIVO') {
            updateData.data_ingresso = effectiveDate;
            updateData.data_baixa = null; // Clear if re-hired
            
            // Regra 6: Se voltar a ser ATIVO e tiver documentos básicos, vira Pendente Alta
            const seguridadeUpper = worker.status_seguridad?.toUpperCase() || '';
            if (seguridadeUpper !== 'ALTA' && !seguridadeUpper.includes('PENDENTE ALTA')) {
                const hasDocs = !!((worker.niss && worker.nif) || worker.dni || worker.nie);
                if (hasDocs) {
                    updateData.status_seguridad = 'Pendente Alta';
                }
            }
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

    // 3. Insert history record(s)
    const userId = (await supabase.auth.getUser()).data.user?.id;
    
    const historyInserts = [{
        worker_id: workerId,
        change_type: changeType,
        old_value: oldValue || 'Sem Status',
        new_value: newValue || 'Sem Status',
        effective_date: effectiveDate,
        comments: comments || null,
        changed_by: userId
    }];

    if (changeType === 'TRABALHADOR' && updateData.status_seguridad !== undefined) {
        historyInserts.push({
            worker_id: workerId,
            change_type: 'SEGURIDADE',
            old_value: worker.status_seguridad || 'Sem Status',
            new_value: updateData.status_seguridad || 'Sem Status',
            effective_date: effectiveDate,
            comments: comments ? `Reflexo Trabalhador: ${comments}` : 'Reflexo Automático da Atualização do Trabalhador',
            changed_by: userId
        });
    }

    const { error: historyError } = await supabase
        .schema('core_personal')
        .from('worker_status_history')
        .insert(historyInserts);

    if (historyError) throw mapSupabaseError(historyError);

    // ==========================================
    // Automações Paralelas (Regras 2, 3 e 5)
    // ==========================================
    
    if (changeType === 'TRABALHADOR' && (newValue.toUpperCase() === 'INATIVO' || newValue.toUpperCase() === 'BAIXA' || newValue.toUpperCase() === 'DESLIGADO')) {
        // Regra 2: Baixa Efetiva Automática de Obras (Alocações / Kanban)
        const { error: allocError } = await supabase
            .schema('public')
            .from('colaborador_por_pedido')
            .update({ fechasalidatrabajador: effectiveDate })
            .eq('cod_colab', worker.cod_colab)
            .is('fechasalidatrabajador', null);

        if (allocError) console.error('Erro ao atualizar Alocações:', allocError);

        // Regra 3: Observações no Controle de Horas
        const d = new Date(effectiveDate);
        const periodYear = d.getFullYear();
        const periodMonth = d.getMonth() + 1;
        
        const { data: existingHour } = await supabase
            .schema('core_personal')
            .from('worker_hours')
            .select('id, observacoes')
            .eq('worker_id', workerId)
            .eq('period_year', periodYear)
            .eq('period_month', periodMonth)
            .maybeSingle();

        // Extrai o Timezone adjustment se necessário (gambiarra UTC-to-Local visual)
        const dtFormatted = effectiveDate.split('-').reverse().join('/');
        const msgObservacao = `Trabalhador inativado em ${dtFormatted}. Motivo: ${comments || 'Não informado'}.`;

        if (existingHour) {
            const newObs = existingHour.observacoes ? `${existingHour.observacoes} | ${msgObservacao}` : msgObservacao;
            await supabase.schema('core_personal').from('worker_hours').update({ observacoes: newObs }).eq('id', existingHour.id);
        } else {
            await supabase.schema('core_personal').from('worker_hours').insert({ 
                worker_id: workerId, 
                empresa_id: worker.empresa_id,
                period_year: periodYear,
                period_month: periodMonth,
                status: 'pendente',
                observacoes: msgObservacao
            });
        }
    }

}
