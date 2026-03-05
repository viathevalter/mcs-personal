import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    listWorkerDocuments,
    uploadWorkerDocument,
    deleteWorkerDocument,
    getDocumentDownloadUrl,
    type UploadDocumentParams
} from '../api/documentsApi';
import type { WorkerDocument } from '@/shared/types/corePersonal';

export function useWorkerDocuments(workerId: string) {
    return useQuery<WorkerDocument[], Error>({
        queryKey: ['worker_documents', workerId],
        queryFn: () => listWorkerDocuments(workerId),
        enabled: Boolean(workerId),
    });
}

export function useUploadDocument() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (params: UploadDocumentParams) => uploadWorkerDocument(params),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: ['worker_documents', variables.workerId]
            });
        }
    });
}

export function useDeleteDocument() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (document: WorkerDocument) => deleteWorkerDocument(document),
        onSuccess: (_, document) => {
            queryClient.invalidateQueries({
                queryKey: ['worker_documents', document.worker_id]
            });
        }
    });
}

export function useDocumentDownload() {
    return useMutation({
        mutationFn: (filePath: string) => getDocumentDownloadUrl(filePath)
    });
}
