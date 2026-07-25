import { supabase } from '@/shared/supabase/client';
import { mapSupabaseError } from '@/shared/api/supabaseError';

export interface ProposalSignature {
    id: string;
    empresa_id: string;
    estimacion_id: string;
    status: 'draft' | 'pending_signature' | 'signed' | 'expired';
    document_url: string | null;
    contract_document_url: string | null;
    signed_document_url: string | null;
    contract_signed_document_url: string | null;
    signature_token: string;
    sent_at: string | null;
    signed_at: string | null;
    created_at: string;
    updated_at: string;
    
    estimacion?: {
        id: string;
        codigo: string;
        contact_name: string;
        contact_email: string;
        client_id: string | null;
        lead_id: string | null;
        client?: {
            id: string;
            trade_name: string;
            legal_name: string;
            email: string;
        } | null;
        lead?: {
            id: string;
            name: string;
            email: string;
            company_name: string;
        } | null;
    };
}

export async function getProposalByToken(token: string): Promise<ProposalSignature> {
    const { data: ps, error: psErr } = await supabase
        .schema('core_comercial')
        .from('proposal_signatures')
        .select('*')
        .eq('signature_token', token)
        .single();

    if (psErr) {
        throw mapSupabaseError(psErr);
    }

    if (!ps) {
        throw new Error('Proposta não encontrada.');
    }

    // Now fetch the estimate
    const { data: est, error: estErr } = await supabase
        .schema('core_comercial')
        .from('estimaciones')
        .select('*')
        .eq('id', ps.estimacion_id)
        .single();

    if (estErr) {
        return ps as ProposalSignature;
    }

    // If there is a lead_id, fetch the lead
    let lead = null;
    if (est.lead_id) {
        const { data: leadData } = await supabase
            .schema('core_comercial')
            .from('leads')
            .select('*')
            .eq('id', est.lead_id)
            .single();
        lead = leadData;
    }

    // If there is a client_id, fetch the client
    let client = null;
    if (est.client_id) {
        const { data: clientData } = await supabase
            .schema('core_common')
            .from('clients')
            .select('*')
            .eq('id', est.client_id)
            .single();
        client = clientData;
    }

    return {
        ...ps,
        estimacion: {
            ...est,
            client,
            lead
        }
    } as ProposalSignature;
}

export interface SignProposalPayload {
    token: string;
    otp_code: string;
    signature_image?: string; // Base64 data URL from canvas
    ip_address: string;
    user_agent: string;
}

export async function signProposal(payload: SignProposalPayload): Promise<{ success: boolean; message: string; signed_at: string }> {
    const { data, error } = await supabase.functions.invoke('sign-proposal', {
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
        throw new Error(errorMsg || 'Erro ao realizar a assinatura da proposta.');
    }

    return data;
}

export async function generateProposal(estimacionId: string, email?: string): Promise<{
    success: boolean;
    proposal_signature_id: string;
    signature_token: string;
    otp_code: string;
    signing_link: string;
    email_sent: boolean;
}> {
    const { data, error } = await supabase.functions.invoke('generate-proposal', {
        body: { estimacion_id: estimacionId, client_email: email },
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
        throw new Error(errorMsg || 'Erro ao gerar e enviar a proposta comercial.');
    }

    return data;
}


