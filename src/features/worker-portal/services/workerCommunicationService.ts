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

export interface McsChatRecipientInput {
    worker_id: string;
    worker_name: string;
    movil?: string | null;
    pasaporte?: string | null;
    cod_colab?: string | null;
    contratante?: string | null;
    funcion?: string | null;
    cliente?: string | null;
}

const MCS_CHAT_BASE_URL = (import.meta.env.VITE_CHAT_URL || 'https://mcs-chat.vercel.app').replace(/\/$/, '');

export function getMcsChatBaseUrl(): string {
    return MCS_CHAT_BASE_URL;
}

export function interpolateWorkerHoursTemplate(
    template: string,
    worker: {
        worker_name?: string;
        pasaporte?: string | null;
        cod_colab?: string | null;
        contratante?: string | null;
        cliente?: string | null;
        funcion?: string | null;
    }
): string {
    const fullName = (worker.worker_name || 'Trabalhador').trim();
    const firstName = fullName.split(/\s+/)[0] || fullName;
    const passportDoc = (worker.pasaporte || 'Seu Passaporte / NIE').trim();
    const codColab = (worker.cod_colab || '').trim();
    const company = (worker.contratante || 'MCS').trim();
    const client = (worker.cliente || 'Obra').trim();
    const func = (worker.funcion || 'Profissional').trim();

    return template
        .replace(/\{\s*(nome|nombre|nombre\s+completo)\s*\}/gi, fullName)
        .replace(/\{\s*(primeiro_nome|primer[_\s]*nombre|nombre\s+de\s+pila)\s*\}/gi, firstName)
        .replace(/\{\s*(passaporte|pasaporte|documento)\s*\}/gi, passportDoc)
        .replace(/\{\s*(cod_colab|codigo_colab)\s*\}/gi, codColab)
        .replace(/\{\s*(empresa|contratante)\s*\}/gi, company)
        .replace(/\{\s*(cliente|obra)\s*\}/gi, client)
        .replace(/\{\s*(funcao|funci[oó]n)\s*\}/gi, func)
        .trim();
}

function normalizePhoneForMcsChat(rawPhone?: string | null): string {
    if (!rawPhone) return '';
    const trimmed = rawPhone.trim();
    const hasExplicitCountryCode = trimmed.startsWith('+') || trimmed.startsWith('00');
    let clean = trimmed.replace(/\D/g, '');
    if (!clean) return '';
    if (clean.startsWith('00')) clean = clean.replace(/^00+/, '');
    if (hasExplicitCountryCode) return clean;
    if (clean.length === 9 && (clean.startsWith('6') || clean.startsWith('7'))) return '34' + clean;
    if (clean.length === 9 && clean.startsWith('9')) return '351' + clean;
    if (clean.length === 10 && clean.startsWith('3')) return '57' + clean;
    return clean;
}

// 1. Buscar histórico completo de mensagens de um trabalhador (sem filtro de mês para conversa contínua)
export async function getWorkerAllMessages(workerId: string): Promise<WorkerMessage[]> {
    try {
        const { data, error } = await supabase
            .schema('core_personal')
            .from('worker_timesheet_messages')
            .select('*')
            .eq('worker_id', workerId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Erro ao buscar histórico de mensagens do trabalhador:', error);
            return [];
        }
        return (data || []) as WorkerMessage[];
    } catch (err) {
        console.error('Falha de conexão ao buscar histórico de mensagens:', err);
        return [];
    }
}

// 1.1 Buscar histórico de mensagens de um trabalhador em um período específico
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

