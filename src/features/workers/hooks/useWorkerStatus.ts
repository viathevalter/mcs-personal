import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    getWorkerStatusHistory,
    updateWorkerStatusUnified,
} from '../api/workerStatusApi';
import type { UnifiedStatusPayload } from '../api/workerStatusApi';

export const useWorkerStatusHistory = (workerId: string) => {
    return useQuery({
        queryKey: ['workerStatusHistory', workerId],
        queryFn: () => getWorkerStatusHistory(workerId),
        enabled: !!workerId,
    });
};

export const useUpdateWorkerStatusUnified = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: UnifiedStatusPayload) => updateWorkerStatusUnified(payload),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['worker', variables.workerId] });
            queryClient.invalidateQueries({ queryKey: ['workers'] });
            queryClient.invalidateQueries({ queryKey: ['workerStatusHistory', variables.workerId] });
            queryClient.invalidateQueries({ queryKey: ['workerAllocations', variables.workerId] });
            queryClient.invalidateQueries({ queryKey: ['seguridade'] });
            
            toast.success('Status do Trabalhador e da Seguridade Social atualizados com sucesso!');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao atualizar o status do trabalhador.');
        }
    });
};
