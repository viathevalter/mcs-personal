import { supabase } from '@/shared/supabase/client';
import { fetchAllPages, fetchInChunks } from '@/shared/supabase/pagination';
import { mapSupabaseError } from '@/shared/api/supabaseError';

export interface Contract {
    id: string;
    empresa_id: string;
    worker_id: string;
    assignment_id: string | null;
    contratante: string;
    contract_type: string;
    status: 'draft' | 'pending_signature' | 'signed' | 'cancelled' | 'terminated' | 'no_signature';
    document_url: string | null;
    signed_document_url: string | null;
    signature_token: string;
    otp_code?: string; // Disponível em desenvolvimento para teste
    otp_expires_at: string | null;
    sent_at: string | null;
    signed_at: string | null;
    terminated_at: string | null;
    metadata?: {
        request_date?: string;
        notice_start_date?: string;
        notice_end_date?: string;
        effective_date?: string;
        notice_days?: number;
        penalty_total?: number;
        apply_deduction?: boolean;
        notice_status?: 'in_progress' | 'completed' | 'abandoned' | 'waived';
        stop_date?: string | null;
        work_start_date?: string | null;
        month_worked_days?: number | null;
        fulfilled_days_override?: number | null;
        notice_notes?: string | null;
        is_manual_entry?: boolean;
        payroll_discount_id?: string | null;
        payroll_competence?: string | null;
        payroll_consolidated_amount?: number | null;
        payroll_consolidated_at?: string | null;
        payroll_stop_reason?: string | null;
        is_sepe_pdf?: boolean;
        sepe_codigo?: string;
        base_document_url?: string;
        worker_signed?: boolean;
        worker_signed_at?: string;
        worker_ip?: string;
        worker_otp?: string;
        company_signed?: boolean;
        company_signed_at?: string;
        company_ip?: string;
        company_otp?: string;
        company_otp_code?: string | null;
        company_otp_expires_at?: string | null;
        company_signer_name?: string;
        company_signer_nif?: string;
        company_signer_cargo?: string;
        company_signer_email?: string;
        representante_nombre?: string;
        representante_nif?: string;
        representante_cargo?: string;
        representante_email?: string;
        puesto?: string;
        grupo_profesional?: string;
        funciones?: string;
        centro_trabajo?: string;
        fecha_inicio?: string;
        retribucion_total?: string;
        convenio_colectivo?: string;
    } | null;
    created_at: string;
    updated_at: string;
    
    // Virtual fields
    pedido_codigo?: string | null;
    solicitud_codigo?: string | null;
    solicitud_tipo?: string | null;
    solicitud_title?: string | null;
    worker?: {
        id: string;
        nome: string;
        email: string;
        movil: string;
        nif: string;
        niss: string;
        dni: string;
        nie: string;
        pasaporte: string;
        cliente?: string;
        cod_cliente?: string;
        cod_colab?: string;
        data_ingresso?: string | null;
        data_alta_seguridad?: string | null;
    };
    assignment?: {
        id: string;
        client?: {
            id: string;
            legal_name: string;
            trade_name: string;
        };
    } | null;
}

import { isHoldingId } from '@/shared/utils/empresaUtils';

export interface ListContractsParams {
    empresaId: string;
    workerId?: string;
    status?: string[];
    contractType?: string[];
}

