import { useMutation, useQueryClient } from '@tanstack/react-query';
import { upsertHousing } from '../api/housingApi';
import type { HousingBenefit } from '@/shared/types/corePersonal';

export function useUpsertHousing() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (variables: Partial<HousingBenefit> & { worker_id: string; empresa_id: string }) =>
            upsertHousing(variables),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['housing_benefit', data.worker_id] });
        },
    });
}
