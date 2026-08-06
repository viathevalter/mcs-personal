import { supabase } from '@/shared/supabase/client';

export interface TariffItemRequest {
    worker_id: string;
    worker_nome: string;
    cod_colab?: string;
    cliente_nombre?: string;
    tarifa_anterior: number;
    tarifa_nova: number;
}

export interface TariffAuthorizationRequest {
    id: string;
    codigo_termo: string;
    solicitante_id?: string;
    solicitante_nome: string;
    gerente_nome: string;
    gerente_email?: string;
    gerente_phone?: string;
    motivo_alteracao?: string;
    status: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'CANCELADO';
    token_assinatura: string;
    itens_solicitacao: TariffItemRequest[];
    assinatura_base64?: string;
    assinado_em?: string;
    created_at: string;
}

export interface WorkerTariffAuditLog {
    id: string;
    worker_id: string;
    worker_nome?: string;
    cod_colab?: string;
    cliente_nombre?: string;
    request_id?: string;
    codigo_termo?: string;
    tarifa_anterior: number;
    tarifa_nova: number;
    alterado_por_nome: string;
    autorizado_por_nome: string;
    documento_autorizacao_url?: string;
    motivo?: string;
    created_at: string;
}

export async function createTariffAuthorizationRequest(payload: {
    solicitanteNome: string;
    solicitanteId?: string;
    gerenteNome: string;
    gerenteEmail?: string;
    gerentePhone?: string;
    motivoAlteracao?: string;
    itens: TariffItemRequest[];
}): Promise<{ request: TariffAuthorizationRequest; token: string; url: string }> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const codigoTermo = `TAR-${dateStr}-${randomSuffix}`;
    const token = `tth_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newRequest = {
        codigo_termo: codigoTermo,
        solicitante_id: payload.solicitanteId || null,
        solicitante_nome: payload.solicitanteNome,
        gerente_nome: payload.gerenteNome,
        gerente_email: payload.gerenteEmail || null,
        gerente_phone: payload.gerentePhone || null,
        motivo_alteracao: payload.motivoAlteracao || 'Ajuste de tarifa de remuneração horária',
        status: 'PENDENTE',
        token_assinatura: token,
        itens_solicitacao: payload.itens
    };

    const { data, error } = await supabase
        .schema('core_personal')
        .from('tariff_authorization_requests')
        .insert(newRequest)
        .select('*')
        .single();

    if (error) {
        console.error("Error creating tariff authorization request:", error);
        throw error;
    }

    const signingUrl = `${window.location.origin}/tariffs/authorization/${token}`;

    return {
        request: data as TariffAuthorizationRequest,
        token,
        url: signingUrl
    };
}

export async function getTariffAuthorizationByToken(token: string): Promise<TariffAuthorizationRequest | null> {
    const { data, error } = await supabase
        .schema('core_personal')
        .from('tariff_authorization_requests')
        .select('*')
        .eq('token_assinatura', token)
        .single();

    if (error) {
        console.error("Error fetching tariff authorization by token:", error);
        return null;
    }

    return data as TariffAuthorizationRequest;
}

export async function approveAndApplyTariffAuthorization(payload: {
    token: string;
    assinaturaBase64: string;
}): Promise<{ success: boolean; updatedCount: number }> {
    const request = await getTariffAuthorizationByToken(payload.token);
    if (!request) {
        throw new Error("Solicitação de autorização não encontrada.");
    }

    if (request.status === 'APROVADO') {
        throw new Error("Esta solicitação já foi aprovada e aplicada anteriormente.");
    }

    // 1. Update request status to APROVADO
    const nowIso = new Date().toISOString();
    const { error: updateReqErr } = await supabase
        .schema('core_personal')
        .from('tariff_authorization_requests')
        .update({
            status: 'APROVADO',
            assinatura_base64: payload.assinaturaBase64,
            assinado_em: nowIso
        })
        .eq('id', request.id);

    if (updateReqErr) {
        console.error("Error updating tariff authorization status:", updateReqErr);
        throw updateReqErr;
    }

    // 2. Apply new rates to worker_beneficios_settings and create audit log entries
    const items = request.itens_solicitacao || [];
    let updatedCount = 0;

    for (const item of items) {
        if (!item.worker_id) continue;

        // Upsert rate in worker_beneficios_settings
        const { data: existingSetting } = await supabase
            .schema('core_personal')
            .from('worker_beneficios_settings')
            .select('*')
            .eq('worker_id', item.worker_id)
            .maybeSingle();

        if (existingSetting) {
            await supabase
                .schema('core_personal')
                .from('worker_beneficios_settings')
                .update({ tarifa_hora: item.tarifa_nova })
                .eq('worker_id', item.worker_id);
        } else {
            await supabase
                .schema('core_personal')
                .from('worker_beneficios_settings')
                .insert({
                    worker_id: item.worker_id,
                    tarifa_hora: item.tarifa_nova
                });
        }

        // Insert Audit Log entry
        await supabase
            .schema('core_personal')
            .from('worker_tariff_audit_logs')
            .insert({
                worker_id: item.worker_id,
                request_id: request.id,
                tarifa_anterior: item.tarifa_anterior,
                tarifa_nova: item.tarifa_nova,
                alterado_por_nome: request.solicitante_nome,
                autorizado_por_nome: request.gerente_nome,
                motivo: request.motivo_alteracao,
                created_at: nowIso
            });

        updatedCount++;
    }

    return { success: true, updatedCount };
}

export async function listWorkerTariffAuditLogs(): Promise<WorkerTariffAuditLog[]> {
    const { data: logs, error } = await supabase
        .schema('core_personal')
        .from('worker_tariff_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) {
        console.error("Error fetching worker tariff audit logs:", error);
        return [];
    }

    if (!logs || logs.length === 0) return [];

    // Fetch worker details to enrich log entries
    const workerIds = Array.from(new Set(logs.map(l => l.worker_id).filter(Boolean)));
    const { data: workersData } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, cod_colab, cliente_nombre')
        .in('id', workerIds);

    const workerMap = new Map<string, any>();
    (workersData || []).forEach(w => workerMap.set(w.id, w));

    // Fetch authorization requests to enrich document codes
    const requestIds = Array.from(new Set(logs.map(l => l.request_id).filter(Boolean)));
    const { data: requestsData } = await supabase
        .schema('core_personal')
        .from('tariff_authorization_requests')
        .select('id, codigo_termo')
        .in('id', requestIds);

    const reqMap = new Map<string, string>();
    (requestsData || []).forEach(r => reqMap.set(r.id, r.codigo_termo));

    return logs.map(l => {
        const w = workerMap.get(l.worker_id);
        return {
            ...l,
            worker_nome: w?.nome || 'Trabalhador',
            cod_colab: w?.cod_colab || '-',
            cliente_nombre: w?.cliente_nombre || '-',
            codigo_termo: l.request_id ? reqMap.get(l.request_id) || '-' : '-'
        };
    });
}

export interface SystemUser {
    id: string;
    email: string;
    nome: string;
    phone?: string;
}

export async function listSystemUsers(): Promise<SystemUser[]> {
    const { data: mcsUsers } = await supabase
        .from('mcs_users')
        .select('*');

    if (!mcsUsers || mcsUsers.length === 0) {
        const { data: opUsers } = await supabase
            .schema('core_operacoes')
            .from('mcs_users')
            .select('*');

        if (opUsers && opUsers.length > 0) {
            return opUsers
                .map(u => ({
                    id: u.id,
                    email: u.email || '',
                    nome: u.display_name || u.nome || u.email || 'Usuário',
                    phone: u.phone || u.telefone || ''
                }))
                .sort((a, b) => a.nome.localeCompare(b.nome));
        }
        return [];
    }

    return mcsUsers
        .map(u => ({
            id: u.id,
            email: u.email || '',
            nome: u.display_name || u.nome || u.email || 'Usuário',
            phone: u.phone || u.telefone || ''
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome));
}