// 2. Buscar contagem de mensagens de vários trabalhadores (unificado para o gestor nunca perder respostas)
export async function getBatchWorkersMessageCounts(workerIds: string[], year?: number, month?: number): Promise<Record<string, { total: number; unreadByGestor: number; unreadByWorker: number; periodTotal: number }>> {
    if (workerIds.length === 0) return {};
    try {
        const { data, error } = await supabase
            .schema('core_personal')
            .from('worker_timesheet_messages')
            .select('worker_id, period_year, period_month, sender_type, read')
            .in('worker_id', workerIds);

        if (error) {
            console.error('Erro ao buscar contagens de mensagens:', error);
            return {};
        }

        const counts: Record<string, { total: number; unreadByGestor: number; unreadByWorker: number; periodTotal: number }> = {};
        (data || []).forEach((row: any) => {
            const wid = row.worker_id;
            if (!counts[wid]) counts[wid] = { total: 0, unreadByGestor: 0, unreadByWorker: 0, periodTotal: 0 };
            counts[wid].total++;
            if (year && month && row.period_year === year && row.period_month === month) {
                counts[wid].periodTotal++;
            }
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

// 2.1 Subscrever a mensagens em tempo real para um trabalhador
export function subscribeToWorkerMessages(workerId: string, onNewMessage: (msg: WorkerMessage) => void) {
    if (!workerId) return () => {};
    try {
        const channel = supabase
            .channel(`worker-chat-${workerId}-${Math.random().toString(36).substring(2, 7)}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'core_personal',
                    table: 'worker_timesheet_messages',
                    filter: `worker_id=eq.${workerId}`
                },
                (payload) => {
                    if (payload && payload.new) {
                        onNewMessage(payload.new as WorkerMessage);
                    }
                }
            )
            .subscribe();

        return () => {
            try {
                supabase.removeChannel(channel);
            } catch (_) {}
        };
    } catch (err) {
        console.warn('Não foi possível iniciar realtime de mensagens:', err);
        return () => {};
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

// 4. Enviar mensagem em lote para múltiplos trabalhadores no Portal
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

// 4.1 Disparar Cobrança / Lembrete de Horas diretamente pelo MCS-Chat (WhatsApp Oficial da Empresa + Portal)
export async function dispatchMcsChatHoursCampaign(params: {
    campaignTitle: string;
    clientName: string;
    year: number;
    month: number;
    messageTemplate: string;
    recipients: McsChatRecipientInput[];
    scheduleType?: 'immediate' | 'recurring';
    recurrenceDaysOfWeek?: number[]; // Ex: [5] = toda Sexta-feira, [1, 5] = Segunda e Sexta
    recurrenceTimeOfDay?: string; // Ex: '09:00'
    alsoSendPortalNotification?: boolean;
}): Promise<{
    success: boolean;
    campaignId?: string;
    enqueuedCount: number;
    portalSentCount: number;
}> {
    const validRecipients = params.recipients.filter(
        r => normalizePhoneForMcsChat(r.movil).length >= 8
    );

    const { data: authData } = await supabase.auth.getUser();
    const createdByName =
        authData?.user?.user_metadata?.full_name ||
        authData?.user?.email?.split('@')[0] ||
        'Gestor Controle de Horas';

    let campaignId: string | undefined;
    let enqueuedCount = 0;

    // 1. Gravar também no histórico interno do Portal do Trabalhador (com as variáveis interpoladas por trabalhador)
    let portalSentCount = 0;
    if (params.alsoSendPortalNotification !== false && params.recipients.length > 0) {
        try {
            const portalRows = params.recipients.map(w => ({
                worker_id: w.worker_id,
                period_year: params.year,
                period_month: params.month,
                sender_type: 'gestor',
                sender_name: `${createdByName} (via MCS-Chat)`,
                message: interpolateWorkerHoursTemplate(params.messageTemplate, {
                    worker_name: w.worker_name,
                    pasaporte: w.pasaporte,
                    cod_colab: w.cod_colab,
                    contratante: w.contratante,
                    cliente: w.cliente || params.clientName,
                    funcion: w.funcion
                }),
                read: false
            }));
            const { error: pErr } = await supabase
                .schema('core_personal')
                .from('worker_timesheet_messages')
                .insert(portalRows);
            if (!pErr) portalSentCount = portalRows.length;
        } catch (e) {
            console.warn('Aviso ao gravar espelho no Portal:', e);
        }
    }

    if (validRecipients.length === 0) {
        return {
            success: portalSentCount > 0,
            enqueuedCount: 0,
            portalSentCount
        };
    }

    const mappedRecipientsForChat = validRecipients.map(w => ({
        id: w.worker_id,
        nome: w.worker_name,
        cod_colab: w.cod_colab || null,
        movil: w.movil || '',
        pasaporte: w.pasaporte || null,
        contratante: w.contratante || 'LUMINOUS',
        cliente: w.cliente || params.clientName,
        funcion: w.funcion || 'Profissional',
        status_trabajador: 'Ativo'
    }));

    const scheduleType = params.scheduleType || 'immediate';
    const recurrenceRule =
        scheduleType === 'recurring'
            ? {
                  frequency: 'weekly',
                  daysOfWeek: params.recurrenceDaysOfWeek?.length ? params.recurrenceDaysOfWeek : [5],
                  timeOfDay: params.recurrenceTimeOfDay || '09:00',
                  sendFirstBatchNow: true
              }
            : null;

    const segmentConfig = {
        segmentMode: 'clients',
        selectedClients: [params.clientName],
        hideInactiveSafetyLock: true,
        includePendingIngreso: false,
        selectedWorkerIds: validRecipients.map(r => r.worker_id)
    };

    // 2. Tentar disparo direto na API do MCS-Chat (com CORS ativo)
    try {
        const res = await fetch(`${MCS_CHAT_BASE_URL}/api/chat/campaign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create_campaign',
                name: params.campaignTitle,
                category: 'horas',
                targetSummary: `Controle de Horas • ${params.clientName} (${validRecipients.length} trab.)`,
                channelMode: 'auto_company',
                cadenceMode: 'safe',
                scheduleType,
                recurrenceRule,
                segmentConfig,
                content: params.messageTemplate,
                createdByName,
                recipients: mappedRecipientsForChat
            })
        });

        if (res.ok) {
            const data = await res.json();
            if (data?.success) {
                return {
                    success: true,
                    campaignId: data.campaignId,
                    enqueuedCount: data.count || validRecipients.length,
                    portalSentCount
                };
            }
        }
    } catch (apiErr) {
        console.warn('Fallback direto Supabase para campanha MCS-Chat:', apiErr);
    }

    // 3. Fallback direto no banco compartilhado (public.chat_campaigns + public.chat_scheduled_messages)
    const { data: channels } = await supabase
        .from('chat_channels')
        .select('*')
        .eq('is_active', true);

    const workerChannels = (channels || []).filter((c: any) => (c.channel_type || 'workers') === 'workers');
    const resolveChannelId = (contratante?: string | null) => {
        if (contratante) {
            const norm = contratante.trim().toUpperCase();
            const exact = workerChannels.find((c: any) => (c.company_name || '').trim().toUpperCase() === norm);
            if (exact) return exact.id;
            const partial = workerChannels.find(
                (c: any) =>
                    (c.company_name || '').toUpperCase().includes(norm) ||
                    norm.includes((c.company_name || '').toUpperCase())
            );
            if (partial) return partial.id;
        }
        return workerChannels[0]?.id || channels?.[0]?.id || null;
    };

    const { data: createdCamp, error: campErr } = await supabase
        .from('chat_campaigns')
        .insert({
            name: params.campaignTitle,
            category: 'horas',
            target_summary: `Controle de Horas • ${params.clientName} (${validRecipients.length} trab.)`,
            channel_mode: 'auto_company',
            cadence_mode: 'safe',
            content_template: params.messageTemplate.trim(),
            schedule_type: scheduleType,
            recurrence_rule: recurrenceRule,
            segment_config: segmentConfig,
            is_recurrence_active: scheduleType === 'recurring',
            status: 'running',
            total_recipients: validRecipients.length,
            sent_count: 0,
            failed_count: 0,
            created_by_name: createdByName,
            scheduled_start_at: new Date().toISOString()
        })
        .select('id')
        .single();

    if (campErr || !createdCamp) {
        throw new Error(campErr?.message || 'Não foi possível criar campanha no MCS-Chat');
    }

    campaignId = createdCamp.id;
    const nowMs = Date.now();
    const queueItems = validRecipients.map((w, idx) => {
        const cleanPhone = normalizePhoneForMcsChat(w.movil);
        const msgText = interpolateWorkerHoursTemplate(params.messageTemplate, {
            worker_name: w.worker_name,
            pasaporte: w.pasaporte,
            cod_colab: w.cod_colab,
            contratante: w.contratante,
            cliente: w.cliente || params.clientName,
            funcion: w.funcion
        });
        return {
            campaign_id: createdCamp.id,
            channel_id: resolveChannelId(w.contratante),
            target_worker_id: w.worker_id,
            worker_name: w.worker_name,
            worker_phone: cleanPhone,
            worker_company: w.contratante || null,
            worker_client: w.cliente || params.clientName,
            worker_function: w.funcion || null,
            worker_passport: w.pasaporte || null,
            content: msgText,
            status: 'pending',
            scheduled_for: new Date(nowMs + idx * 9000).toISOString()
        };
    });

    const { error: qErr } = await supabase.from('chat_scheduled_messages').insert(queueItems);
    if (qErr) throw qErr;
    enqueuedCount = queueItems.length;

    // Aciona o processador da fila em background
    fetch(`${MCS_CHAT_BASE_URL}/api/chat/campaign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'process_next', maxItems: 2 })
    }).catch(() => {});

    return {
        success: true,
        campaignId,
        enqueuedCount,
        portalSentCount
    };
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
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            data: { url },
            tag: 'mcs-test-push'
        } as any);
        return true;
    } catch (err) {
        console.error('Erro ao disparar teste de notificação:', err);
        return false;
    }
}
