import { supabase } from '@/shared/supabase/client';
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

    const [allocRes, assignRes, targetsTargetRes, targetsSourceRes] = await Promise.all([
        uniqueCodColabs.length > 0
            ? supabase
                .schema('core_personal')
                .from('vw_worker_allocations')
                .select('cod_colab, codpedido, cliente_nombre, contratante, fechainiciopedido, fechasalidatrabajador, fechafinpedido, inserted_at')
                .in('cod_colab', uniqueCodColabs)
            : Promise.resolve({ data: [] }),
        uniqueWorkerIds.length > 0
            ? supabase
                .schema('core_personal')
                .from('worker_assignments')
                .select('id, worker_id, client_id, pedido_id, created_at')
                .in('worker_id', uniqueWorkerIds)
            : Promise.resolve({ data: [] }),
        uniqueWorkerIds.length > 0
            ? supabase
                .schema('core_operacoes')
                .from('solicitud_targets')
                .select('id, solicitud_id, target_worker_id, source_worker_id, created_at')
                .in('target_worker_id', uniqueWorkerIds)
            : Promise.resolve({ data: [] }),
        uniqueWorkerIds.length > 0
            ? supabase
                .schema('core_operacoes')
                .from('solicitud_targets')
                .select('id, solicitud_id, target_worker_id, source_worker_id, created_at')
                .in('source_worker_id', uniqueWorkerIds)
            : Promise.resolve({ data: [] })
    ]);

    const allocs = (allocRes.data || []) as any[];
    const assigns = (assignRes.data || []) as any[];
    const targets = [...(targetsTargetRes.data || []), ...(targetsSourceRes.data || [])] as any[];

    const pedidoIds = [...new Set(assigns.map((a: any) => a.pedido_id).filter(Boolean))];
    const solicitudIds = [...new Set(targets.map((t: any) => t.solicitud_id).filter(Boolean))];

    const [pedidosRes, solRes] = await Promise.all([
        pedidoIds.length > 0
            ? supabase.schema('core_comercial').from('pedidos').select('id, codigo').in('id', pedidoIds)
            : Promise.resolve({ data: [] }),
        solicitudIds.length > 0
            ? supabase.schema('core_operacoes').from('solicitudes_operativas').select('id, codigo, tipo, title').in('id', solicitudIds)
            : Promise.resolve({ data: [] })
    ]);

    const pedidosMap = new Map((pedidosRes.data || []).map((p: any) => [p.id, p.codigo]));
    const solMap = new Map((solRes.data || []).map((s: any) => [s.id, s]));

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
    solMap?: Map<string, any>
) {
    const workerAllocs = codColab && allocationsGroupByWorker ? (allocationsGroupByWorker.get(codColab) || []) : [];
    const workerAssigns = workerId && assignmentsGroupByWorker ? (assignmentsGroupByWorker.get(workerId) || []) : [];
    const workerTargets = workerId && targetsGroupByWorker ? (targetsGroupByWorker.get(workerId) || []) : [];

    // Sort assignments by created_at desc
    const sortedAssigns = [...workerAssigns].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    const latestAssign = sortedAssigns[0];
    const assignPedidoCodigo = latestAssign?.pedido_id && pedidosMap ? pedidosMap.get(latestAssign.pedido_id) : null;

    // Sort targets by created_at desc
    const sortedTargets = [...workerTargets].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
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

    const finalPedidoCodigo = explicitPedidoCodigo || assignPedidoCodigo || pertinentAlloc?.codpedido || latestSol?.codigo || null;
    const finalTipo = latestSol?.tipo || (finalPedidoCodigo ? 'Pedido' : null);

    return {
        pedido_codigo: finalPedidoCodigo,
        solicitud_codigo: latestSol?.codigo || null,
        solicitud_tipo: finalTipo,
        solicitud_title: latestSol?.title || null
    };
}

