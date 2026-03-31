import { supabase } from '@/shared/supabase/client';
import { mapSupabaseError } from '@/shared/api/supabaseError';

const BUCKET_NAME = 'mcs-personal-docs';

export type IbanDocType = 'certificado' | 'autorizacao';

export interface UploadIbanDocumentParams {
    workerId: string;
    docType: IbanDocType;
    file: File;
}

export async function uploadIbanDocument({ workerId, docType, file }: UploadIbanDocumentParams): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${docType}_${Date.now()}.${fileExt}`;
    // Store inside ibans folder
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
