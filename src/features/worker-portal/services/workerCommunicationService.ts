import { supabase } from '../../../shared/supabase/client';

export interface WorkerMessage {
    id: string;
    empresa_id?: string;
    worker_id: string;
    hour_record_id?: string;
    period_year: number;
    period_month: number;
    sender_type: 'gestor' | 'trabalhador' | 'sistema';
    sender_name: string;
    message: string;
    read: boolean;
    read_at?: string;
    created_at: string;
}

export interface MessageTemplate {
    id: string;
    empresa_id?: string;
    title: string;
    message: string;
    category?: string;
    created_at: string;
}

// 1. Buscar histórico de mensagens de um trabalhador em um período
export async function getWorkerPeriodMessages(workerId: string, year: number, month: number): Promise<WorkerMessage[]> {
    try {
        const { data, error } = await supabase
            .schema('core_personal')
            .from('worker_timesheet_messages')
            .select('*')
            .eq('worker_id', workerId)
            .eq('period_year', year)
            .eq('period_month', month)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Erro ao buscar mensagens do trabalhador:', error);
            return [];
        }
        return (data || []) as WorkerMessage[];
    } catch (err) {
        console.error('Falha de conexão ao buscar mensagens:', err);
        return [];
    }
}

// 2. Buscar contagem de mensagens de vários trabalhadores em um período (para a tabela do gestor)
export async function getBatchWorkersMessageCounts(workerIds: string[], year: number, month: number): Promise<Record<string, { total: number; unreadByGestor: number; unreadByWorker: number }>> {
    if (workerIds.length === 0) return {};
    try {
        const { data, error } = await supabase
            .schema('core_personal')
            .from('worker_timesheet_messages')
            .select('worker_id, sender_type, read')
            .in('worker_id', workerIds)
            .eq('period_year', year)
            .eq('period_month', month);

        if (error) {
            console.error('Erro ao buscar contagens de mensagens:', error);
            return {};
        }

        const counts: Record<string, { total: number; unreadByGestor: number; unreadByWorker: number }> = {};
        (data || []).forEach((row: any) => {
            const wid = row.worker_id;
            if (!counts[wid]) counts[wid] = { total: 0, unreadByGestor: 0, unreadByWorker: 0 };
            counts[wid].total++;
            if (!row.read) {
                if (row.sender_type === 'trabalhador') counts[wid].unreadByGestor++;
                if (row.sender_type === 'gestor') counts[wid].unreadByWorker++;
            }
        });
        return counts;
    } catch (err) {
        console.error('Falha ao processar contagens de mensagens:', err);
        return {};
    }
}

// 3. Enviar mensagem individual
export async function sendWorkerMessage(params: {
    workerId: string;
    empresaId?: string;
    year: number;
    month: number;
    senderType: 'gestor' | 'trabalhador' | 'sistema';
    senderName: string;
    message: string;
    hourRecordId?: string;
}): Promise<WorkerMessage | null> {
    try {
        const { data, error } = await supabase
            .schema('core_personal')
            .from('worker_timesheet_messages')
            .insert({
                worker_id: params.workerId,
                empresa_id: params.empresaId || null,
                period_year: params.year,
                period_month: params.month,
                sender_type: params.senderType,
                sender_name: params.senderName,
                message: params.message.trim(),
                hour_record_id: params.hourRecordId || null,
                read: false
            })
            .select()
            .single();

        if (error) throw error;
        return data as WorkerMessage;
    } catch (err) {
        console.error('Erro ao enviar mensagem:', err);
        throw err;
    }
}

// 4. Enviar mensagem em lote para múltiplos trabalhadores
export async function sendBatchWorkerMessages(params: {
    workerIds: string[];
    empresaId?: string;
    year: number;
    month: number;
    senderName: string;
    message: string;
}): Promise<number> {
    if (params.workerIds.length === 0) return 0;
    try {
        const rows = params.workerIds.map(wid => ({
            worker_id: wid,
            empresa_id: params.empresaId || null,
            period_year: params.year,
            period_month: params.month,
            sender_type: 'gestor',
            sender_name: params.senderName,
            message: params.message.trim(),
            read: false
        }));

        const { error } = await supabase
            .schema('core_personal')
            .from('worker_timesheet_messages')
            .insert(rows);

        if (error) throw error;
        return rows.length;
    } catch (err) {
        console.error('Erro ao enviar mensagens em lote:', err);
        throw err;
    }
}

// 5. Marcar mensagens como lidas
export async function markMessagesAsRead(messageIds: string[]): Promise<void> {
    if (messageIds.length === 0) return;
    try {
        await supabase
            .schema('core_personal')
            .from('worker_timesheet_messages')
            .update({
                read: true,
                read_at: new Date().toISOString()
            })
            .in('id', messageIds);
    } catch (err) {
        console.error('Erro ao marcar mensagens como lidas:', err);
    }
}

// 6. Frases Prontas (Templates)
export async function getMessageTemplates(): Promise<MessageTemplate[]> {
    try {
        const { data, error } = await supabase
            .schema('core_personal')
            .from('worker_message_templates')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar modelos:', error);
            return [];
        }
        return (data || []) as MessageTemplate[];
    } catch (err) {
        console.error('Falha de conexão ao buscar templates:', err);
        return [];
    }
}

export async function createMessageTemplate(title: string, message: string, category: string = 'geral'): Promise<MessageTemplate | null> {
    try {
        const { data, error } = await supabase
            .schema('core_personal')
            .from('worker_message_templates')
            .insert({
                title: title.trim(),
                message: message.trim(),
                category: category.trim()
            })
            .select()
            .single();

        if (error) throw error;
        return data as MessageTemplate;
    } catch (err) {
        console.error('Erro ao cadastrar frase pronta:', err);
        throw err;
    }
}

// 7. Salvar inscrição de Push Notification (Web Push Subscription)
export async function registerPushSubscription(workerId: string, subscription: PushSubscription): Promise<void> {
    try {
        const subJson = subscription.toJSON();
        const endpoint = subJson.endpoint;
        const p256dh = subJson.keys?.p256dh;
        const auth = subJson.keys?.auth;

        if (!endpoint || !p256dh || !auth) return;

        await supabase
            .schema('core_personal')
            .from('worker_push_subscriptions')
            .upsert({
                worker_id: workerId,
                endpoint,
                p256dh,
                auth,
                user_agent: navigator.userAgent,
                updated_at: new Date().toISOString()
            }, { onConflict: 'endpoint' });
    } catch (err) {
        console.error('Erro ao salvar Push Subscription no Supabase:', err);
    }
}

// 8. Disparar notificação local ou teste direto no Service Worker
export async function triggerLocalTestPush(title: string, body: string, url: string = '/portal'): Promise<boolean> {
    try {
        if (!('serviceWorker' in navigator)) return false;
        const reg = await navigator.serviceWorker.ready;
        if (!reg) return false;

        await reg.showNotification(title, {
            body,
            icon: '/logo_mcs_transparent.png',
            badge: '/logo_mcs_transparent.png',
            data: { url },
            tag: 'mcs-test-push'
        } as any);
        return true;
    } catch (err) {
        console.error('Erro ao disparar teste de notificação:', err);
        return false;
    }
}
