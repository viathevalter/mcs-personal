import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
    getAllIbanRequests, 
    getIbanRequestByToken, 
    createIbanRequest, 
    submitIbanRequest, 
    approveIbanRequest, 
    rejectIbanRequest, 
    uploadIbanRequestFile
} from '../api/ibanRequestsApi';

export const useAllIbanRequests = (empresaId?: string) => {
    return useQuery({
        queryKey: ['all-iban-change-requests', empresaId],
        queryFn: () => {
            if (!empresaId) return [];
            return getAllIbanRequests(empresaId);
        },
        enabled: Boolean(empresaId)
    });
};

export const useIbanRequestByToken = (token: string) => {
    return useQuery({
        queryKey: ['iban-change-request-by-token', token],
        queryFn: () => getIbanRequestByToken(token),
        enabled: Boolean(token),
        retry: false
    });
};

export const useCreateIbanRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (variables: { empresaId: string; workerId: string; oldIban: string | null; oldBanco: string | null }) => 
            createIbanRequest(variables.empresaId, variables.workerId, variables.oldIban, variables.oldBanco),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['all-iban-change-requests', variables.empresaId] });
        }
    });
};

export const useSubmitIbanRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (variables: { token: string; payload: { new_iban: string; new_banco: string; iban_photo_url: string | null; comprovante_url: string | null } }) => 
            submitIbanRequest(variables.token, variables.payload),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['iban-change-request-by-token', variables.token] });
        }
    });
};

export const useApproveIbanRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (variables: { id: string; workerId: string; newIban: string; newBanco: string; termoAssinadoUrl: string | null; comprovanteUrl: string | null; empresaId: string }) => 
            approveIbanRequest(variables.id, variables.workerId, variables.newIban, variables.newBanco, variables.termoAssinadoUrl, variables.comprovanteUrl),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['all-iban-change-requests', variables.empresaId] });
            queryClient.invalidateQueries({ queryKey: ['all-bank-accounts', variables.empresaId] });
        }
    });
};

export const useRejectIbanRequest = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (variables: { id: string; reason: string; empresaId: string }) => 
            rejectIbanRequest(variables.id, variables.reason),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['all-iban-change-requests', variables.empresaId] });
        }
    });
};

export const useUploadIbanRequestFile = () => {
    return useMutation({
        mutationFn: (variables: { token: string; file: File; docType: 'iban_photo' | 'comprovante' | 'termo_assinado' }) => 
            uploadIbanRequestFile(variables.token, variables.file, variables.docType)
    });
};
