import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    getWorkerStatusHistory,
    changeWorkerStatus,
} from '../api/workerStatusApi';
import type { ChangeStatusPayload } from '../api/workerStatusApi';

export const useWorkerStatusHistory = (workerId: string) => {
    return useQuery({
        queryKey: ['workerStatusHistory', workerId],
        queryFn: () => getWorkerStatusHistory(workerId),
        enabled: !!workerId,
    });
};

export const useChangeWorkerStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: ChangeStatusPayload) => changeWorkerStatus(payload),
        onSuccess: (_, variables) => {
            // Invalidate both the specific worker and the overall workers list
            queryClient.invalidateQueries({ queryKey: ['worker', { id: variables.workerId }] });
            queryClient.invalidateQueries({ queryKey: ['workers'] });
            queryClient.invalidateQueries({ queryKey: ['workerStatusHistory', variables.workerId] });
            
            toast.success(`Status de ${variables.changeType === 'TRABALHADOR' ? 'Trabalho' : 'Seguridade'} atualizado com sucesso.`);
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao atualizar o status do trabalhador.');
        }
    });
};
