import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteHousing } from '../api/housingApi';

export function useDeleteHousing(workerId: string, empresaId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteHousing(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['housing_benefit', workerId] });
            queryClient.invalidateQueries({ queryKey: ['all-worker-housing-benefits'] });
            queryClient.invalidateQueries({ queryKey: ['workers_holerites'] });
            if (empresaId) {
                queryClient.invalidateQueries({ queryKey: ['workers_with_housing', empresaId] });
            }
        },
    });
}