function normalizeCompany(str: string): string {
    if (!str) return '';
    return str
        .toUpperCase()
        .replace(/,/g, '')
        .replace(/\bLDA\b/g, '')
        .replace(/\bSL\b/g, '')
        .replace(/\bSRL\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function fetchWorkersOrderInfo(workerIds: string[], codColabs: string[]) {
    const uniqueWorkerIds = [...new Set(workerIds.filter(Boolean))];
    const uniqueCodColabs = [...new Set(codColabs.filter(Boolean))];

    const [allocs, assigns, targetsTarget, targetsSource] = await Promise.all([
        fetchInChunks<any>(uniqueCodColabs, chunk =>
            supabase
                .schema('core_personal')
                .from('vw_worker_allocations')
                .select('cod_colab, codpedido, cliente_nombre, contratante, fechainiciopedido, fechasalidatrabajador, fechafinpedido, inserted_at')
                .in('cod_colab', chunk)
        ),
        fetchInChunks<any>(uniqueWorkerIds, chunk =>
            supabase
                .schema('core_personal')
                .from('worker_assignments')
                .select('id, worker_id, empresa_id, client_id, pedido_id, status, start_date, planned_start_date, created_at')
                .in('worker_id', chunk)
        ),
        fetchInChunks<any>(uniqueWorkerIds, chunk =>
            supabase
                .schema('core_operacoes')
                .from('solicitud_targets')
                .select('id, solicitud_id, target_worker_id, source_worker_id, created_at')
                .in('target_worker_id', chunk)
        ),
        fetchInChunks<any>(uniqueWorkerIds, chunk =>
            supabase
                .schema('core_operacoes')
                .from('solicitud_targets')
                .select('id, solicitud_id, target_worker_id, source_worker_id, created_at')
                .in('source_worker_id', chunk)
        )
    ]);

    const targets = [...targetsTarget, ...targetsSource] as any[];

    const pedidoIds = [...new Set(assigns.map((a: any) => a.pedido_id).filter(Boolean))];
    const solicitudIds = [...new Set(targets.map((t: any) => t.solicitud_id).filter(Boolean))];

    const [pedidosData, solData] = await Promise.all([
        fetchInChunks<any>(pedidoIds, chunk =>
            supabase.schema('core_comercial').from('pedidos').select('id, codigo').in('id', chunk)
        ),
        fetchInChunks<any>(solicitudIds, chunk =>
            supabase.schema('core_operacoes').from('solicitudes_operativas').select('id, codigo, tipo, title').in('id', chunk)
        )
    ]);

    const pedidosMap = new Map(pedidosData.map((p: any) => [p.id, p.codigo]));
    const solMap = new Map(solData.map((s: any) => [s.id, s]));

    const allocationsGroupByWorker = new Map<string, any[]>();
    allocs.forEach((a: any) => {
        if (a.cod_colab) {
            if (!allocationsGroupByWorker.has(a.cod_colab)) allocationsGroupByWorker.set(a.cod_colab, []);
            allocationsGroupByWorker.get(a.cod_colab)!.push(a);
        }
    });

    const assignmentsGroupByWorker = new Map<string, any[]>();
    assigns.forEach((a: any) => {
        if (a.worker_id) {
            if (!assignmentsGroupByWorker.has(a.worker_id)) assignmentsGroupByWorker.set(a.worker_id, []);
            assignmentsGroupByWorker.get(a.worker_id)!.push(a);
        }
    });

    const targetsGroupByWorker = new Map<string, any[]>();
    targets.forEach((t: any) => {
        const wId = t.target_worker_id || t.source_worker_id;
        if (wId) {
            if (!targetsGroupByWorker.has(wId)) targetsGroupByWorker.set(wId, []);
            targetsGroupByWorker.get(wId)!.push(t);
        }
    });

    return {
        allocationsGroupByWorker,
        assignmentsGroupByWorker,
        targetsGroupByWorker,
        pedidosMap,
        solMap
    };
}

function resolveOrderInfo(
    workerId?: string,
    codColab?: string,
    contratante?: string,
    explicitPedidoCodigo?: string,
    allocationsGroupByWorker?: Map<string, any[]>,
    assignmentsGroupByWorker?: Map<string, any[]>,
    targetsGroupByWorker?: Map<string, any[]>,
    pedidosMap?: Map<string, string>,
    solMap?: Map<string, any>,
    explicitOptions?: {
        explicitClientId?: string | null;
        targetEmpresaId?: string | null;
        requestCreatedAt?: string | null;
        explicitSolicitudCodigo?: string | null;
        explicitSolicitudTipo?: string | null;
        explicitSolicitudTitle?: string | null;
    }
) {
    const workerAllocs = codColab && allocationsGroupByWorker ? (allocationsGroupByWorker.get(codColab) || []) : [];
    const workerAssigns = workerId && assignmentsGroupByWorker ? (assignmentsGroupByWorker.get(workerId) || []) : [];
    const workerTargets = workerId && targetsGroupByWorker ? (targetsGroupByWorker.get(workerId) || []) : [];

    const reqTime = explicitOptions?.requestCreatedAt ? new Date(explicitOptions.requestCreatedAt).getTime() : 0;

    // Sort assignments prioritizing explicitClientId, then targetEmpresaId, then proximity to requestCreatedAt (or newest)
    const sortedAssigns = [...workerAssigns].sort((a, b) => {
        if (explicitOptions?.explicitClientId) {
            const aClientMatch = a.client_id === explicitOptions.explicitClientId ? 1 : 0;
            const bClientMatch = b.client_id === explicitOptions.explicitClientId ? 1 : 0;
            if (aClientMatch !== bClientMatch) return bClientMatch - aClientMatch;
        }
        if (explicitOptions?.targetEmpresaId) {
            const aEmpMatch = a.empresa_id === explicitOptions.targetEmpresaId ? 1 : 0;
            const bEmpMatch = b.empresa_id === explicitOptions.targetEmpresaId ? 1 : 0;
            if (aEmpMatch !== bEmpMatch) return bEmpMatch - aEmpMatch;
        }
        if (reqTime > 0) {
            const distA = Math.abs(new Date(a.created_at || 0).getTime() - reqTime);
            const distB = Math.abs(new Date(b.created_at || 0).getTime() - reqTime);
            return distA - distB;
        }
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
    const matchedAssign = sortedAssigns[0];
    const assignPedidoCodigo = matchedAssign?.pedido_id && pedidosMap ? pedidosMap.get(matchedAssign.pedido_id) : null;

    // Sort targets by proximity to requestCreatedAt or created_at desc
    const sortedTargets = [...workerTargets].sort((a, b) => {
        if (reqTime > 0) {
            const distA = Math.abs(new Date(a.created_at || 0).getTime() - reqTime);
            const distB = Math.abs(new Date(b.created_at || 0).getTime() - reqTime);
            return distA - distB;
        }
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
    const latestTarget = sortedTargets[0];
    const latestSol = latestTarget?.solicitud_id && solMap ? solMap.get(latestTarget.solicitud_id) : null;

    // Get pertinent allocation
    let pertinentAlloc = workerAllocs[0];
    if (contratante && workerAllocs.length > 0) {
        const contractorNorm = normalizeCompany(contratante);
        const contractorWords = contractorNorm.split(' ').filter(w => w.length > 2);
        const filtered = workerAllocs.filter(alloc => {
            if (!alloc.contratante) return false;
            const allocContrNorm = normalizeCompany(alloc.contratante);
            if (contractorNorm.includes(allocContrNorm) || allocContrNorm.includes(contractorNorm)) return true;
            return contractorWords.some(word => allocContrNorm.includes(word));
        });
        if (filtered.length > 0) {
            pertinentAlloc = filtered[0];
        }
    }

    const finalPedidoCodigo = explicitPedidoCodigo || assignPedidoCodigo || pertinentAlloc?.codpedido || explicitOptions?.explicitSolicitudCodigo || latestSol?.codigo || null;
    const finalSolicitudCodigo = explicitOptions?.explicitSolicitudCodigo || latestSol?.codigo || null;
    const finalTipo = explicitOptions?.explicitSolicitudTipo || latestSol?.tipo || (finalPedidoCodigo ? 'Pedido' : null);

    return {
        pedido_codigo: finalPedidoCodigo,
        solicitud_codigo: finalSolicitudCodigo,
        solicitud_tipo: finalTipo,
        solicitud_title: explicitOptions?.explicitSolicitudTitle || latestSol?.title || null
    };
}

export async function listContracts({ empresaId, workerId, status, contractType }: ListContractsParams): Promise<Contract[]> {
    let contracts: any[] = [];
    try {
        contracts = await fetchAllPages<any>((from, to) => {
            let query = supabase
                .schema('core_personal')
                .from('contracts')
                .select(`
                    *,
                    worker:workers (
                        id, nome, email, movil, nif, niss, dni, nie, pasaporte, cliente, cod_cliente, cod_colab, data_ingresso, data_alta_seguridad
                    ),
                    assignment:worker_assignments (
                        id,
                        client_id
                    )
                `);

            if (!isHoldingId(empresaId)) {
                query = query.eq('empresa_id', empresaId);
            }

            if (workerId) {
                query = query.eq('worker_id', workerId);
            }

            if (status && status.length > 0) {
                query = query.in('status', status);
            }

            if (contractType && contractType.length > 0) {
                query = query.in('contract_type', contractType);
            }

            return query.order('created_at', { ascending: false }).range(from, to);
        });
    } catch (error) {
        throw mapSupabaseError(error);
    }

    const clientIds = [...new Set(contracts.map(c => c.assignment?.client_id).filter(Boolean))];
    const codColabs = [...new Set(contracts.map(c => c.worker?.cod_colab).filter(Boolean))];
    const workerIds = [...new Set(contracts.map(c => c.worker_id).filter(Boolean))];

    const [clientsData, orderInfo] = await Promise.all([
        fetchInChunks<any>(clientIds, chunk =>
            supabase.schema('core_common').from('clients').select('id, legal_name, trade_name').in('id', chunk)
        ),
        fetchWorkersOrderInfo(workerIds, codColabs)
    ]);

    const clientsMap = new Map(clientsData.map(c => [c.id, c]));
    const { allocationsGroupByWorker, assignmentsGroupByWorker, targetsGroupByWorker, pedidosMap, solMap } = orderInfo;

    function getPertinentClientForContract(contratante: string, workerAllocations: any[]): string | null {
        if (!workerAllocations || workerAllocations.length === 0) return null;

        const contractorNorm = normalizeCompany(contratante);
        const contractorWords = contractorNorm.split(' ').filter(w => w.length > 2);

        let filtered = workerAllocations.filter(alloc => {
            if (!alloc.contratante) return false;
            const allocContrNorm = normalizeCompany(alloc.contratante);
            if (contractorNorm.includes(allocContrNorm) || allocContrNorm.includes(contractorNorm)) return true;
            return contractorWords.some(word => allocContrNorm.includes(word));
        });

        if (filtered.length === 0) {
            filtered = workerAllocations;
        }

        const sorted = [...filtered].sort((a, b) => {
            const currentDateStr = new Date().toISOString().split('T')[0];
            const salidaA = a.fechasalidatrabajador ? String(a.fechasalidatrabajador).split('T')[0] : null;
            const salidaB = b.fechasalidatrabajador ? String(b.fechasalidatrabajador).split('T')[0] : null;
            const finA = a.fechafinpedido ? String(a.fechafinpedido).split('T')[0] : null;
            const finB = b.fechafinpedido ? String(b.fechafinpedido).split('T')[0] : null;

            const isAActive = (!salidaA || salidaA >= currentDateStr) && (!finA || finA >= currentDateStr);
            const isBActive = (!salidaB || salidaB >= currentDateStr) && (!finB || finB >= currentDateStr);

            if (isAActive && !isBActive) return -1;
            if (!isAActive && isBActive) return 1;

            const dateA = a.fechainiciopedido ? new Date(a.fechainiciopedido).getTime() : 0;
            const dateB = b.fechainiciopedido ? new Date(b.fechainiciopedido).getTime() : 0;
            if (dateB !== dateA) return dateB - dateA;

            const insA = a.inserted_at ? new Date(a.inserted_at).getTime() : 0;
            const insB = b.inserted_at ? new Date(b.inserted_at).getTime() : 0;
            return insB - insA;
        });

        return sorted[0]?.cliente_nombre || null;
    }

    return contracts.map(c => {
        const workerAllocs = c.worker?.cod_colab ? (allocationsGroupByWorker.get(c.worker.cod_colab) || []) : [];
        const pertinentClient = c.contratante ? getPertinentClientForContract(c.contratante, workerAllocs) : null;
        const resolvedOrder = resolveOrderInfo(
            c.worker_id,
            c.worker?.cod_colab,
            c.contratante,
            undefined,
            allocationsGroupByWorker,
            assignmentsGroupByWorker,
            targetsGroupByWorker,
            pedidosMap,
            solMap
        );

        return {
            ...c,
            ...resolvedOrder,
            worker: c.worker ? {
                ...c.worker,
                cliente: pertinentClient || c.worker.cliente
            } : undefined,
            assignment: c.assignment ? {
                ...c.assignment,
                client: clientsMap.get(c.assignment.client_id) || null
            } : null
        };
    }) as unknown as Contract[];
}

export interface GenerateContractPayload {
    worker_id: string;
    assignment_id?: string;
    contratante: string;
    contract_type: string;
    empresa_id?: string;
    request_date?: string;
    notice_start_date?: string;
    notice_end_date?: string;
    effective_date?: string;
    worker_updates?: {
        pasaporte?: string;
        nif?: string;
        niss?: string;
        dni?: string;
        nie?: string;
        nuss?: string;
        codigo_postal?: string;
        municipio_domicilio?: string;
        nivel_formativo?: string;
    };
    sepe_overrides?: Record<string, any>;
    template_base64?: string;
}

export interface GenerateContractResponse {
    success: boolean;
    contract_id: string;
    document_url?: string;
    signature_token: string;
    otp_code: string;
    company_otp_code?: string;
    signing_link: string;
    email_sent: boolean;
}

export async function generateContract(payload: GenerateContractPayload): Promise<GenerateContractResponse> {
    const { data, error } = await supabase.functions.invoke('generate-contract', {
        body: payload,
    });

    if (error) {
        let errorMsg = error.message;
        if ('context' in error && (error as any).context instanceof Response) {
            try {
                const body = await (error as any).context.clone().json();
                if (body && body.error) {
                    errorMsg = body.error;
                }
            } catch (_) {}
        }
        throw new Error(errorMsg || 'Erro ao gerar o contrato.');
    }

    return data as GenerateContractResponse;
}

export interface SignContractPayload {
    token: string;
    otp_code: string;
    ip_address: string;
    user_agent: string;
    signature_image?: string;
}

export async function signContract(payload: SignContractPayload): Promise<{ success: boolean; message: string; signed_at: string }> {
    const { data, error } = await supabase.functions.invoke('sign-contract', {
        body: payload,
    });

    if (error) {
        let errorMsg = error.message;
        if ('context' in error && (error as any).context instanceof Response) {
            try {
                const body = await (error as any).context.clone().json();
                if (body && body.error) {
                    errorMsg = body.error;
                }
            } catch (_) {}
        }
        throw new Error(errorMsg || 'Erro ao realizar a assinatura do contrato.');
    }

    return data;
}


// Buscar o contrato e trabalhador associado usando o token de assinatura pública (sem auth necessária)
export async function getContractByToken(token: string): Promise<Contract> {
    const { data, error } = await supabase
        .schema('core_personal')
        .from('contracts')
        .select(`
            *,
            worker:workers (
                id, nome, email, movil, nif, niss, dni, nie, pasaporte, nacionalidade, fecha_nacimiento
            )
        `)
        .eq('signature_token', token)
        .single();

    if (error) {
        throw mapSupabaseError(error);
    }

    return data as unknown as Contract;
}

export interface DocumentRequest {
    id: string;
    empresa_id: string;
    worker_id: string;
    token: string;
    status: 'pending_upload' | 'submitted' | 'verified' | 'rejected';
    passport_url: string | null;
    nif_url: string | null;
    niss_url: string | null;
    license_url: string | null;
    iban_url: string | null;
    selfie_url: string | null;
    residence_url?: string | null;
    tiene_residencia_ue?: boolean | null;
    extracted_data: any;
    expires_at: string;
    created_at: string;
    updated_at: string;
    pedido_codigo?: string | null;
    solicitud_codigo?: string | null;
    solicitud_tipo?: string | null;
    solicitud_title?: string | null;
    client?: {
        id: string;
        legal_name: string;
        trade_name: string;
        codigo?: string;
    } | null;
    worker?: {
        id: string;
        nome: string;
        email: string;
        movil: string;
        cod_colab: string;
        address_line?: string;
        morada_contrato?: string;
        location?: string;
        pasaporte?: string;
        nif?: string;
        niss?: string;
        nie?: string;
        dni?: string;
        nuss?: string;
        codigo_postal?: string;
        municipio_domicilio?: string;
        nivel_formativo?: string;
        licencia_conducir?: string;
        nacionalidade?: string;
        fecha_nacimiento?: string;
        cliente?: string;
        cod_cliente?: string;
        iban?: string;
        assignments?: Array<{
            id: string;
            status: string;
            empresa_id?: string;
            client_id: string;
            start_date?: string;
            planned_start_date?: string;
            created_at?: string;
            client?: {
                id: string;
                legal_name: string;
                trade_name: string;
            };
        }>;
    };
    empresa?: {
        id: string;
        name: string;
    } | null;
}

export const HEXAGON_EMPRESA_ID = '2c944db5-f1d0-4789-a562-8cfa1c0155b7';

export async function listDocumentRequests(empresaId: string): Promise<DocumentRequest[]> {
    // Se a empresa selecionada for a Hexagon (Espanha), garante que todos os trabalhadores alocados ou vinculados à Hexagon
    // tenham uma solicitação de documentos no processo da Hexagon (trazendo os documentos existentes e liberando envio)
    if (empresaId === HEXAGON_EMPRESA_ID) {
        try {
            const [{ data: existingHexReqs }, { data: hexAssignments }, { data: hexWorkers }] = await Promise.all([
                supabase
                    .schema('core_personal')
                    .from('document_requests')
                    .select('worker_id')
                    .eq('empresa_id', HEXAGON_EMPRESA_ID),
                supabase
                    .schema('core_personal')
                    .from('worker_assignments')
                    .select('worker_id, client_id, start_date, planned_start_date')
                    .eq('empresa_id', HEXAGON_EMPRESA_ID)
                    .in('status', ['planned', 'active']),
                supabase
                    .schema('core_personal')
                    .from('workers')
                    .select('id')
                    .ilike('contratante', '%HEXAGON%')
            ]);

            const existingWorkerIds = new Set((existingHexReqs || []).map((r: any) => r.worker_id).filter(Boolean));
            const assignmentByWorker = new Map<string, any>();
            (hexAssignments || []).forEach((a: any) => {
                if (a.worker_id && !assignmentByWorker.has(a.worker_id)) {
                    assignmentByWorker.set(a.worker_id, a);
                }
            });

            const candidateWorkerIds = new Set<string>([
                ...Array.from(assignmentByWorker.keys()),
                ...(hexWorkers || []).map((w: any) => w.id).filter(Boolean)
            ]);

            for (const wId of candidateWorkerIds) {
                if (!existingWorkerIds.has(wId)) {
                    const assign = assignmentByWorker.get(wId);
                    const startIso = assign?.planned_start_date || assign?.start_date || undefined;
                    await createDocumentRequest(
                        HEXAGON_EMPRESA_ID,
                        wId,
                        assign?.client_id || undefined,
                        startIso ? String(startIso).substring(0, 10) : undefined
                    );
                }
            }
        } catch (syncErr) {
            console.warn('Aviso ao sincronizar solicitações de documentos da Hexagon:', syncErr);
        }
    }
    let query = supabase
        .schema('core_personal')
        .from('document_requests')
        .select(`
            *,
            worker:workers (
                id, nome, email, movil, cod_colab, address_line, morada_contrato, location, pasaporte, nif, niss, nie, dni, nuss, codigo_postal, municipio_domicilio, nivel_formativo, licencia_conducir, nacionalidade, fecha_nacimiento, cliente, cod_cliente,
                assignments:worker_assignments (
                    id, status, empresa_id, client_id, start_date, planned_start_date, created_at
                )
            )
        `);

    if (!isHoldingId(empresaId)) {
        query = query.eq('empresa_id', empresaId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        throw mapSupabaseError(error);
    }

    const docRequests = (data || []) as any[];

    // Fetch related empresas and clients in-memory to bypass cross-schema join restrictions in PostgREST
    const empresaIds = [...new Set(docRequests.map(r => r.empresa_id).filter(Boolean))];
    const codColabs = [...new Set(docRequests.map(r => r.worker?.cod_colab).filter(Boolean))];
    const workerIds = [...new Set(docRequests.map(r => r.worker_id).filter(Boolean))];

    const clientIds: string[] = [];
    docRequests.forEach(r => {
        if ((r as any).extracted_data?.client_id) {
            clientIds.push((r as any).extracted_data.client_id);
        }
        r.worker?.assignments?.forEach((a: any) => {
            if (a.client_id) clientIds.push(a.client_id);
        });
    });
    const uniqueClientIds = [...new Set(clientIds)];

    const [empresasRes, clientsRes, orderInfo] = await Promise.all([
        empresaIds.length > 0
            ? supabase.schema('core_common').from('empresas').select('id, nome').in('id', empresaIds)
            : Promise.resolve({ data: [] }),
        uniqueClientIds.length > 0
            ? supabase.schema('core_common').from('clients').select('id, legal_name, trade_name, codigo').in('id', uniqueClientIds)
            : Promise.resolve({ data: [] }),
        fetchWorkersOrderInfo(workerIds, codColabs)
    ]);

    const empresasMap = new Map((empresasRes.data || []).map((e: any) => [e.id, e]));
    const clientsMap = new Map((clientsRes.data || []).map((c: any) => [c.id, c]));
    const { allocationsGroupByWorker, assignmentsGroupByWorker, targetsGroupByWorker, pedidosMap, solMap } = orderInfo;

    return docRequests.map(r => {
        const emp = empresasMap.get(r.empresa_id);
        const ext = (r as any).extracted_data || {};
        const explicitClientId = ext.client_id;
        const explicitClientName = ext.client_name;
        const explicitClient = explicitClientId
            ? (clientsMap.get(explicitClientId) || (explicitClientName ? { id: explicitClientId, legal_name: explicitClientName, trade_name: explicitClientName } : null))
            : (explicitClientName ? { id: '', legal_name: explicitClientName, trade_name: explicitClientName } : null);
        const explicitPedido = ext.pedido_codigo || ext.codigo_pedido;

        const resolvedOrder = resolveOrderInfo(
            r.worker_id,
            r.worker?.cod_colab,
            emp?.nome,
            explicitPedido,
            allocationsGroupByWorker,
            assignmentsGroupByWorker,
            targetsGroupByWorker,
            pedidosMap,
            solMap,
            {
                explicitClientId,
                targetEmpresaId: r.empresa_id,
                requestCreatedAt: r.created_at,
                explicitSolicitudCodigo: ext.solicitud_codigo,
                explicitSolicitudTipo: ext.solicitud_tipo,
                explicitSolicitudTitle: ext.solicitud_title
            }
        );

        const reqTime = r.created_at ? new Date(r.created_at).getTime() : 0;
        const sortedAssignments = (r.worker?.assignments || [])
            .map((a: any) => ({
                ...a,
                client: clientsMap.get(a.client_id) || null
            }))
            .sort((a: any, b: any) => {
                if (explicitClientId) {
                    const aCli = a.client_id === explicitClientId ? 1 : 0;
                    const bCli = b.client_id === explicitClientId ? 1 : 0;
                    if (aCli !== bCli) return bCli - aCli;
                }
                const aSameEmp = a.empresa_id === r.empresa_id ? 1 : 0;
                const bSameEmp = b.empresa_id === r.empresa_id ? 1 : 0;
                if (aSameEmp !== bSameEmp) return bSameEmp - aSameEmp;

                if (reqTime > 0) {
                    const distA = Math.abs(new Date(a.created_at || 0).getTime() - reqTime);
                    const distB = Math.abs(new Date(b.created_at || 0).getTime() - reqTime);
                    return distA - distB;
                }

                const aActiveOrPlanned = (a.status === 'active' || a.status === 'planned') ? 1 : 0;
                const bActiveOrPlanned = (b.status === 'active' || b.status === 'planned') ? 1 : 0;
                if (aActiveOrPlanned !== bActiveOrPlanned) return bActiveOrPlanned - aActiveOrPlanned;

                return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
            });

        const sameEmpAssignment = sortedAssignments.find((a: any) => a.empresa_id === r.empresa_id);

        return {
            ...r,
            ...resolvedOrder,
            empresa: emp ? { id: emp.id, name: emp.nome } : null,
            client: explicitClient || sameEmpAssignment?.client || sortedAssignments[0]?.client || null,
            worker: r.worker ? {
                ...r.worker,
                assignments: sortedAssignments
            } : null
        };
    }) as unknown as DocumentRequest[];
}

export interface CreateDocumentRequestMetadata {
    pedidoCodigo?: string | null;
    solicitudCodigo?: string | null;
    solicitudTipo?: string | null;
    solicitudTitle?: string | null;
    solicitudId?: string | null;
    pedidoId?: string | null;
    clientName?: string | null;
    siteId?: string | null;
    siteName?: string | null;
    forceEmpresaId?: boolean;
}

export async function createDocumentRequest(
    empresaId: string,
    workerId: string,
    clientId?: string,
    startDate?: string,
    extraMetadata?: CreateDocumentRequestMetadata
): Promise<DocumentRequest> {
    // Buscar dados pré-existentes do trabalhador, solicitações anteriores e alocações/solicitações ativas
    const [{ data: worker }, { data: prevReq }, { data: workerAssigns }, { data: workerTargets }] = await Promise.all([
        supabase
            .schema('core_personal')
            .from('workers')
            .select('*')
            .eq('id', workerId)
            .maybeSingle(),
        supabase
            .schema('core_personal')
            .from('document_requests')
            .select('*')
            .eq('worker_id', workerId)
            .order('updated_at', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        supabase
            .schema('core_personal')
            .from('worker_assignments')
            .select('id, empresa_id, client_id, client_site_id, pedido_id, status, start_date, planned_start_date, created_at')
            .eq('worker_id', workerId)
            .order('created_at', { ascending: false })
            .limit(5),
        supabase
            .schema('core_operacoes')
            .from('solicitud_targets')
            .select('id, solicitud_id, target_client_id, source_client_id, created_at')
            .or(`target_worker_id.eq.${workerId},source_worker_id.eq.${workerId}`)
            .order('created_at', { ascending: false })
            .limit(5)
    ]);

    // Resolver alocação/solicitação mais recente caso os metadados não tenham sido passados explicitamente
    const activeOrPlannedAssign = (workerAssigns || []).find((a: any) => a.status === 'planned' || a.status === 'active') || (workerAssigns || [])[0];
    const latestTarget = (workerTargets || [])[0];

    let latestSol: any = null;
    if (latestTarget?.solicitud_id) {
        const { data: sData } = await supabase
            .schema('core_operacoes')
            .from('solicitudes_operativas')
            .select('id, codigo, empresa_id, client_id, client_site_id, pedido_id, tipo, title')
            .eq('id', latestTarget.solicitud_id)
            .maybeSingle();
        latestSol = sData;
    }

    const resolvedPedidoId = extraMetadata?.pedidoId || activeOrPlannedAssign?.pedido_id || latestSol?.pedido_id || null;
    let latestPedido: any = null;
    if (resolvedPedidoId) {
        const { data: pData } = await supabase
            .schema('core_comercial')
            .from('pedidos')
            .select('id, codigo, empresa_id, client_id, client_site_id, expected_start_date')
            .eq('id', resolvedPedidoId)
            .maybeSingle();
        latestPedido = pData;
    }

    const resolvedEmpresaId = (extraMetadata?.forceEmpresaId && !isHoldingId(empresaId))
        ? empresaId
        : (activeOrPlannedAssign?.empresa_id || latestPedido?.empresa_id || latestSol?.empresa_id || (!isHoldingId(empresaId) ? empresaId : prevReq?.empresa_id) || empresaId);

    const resolvedClientId = clientId || activeOrPlannedAssign?.client_id || latestPedido?.client_id || latestSol?.client_id || latestTarget?.target_client_id || latestTarget?.source_client_id || null;
    const resolvedSiteId = extraMetadata?.siteId || activeOrPlannedAssign?.client_site_id || latestPedido?.client_site_id || latestSol?.client_site_id || null;
    const resolvedStartDate = startDate || activeOrPlannedAssign?.planned_start_date || activeOrPlannedAssign?.start_date || latestPedido?.expected_start_date || null;
    const resolvedPedidoCodigo = extraMetadata?.pedidoCodigo || latestPedido?.codigo || latestSol?.codigo || null;
    const resolvedSolicitudCodigo = extraMetadata?.solicitudCodigo || latestSol?.codigo || null;
    const resolvedSolicitudTipo = extraMetadata?.solicitudTipo || latestSol?.tipo || (resolvedPedidoCodigo ? 'Pedido' : null);
    const resolvedSolicitudTitle = extraMetadata?.solicitudTitle || latestSol?.title || null;
    const resolvedSolicitudId = extraMetadata?.solicitudId || latestSol?.id || null;

    let resolvedClientName = extraMetadata?.clientName || null;
    if (!resolvedClientName && resolvedClientId) {
        const { data: cData } = await supabase
            .schema('core_common')
            .from('clients')
            .select('trade_name, legal_name')
            .eq('id', resolvedClientId)
            .maybeSingle();
        resolvedClientName = cData?.trade_name || cData?.legal_name || null;
    }

    const prevExt = { ...((prevReq?.extracted_data || {}) as Record<string, any>) };
    // Limpar chaves de vínculo de pedido/cliente anterior para não poluir a nova linha
    delete prevExt.client_id;
    delete prevExt.client_name;
    delete prevExt.pedido_codigo;
    delete prevExt.codigo_pedido;
    delete prevExt.solicitud_codigo;
    delete prevExt.solicitud_tipo;
    delete prevExt.solicitud_title;
    delete prevExt.solicitud_id;
    delete prevExt.pedido_id;
    delete prevExt.site_id;
    delete prevExt.site_name;
    delete prevExt.start_date;

    const prevIbanUrl = prevReq?.iban_url || prevExt.iban_url || null;
    const prevResidenceUrl = prevReq?.residence_url || prevExt.residence_url || null;
    const prevResidenceBackUrl = prevExt.residence_back_url || null;

    const extractedData: any = {
        ...prevExt,
        nome: worker?.nome || prevExt.nome || '',
        pasaporte: worker?.pasaporte || prevExt.pasaporte || '',
        dni: worker?.dni || prevExt.dni || '',
        nie: worker?.nie || prevExt.nie || '',
        nif: worker?.nif || prevExt.nif || '',
        niss: worker?.niss || prevExt.niss || '',
        nuss: worker?.nuss || prevExt.nuss || '',
        codigo_postal: worker?.codigo_postal || prevExt.codigo_postal || '',
        municipio_domicilio: worker?.municipio_domicilio || prevExt.municipio_domicilio || '',
        nivel_formativo: worker?.nivel_formativo || prevExt.nivel_formativo || '',
        movil: worker?.movil || prevExt.movil || '',
        email: worker?.email || prevExt.email || '',
        talla_camisa: worker?.camiseta || prevExt.talla_camisa || '',
        talla_pantalon: worker?.pantalones || prevExt.talla_pantalon || '',
        licencia_conducir: worker?.licencia_conducir || prevExt.licencia_conducir || '',
        nacionalidade: worker?.nacionalidade || prevExt.nacionalidade || '',
        fecha_nacimiento: worker?.fecha_nacimiento || prevExt.fecha_nacimiento || '',
        direccion_actual: worker?.address_line || prevExt.direccion_actual || '',
        ubicacion_actual: worker?.location || prevExt.ubicacion_actual || '',
        morada_contrato: worker?.morada_contrato || prevExt.morada_contrato || '',
        iban: worker?.iban || prevExt.iban || '',
        banco: prevExt.banco || '',
        iban_url: prevIbanUrl,
        residence_url: prevResidenceUrl,
        residence_back_url: prevResidenceBackUrl,
        client_id: resolvedClientId,
        client_name: resolvedClientName,
        pedido_codigo: resolvedPedidoCodigo,
        solicitud_codigo: resolvedSolicitudCodigo,
        solicitud_tipo: resolvedSolicitudTipo,
        solicitud_title: resolvedSolicitudTitle,
        solicitud_id: resolvedSolicitudId,
        pedido_id: resolvedPedidoId,
        site_id: resolvedSiteId,
        site_name: extraMetadata?.siteName || null,
        start_date: resolvedStartDate ? String(resolvedStartDate).substring(0, 10) : null
    };

    const { data, error } = await supabase
        .schema('core_personal')
        .from('document_requests')
        .insert({
            empresa_id: resolvedEmpresaId,
            worker_id: workerId,
            status: 'pending_upload',
            passport_url: prevReq?.passport_url || null,
            residence_url: prevResidenceUrl,
            tiene_residencia_ue: prevReq?.tiene_residencia_ue ?? true,
            nif_url: prevReq?.nif_url || null,
            niss_url: prevReq?.niss_url || null,
            license_url: prevReq?.license_url || null,
            iban_url: prevIbanUrl,
            selfie_url: prevReq?.selfie_url || null,
            extracted_data: extractedData,
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 dias
        })
        .select('*, worker:workers(id, nome, email, movil, cod_colab)')
        .single();

    if (error) {
        throw mapSupabaseError(error);
    }

    return {
        ...(data as any),
        pedido_codigo: resolvedPedidoCodigo,
        solicitud_codigo: resolvedSolicitudCodigo,
        solicitud_tipo: resolvedSolicitudTipo,
        solicitud_title: resolvedSolicitudTitle,
        client: resolvedClientId ? {
            id: resolvedClientId,
            legal_name: resolvedClientName || '',
            trade_name: resolvedClientName || ''
        } : null
    } as unknown as DocumentRequest;
}

export async function reopenDocumentRequest(requestId: string): Promise<DocumentRequest> {
    const { data, error } = await supabase
        .schema('core_personal')
        .from('document_requests')
        .update({
            status: 'pending_upload',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', requestId)
        .select('*, worker:workers(id, nome, email, movil, cod_colab)')
        .single();

    if (error) {
        throw mapSupabaseError(error);
    }

    return data as unknown as DocumentRequest;
}

export async function updateDocumentRequest(requestId: string, empresaId: string, clientId?: string, startDate?: string): Promise<void> {
    const { data: existing } = await supabase
        .schema('core_personal')
        .from('document_requests')
        .select('extracted_data')
        .eq('id', requestId)
        .single();

    const currentExtracted = existing?.extracted_data || {};
    const updatedExtracted = {
        ...currentExtracted,
        client_id: clientId || null,
        start_date: startDate || null
    };

    const { error } = await supabase
        .schema('core_personal')
        .from('document_requests')
        .update({
            empresa_id: empresaId,
            extracted_data: updatedExtracted,
            updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

    if (error) {
        throw mapSupabaseError(error);
    }
}

export async function deleteDocumentRequest(requestId: string): Promise<void> {
    const { error } = await supabase
        .schema('core_personal')
        .from('document_requests')
        .delete()
        .eq('id', requestId);

    if (error) {
        throw mapSupabaseError(error);
    }
}

export async function deleteContract(contractId: string): Promise<void> {
    const { error } = await supabase
        .schema('core_personal')
        .from('contracts')
        .delete()
        .eq('id', contractId);

    if (error) {
        throw mapSupabaseError(error);
    }
}

export async function updateContractNoticeMetadata(
    contractId: string,
    metadataUpdates: NonNullable<Contract['metadata']>,
    statusUpdate?: Contract['status']
): Promise<void> {
    const { data: existing, error: fetchErr } = await supabase
        .schema('core_personal')
        .from('contracts')
        .select('metadata, status')
        .eq('id', contractId)
        .single();

    if (fetchErr) {
        throw mapSupabaseError(fetchErr);
    }

    const mergedMetadata = {
        ...(existing?.metadata || {}),
        ...metadataUpdates,
    };

    const updatePayload: any = {
        metadata: mergedMetadata,
        updated_at: new Date().toISOString(),
    };
    if (metadataUpdates.notice_end_date) {
        updatePayload.terminated_at = metadataUpdates.notice_end_date;
    }
    if (statusUpdate) {
        updatePayload.status = statusUpdate;
    }

    const { error } = await supabase
        .schema('core_personal')
        .from('contracts')
        .update(updatePayload)
        .eq('id', contractId);

    if (error) {
        throw mapSupabaseError(error);
    }
}

export interface CreateManualNoticePayload {
    empresa_id: string;
    worker_id: string;
    contratante: string;
    assignment_id?: string | null;
    signed_manually?: boolean;
    metadata: NonNullable<Contract['metadata']>;
}

export async function createManualNoticeEntry(payload: CreateManualNoticePayload): Promise<Contract> {
    const token = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36);

    const { data, error } = await supabase
        .schema('core_personal')
        .from('contracts')
        .insert({
            empresa_id: payload.empresa_id,
            worker_id: payload.worker_id,
            assignment_id: payload.assignment_id || null,
            contratante: payload.contratante,
            contract_type: 'rescisao',
            status: payload.signed_manually !== false ? 'signed' : 'pending_signature',
            signed_at: payload.signed_manually !== false ? new Date().toISOString() : null,
            signature_token: token,
            terminated_at: payload.metadata.notice_end_date || null,
            metadata: {
                ...payload.metadata,
                is_manual_entry: true,
            },
        })
        .select()
        .single();

    if (error) {
        throw mapSupabaseError(error);
    }

    return data as unknown as Contract;
}

export async function getDocumentRequestByToken(token: string): Promise<DocumentRequest> {
    const { data, error } = await supabase
        .schema('core_personal')
        .from('document_requests')
        .select(`
            *,
            worker:workers (
                id, nome, email, movil, cod_colab
            )
        `)
        .eq('token', token)
        .single();

    if (error) {
        throw mapSupabaseError(error);
    }

    return data as unknown as DocumentRequest;
}

export async function processDocumentOcr(payload: { file_path: string; mime_type: string; document_type: string }): Promise<{ success: boolean; data: any }> {
    const { data, error } = await supabase.functions.invoke('process-document-ocr', {
        body: payload
    });

    if (error) {
        let errorMsg = error.message;
        if ('context' in error && (error as any).context instanceof Response) {
            try {
                const body = await (error as any).context.clone().json();
                if (body && body.error) {
                    errorMsg = body.error;
                }
            } catch (_) {}
        }
        throw new Error(errorMsg || 'Erro ao realizar leitura inteligente (OCR).');
    }

    return data;
}

export async function submitDocumentRequest(token: string, payload: Partial<DocumentRequest>): Promise<void> {
    const { data: existing } = await supabase
        .schema('core_personal')
        .from('document_requests')
        .select('extracted_data')
        .eq('token', token)
        .maybeSingle();

    const mergedExtractedData = payload.extracted_data
        ? {
            ...(existing?.extracted_data || {}),
            ...payload.extracted_data
        }
        : existing?.extracted_data;

    const { error } = await supabase
        .schema('core_personal')
        .from('document_requests')
        .update({
            ...payload,
            ...(mergedExtractedData ? { extracted_data: mergedExtractedData } : {}),
            status: 'submitted',
            updated_at: new Date().toISOString()
        })
        .eq('token', token);

    if (error) {
        throw mapSupabaseError(error);
    }
}

export async function approveDocumentRequest(
    requestId: string,
    workerId: string,
    approvedData: {
        nome?: string;
        email?: string;
        movil?: string;
        location?: string;
        address_line?: string;
        morada_contrato?: string;
        notes?: string;
        nif?: string;
        niss?: string;
        nie?: string;
        dni?: string;
        pasaporte?: string;
        nuss?: string;
        codigo_postal?: string;
        municipio_domicilio?: string;
        nivel_formativo?: string;
        licencia_conducir?: string;
        nacionalidade?: string;
        fecha_nacimiento?: string;
        iban?: string;
        camiseta?: string;
        pantalones?: string;
        foto?: string;
    },
    updatedFormData?: any
): Promise<void> {
    // 1. Atualizar o cadastro do trabalhador
    const { data: updatedW, error: workerErr } = await supabase
        .schema('core_personal')
        .from('workers')
        .update(approvedData)
        .eq('id', workerId)
        .select('cod_colab')
        .maybeSingle();

    if (workerErr) {
        throw mapSupabaseError(workerErr);
    }

    if (updatedW?.cod_colab) {
        const colabSync: any = {};
        if (approvedData.nome) colabSync.nombre = approvedData.nome;
        if (approvedData.nif) colabSync.nif = approvedData.nif;
        if (approvedData.niss) colabSync.niss = approvedData.niss;
        if (approvedData.nie) colabSync.nie = approvedData.nie;
        if (approvedData.dni) colabSync.dni = approvedData.dni;
        if (approvedData.nuss) colabSync.nuss = approvedData.nuss;
        if (approvedData.pasaporte) colabSync.pasaporte = approvedData.pasaporte;
        if (approvedData.email) colabSync.email = approvedData.email;
        if (approvedData.movil) colabSync.movil = approvedData.movil;
        if (approvedData.fecha_nacimiento) colabSync.fecha_nacimiento = approvedData.fecha_nacimiento;
        if (approvedData.nacionalidade) colabSync.nacionalidade = approvedData.nacionalidade;
        if (approvedData.licencia_conducir) colabSync.licencia_conducir = approvedData.licencia_conducir;
        if (approvedData.foto) {
            colabSync.foto = approvedData.foto;
            colabSync.foto_trabalhador = approvedData.foto;
        }
        if (approvedData.camiseta) colabSync.camiseta = approvedData.camiseta;
        if (approvedData.pantalones) colabSync.pantalones = approvedData.pantalones;
        if (approvedData.address_line) colabSync.domicilio = approvedData.address_line;
        if (approvedData.morada_contrato) colabSync.alojamiento = approvedData.morada_contrato;

        if (Object.keys(colabSync).length > 0) {
            try {
                await supabase
                    .schema('public')
                    .from('colaboradores')
                    .update(colabSync)
                    .eq('cod_colab', updatedW.cod_colab);
            } catch (err) {
                console.warn("Aviso: Falha ao sincronizar public.colaboradores:", err);
            }
        }
    }

    // 2. Buscar dados completos da solicitação atual
    const { data: currentReq } = await supabase
        .schema('core_personal')
        .from('document_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

    // 3. Sincronizar IBAN na tabela core_personal.worker_ibans
    const finalIban = (approvedData.iban || updatedFormData?.iban || '').trim();
    const finalBanco = (updatedFormData?.banco || '').trim() || 'Banco';
    const certificadoUrl = currentReq?.iban_url || (currentReq?.extracted_data?.iban_url) || null;

    if (finalIban) {
        try {
            const { data: existingIban } = await supabase
                .schema('core_personal')
                .from('worker_ibans')
                .select('id, iban, banco')
                .eq('worker_id', workerId)
                .eq('status', 'ATIVO')
                .maybeSingle();

            if (existingIban) {
                await supabase
                    .schema('core_personal')
                    .from('worker_ibans')
                    .update({
                        iban: finalIban,
                        banco: finalBanco,
                        certificado_url: certificadoUrl,
                        documento_url: certificadoUrl,
                        data_alteracao: new Date().toISOString().split('T')[0],
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingIban.id);
            } else {
                await supabase
                    .schema('core_personal')
                    .from('worker_ibans')
                    .insert({
                        worker_id: workerId,
                        banco: finalBanco,
                        iban: finalIban,
                        status: 'ATIVO',
                        certificado_url: certificadoUrl,
                        documento_url: certificadoUrl,
                        data_alteracao: new Date().toISOString().split('T')[0],
                        observacoes: 'Cadastrado via Validação de Documentos'
                    });
            }
        } catch (ibanErr) {
            console.error("Erro ao sincronizar worker_ibans:", ibanErr);
        }
    }

    // 4. Sincronizar anexos de documentos no arquivo digital do trabalhador (worker_documents)
    if (currentReq) {
        try {
            const empresaIdForDocs = currentReq.empresa_id || 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d';
            const residenceFileUrl = currentReq.residence_url || (currentReq.extracted_data?.residence_url) || null;
            const residenceBackFileUrl = (currentReq.extracted_data?.residence_back_url) || null;
            const docsToArchive: Array<{ docType: string; label: string; filePath: string | null }> = [
                { docType: 'foto', label: 'Foto do Trabalhador', filePath: currentReq.selfie_url },
                { docType: 'passaporte', label: 'Passaporte / Identificação', filePath: currentReq.passport_url },
                { docType: 'residencia_europeia', label: residenceBackFileUrl ? 'Residência Europeia (Frente)' : 'Residência Europeia', filePath: residenceFileUrl },
                { docType: 'residencia_europeia', label: 'Residência Europeia (Verso)', filePath: residenceBackFileUrl },
                { docType: 'nif', label: 'NIF', filePath: currentReq.nif_url },
                { docType: 'niss', label: 'NISS', filePath: currentReq.niss_url },
                { docType: 'permision_conducir', label: 'Carta de Condução', filePath: currentReq.license_url },
                { docType: 'Cert. Titularidade Banco', label: 'Comprovativo IBAN', filePath: certificadoUrl }
            ];

            for (const doc of docsToArchive) {
                if (doc.filePath) {
                    const cleanPath = doc.filePath.replace(/^worker-incoming-docs\//, '');
                    const targetFilePath = `worker-incoming-docs/${cleanPath}`;
                    const ext = doc.filePath.split('.').pop() || 'jpg';
                    const fileName = `${doc.label} - ${approvedData.nome || 'Trabalhador'}.${ext}`;
                    
                    const { data: existingDoc } = await supabase
                        .schema('core_personal')
                        .from('worker_documents')
                        .select('id')
                        .eq('worker_id', workerId)
                        .or(`file_path.eq.${targetFilePath},file_path.eq.${cleanPath}`)
                        .maybeSingle();

                    if (!existingDoc) {
                        await supabase
                            .schema('core_personal')
                            .from('worker_documents')
                            .insert({
                                empresa_id: empresaIdForDocs,
                                worker_id: workerId,
                                doc_type: doc.docType,
                                file_path: targetFilePath,
                                file_name: fileName,
                                file_size: 1024,
                                mime_type: ext.toLowerCase() === 'pdf' ? 'application/pdf' : 'image/jpeg'
                            });
                    }
                }
            }
        } catch (docErr) {
            console.error("Erro ao arquivar worker_documents:", docErr);
        }
    }

    // 5. Atualizar o extracted_data da solicitação e marcar como verificada
    const mergedExtracted = {
        ...(currentReq?.extracted_data || {}),
        ...(updatedFormData || approvedData),
        updated_at: new Date().toISOString()
    };

    const { error: requestErr } = await supabase
        .schema('core_personal')
        .from('document_requests')
        .update({
            status: 'verified',
            ...(updatedFormData?.tiene_residencia_ue !== undefined ? { tiene_residencia_ue: Boolean(updatedFormData.tiene_residencia_ue) } : {}),
            extracted_data: mergedExtracted,
            updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

    if (requestErr) {
        throw mapSupabaseError(requestErr);
    }
}


export interface ConsolidateNoticeDiscountPayload {
    contractId: string;
    workerId: string;
    empresaId: string;
    competenceMonth: string; // YYYY-MM
    amount: number;
    stopDate: string;
    stopReason: string;
    description: string;
    metadataUpdates: NonNullable<Contract['metadata']>;
    existingDiscountId?: string | null;
}

export async function consolidateNoticeDiscountToPayroll(
    payload: ConsolidateNoticeDiscountPayload
): Promise<{ discountId: string }> {
    const referenceDate = `${payload.competenceMonth.substring(0, 7)}-01`;
    let discountId = payload.existingDiscountId || null;

    if (discountId) {
        const { data: updated, error: updErr } = await supabase
            .from('worker_discounts')
            .update({
                empresa_id: payload.empresaId,
                category: 'AVISO PRÉVIO',
                amount: Number(payload.amount.toFixed(2)),
                reference_date: referenceDate,
                description: payload.description,
                status: 'Ativo',
                updated_at: new Date().toISOString(),
            })
            .eq('id', discountId)
            .select('id')
            .maybeSingle();

        if (updErr || !updated) {
            discountId = null;
        }
    }

    if (!discountId) {
        const { data: created, error: insErr } = await supabase
            .from('worker_discounts')
            .insert([
                {
                    worker_id: payload.workerId,
                    empresa_id: payload.empresaId,
                    category: 'AVISO PRÉVIO',
                    amount: Number(payload.amount.toFixed(2)),
                    reference_date: referenceDate,
                    description: payload.description,
                    is_recurring: false,
                    status: 'Ativo',
                },
            ])
            .select('id')
            .single();

        if (insErr) {
            throw mapSupabaseError(insErr);
        }
        discountId = created.id;
    }

    await updateContractNoticeMetadata(payload.contractId, {
        ...payload.metadataUpdates,
        payroll_discount_id: discountId,
        payroll_competence: payload.competenceMonth.substring(0, 7),
        payroll_consolidated_amount: Number(payload.amount.toFixed(2)),
        payroll_consolidated_at: new Date().toISOString(),
        payroll_stop_reason: payload.stopReason,
    });

    return { discountId: discountId! };
}

export interface SignContractAsCompanyPayload {
    contract_id: string;
    otp_code: string;
    signature_image?: string;
    signature_base64?: string;
    signer_name?: string;
    signer_nif?: string;
    signer_document?: string;
    signer_cargo?: string;
    signer_email?: string;
    ip_address?: string;
    user_agent?: string;
}

export async function signContractAsCompany(
    payload: SignContractAsCompanyPayload
): Promise<{
    success: boolean;
    message: string;
    signed_at: string;
    worker_signed?: boolean;
    company_signed?: boolean;
}> {
    const resolvedSig = payload.signature_image || payload.signature_base64 || '';
    const resolvedNif = payload.signer_nif || payload.signer_document || '';
    const { data, error } = await supabase.functions.invoke('sign-contract', {
        body: {
            ...payload,
            signature_image: resolvedSig,
            signature_base64: resolvedSig,
            signer_nif: resolvedNif,
            signer_document: resolvedNif,
            signer_role: 'company',
        },
    });

    if (error) {
        let errorMsg = error.message;
        if ('context' in error && (error as any).context instanceof Response) {
            try {
                const body = await (error as any).context.clone().json();
                if (body && body.error) {
                    errorMsg = body.error;
                }
            } catch (_) {}
        }
        throw new Error(errorMsg || 'Erro ao assinar o contrato pelo representante da empresa.');
    }

    return data;
}

export async function requestCompanyOtp(
    contractId: string,
    signerEmail?: string
): Promise<{ success: boolean; company_otp_code: string; email_sent: boolean }> {
    const { data, error } = await supabase.functions.invoke('sign-contract', {
        body: {
            action: 'request_company_otp',
            contract_id: contractId,
            signer_email: signerEmail,
        },
    });

    if (error) {
        let errorMsg = error.message;
        if ('context' in error && (error as any).context instanceof Response) {
            try {
                const body = await (error as any).context.clone().json();
                if (body && body.error) {
                    errorMsg = body.error;
                }
            } catch (_) {}
        }
        throw new Error(errorMsg || 'Erro ao solicitar código OTP corporativo.');
    }

    return data;
}

export async function getCompanyContractSettings(empresaId: string): Promise<Record<string, any>> {
    const { data, error } = await supabase
        .schema('core_common')
        .from('empresas')
        .select('contract_settings')
        .eq('id', empresaId)
        .maybeSingle();

    if (error) {
        throw mapSupabaseError(error);
    }

    return (data?.contract_settings && typeof data.contract_settings === 'object')
        ? data.contract_settings
        : {};
}

export async function updateCompanyContractSettings(
    empresaId: string,
    settings: Record<string, any>
): Promise<void> {
    const { error } = await supabase
        .schema('core_common')
        .from('empresas')
        .update({ contract_settings: settings })
        .eq('id', empresaId);

    if (error) {
        throw mapSupabaseError(error);
    }

}


export interface UploadSignedContractPayload {
    contract: Contract;
    file: File;
    signedBy: "both" | "company" | "worker";
    archiveToWorkerProfile?: boolean;
}

export async function uploadSignedContractFile(
    payload: UploadSignedContractPayload
): Promise<{ documentUrl: string; status: Contract["status"]; companySigned: boolean; workerSigned: boolean }> {
    const { contract, file, signedBy, archiveToWorkerProfile = true } = payload;
    const ext = (file.name.split(".").pop() || "pdf").toLowerCase();
    const cleanContratante = (contract.contratante || "HEXAGON").toUpperCase().replace(/[^A-Z0-9_-]/g, "_");
    const targetPath = `${cleanContratante}/FIRMADO_${contract.id}_${Date.now()}.${ext}`;

    const contentType =
        file.type ||
        (ext === "pdf"
            ? "application/pdf"
            : ext === "docx"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "image/jpeg");

    const { error: uploadErr } = await supabase.storage
        .from("worker-contracts")
        .upload(targetPath, file, {
            upsert: true,
            contentType,
        });

    if (uploadErr) {
        throw new Error(`Error al subir el archivo del contrato firmado: ${uploadErr.message}`);
    }

    const { data: existingRow } = await supabase
        .schema("core_personal")
        .from("contracts")
        .select("metadata, status, signed_at")
        .eq("id", contract.id)
        .maybeSingle();

    const prevMeta = (existingRow?.metadata && typeof existingRow.metadata === "object")
        ? existingRow.metadata
        : (contract.metadata || {});

    const nowIso = new Date().toISOString();
    const companySigned = signedBy === "both" || signedBy === "company" ? true : Boolean(prevMeta.company_signed);
    const workerSigned = signedBy === "both" || signedBy === "worker" ? true : (existingRow?.status === "signed" || contract.status === "signed");
    const nextStatus: Contract["status"] = workerSigned ? "signed" : "pending_signature";
    const nextSignedAt = workerSigned ? (existingRow?.signed_at || nowIso) : null;

    const updatedMeta: Record<string, any> = {
        ...prevMeta,
        company_signed: companySigned,
        ...(signedBy === "both" || signedBy === "company" ? { company_signed_at: nowIso } : {}),
        worker_signed: workerSigned,
        ...(signedBy === "both" || signedBy === "worker" ? { worker_signed_at: nowIso } : {}),
        base_document_url: targetPath,
        uploaded_signed_file_name: file.name,
        uploaded_signed_by: signedBy,
        uploaded_signed_at: nowIso,
    };

    const { error: updateErr } = await supabase
        .schema("core_personal")
        .from("contracts")
        .update({
            document_url: targetPath,
            signed_document_url: targetPath,
            status: nextStatus,
            signed_at: nextSignedAt,
            metadata: updatedMeta,
            updated_at: nowIso,
        })
        .eq("id", contract.id);

    if (updateErr) {
        throw mapSupabaseError(updateErr);
    }

    if (archiveToWorkerProfile && contract.worker_id) {
        try {
            const workerName = contract.worker?.nome || "Trabajador";
            const statusLabel =
                signedBy === "both"
                    ? "Contrato Firmado (Empresa y Trabajador)"
                    : signedBy === "company"
                    ? "Contrato Firmado (Empresa)"
                    : "Contrato Firmado (Trabajador)";
            const docFileName = `${statusLabel} - ${workerName}.${ext}`;
            const workerDocPath = `worker-contracts/${targetPath}`;

            await supabase
                .schema("core_personal")
                .from("worker_documents")
                .insert({
                    empresa_id: contract.empresa_id || HEXAGON_EMPRESA_ID,
                    worker_id: contract.worker_id,
                    doc_type: contract.contract_type === "rescisao" ? "carta_renuncia" : "contrato_trabalho",
                    file_path: workerDocPath,
                    file_name: docFileName,
                    file_size: file.size || 1024,
                    mime_type: contentType,
                });
        } catch (archErr) {
            console.warn("Aviso al archivar contrato firmado en la ficha del trabajador:", archErr);
        }
    }

    return {
        documentUrl: targetPath,
        status: nextStatus,
        companySigned,
        workerSigned,
    };
}
