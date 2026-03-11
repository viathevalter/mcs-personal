import { useMutation, useQueryClient } from '@tanstack/react-query';
import { insertHousingBatch } from '../api/housingApi';
import type { HousingBenefit } from '@/shared/types/corePersonal';
import { toast } from 'sonner';

export const HOUSING_QUERY_KEY = 'worker_housing';

export function useImportHousing() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payloads: Omit<HousingBenefit, 'id' | 'created_at'>[]) => {
            if (!payloads || payloads.length === 0) return;
            await insertHousingBatch(payloads);
        },
        onSuccess: () => {
            // Invalidate queries to refresh the benefits list
            queryClient.invalidateQueries({ queryKey: [HOUSING_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: ['workers_with_housing'] });
            toast.success("Benefícios importados com sucesso.");
        },
        onError: (error: Error) => {
            toast.error(`Erro ao importar benefícios: ${error.message}`);
        }
    });
}
