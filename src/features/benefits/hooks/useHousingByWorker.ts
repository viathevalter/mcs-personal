import { useQuery } from '@tanstack/react-query';
import { getHousingByWorker } from '../api/housingApi';
import type { HousingBenefit } from '@/shared/types/corePersonal';

export function useHousingByWorker(workerId: string | undefined) {
    return useQuery<HousingBenefit[], Error>({
        queryKey: ['housing_benefit', workerId],
        queryFn: () => {
            if (!workerId) throw new Error('workerId is required');
            return getHousingByWorker(workerId);
        },
        enabled: Boolean(workerId),
        staleTime: 5 * 60 * 1000,
    });
}
