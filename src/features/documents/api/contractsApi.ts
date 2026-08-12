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

    let clientsMap = new Map();
    if (clientIds.length > 0) {
        const { data: clientsData, error: clientsErr } = await supabase
            .schema('core_common')
            .from('clients')
            .select('id, legal_name, trade_name')
            .in('id', clientIds);

        if (!clientsErr && clientsData) {
            clientsMap = new Map(clientsData.map(c => [c.id, c]));
        }
    }

    // Resolve active/last client for workers when assignment_id is null
    const codColabs = [...new Set(contracts.map(c => c.worker?.cod_colab).filter(Boolean))];
    const allocationsGroupByWorker = new Map<string, any[]>();
    
    if (codColabs.length > 0) {
        const { data: allocData } = await supabase
            .schema('core_personal')
            .from('vw_worker_allocations')
            .select('cod_colab, cliente_nombre, contratante, fechainiciopedido, fechasalidatrabajador, fechafinpedido, inserted_at')
            .in('cod_colab', codColabs);

        if (allocData) {
            allocData.forEach(alloc => {
                if (alloc.cod_colab) {
                    if (!allocationsGroupByWorker.has(alloc.cod_colab)) {
                        allocationsGroupByWorker.set(alloc.cod_colab, []);
                    }
                    allocationsGroupByWorker.get(alloc.cod_colab)!.push(alloc);
                }
            });
        }
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

        return {
            ...c,
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

    const [empresasRes, clientsRes] = await Promise.all([
        empresaIds.length > 0
            ? supabase.schema('core_common').from('empresas').select('id, nome').in('id', empresaIds)
            : Promise.resolve({ data: [] }),
        uniqueClientIds.length > 0
            ? supabase.schema('core_common').from('clients').select('id, legal_name, trade_name, codigo').in('id', uniqueClientIds)
            : Promise.resolve({ data: [] })
    ]);

    const empresasMap = new Map(empresasRes.data?.map(e => [e.id, e]) || []);
    const clientsMap = new Map(clientsRes.data?.map(c => [c.id, c]) || []);

    return docRequests.map(r => {
        const emp = empresasMap.get(r.empresa_id);
        const explicitClientId = (r as any).extracted_data?.client_id;
        const explicitClient = explicitClientId ? clientsMap.get(explicitClientId) : null;
        return {
            ...r,
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
    const extractedData: any = {};
    if (clientId) extractedData.client_id = clientId;
    if (startDate) extractedData.start_date = startDate;

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
        foto?: string;
    }
): Promise<void> {
    // 1. Atualizar o cadastro do trabalhador
    const { error: workerErr } = await supabase
        .schema('core_personal')
        .from('workers')
        .update(approvedData)
        .eq('id', workerId);

    if (workerErr) {
        throw mapSupabaseError(workerErr);
    }

    // 2. Marcar a solicitação como verificada
    const { error: requestErr } = await supabase
        .schema('core_personal')
        .from('document_requests')
        .update({
            status: 'verified',
            updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

    if (requestErr) {
        throw mapSupabaseError(requestErr);
    }
}
