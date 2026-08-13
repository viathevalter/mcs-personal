import { supabase } from '@/shared/supabase/client';
import { mapSupabaseError } from '@/shared/api/supabaseError';
import type { WorkerDocument } from '@/shared/types/corePersonal';

const BUCKET_NAME = 'mcs-personal-docs';

export async function listWorkerDocuments(workerId: string): Promise<WorkerDocument[]> {
    const { data, error } = await supabase
        .schema('core_personal').from('worker_documents')
        .select('*')
        .eq('worker_id', workerId)
        .order('created_at', { ascending: false });

    if (error) {
        throw mapSupabaseError(error);
    }

    return data as WorkerDocument[];
}

export interface UploadDocumentParams {
    empresaId: string;
    workerId: string;
    docType: string;
    file: File;
}

export async function uploadWorkerDocument({ empresaId, workerId, docType, file }: UploadDocumentParams): Promise<WorkerDocument> {
    // 1. Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `${empresaId}/${workerId}/${docType}/${fileName}`;

    // 2. Upload to Storage Bucket
    const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (uploadError) {
        throw mapSupabaseError(uploadError);
    }

    // 3. Insert record in DB
    const { data, error: dbError } = await supabase
        .schema('core_personal').from('worker_documents')
        .insert({
            empresa_id: empresaId,
            worker_id: workerId,
            doc_type: docType,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type
        })
        .select('*')
        .single();

    if (dbError) {
        // Optional: rollback file upload if DB fails
        await supabase.storage.from(BUCKET_NAME).remove([filePath]);
        throw mapSupabaseError(dbError);
    }

    return data as WorkerDocument;
}

export async function deleteWorkerDocument(document: WorkerDocument): Promise<void> {
    // 1. Delete from DB (relies on RLS for authorization check)
    const { error: dbError } = await supabase
        .schema('core_personal').from('worker_documents')
        .delete()
        .eq('id', document.id);

    if (dbError) {
        throw mapSupabaseError(dbError);
    }

    // 2. Delete from Storage bucket
    const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([document.file_path]);

    if (storageError) {
        console.warn('Failed to delete file from storage, but DB record was removed:', storageError);
    }
}

export async function getDocumentDownloadUrl(filePath: string): Promise<string> {
    if (!filePath) return '';
    const buckets = ['mcs-personal-docs', 'worker-contracts', 'worker-incoming-docs', 'worker-documents', 'documents'];
    
    let bucketToUse = BUCKET_NAME;
    let cleanPath = filePath.replace(/^\/+/, '').trim();

    // Detect bucket if path starts with bucket name
    for (const b of buckets) {
        if (cleanPath.startsWith(`${b}/`)) {
            bucketToUse = b;
            cleanPath = cleanPath.substring(b.length + 1);
            break;
        }
    }

    // Try detected bucket first
    const { data: firstTry, error: firstErr } = await supabase.storage
        .from(bucketToUse)
        .createSignedUrl(cleanPath, 60 * 60);

    if (!firstErr && firstTry?.signedUrl) {
        return firstTry.signedUrl;
    }

    // Fallback: search across all buckets
    for (const bucket of buckets) {
        if (bucket === bucketToUse) continue;
        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUrl(cleanPath, 60 * 60);

        if (!error && data?.signedUrl) {
            return data.signedUrl;
        }
    }

    // Fallback to public URL
    const { data } = supabase.storage.from(bucketToUse).getPublicUrl(cleanPath);
    return data.publicUrl;
}
