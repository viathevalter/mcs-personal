import { supabase } from '@/shared/supabase/client';

export interface WorkerHoleriteSummary {
    mes_referencia: string; // YYYY-MM
    horas_trabalhadas: number;
    total_proventos: number;
    valor_liquido: number;
    status?: string;
    clientes?: string[];
}

export interface WorkerClientHistory {
    cliente_nome: string;
    primeira_data?: string | null;
    ultima_data?: string | null;
    dias_no_cliente: number;
    total_horas: number;
}

export interface WorkerTariffDossier {
    worker_id: string;
    data_ingresso?: string | null;
    tempo_casa_dias?: number | null;
    cliente_atual?: string | null;
    tempo_cliente_dias?: number | null;
    total_horas_ultimos_meses: number;
    media_horas_mensal: number;
    empresas_passadas?: WorkerClientHistory[];
    ultimos_holerites: WorkerHoleriteSummary[];
}

export interface TariffItemRequest {
    worker_id: string;
    worker_nome: string;
    cod_colab?: string;
    cliente_nombre?: string;
    tarifa_anterior: number;
    tarifa_pretendida?: number;
    tarifa_nova: number;
    dossie?: WorkerTariffDossier;
}

export interface TariffAuthorizationRequest {
    id: string;
    codigo_termo: string;
    solicitante_id?: string;
    solicitante_nome: string;
    solicitante_email?: string;
    gerente_user_id?: string;
    gerente_nome: string;
    gerente_email?: string;
    gerente_phone?: string;
    mes_vigencia: string; // YYYY-MM
    motivo_alteracao?: string;
    status: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'CANCELADO';
    token_assinatura: string;
    itens_solicitacao: TariffItemRequest[];
    assinatura_base64?: string;
    assinado_em?: string;
    task_id?: string;
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
    mes_vigencia?: string;
    alterado_por_nome: string;
    autorizado_por_nome: string;
    documento_autorizacao_url?: string;
    motivo?: string;
    created_at: string;
}

export interface TariffAuthorizer {
    id: string;
    user_id?: string | null;
    email: string;
    nome: string;
    phone?: string | null;
    is_default: boolean;
    active: boolean;
}

export interface TariffGovernanceSettings {
    id: string;
    email_subject_template: string;
    email_body_template: string;
    email_subject_template_es?: string;
    email_body_template_es?: string;
    updated_at?: string;
    updated_by_email?: string;
}

export interface WorkerTariffSchedule {
    id: string;
    worker_id: string;
    tarifa_hora: number;
    mes_inicio: string;
    request_id?: string | null;
    aprovado_por_nome?: string | null;
    aprovado_em: string;
}

export interface SystemUser {
    id: string;
    email: string;
    nome: string;
    phone?: string;
}

export const DEFAULT_EMAIL_SUBJECT =
    'Autorização de Reajuste de Tarifa ({{codigo}}) - Vigência {{vigencia}}';

export const DEFAULT_EMAIL_BODY = `<p>Olá, <strong>{{gerente}}</strong>,</p>
<p><strong>{{solicitante}}</strong> gerou o Termo de Autorização de Tarifa <strong>{{codigo}}</strong> com vigência a partir de <strong>{{vigencia}}</strong>.</p>
<p>Uma tarefa foi atribuída a você na <strong>Super Gaveta Operacional</strong> do sistema.</p>
<p><strong>Trabalhadores / Tarifas:</strong></p>
{{itens}}
<p><strong>Justificativa:</strong><br/>{{justificativa}}</p>
<p>Para revisar e assinar eletronicamente (é necessário estar logado com seu e-mail corporativo), acesse o link abaixo:</p>
<p><a href="{{link}}" style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Revisar e Assinar Termo</a></p>
<p style="font-size:12px;color:#64748b;">Caso o botão não funcione, copie e cole no navegador: {{link}}</p>`;

export const DEFAULT_EMAIL_SUBJECT_ES =
    'Autorización de Ajuste de Tarifa ({{codigo}}) - Vigencia {{vigencia}}';

export const DEFAULT_EMAIL_BODY_ES = `<p>Hola, <strong>{{gerente}}</strong>,</p>
<p><strong>{{solicitante}}</strong> ha generado el Termo de Autorización de Tarifa <strong>{{codigo}}</strong> ({{vigencia}}).</p>
<p>Se te ha asignado una tarea en la <strong>Super Gaveta Operacional</strong> del sistema.</p>
<p><strong>Trabajadores / Tarifas:</strong></p>
{{itens}}
<p><strong>Justificación:</strong><br/>{{justificativa}}</p>
<p>Para revisar y firmar electrónicamente (es necesario iniciar sesión con tu correo corporativo), accede al siguiente enlace:</p>
<p><a href="{{link}}" style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;">Revisar y Firmar Termo</a></p>
<p style="font-size:12px;color:#64748b;">Si el botón no funciona, copia y pega este enlace en tu navegador: {{link}}</p>`;

export function formatMesVigenciaLabel(mesVigencia?: string): string {
    if (!mesVigencia || !/^\d{4}-\d{2}$/.test(mesVigencia)) return mesVigencia || '-';
    const [year, month] = mesVigencia.split('-');
    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const idx = parseInt(month, 10) - 1;
    return `${monthNames[idx] || month}/${year} (${month}/${year})`;
}

