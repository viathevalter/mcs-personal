import { useQuery } from '@tanstack/react-query';
import { getWorkersWithHousing } from '../api/housingApi';
import type { WorkerWithHousing } from '@/shared/types/corePersonal';

export function useWorkersWithHousing(empresaId: string | undefined) {
    return useQuery<WorkerWithHousing[], Error>({
        queryKey: ['workers_with_housing', empresaId],
        queryFn: () => {
            if (!empresaId) throw new Error('empresaId is required');
            return getWorkersWithHousing(empresaId);
        },
        enabled: Boolean(empresaId),
        staleTime: 5 * 60 * 1000,
    });
}
