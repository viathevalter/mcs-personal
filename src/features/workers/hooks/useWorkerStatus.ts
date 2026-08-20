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
        onSuccess: async (_, variables) => {
            // Força a invalidação e o re-fetch ativo imediato de todas as queries relacionadas ao trabalhador
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['worker', variables.workerId], refetchType: 'active' }),
                queryClient.invalidateQueries({ queryKey: ['workers'], refetchType: 'active' }),
                queryClient.invalidateQueries({ queryKey: ['workerStatusHistory', variables.workerId], refetchType: 'active' }),
                queryClient.invalidateQueries({ queryKey: ['workerAllocations', variables.workerId], refetchType: 'active' }),
                queryClient.invalidateQueries({ queryKey: ['seguridade'], refetchType: 'active' }),
                queryClient.refetchQueries({ queryKey: ['worker', variables.workerId] })
            ]);

            toast.success('Status do Trabalhador e da Seguridade Social atualizados com sucesso!');
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao atualizar o status do trabalhador.');
        }
    });
};
