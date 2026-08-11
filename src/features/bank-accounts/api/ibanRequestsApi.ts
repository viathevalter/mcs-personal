import { supabase } from '@/shared/supabase/client';
import { mapSupabaseError } from '@/shared/api/supabaseError';

const BUCKET_NAME = 'worker-incoming-docs';

export type IbanRequestStatus = 'pendente_envio' | 'enviado' | 'aguardando_assinatura' | 'assinado' | 'aprovado' | 'rejeitado';

export interface IbanChangeRequest {
    id: string;
    empresa_id: string;
    worker_id: string;
    token: string;
    status: IbanRequestStatus;
    old_iban: string | null;
    old_banco: string | null;
    new_iban: string | null;
    new_banco: string | null;
    iban_photo_url: string | null;
    comprovante_url: string | null;
    termo_gerado_url: string | null;
    termo_assinado_url: string | null;
    rejection_reason: string | null;
    expires_at: string;
    created_at: string;
    updated_at: string;
    worker?: {
        id: string;
        nome: string;
        email: string | null;
        movil: string | null;
        cod_colab: string | null;
    };
}

export async function createIbanRequest(empresaId: string, workerId: string, oldIban: string | null, oldBanco: string | null): Promise<IbanChangeRequest> {
    const { data, error } = await supabase
        .schema('core_personal')
        .from('iban_change_requests')
        .insert({
            empresa_id: empresaId,
            worker_id: workerId,
            old_iban: oldIban,
            old_banco: oldBanco,
            status: 'pendente_envio'
        })
        .select()
        .single();

    if (error) {
        throw mapSupabaseError(error);
    }

    return data as IbanChangeRequest;
}

export async function getIbanRequestByToken(token: string): Promise<IbanChangeRequest> {
    const { data, error } = await supabase
        .schema('core_personal')
        .from('iban_change_requests')
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

    return data as unknown as IbanChangeRequest;
}

export async function submitIbanRequest(
    token: string,
    payload: {
        new_iban: string;
        new_banco: string;
        iban_photo_url: string | null;
        comprovante_url: string | null;
    }
): Promise<void> {
    const { error } = await supabase
        .schema('core_personal')
        .from('iban_change_requests')
        .update({
            new_iban: payload.new_iban,
            new_banco: payload.new_banco,
            iban_photo_url: payload.iban_photo_url,
            comprovante_url: payload.comprovante_url,
            status: 'enviado',
            updated_at: new Date().toISOString()
        })
        .eq('token', token);

    if (error) {
        throw mapSupabaseError(error);
    }
}

export async function updateIbanRequestUrls(
    id: string,
    urls: {
        termo_gerado_url?: string;
        termo_assinado_url?: string;
    }
): Promise<void> {
    const { error } = await supabase
        .schema('core_personal')
        .from('iban_change_requests')
        .update({
            ...urls,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        throw mapSupabaseError(error);
    }
}

export async function approveIbanRequest(
    id: string,
    workerId: string,
    newIban: string,
    newBanco: string,
    termoAssinadoUrl: string | null,
    comprovanteUrl: string | null
): Promise<void> {
    // 1. Set all active IBANs for this worker to INATIVO
    const { error: deactivateError } = await supabase
        .schema('core_personal')
        .from('worker_ibans')
        .update({ status: 'INATIVO' })
        .eq('worker_id', workerId)
        .eq('status', 'ATIVO');

    if (deactivateError) {
        throw mapSupabaseError(deactivateError);
    }

    // 2. Insert new active IBAN
    const { error: insertError } = await supabase
        .schema('core_personal')
        .from('worker_ibans')
        .insert({
            worker_id: workerId,
            banco: newBanco,
            iban: newIban,
            status: 'ATIVO',
            certificado_url: comprovanteUrl,
            autorizacao_url: termoAssinadoUrl,
            observacoes: 'Atualizado via solicitacao de troca aprovada.'
        });

    if (insertError) {
        throw mapSupabaseError(insertError);
    }

    // 3. Update the request status to 'aprovado'
    const { error: requestError } = await supabase
        .schema('core_personal')
        .from('iban_change_requests')
        .update({
            status: 'aprovado',
            termo_assinado_url: termoAssinadoUrl,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (requestError) {
        throw mapSupabaseError(requestError);
    }
}

export async function rejectIbanRequest(id: string, reason: string): Promise<void> {
    const { error } = await supabase
        .schema('core_personal')
        .from('iban_change_requests')
        .update({
            status: 'rejeitado',
            rejection_reason: reason,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        throw mapSupabaseError(error);
    }
}

export async function getAllIbanRequests(empresaId: string): Promise<IbanChangeRequest[]> {
    const { data, error } = await supabase
        .schema('core_personal')
        .from('iban_change_requests')
        .select(`
            *,
            worker:workers (
                id, nome, email, movil, cod_colab
            )
        `)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

    if (error) {
        throw mapSupabaseError(error);
    }

    return data as unknown as IbanChangeRequest[];
}

export async function uploadIbanRequestFile(token: string, file: File, docType: 'iban_photo' | 'comprovante' | 'termo_assinado'): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${docType}_${Date.now()}.${fileExt}`;
    const filePath = `${token}/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (uploadError) {
        throw mapSupabaseError(uploadError);
    }

    return filePath;
}

export async function getIbanRequestFileUrl(filePath: string): Promise<string> {
    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, 60 * 60); // 1 hour

    if (error) {
        throw mapSupabaseError(error);
    }

    return data.signedUrl;
}

export async function setIbanRequestAwaitingSignature(id: string, termoGeradoUrl: string): Promise<void> {
    const { error } = await supabase
        .schema('core_personal')
        .from('iban_change_requests')
        .update({
            termo_gerado_url: termoGeradoUrl,
            status: 'aguardando_assinatura',
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
        throw mapSupabaseError(error);
    }
}

export async function submitSignedIbanRequestTerm(token: string, termoAssinadoUrl: string): Promise<void> {
    const { error } = await supabase
        .schema('core_personal')
        .from('iban_change_requests')
        .update({
            termo_assinado_url: termoAssinadoUrl,
            status: 'assinado',
            updated_at: new Date().toISOString()
        })
        .eq('token', token);

    if (error) {
        throw mapSupabaseError(error);
    }
}