export function getCurrentYearMonth(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
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

export async function listTariffAuthorizers(onlyActive = true): Promise<TariffAuthorizer[]> {
    let query = supabase
        .schema('core_personal')
        .from('tariff_authorizers')
        .select('*')
        .order('is_default', { ascending: false })
        .order('nome', { ascending: true });

    if (onlyActive) {
        query = query.eq('active', true);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error listing tariff authorizers:', error);
        return [];
    }
    return (data || []) as TariffAuthorizer[];
}

export async function saveTariffAuthorizer(authorizer: {
    user_id?: string | null;
    email: string;
    nome: string;
    phone?: string | null;
    is_default?: boolean;
    active?: boolean;
}): Promise<TariffAuthorizer> {
    const cleanEmail = authorizer.email.trim().toLowerCase();

    if (authorizer.is_default) {
        await supabase
            .schema('core_personal')
            .from('tariff_authorizers')
            .update({ is_default: false })
            .neq('email', cleanEmail);
    }

    const { data, error } = await supabase
        .schema('core_personal')
        .from('tariff_authorizers')
        .upsert(
            {
                user_id: authorizer.user_id || null,
                email: cleanEmail,
                nome: authorizer.nome.trim(),
                phone: authorizer.phone || null,
                is_default: Boolean(authorizer.is_default),
                active: authorizer.active ?? true,
                updated_at: new Date().toISOString()
            },
            { onConflict: 'email' }
        )
        .select('*')
        .single();

    if (error) throw error;
    return data as TariffAuthorizer;
}

export async function setDefaultTariffAuthorizer(authorizerId: string): Promise<void> {
    await supabase
        .schema('core_personal')
        .from('tariff_authorizers')
        .update({ is_default: false })
        .neq('id', authorizerId);

    const { error } = await supabase
        .schema('core_personal')
        .from('tariff_authorizers')
        .update({ is_default: true, updated_at: new Date().toISOString() })
        .eq('id', authorizerId);

    if (error) throw error;
}

export async function deleteTariffAuthorizer(authorizerId: string): Promise<void> {
    const { error } = await supabase
        .schema('core_personal')
        .from('tariff_authorizers')
        .delete()
        .eq('id', authorizerId);

    if (error) throw error;
}

export async function getTariffGovernanceSettings(): Promise<TariffGovernanceSettings> {
    const { data, error } = await supabase
        .schema('core_personal')
        .from('tariff_governance_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

    if (error || !data) {
        return {
            id: 'default',
            email_subject_template: DEFAULT_EMAIL_SUBJECT,
            email_body_template: DEFAULT_EMAIL_BODY
        };
    }
    return data as TariffGovernanceSettings;
}

export async function updateTariffGovernanceSettings(payload: {
    email_subject_template: string;
    email_body_template: string;
    updated_by_email?: string;
}): Promise<void> {
    const { error } = await supabase
        .schema('core_personal')
        .from('tariff_governance_settings')
        .upsert(
            {
                id: 'default',
                email_subject_template: payload.email_subject_template,
                email_body_template: payload.email_body_template,
                updated_by_email: payload.updated_by_email || null,
                updated_at: new Date().toISOString()
            },
            { onConflict: 'id' }
        );

    if (error) throw error;
}

export function renderEmailTemplate(
    template: string,
    vars: Record<string, string>
): string {
    let output = template;
    for (const [key, val] of Object.entries(vars)) {
        output = output.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'), val);
    }
    return output;
}

export function buildTariffEmailFromTemplate(params: {
    lang: 'pt' | 'es';
    settings: TariffGovernanceSettings;
    gerenteNome: string;
    solicitanteNome: string;
    mesVigencia: string;
    codigoTermo: string;
    itens: TariffItemRequest[];
    justificativa: string;
    signingUrl: string;
}): { subject: string; body: string } {
    const vigenciaLabel = /^\d{4}-\d{2}$/.test(params.mesVigencia)
        ? formatMesVigenciaLabel(params.mesVigencia)
        : params.mesVigencia;

    const itensHtml = `<ul style="padding-left:18px;margin:8px 0;">${params.itens
        .map(
            i =>
                `<li><strong>${i.worker_nome}</strong> (${i.cod_colab || '-'} • ${i.cliente_nombre || '-'}): € ${i.tarifa_anterior.toFixed(2)} &rarr; <strong style="color:#4f46e5;">€ ${i.tarifa_nova.toFixed(2)}/h</strong></li>`
        )
        .join('')}</ul>`;

    const vars = {
        gerente: params.gerenteNome,
        solicitante: params.solicitanteNome,
        vigencia: vigenciaLabel,
        codigo: params.codigoTermo,
        itens: itensHtml,
        justificativa: (params.justificativa || '-').replace(/\n/g, '<br/>'),
        link: params.signingUrl
    };

    const subjectTpl =
        params.lang === 'es'
            ? params.settings.email_subject_template_es || DEFAULT_EMAIL_SUBJECT_ES
            : params.settings.email_subject_template || DEFAULT_EMAIL_SUBJECT;

    const bodyTpl =
        params.lang === 'es'
            ? params.settings.email_body_template_es || DEFAULT_EMAIL_BODY_ES
            : params.settings.email_body_template || DEFAULT_EMAIL_BODY;

    return {
        subject: renderEmailTemplate(subjectTpl, vars),
        body: renderEmailTemplate(bodyTpl, vars)
    };
}

export async function createTariffAuthorizationRequest(payload: {
    solicitanteNome: string;
    solicitanteId?: string;
    solicitanteEmail?: string;
    gerenteNome: string;
    gerenteEmail: string;
    gerenteUserId?: string;
    gerentePhone?: string;
    mesVigencia?: string; // YYYY-MM (defined by authorizer on approval)
    motivoAlteracao?: string;
    itens: TariffItemRequest[];
    empresaId?: string | null;
    emailLanguage?: 'pt' | 'es';
    customEmailSubject?: string;
    customEmailBody?: string;
}): Promise<{
    request: TariffAuthorizationRequest;
    token: string;
    url: string;
    taskCreated: boolean;
    emailSent: boolean;
    emailError?: string;
}> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const codigoTermo = `TAR-${dateStr}-${randomSuffix}`;
    const token = `tth_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const signingUrl = `${window.location.origin}/tariffs/authorization/${token}`;
    const justificativa = (payload.motivoAlteracao || '').trim() || 'Ajuste de tarifa de remuneração horária';

    const effectiveMesVigencia = payload.mesVigencia || getCurrentYearMonth();
    const newRequest = {
        codigo_termo: codigoTermo,
        solicitante_id: payload.solicitanteId || null,
        solicitante_nome: payload.solicitanteNome,
        solicitante_email: payload.solicitanteEmail || null,
        gerente_user_id: payload.gerenteUserId || null,
        gerente_nome: payload.gerenteNome,
        gerente_email: payload.gerenteEmail.trim().toLowerCase(),
        gerente_phone: payload.gerentePhone || null,
        mes_vigencia: effectiveMesVigencia,
        motivo_alteracao: justificativa,
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
        console.error('Error creating tariff authorization request:', error);
        throw error;
    }

    const vigenciaLabel = payload.mesVigencia
        ? formatMesVigenciaLabel(payload.mesVigencia)
        : 'A definir pelo autorizador';

    // 1. Create Task in Super Gaveta Operacional (core_operacoes.solicitud_tareas)
    let taskCreated = false;
    let createdTaskId: string | null = null;
    try {
        const workersSummaryLines = payload.itens
            .map(i => `• ${i.worker_nome} (${i.cod_colab || '-'}): € ${i.tarifa_anterior.toFixed(2)} -> € ${i.tarifa_nova.toFixed(2)}`)
            .join('\n');

        const taskTitle = `Autorizar Tarifa (${codigoTermo}) - Vigência ${vigenciaLabel}`;
        const taskDesc = [
            `Solicitante: ${payload.solicitanteNome} (${payload.solicitanteEmail || '-'})`,
            `Vigência: ${vigenciaLabel}`,
            ``,
            `Trabalhadores:`,
            workersSummaryLines,
            ``,
            `Justificativa: ${justificativa}`,
            ``,
            `Link para assinatura: ${signingUrl}`
        ].join('\n');

        const { data: rpcData, error: rpcError } = await supabase
            .schema('core_operacoes')
            .rpc('criar_tarefa_direta', {
                payload: {
                    empresa_id: payload.empresaId || null,
                    department_code: 'FINANCEIRO',
                    assigned_to: payload.gerenteUserId || null,
                    assigned_to_email: payload.gerenteEmail.trim().toLowerCase(),
                    assigned_to_name: payload.gerenteNome,
                    created_by_email: payload.solicitanteEmail || null,
                    created_by_name: payload.solicitanteNome,
                    worker_id: payload.itens.length === 1 ? payload.itens[0].worker_id : null,
                    title: taskTitle,
                    description: taskDesc,
                    priority: 'high',
                    task_source: 'tariff_authorization',
                    metadata: {
                        tipo: 'tariff_authorization',
                        request_id: data.id,
                        codigo_termo: codigoTermo,
                        token,
                        signing_url: signingUrl,
                        mes_vigencia: payload.mesVigencia
                    }
                }
            });

        if (rpcError) {
            console.error('Error creating Super Gaveta task for tariff authorization:', rpcError);
        } else if (rpcData?.task_id) {
            taskCreated = true;
            createdTaskId = rpcData.task_id;
            await supabase
                .schema('core_personal')
                .from('tariff_authorization_requests')
                .update({ task_id: createdTaskId })
                .eq('id', data.id);
        }
    } catch (taskErr) {
        console.error('Unexpected error creating task:', taskErr);
    }

    // 2. Send Email via send-order-notification Edge Function
    let emailSent = false;
    let emailError: string | undefined;
    try {
        const settings = await getTariffGovernanceSettings();
        const rendered = buildTariffEmailFromTemplate({
            lang: payload.emailLanguage || 'pt',
            settings,
            gerenteNome: payload.gerenteNome,
            solicitanteNome: payload.solicitanteNome,
            mesVigencia: payload.mesVigencia || 'A definir pelo autorizador',
            codigoTermo,
            itens: payload.itens,
            justificativa,
            signingUrl
        });

        let emailSubject = rendered.subject;
        let emailBody = rendered.body;

        if (payload.customEmailSubject && payload.customEmailSubject.trim()) {
            emailSubject = payload.customEmailSubject
                .replace(/\{\{\s*codigo\s*\}\}/gi, codigoTermo)
                .replace(/\{\{\s*link\s*\}\}/gi, signingUrl);
        }
        if (payload.customEmailBody && payload.customEmailBody.trim()) {
            emailBody = payload.customEmailBody
                .replace(/\{\{\s*codigo\s*\}\}/gi, codigoTermo)
                .replace(/\{\{\s*link\s*\}\}/gi, signingUrl);
        }

        const { data: fnData, error: fnErr } = await supabase.functions.invoke('send-order-notification', {
            body: {
                to_emails: [payload.gerenteEmail.trim().toLowerCase()],
                sender_email: payload.solicitanteEmail || undefined,
                reply_to_email: payload.solicitanteEmail || undefined,
                email_subject: emailSubject,
                email_body: emailBody
            }
        });

        if (fnErr || fnData?.error) {
            emailError = fnErr?.message || fnData?.error || 'Falha ao enviar e-mail';
            console.error('Error sending tariff authorization email:', emailError);
        } else {
            emailSent = true;
        }
    } catch (mailErr: any) {
        emailError = mailErr?.message || 'Erro inesperado ao enviar e-mail';
        console.error('Unexpected error sending email:', mailErr);
    }

    return {
        request: { ...(data as TariffAuthorizationRequest), task_id: createdTaskId || undefined },
        token,
        url: signingUrl,
        taskCreated,
        emailSent,
        emailError
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
        console.error('Error fetching tariff authorization by token:', error);
        return null;
    }

    return data as TariffAuthorizationRequest;
}

export async function approveAndApplyTariffAuthorization(payload: {
    token: string;
    assinaturaBase64: string;
    signerEmail: string;
    tipoAssinatura?: 'desenho' | 'imagem' | 'texto';
    mesVigencia?: string;
    approvedTariffs?: Record<string, number>;
}): Promise<{ success: boolean; updatedCount: number; appliedImmediately: boolean; mesVigencia: string }> {
    const request = await getTariffAuthorizationByToken(payload.token);
    if (!request) {
        throw new Error('Solicitação de autorização não encontrada.');
    }

    if (request.status === 'APROVADO') {
        throw new Error('Esta solicitação já foi aprovada e aplicada anteriormente.');
    }
    if (request.status === 'REJEITADO') {
        throw new Error('Esta solicitação já foi marcada como Não Autorizada.');
    }

    if (request.gerente_email) {
        const expected = request.gerente_email.trim().toLowerCase();
        const actual = payload.signerEmail.trim().toLowerCase();
        if (expected !== actual) {
            throw new Error(`Apenas o autorizador designado (${expected}) pode assinar este termo. Você está logado como ${actual}.`);
        }
    }

    const mesVigencia = payload.mesVigencia || request.mes_vigencia || getCurrentYearMonth();
    const nowIso = new Date().toISOString();

    const finalItems: TariffItemRequest[] = (request.itens_solicitacao || []).map(item => {
        const overrideVal = payload.approvedTariffs?.[item.worker_id];
        const approvedRate =
            overrideVal !== undefined && !isNaN(overrideVal) && overrideVal >= 0
                ? overrideVal
                : Number(item.tarifa_nova || 0);
        return {
            ...item,
            tarifa_pretendida: item.tarifa_pretendida ?? item.tarifa_nova,
            tarifa_nova: approvedRate
        };
    });

    const { error: updateReqErr } = await supabase
        .schema('core_personal')
        .from('tariff_authorization_requests')
        .update({
            status: 'APROVADO',
            mes_vigencia: mesVigencia,
            itens_solicitacao: finalItems,
            assinatura_base64: payload.assinaturaBase64,
            assinado_em: nowIso,
            tipo_assinatura: payload.tipoAssinatura || 'desenho',
            updated_at: nowIso
        })
        .eq('id', request.id);

    if (updateReqErr) {
        console.error('Error updating tariff authorization status:', updateReqErr);
        throw updateReqErr;
    }

    const currentMonth = getCurrentYearMonth();
    const applyNowToCurrentSettings = mesVigencia <= currentMonth;

    let updatedCount = 0;

    for (const item of finalItems) {
        if (!item.worker_id) continue;

        // 1. Always record competence schedule (used by Holerites for mes_referencia >= mesVigencia)
        await supabase
            .schema('core_personal')
            .from('worker_tariff_schedules')
            .upsert(
                {
                    worker_id: item.worker_id,
                    tarifa_hora: item.tarifa_nova,
                    mes_inicio: mesVigencia,
                    request_id: request.id,
                    aprovado_por_nome: request.gerente_nome,
                    aprovado_em: nowIso
                },
                { onConflict: 'worker_id,mes_inicio' }
            );

        // 2. Only update worker_beneficios_settings.tarifa_hora if vigência has already started (<= currentMonth)
        if (applyNowToCurrentSettings) {
            const { data: existingSetting } = await supabase
                .schema('core_personal')
                .from('worker_beneficios_settings')
                .select('worker_id')
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
        }

        // 3. Insert Audit Log entry
        await supabase
            .schema('core_personal')
            .from('worker_tariff_audit_logs')
            .insert({
                worker_id: item.worker_id,
                request_id: request.id,
                tarifa_anterior: item.tarifa_anterior,
                tarifa_nova: item.tarifa_nova,
                mes_vigencia: mesVigencia,
                alterado_por_nome: request.solicitante_nome,
                autorizado_por_nome: request.gerente_nome,
                motivo: request.motivo_alteracao,
                created_at: nowIso
            });

        updatedCount++;
    }

    // 4. Complete the linked task in Super Gaveta Operacional
    if (request.task_id) {
        try {
            await supabase.schema('core_operacoes').rpc('concluir_tarefa_termo_tarifa', {
                p_task_id: request.task_id,
                p_signed_by: request.gerente_nome
            });
        } catch (taskErr) {
            console.error('Error completing linked Super Gaveta task:', taskErr);
        }
    }

    // 5. Create follow-up task for the original requester to notify the worker
    if (request.solicitante_email || request.solicitante_id) {
        try {
            const vigenciaLabel = formatMesVigenciaLabel(mesVigencia);
            const lines = finalItems
                .map(i => `• ${i.worker_nome} (${i.cod_colab || '-'}): € ${Number(i.tarifa_anterior).toFixed(2)} -> € ${Number(i.tarifa_nova).toFixed(2)}/h`)
                .join('\n');

            await supabase.schema('core_operacoes').rpc('criar_tarefa_direta', {
                payload: {
                    department_code: 'RH',
                    assigned_to: request.solicitante_id || null,
                    assigned_to_email: request.solicitante_email || null,
                    assigned_to_name: request.solicitante_nome,
                    created_by_email: request.gerente_email || payload.signerEmail,
                    created_by_name: request.gerente_nome,
                    worker_id: finalItems.length === 1 ? finalItems[0].worker_id : null,
                    title: `Comunicar Trabalhador: Tarifa Aprovada (${request.codigo_termo})`,
                    description: [
                        `A solicitação de tarifa ${request.codigo_termo} foi APROVADA por ${request.gerente_nome}.`,
                        `Vigência: ${vigenciaLabel}`,
                        ``,
                        `Valores aprovados:`,
                        lines,
                        ``,
                        `Próximo passo: avisar o(s) trabalhador(es) sobre o valor e mês de vigência e concluir esta tarefa.`
                    ].join('\n'),
                    priority: 'normal',
                    task_source: 'tariff_feedback',
                    metadata: {
                        tipo: 'tariff_feedback',
                        decision: 'APROVADO',
                        request_id: request.id,
                        codigo_termo: request.codigo_termo,
                        mes_vigencia: mesVigencia
                    }
                }
            });
        } catch (followErr) {
            console.error('Error creating follow-up task for requester:', followErr);
        }
    }

    return {
        success: true,
        updatedCount,
        appliedImmediately: applyNowToCurrentSettings,
        mesVigencia
    };
}

export async function listWorkerTariffAuditLogs(): Promise<WorkerTariffAuditLog[]> {
    const { data: logs, error } = await supabase
        .schema('core_personal')
        .from('worker_tariff_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) {
        console.error('Error fetching worker tariff audit logs:', error);
        return [];
    }

    if (!logs || logs.length === 0) return [];

    const workerIds = Array.from(new Set(logs.map(l => l.worker_id).filter(Boolean)));
    const { data: workersData } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('id, nome, cod_colab, cliente_nombre')
        .in('id', workerIds);

    const workerMap = new Map<string, any>();
    (workersData || []).forEach(w => workerMap.set(w.id, w));

    const requestIds = Array.from(new Set(logs.map(l => l.request_id).filter(Boolean)));
    const { data: requestsData } = await supabase
        .schema('core_personal')
        .from('tariff_authorization_requests')
        .select('id, codigo_termo, mes_vigencia')
        .in('id', requestIds);

    const reqMap = new Map<string, { codigo_termo: string; mes_vigencia?: string }>();
    (requestsData || []).forEach(r => reqMap.set(r.id, r));

    return logs.map(l => {
        const w = workerMap.get(l.worker_id);
        const req = l.request_id ? reqMap.get(l.request_id) : undefined;
        return {
            ...l,
            worker_nome: w?.nome || 'Trabalhador',
            cod_colab: w?.cod_colab || '-',
            cliente_nombre: w?.cliente_nombre || '-',
            codigo_termo: req?.codigo_termo || '-',
            mes_vigencia: l.mes_vigencia || req?.mes_vigencia
        };
    });
}

export async function listTariffAuthorizationRequests(): Promise<(TariffAuthorizationRequest & { url: string })[]> {
    const { data, error } = await supabase
        .schema('core_personal')
        .from('tariff_authorization_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

    if (error || !data) {
        console.error('Error listing tariff authorization requests:', error);
        return [];
    }

    const baseUrl = window.location.origin;

    return data.map(r => ({
        id: r.id,
        codigo_termo: r.codigo_termo,
        solicitante_id: r.solicitante_id,
        solicitante_nome: r.solicitante_nome,
        solicitante_email: r.solicitante_email,
        gerente_user_id: r.gerente_user_id,
        gerente_nome: r.gerente_nome,
        gerente_email: r.gerente_email,
        gerente_phone: r.gerente_phone,
        mes_vigencia: r.mes_vigencia || getCurrentYearMonth(),
        motivo_alteracao: r.motivo_alteracao,
        status: r.status,
        token_assinatura: r.token_assinatura,
        itens_solicitacao: r.itens_solicitacao || [],
        assinatura_base64: r.assinatura_base64,
        assinado_em: r.assinado_em,
        tipo_assinatura: r.tipo_assinatura,
        motivo_rejeicao: r.motivo_rejeicao,
        rejeitado_em: r.rejeitado_em,
        rejeitado_por_nome: r.rejeitado_por_nome,
        task_id: r.task_id,
        created_at: r.created_at,
        url: `${baseUrl}/tariffs/authorization/${r.token_assinatura}`
    }));
}

export async function rejectTariffAuthorization(payload: {
    token: string;
    motivoRejeicao: string;
    rejectorEmail: string;
    rejectorNome?: string;
}): Promise<{ success: boolean }> {
    const request = await getTariffAuthorizationByToken(payload.token);
    if (!request) {
        throw new Error('Solicitação de autorização não encontrada.');
    }

    if (request.status === 'APROVADO') {
        throw new Error('Esta solicitação já foi aprovada anteriormente.');
    }
    if (request.status === 'REJEITADO') {
        throw new Error('Esta solicitação já foi marcada como Não Autorizada.');
    }

    if (request.gerente_email) {
        const expected = request.gerente_email.trim().toLowerCase();
        const actual = payload.rejectorEmail.trim().toLowerCase();
        if (expected !== actual) {
            throw new Error(`Apenas o autorizador designado (${expected}) pode recusar este termo. Você está logado como ${actual}.`);
        }
    }

    const reason = payload.motivoRejeicao.trim();
    if (!reason) {
        throw new Error('Informe a justificativa da não autorização.');
    }

    const nowIso = new Date().toISOString();
    const rejectorName = payload.rejectorNome || request.gerente_nome;

    const { error } = await supabase
        .schema('core_personal')
        .from('tariff_authorization_requests')
        .update({
            status: 'REJEITADO',
            motivo_rejeicao: reason,
            rejeitado_em: nowIso,
            rejeitado_por_nome: rejectorName,
            updated_at: nowIso
        })
        .eq('id', request.id);

    if (error) {
        console.error('Error rejecting tariff authorization:', error);
        throw error;
    }

    if (request.task_id) {
        try {
            await supabase.schema('core_operacoes').rpc('concluir_tarefa_termo_tarifa', {
                p_task_id: request.task_id,
                p_signed_by: `${rejectorName} (NÃO AUTORIZADO: ${reason})`
            });
        } catch (taskErr) {
            console.error('Error completing linked Super Gaveta task on rejection:', taskErr);
        }
    }

    // Create follow-up task for the original requester to notify the worker of the rejection
    if (request.solicitante_email || request.solicitante_id) {
        try {
            const items = request.itens_solicitacao || [];
            const lines = items
                .map(i => `• ${i.worker_nome} (${i.cod_colab || '-'}): mantida em € ${Number(i.tarifa_anterior).toFixed(2)}/h`)
                .join('\n');

            await supabase.schema('core_operacoes').rpc('criar_tarefa_direta', {
                payload: {
                    department_code: 'RH',
                    assigned_to: request.solicitante_id || null,
                    assigned_to_email: request.solicitante_email || null,
                    assigned_to_name: request.solicitante_nome,
                    created_by_email: request.gerente_email || payload.rejectorEmail,
                    created_by_name: rejectorName,
                    worker_id: items.length === 1 ? items[0].worker_id : null,
                    title: `Comunicar Trabalhador: Tarifa Não Autorizada (${request.codigo_termo})`,
                    description: [
                        `A solicitação de tarifa ${request.codigo_termo} foi NÃO AUTORIZADA por ${rejectorName}.`,
                        ``,
                        `Trabalhador(es):`,
                        lines,
                        ``,
                        `Motivo da não autorização: ${reason}`,
                        ``,
                        `Próximo passo: dar o retorno ao colaborador e concluir esta tarefa.`
                    ].join('\n'),
                    priority: 'high',
                    task_source: 'tariff_feedback',
                    metadata: {
                        tipo: 'tariff_feedback',
                        decision: 'REJEITADO',
                        request_id: request.id,
                        codigo_termo: request.codigo_termo
                    }
                }
            });
        } catch (followErr) {
            console.error('Error creating follow-up rejection task for requester:', followErr);
        }
    }

    return { success: true };
}

export interface WorkerTariffStatusBadge {
    pending?: { tarifa: number; mesVigencia: string; codigoTermo: string };
    scheduled?: { tarifa: number; mesInicio: string };
}

export async function getWorkerTariffStatusBadges(): Promise<Map<string, WorkerTariffStatusBadge>> {
    const result = new Map<string, WorkerTariffStatusBadge>();
    const currentMonth = getCurrentYearMonth();

    const [{ data: pendingReqs }, { data: futureSchedules }] = await Promise.all([
        supabase
            .schema('core_personal')
            .from('tariff_authorization_requests')
            .select('codigo_termo, mes_vigencia, itens_solicitacao')
            .eq('status', 'PENDENTE')
            .order('created_at', { ascending: false }),
        supabase
            .schema('core_personal')
            .from('worker_tariff_schedules')
            .select('worker_id, tarifa_hora, mes_inicio')
            .gt('mes_inicio', currentMonth)
            .order('mes_inicio', { ascending: true })
    ]);

    (pendingReqs || []).forEach((req: any) => {
        (req.itens_solicitacao || []).forEach((item: TariffItemRequest) => {
            if (!item.worker_id) return;
            const prev = result.get(item.worker_id) || {};
            if (!prev.pending) {
                prev.pending = {
                    tarifa: Number(item.tarifa_nova || 0),
                    mesVigencia: req.mes_vigencia || currentMonth,
                    codigoTermo: req.codigo_termo
                };
                result.set(item.worker_id, prev);
            }
        });
    });

    (futureSchedules || []).forEach((sch: any) => {
        const prev = result.get(sch.worker_id) || {};
        if (!prev.scheduled) {
            prev.scheduled = {
                tarifa: Number(sch.tarifa_hora || 0),
                mesInicio: sch.mes_inicio
            };
            result.set(sch.worker_id, prev);
        }
    });

    return result;
}

export async function getEffectiveTariffsMapForMonth(mesReferencia: string): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (!mesReferencia) return map;

    const cleanMonth = mesReferencia.substring(0, 7);

    const [{ data: schedules }, { data: futureAuditLogs }] = await Promise.all([
        supabase
            .schema('core_personal')
            .from('worker_tariff_schedules')
            .select('worker_id, tarifa_hora, mes_inicio')
            .lte('mes_inicio', cleanMonth)
            .order('mes_inicio', { ascending: false }),
        supabase
            .schema('core_personal')
            .from('worker_tariff_audit_logs')
            .select('worker_id, tarifa_anterior, tarifa_nova, mes_vigencia, created_at')
            .gt('mes_vigencia', cleanMonth)
            .order('mes_vigencia', { ascending: true })
            .order('created_at', { ascending: true })
    ]);

    // 1. Apply active schedule for months >= mes_inicio
    if (schedules) {
        for (const row of schedules) {
            if (row.worker_id && !map.has(row.worker_id) && Number(row.tarifa_hora || 0) > 0) {
                map.set(row.worker_id, Number(row.tarifa_hora));
            }
        }
    }

    // 2. For months BEFORE a future/later tariff raise (mesReferencia < mes_vigencia),
    // restore the worker's previous tariff (tarifa_anterior) if no earlier schedule was active
    if (futureAuditLogs) {
        for (const log of futureAuditLogs) {
            if (log.worker_id && !map.has(log.worker_id) && Number(log.tarifa_anterior || 0) > 0) {
                map.set(log.worker_id, Number(log.tarifa_anterior));
            }
        }
    }

    return map;
}

export async function updatePendingTariffAuthorizationRequest(payload: {
    requestId: string;
    mesVigencia: string;
    motivoAlteracao: string;
    itens: TariffItemRequest[];
}): Promise<void> {
    const { data: existing, error: fetchErr } = await supabase
        .schema('core_personal')
        .from('tariff_authorization_requests')
        .select('*')
        .eq('id', payload.requestId)
        .single();

    if (fetchErr || !existing) {
        throw new Error('Termo não encontrado.');
    }

    if (existing.status !== 'PENDENTE') {
        throw new Error('Apenas termos com status PENDENTE podem ser editados.');
    }

    const cleanMotivo = payload.motivoAlteracao.trim() || 'Ajuste de tarifa de remuneração horária';
    const nowIso = new Date().toISOString();

    const { error: updateErr } = await supabase
        .schema('core_personal')
        .from('tariff_authorization_requests')
        .update({
            mes_vigencia: payload.mesVigencia,
            motivo_alteracao: cleanMotivo,
            itens_solicitacao: payload.itens,
            updated_at: nowIso
        })
        .eq('id', payload.requestId);

    if (updateErr) throw updateErr;

    // Sync linked Super Gaveta task (without creating a new task or sending a new email)
    if (existing.task_id) {
        try {
            const vigenciaLabel = payload.mesVigencia
        ? formatMesVigenciaLabel(payload.mesVigencia)
        : 'A definir pelo autorizador';
            const signingUrl = `${window.location.origin}/tariffs/authorization/${existing.token_assinatura}`;
            const workersSummaryLines = payload.itens
                .map(i => `• ${i.worker_nome} (${i.cod_colab || '-'}): € ${Number(i.tarifa_anterior).toFixed(2)} -> € ${Number(i.tarifa_nova).toFixed(2)}`)
                .join('\n');

            const taskTitle = `Autorizar Tarifa (${existing.codigo_termo}) - Vigência ${vigenciaLabel}`;
            const taskDesc = [
                `Solicitante: ${existing.solicitante_nome} (${existing.solicitante_email || '-'})`,
                `Vigência: ${vigenciaLabel}`,
                ``,
                `Trabalhadores:`,
                workersSummaryLines,
                ``,
                `Justificativa: ${cleanMotivo}`,
                ``,
                `Link para assinatura: ${signingUrl}`
            ].join('\n');

            await supabase.schema('core_operacoes').rpc('atualizar_tarefa_termo_tarifa', {
                p_task_id: existing.task_id,
                p_title: taskTitle,
                p_description: taskDesc,
                p_mes_vigencia: payload.mesVigencia
            });
        } catch (taskErr) {
            console.error('Error syncing linked Super Gaveta task:', taskErr);
        }
    }
}

export async function deletePendingTariffAuthorizationRequest(requestId: string): Promise<void> {
    const { data: existing, error: fetchErr } = await supabase
        .schema('core_personal')
        .from('tariff_authorization_requests')
        .select('id, status, task_id, codigo_termo')
        .eq('id', requestId)
        .single();

    if (fetchErr || !existing) {
        throw new Error('Termo não encontrado.');
    }

    if (existing.status !== 'PENDENTE') {
        throw new Error('Apenas termos com status PENDENTE podem ser excluídos.');
    }

    if (existing.task_id) {
        try {
            await supabase.schema('core_operacoes').rpc('cancelar_tarefa_termo_tarifa', {
                p_task_id: existing.task_id,
                p_reason: `Termo ${existing.codigo_termo} excluído pelo solicitante.`
            });
        } catch (taskErr) {
            console.error('Error cancelling linked Super Gaveta task:', taskErr);
        }
    }

    const { error: delErr } = await supabase
        .schema('core_personal')
        .from('tariff_authorization_requests')
        .delete()
        .eq('id', requestId);

    if (delErr) throw delErr;
}

export interface WorkerTariffTimelineEvent {
    id: string;
    kind: 'contratacao' | 'termo_audit' | 'vigencia_agendada';
    date: string;
    title: string;
    subtitle?: string;
    tarifaAnterior?: number;
    tarifaNova: number;
    mesVigencia?: string;
    actorName?: string;
    authorizerName?: string;
    status?: string;
    codigoTermo?: string;
}

export async function getWorkerCompleteTariffTimeline(workerId: string): Promise<WorkerTariffTimelineEvent[]> {
    const [assignmentsRes, auditRes, schedulesRes, usersRes] = await Promise.all([
        supabase
            .schema('core_personal')
            .from('worker_assignments')
            .select('id, client_id, status, tarifa_acordada, planned_start_date, start_date, end_date, created_at, created_by')
            .eq('worker_id', workerId)
            .order('created_at', { ascending: false }),
        supabase
            .schema('core_personal')
            .from('worker_tariff_audit_logs')
            .select('*')
            .eq('worker_id', workerId)
            .order('created_at', { ascending: false }),
        supabase
            .schema('core_personal')
            .from('worker_tariff_schedules')
            .select('*')
            .eq('worker_id', workerId)
            .order('mes_inicio', { ascending: false }),
        listSystemUsers().catch(() => [] as SystemUser[])
    ]);

    const userMap = new Map<string, SystemUser>();
    usersRes.forEach(u => userMap.set(u.id, u));

    const assignments = assignmentsRes.data || [];
    const clientIds = Array.from(new Set(assignments.map((a: any) => a.client_id).filter(Boolean)));
    const clientMap = new Map<string, string>();
    if (clientIds.length > 0) {
        const { data: clients } = await supabase
            .schema('core_common')
            .from('clients')
            .select('id, trade_name, legal_name')
            .in('id', clientIds);
        (clients || []).forEach((c: any) => clientMap.set(c.id, c.trade_name || c.legal_name || 'Cliente'));
    }

    const audits = auditRes.data || [];
    const reqIds = Array.from(new Set(audits.map((a: any) => a.request_id).filter(Boolean)));
    const reqCodeMap = new Map<string, string>();
    if (reqIds.length > 0) {
        const { data: reqs } = await supabase
            .schema('core_personal')
            .from('tariff_authorization_requests')
            .select('id, codigo_termo')
            .in('id', reqIds);
        (reqs || []).forEach((r: any) => reqCodeMap.set(r.id, r.codigo_termo));
    }

    const events: WorkerTariffTimelineEvent[] = [];

    assignments.forEach((a: any) => {
        const clientName = a.client_id ? clientMap.get(a.client_id) || 'Cliente' : 'Cliente';
        const creator = a.created_by ? userMap.get(a.created_by) : undefined;
        const startStr = a.start_date || a.planned_start_date;
        const endStr = a.end_date;
        const periodParts: string[] = [];
        if (startStr) periodParts.push(`Início: ${new Date(startStr).toLocaleDateString('pt-PT')}`);
        if (endStr) periodParts.push(`Fim: ${new Date(endStr).toLocaleDateString('pt-PT')}`);

        events.push({
            id: `assign-${a.id}`,
            kind: 'contratacao',
            date: a.created_at,
            title: `Contratação: ${clientName}`,
            subtitle: periodParts.join(' • ') || undefined,
            tarifaNova: Number(a.tarifa_acordada || 0),
            mesVigencia: startStr ? String(startStr).slice(0, 7) : undefined,
            actorName: creator ? `${creator.nome} (${creator.email})` : 'Contratação',
            status: a.status
        });
    });

    audits.forEach((l: any) => {
        events.push({
            id: `audit-${l.id}`,
            kind: 'termo_audit',
            date: l.created_at,
            title: l.motivo || 'Alteração de Tarifa',
            tarifaAnterior: Number(l.tarifa_anterior || 0),
            tarifaNova: Number(l.tarifa_nova || 0),
            mesVigencia: l.mes_vigencia || undefined,
            actorName: l.alterado_por_nome,
            authorizerName: l.autorizado_por_nome,
            codigoTermo: l.request_id ? reqCodeMap.get(l.request_id) : undefined
        });
    });

    (schedulesRes.data || []).forEach((s: any) => {
        events.push({
            id: `sch-${s.id}`,
            kind: 'vigencia_agendada',
            date: s.aprovado_em || s.created_at,
            title: `Vigência por Competência (${formatMesVigenciaLabel(s.mes_inicio)})`,
            tarifaNova: Number(s.tarifa_hora || 0),
            mesVigencia: s.mes_inicio,
            authorizerName: s.aprovado_por_nome || undefined
        });
    });

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function getWorkerTariffDossiers(
    workerIds: string[]
): Promise<Map<string, WorkerTariffDossier>> {
    const map = new Map<string, WorkerTariffDossier>();
    if (!workerIds || workerIds.length === 0) return map;

    const [workersRes, assignmentsRes, holeritesRes, horasRes, settingsRes] = await Promise.all([
        supabase
            .schema('core_personal')
            .from('workers')
            .select('id, data_ingresso, cliente, created_at')
            .in('id', workerIds),
        supabase
            .schema('core_personal')
            .from('worker_assignments')
            .select('worker_id, client_id, start_date, planned_start_date, end_date, status')
            .in('worker_id', workerIds)
            .order('created_at', { ascending: false }),
        supabase
            .schema('core_personal')
            .from('holerites')
            .select('id, worker_id, mes_referencia, horas_trabalhadas, total_proventos, valor_liquido, status')
            .in('worker_id', workerIds)
            .order('mes_referencia', { ascending: false })
            .limit(workerIds.length * 6),
        supabase
            .schema('core_finance')
            .from('horas_trabalhadas')
            .select('worker_id, client_id, data_trabalho, horas_totais')
            .in('worker_id', workerIds)
            .order('data_trabalho', { ascending: false })
            .limit(3000),
        supabase
            .schema('core_personal')
            .from('worker_beneficios_settings')
            .select('worker_id, tarifa_hora')
            .in('worker_id', workerIds)
    ]);

    const horasRows = horasRes.data || [];
    const assignments = assignmentsRes.data || [];

    const allClientIds = Array.from(
        new Set([
            ...horasRows.map((r: any) => r.client_id).filter(Boolean),
            ...assignments.map((a: any) => a.client_id).filter(Boolean)
        ])
    );

    const clientNameMap = new Map<string, string>();
    if (allClientIds.length > 0) {
        const { data: clientsData } = await supabase
            .schema('core_common')
            .from('clients')
            .select('id, trade_name, legal_name')
            .in('id', allClientIds);
        (clientsData || []).forEach((c: any) => {
            clientNameMap.set(c.id, c.trade_name || c.legal_name || 'Cliente');
        });
    }

    const holerites = holeritesRes.data || [];
    const holeriteIds = holerites.map((h: any) => h.id).filter(Boolean);
    const horasEventoMap = new Map<string, number>();

    if (holeriteIds.length > 0) {
        const { data: eventos } = await supabase
            .schema('core_personal')
            .from('holerite_eventos')
            .select('holerite_id, categoria, referencia_dias_horas')
            .in('holerite_id', holeriteIds)
            .in('categoria', ['total_horas', 'ajuste_manual_horas']);

        (eventos || []).forEach((ev: any) => {
            if (ev.categoria === 'ajuste_manual_horas' && ev.referencia_dias_horas != null) {
                horasEventoMap.set(ev.holerite_id, Number(ev.referencia_dias_horas));
            } else if (!horasEventoMap.has(ev.holerite_id) && ev.referencia_dias_horas != null) {
                horasEventoMap.set(ev.holerite_id, Number(ev.referencia_dias_horas));
            }
        });
    }

    const nowMs = Date.now();
    const dayMs = 1000 * 60 * 60 * 24;

    const workerMap = new Map<string, any>();
    (workersRes.data || []).forEach((w: any) => workerMap.set(w.id, w));

    const tarifaMap = new Map<string, number>();
    (settingsRes.data || []).forEach((s: any) => tarifaMap.set(s.worker_id, Number(s.tarifa_hora || 0)));

    const assignByWorker = new Map<string, any[]>();
    assignments.forEach((a: any) => {
        const list = assignByWorker.get(a.worker_id) || [];
        list.push(a);
        assignByWorker.set(a.worker_id, list);
    });

    const holeritesByWorker = new Map<string, any[]>();
    holerites.forEach((h: any) => {
        const list = holeritesByWorker.get(h.worker_id) || [];
        list.push(h);
        holeritesByWorker.set(h.worker_id, list);
    });

    const horasByWorker = new Map<string, any[]>();
    horasRows.forEach((r: any) => {
        const list = horasByWorker.get(r.worker_id) || [];
        list.push(r);
        horasByWorker.set(r.worker_id, list);
    });

    for (const wid of workerIds) {
        const w = workerMap.get(wid);
        const assigns = assignByWorker.get(wid) || [];
        const hList = holeritesByWorker.get(wid) || [];
        const wHoras = horasByWorker.get(wid) || [];
        const currentTarifa = tarifaMap.get(wid) || 0;

        const admissionStr = w?.data_ingresso || w?.created_at || null;
        const tempoCasaDias = admissionStr
            ? Math.max(0, Math.floor((nowMs - new Date(admissionStr).getTime()) / dayMs))
            : null;

        // Build client history (empresas passadas) from horas_trabalhadas + worker_assignments
        const clientStats = new Map<
            string,
            { nome: string; minDate: string | null; maxDate: string | null; totalHoras: number }
        >();

        wHoras.forEach((r: any) => {
            const cName = (r.client_id && clientNameMap.get(r.client_id)) || w?.cliente || 'Cliente';
            const dt = r.data_trabalho ? String(r.data_trabalho).slice(0, 10) : null;
            const prev = clientStats.get(cName) || { nome: cName, minDate: dt, maxDate: dt, totalHoras: 0 };
            prev.totalHoras += Number(r.horas_totais || 0);
            if (dt && (!prev.minDate || dt < prev.minDate)) prev.minDate = dt;
            if (dt && (!prev.maxDate || dt > prev.maxDate)) prev.maxDate = dt;
            clientStats.set(cName, prev);
        });

        assigns.forEach((a: any) => {
            const cName = (a.client_id && clientNameMap.get(a.client_id)) || null;
            if (!cName) return;
            const startDt = (a.start_date || a.planned_start_date) ? String(a.start_date || a.planned_start_date).slice(0, 10) : null;
            const endDt = a.end_date ? String(a.end_date).slice(0, 10) : null;
            const prev = clientStats.get(cName) || { nome: cName, minDate: startDt, maxDate: endDt || startDt, totalHoras: 0 };
            if (startDt && (!prev.minDate || startDt < prev.minDate)) prev.minDate = startDt;
            if (endDt && (!prev.maxDate || endDt > prev.maxDate)) prev.maxDate = endDt;
            clientStats.set(cName, prev);
        });

        const empresasPassadas: WorkerClientHistory[] = Array.from(clientStats.values())
            .map(cs => {
                const startMs = cs.minDate ? new Date(cs.minDate).getTime() : nowMs;
                const endMs = cs.maxDate ? new Date(cs.maxDate).getTime() : nowMs;
                const dias = Math.max(1, Math.floor((endMs - startMs) / dayMs) + 1);
                return {
                    cliente_nome: cs.nome,
                    primeira_data: cs.minDate,
                    ultima_data: cs.maxDate,
                    dias_no_cliente: dias,
                    total_horas: Math.round(cs.totalHoras * 100) / 100
                };
            })
            .sort((a, b) => (b.ultima_data || '').localeCompare(a.ultima_data || ''));

        const activeAssign = assigns.find((a: any) => a.status === 'active') || assigns[0];
        const clientStartStr = activeAssign?.start_date || activeAssign?.planned_start_date || empresasPassadas[0]?.primeira_data || null;
        const tempoClienteDias = clientStartStr
            ? Math.max(0, Math.floor((nowMs - new Date(clientStartStr).getTime()) / dayMs))
            : null;

        // Aggregate horas_trabalhadas by month YYYY-MM
        const monthHoursMap = new Map<string, { horas: number; clients: Set<string> }>();
        wHoras.forEach((r: any) => {
            if (!r.data_trabalho) return;
            const mes = String(r.data_trabalho).slice(0, 7);
            const cur = monthHoursMap.get(mes) || { horas: 0, clients: new Set<string>() };
            cur.horas += Number(r.horas_totais || 0);
            const cName = (r.client_id && clientNameMap.get(r.client_id)) || w?.cliente;
            if (cName) cur.clients.add(cName);
            monthHoursMap.set(mes, cur);
        });

        const holeriteByMonth = new Map<string, any>();
        hList.forEach((h: any) => {
            const mes = String(h.mes_referencia).slice(0, 7);
            if (!holeriteByMonth.has(mes)) holeriteByMonth.set(mes, h);
        });

        const allMonths = Array.from(
            new Set([...Array.from(monthHoursMap.keys()), ...Array.from(holeriteByMonth.keys())])
        )
            .sort((a, b) => b.localeCompare(a))
            .slice(0, 6);

        const ultimosHolerites: WorkerHoleriteSummary[] = allMonths.map(mes => {
            const h = holeriteByMonth.get(mes);
            const mh = monthHoursMap.get(mes);
            const horasHolerite = h
                ? Number(h.horas_trabalhadas || 0) > 0
                    ? Number(h.horas_trabalhadas)
                    : Number(horasEventoMap.get(h.id) || 0)
                : 0;
            const horas = horasHolerite > 0 ? horasHolerite : Math.round((mh?.horas || 0) * 100) / 100;
            const estimatedGross = horas * currentTarifa;
            const proventos = h && Number(h.total_proventos || 0) > 0 ? Number(h.total_proventos) : estimatedGross;
            const liquido = h && Number(h.valor_liquido || 0) > 0 ? Number(h.valor_liquido) : estimatedGross;
            const status = h?.status === 'pago' ? 'Pago' : h ? 'Lançado' : 'Horas Lançadas';

            return {
                mes_referencia: mes,
                horas_trabalhadas: horas,
                total_proventos: Math.round(proventos * 100) / 100,
                valor_liquido: Math.round(liquido * 100) / 100,
                status,
                clientes: mh ? Array.from(mh.clients) : undefined
            };
        });

        const totalHoras = ultimosHolerites.reduce((sum, h) => sum + h.horas_trabalhadas, 0);
        const mediaHoras = ultimosHolerites.length > 0 ? totalHoras / ultimosHolerites.length : 0;

        map.set(wid, {
            worker_id: wid,
            data_ingresso: admissionStr,
            tempo_casa_dias: tempoCasaDias,
            cliente_atual: w?.cliente || empresasPassadas[0]?.cliente_nome || null,
            tempo_cliente_dias: tempoClienteDias,
            total_horas_ultimos_meses: Math.round(totalHoras * 100) / 100,
            media_horas_mensal: Math.round(mediaHoras * 10) / 10,
            empresas_passadas: empresasPassadas,
            ultimos_holerites: ultimosHolerites
        });
    }

    return map;
}

export function formatDossierSummaryText(workerName: string, dossier?: WorkerTariffDossier): string {
    if (!dossier) return '';
    const lines: string[] = [`📊 Resumo Operacional — ${workerName}:`];
    if (dossier.data_ingresso) {
        lines.push(
            `• Tempo na empresa: ${dossier.tempo_casa_dias ?? 0} dias (desde ${new Date(dossier.data_ingresso).toLocaleDateString('pt-PT')})`
        );
    }
    if (dossier.empresas_passadas && dossier.empresas_passadas.length > 0) {
        lines.push(`• Empresas/Clientes por onde passou:`);
        dossier.empresas_passadas.forEach(emp => {
            const period = emp.primeira_data && emp.ultima_data
                ? `${new Date(emp.primeira_data).toLocaleDateString('pt-PT')} a ${new Date(emp.ultima_data).toLocaleDateString('pt-PT')}`
                : '';
            lines.push(
                `  - ${emp.cliente_nome}: ${emp.dias_no_cliente} dias${period ? ` (${period})` : ''} • ${emp.total_horas}h`
            );
        });
    }
    if (dossier.ultimos_holerites.length > 0) {
        lines.push(`• Média de horas: ${dossier.media_horas_mensal}h/mês (últimos ${dossier.ultimos_holerites.length} meses):`);
        dossier.ultimos_holerites.forEach(h => {
            lines.push(
                `  - ${h.mes_referencia}: ${h.horas_trabalhadas}h | Est./Líquido: € ${h.valor_liquido.toFixed(2)} (${h.status || '-'})`
            );
        });
    } else {
        lines.push('• Sem horas ou holerites anteriores registrados.');
    }
    return lines.join('\n');
}
