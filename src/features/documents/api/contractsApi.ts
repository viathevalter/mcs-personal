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
    };
}

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
                id, nome, email, movil, nif, niss, dni, nie, pasaporte
            )
        `);

    if (empresaId !== 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d') {
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

    return (data || []) as unknown as Contract[];
}

export interface GenerateContractPayload {
    worker_id: string;
    assignment_id?: string;
    contratante: string;
    contract_type: string;
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
    };
}

export async function listDocumentRequests(empresaId: string): Promise<DocumentRequest[]> {
    let query = supabase
        .schema('core_personal')
        .from('document_requests')
        .select(`
            *,
            worker:workers (
                id, nome, email, movil, cod_colab
            )
        `);

    if (empresaId !== 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d') {
        query = query.eq('empresa_id', empresaId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        throw mapSupabaseError(error);
    }

    return (data || []) as unknown as DocumentRequest[];
}

export async function createDocumentRequest(empresaId: string, workerId: string): Promise<DocumentRequest> {
    const { data, error } = await supabase
        .schema('core_personal')
        .from('document_requests')
        .insert({
            empresa_id: empresaId,
            worker_id: workerId,
            status: 'pending_upload',
            expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48h
        })
        .select()
        .single();

    if (error) {
        throw mapSupabaseError(error);
    }

    return data as unknown as DocumentRequest;
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
        nif?: string;
        niss?: string;
        nie?: string;
        dni?: string;
        pasaporte?: string;
        licencia_conducir?: string;
        nacionalidade?: string;
        fecha_nacimiento?: string;
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
