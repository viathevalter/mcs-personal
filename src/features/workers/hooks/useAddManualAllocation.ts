import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addManualAllocation, AddManualAllocationParams } from '../api/workersApi';
import { toast } from 'sonner';

export function useAddManualAllocation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (params: AddManualAllocationParams) => addManualAllocation(params),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['worker-alocacoes', variables.workerCodColab] });
            queryClient.invalidateQueries({ queryKey: ['workers'] }); // Invalidate workers list to update KPIs and status
            toast.success('Alocação manual inserida com sucesso', {
                description: `Trabalhador ${variables.workerName} reativado e alocado.`
            });
        },
        onError: (error: Error) => {
            toast.error('Erro ao inserir alocação', {
                description: error.message
            });
        }
    });
}
