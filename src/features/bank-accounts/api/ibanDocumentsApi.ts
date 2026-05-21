import { supabase } from '@/shared/supabase/client';
import { mapSupabaseError } from '@/shared/api/supabaseError';

const BUCKET_NAME = 'mcs-personal-docs';

export type IbanDocType = 'certificado' | 'autorizacao';

export interface UploadIbanDocumentParams {
    empresaId: string;
    workerId: string;
    docType: IbanDocType;
    file: File;
}

export async function uploadIbanDocument({ empresaId, workerId, docType, file }: UploadIbanDocumentParams): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${docType}_${Date.now()}.${fileExt}`;
    // Store inside ibans folder (or inside the unified folder structure, but let's keep it here so existing links don't break logic)
    const filePath = `ibans/${workerId}/${fileName}`;

    // 1. Upload to Storage Bucket
    const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (uploadError) {
        throw mapSupabaseError(uploadError);
    }

    // 2. Update the worker_ibans active record
    const columnToUpdate = docType === 'certificado' ? 'certificado_url' : 'autorizacao_url';

    const { error: dbError } = await supabase
        .schema('core_personal')
        .from('worker_ibans')
        .update({ [columnToUpdate]: filePath })
        .eq('worker_id', workerId)
        .eq('status', 'ATIVO');

    if (dbError) {
        // Rollback
        await supabase.storage.from(BUCKET_NAME).remove([filePath]);
        throw mapSupabaseError(dbError);
    }

    // 3. (NEW) Also insert into the worker_documents table so it appears in the Arquivo Digital
    const globalDocType = docType === 'certificado' ? 'certificado_banco' : 'autorizacao_banco';
    
    const { error: docInsertError } = await supabase
        .schema('core_personal')
        .from('worker_documents')
        .insert({
            empresa_id: empresaId,
            worker_id: workerId,
            doc_type: globalDocType,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type
        });

    if (docInsertError) {
        console.warn("Falha não-critica ao syncar com worker_documents:", docInsertError);
    }

    return filePath;
}


export async function getIbanDocumentDownloadUrl(filePath: string): Promise<string> {
    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, 60 * 60); // 1 hour link

    if (error) {
        throw mapSupabaseError(error);
    }

    return data.signedUrl;
}