export async function listContracts({ empresaId, workerId, status, contractType }: ListContractsParams): Promise<Contract[]> {
    let query = supabase
        .schema('core_personal')
        .from('contracts')
        .select(`
            *,
            worker:workers (
                id, nome, email, movil, nif, niss, dni, nie, pasaporte, cliente, cod_cliente, cod_colab
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

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        throw mapSupabaseError(error);
    }

    const contracts = (data || []) as any[];
    const clientIds = [...new Set(contracts.map(c => c.assignment?.client_id).filter(Boolean))];
    const codColabs = [...new Set(contracts.map(c => c.worker?.cod_colab).filter(Boolean))];
    const workerIds = [...new Set(contracts.map(c => c.worker_id).filter(Boolean))];

    const [clientsRes, orderInfo] = await Promise.all([
        clientIds.length > 0
            ? supabase.schema('core_common').from('clients').select('id, legal_name, trade_name').in('id', clientIds)
            : Promise.resolve({ data: [] }),
        fetchWorkersOrderInfo(workerIds, codColabs)
    ]);

    const clientsMap = new Map((clientsRes.data || []).map(c => [c.id, c]));
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
}

export interface GenerateContractResponse {
    success: boolean;
    contract_id: string;
    document_url?: string;
    signature_token: string;
    otp_code: string;
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
        licencia_conducir?: string;
        nacionalidade?: string;
        fecha_nacimiento?: string;
        cliente?: string;
        cod_cliente?: string;
        iban?: string;
        assignments?: Array<{
            id: string;
            status: string;
            client_id: string;
            start_date?: string;
            planned_start_date?: string;
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

export async function listDocumentRequests(empresaId: string): Promise<DocumentRequest[]> {
    let query = supabase
        .schema('core_personal')
        .from('document_requests')
        .select(`
            *,
            worker:workers (
                id, nome, email, movil, cod_colab, address_line, morada_contrato, location, pasaporte, nif, niss, nie, dni, licencia_conducir, nacionalidade, fecha_nacimiento, cliente, cod_cliente,
                assignments:worker_assignments (
                    id, status, client_id, start_date, planned_start_date
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
        const explicitClientId = (r as any).extracted_data?.client_id;
        const explicitClient = explicitClientId ? clientsMap.get(explicitClientId) : null;
        const explicitPedido = (r as any).extracted_data?.pedido_codigo || (r as any).extracted_data?.codigo_pedido;

        const resolvedOrder = resolveOrderInfo(
            r.worker_id,
            r.worker?.cod_colab,
            undefined,
            explicitPedido,
            allocationsGroupByWorker,
            assignmentsGroupByWorker,
            targetsGroupByWorker,
            pedidosMap,
            solMap
        );

        return {
            ...r,
            ...resolvedOrder,
            empresa: emp ? { id: emp.id, name: emp.nome } : null,
            client: explicitClient || r.worker?.assignments?.[0]?.client || null,
            worker: r.worker ? {
                ...r.worker,
                assignments: r.worker.assignments?.map((a: any) => ({
                    ...a,
                    client: clientsMap.get(a.client_id) || null
                })) || []
            } : null
        };
    }) as unknown as DocumentRequest[];
}

export async function createDocumentRequest(empresaId: string, workerId: string, clientId?: string, startDate?: string): Promise<DocumentRequest> {
    // Buscar dados pré-existentes do trabalhador (cadastrados na contratação inicial)
    const { data: worker } = await supabase
        .schema('core_personal')
        .from('workers')
        .select('*')
        .eq('id', workerId)
        .maybeSingle();

    const extractedData: any = {
        nome: worker?.nome || '',
        pasaporte: worker?.pasaporte || '',
        dni: worker?.dni || '',
        nie: worker?.nie || '',
        nif: worker?.nif || '',
        niss: worker?.niss || '',
        movil: worker?.movil || '',
        email: worker?.email || '',
        talla_camisa: worker?.camiseta || '',
        talla_pantalon: worker?.pantalones || '',
        licencia_conducir: worker?.licencia_conducir || '',
        nacionalidade: worker?.nacionalidade || '',
        fecha_nacimiento: worker?.fecha_nacimiento || '',
        direccion_actual: worker?.address_line || '',
        ubicacion_actual: worker?.location || '',
        morada_contrato: worker?.morada_contrato || '',
        iban: worker?.iban || '',
        client_id: clientId || null,
        start_date: startDate || null
    };

    const { data, error } = await supabase
        .schema('core_personal')
        .from('document_requests')
        .insert({
            empresa_id: empresaId,
            worker_id: workerId,
            status: 'pending_upload',
            extracted_data: extractedData,
            expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48h
        })
        .select()
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
    const { error } = await supabase
        .schema('core_personal')
        .from('document_requests')
        .update({
            ...payload,
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
        if (approvedData.pasaporte) colabSync.pasaporte = approvedData.pasaporte;
        if (approvedData.email) colabSync.email = approvedData.email;
        if (approvedData.movil) colabSync.movil = approvedData.movil;
        if (approvedData.fecha_nacimiento) colabSync.fecha_nacimiento = approvedData.fecha_nacimiento;
        if (approvedData.nacionalidade) colabSync.nacionalidade = approvedData.nacionalidade;
        if (approvedData.licencia_conducir) colabSync.licencia_conducir = approvedData.licencia_conducir;

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
            const docsToArchive: Array<{ docType: string; label: string; filePath: string | null }> = [
                { docType: 'passaporte', label: 'Passaporte / Identificação', filePath: currentReq.passport_url },
                { docType: 'nif', label: 'NIF', filePath: currentReq.nif_url },
                { docType: 'niss', label: 'NISS', filePath: currentReq.niss_url },
                { docType: 'permision_conducir', label: 'Carta de Condução', filePath: currentReq.license_url },
                { docType: 'Cert. Titularidade Banco', label: 'Comprovativo IBAN', filePath: certificadoUrl }
            ];

            for (const doc of docsToArchive) {
                if (doc.filePath) {
                    const ext = doc.filePath.split('.').pop() || 'pdf';
                    const fileName = `${doc.label} - ${approvedData.nome || 'Trabalhador'}.${ext}`;
                    
                    const { data: existingDoc } = await supabase
                        .schema('core_personal')
                        .from('worker_documents')
                        .select('id')
                        .eq('worker_id', workerId)
                        .eq('file_path', doc.filePath)
                        .maybeSingle();

                    if (!existingDoc) {
                        await supabase
                            .schema('core_personal')
                            .from('worker_documents')
                            .insert({
                                empresa_id: empresaIdForDocs,
                                worker_id: workerId,
                                doc_type: doc.docType,
                                file_path: doc.filePath,
                                file_name: fileName,
                                file_size: 1024,
                                mime_type: doc.filePath.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'
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
            extracted_data: mergedExtracted,
            updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

    if (requestErr) {
        throw mapSupabaseError(requestErr);
    }
}
