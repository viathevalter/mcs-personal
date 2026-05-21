import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateWorkerAlocacao } from '../api/workersApi';
import type { UpdateWorkerAlocacaoParams } from '../api/workersApi';
import { useToast } from '@/hooks/use-toast';

export function useUpdateWorkerAlocacao() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: (params: UpdateWorkerAlocacaoParams) => updateWorkerAlocacao(params),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['worker-alocacoes', variables.workerCodColab] });
            queryClient.invalidateQueries({ queryKey: ['worker', variables.workerCodColab] }); // Invalidar o cache do worker para atualizar a interface (empresa/função)
            
            toast({
                title: 'Alocação atualizada',
                description: 'A alocação foi atualizada com sucesso.',
            });
        },
        onError: (error: Error) => {
            toast({
                title: 'Erro ao atualizar alocação',
                description: error.message || 'Ocorreu um erro inesperado.',
                variant: 'destructive',
            });
        },
    });
}
