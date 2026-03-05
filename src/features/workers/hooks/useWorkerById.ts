import { useQuery } from '@tanstack/react-query';
import { getWorker } from '../api/workersApi';
import type { Worker } from '@/shared/types/corePersonal';

export function useWorkerById(workerId: string | undefined) {
    return useQuery<Worker | null, Error>({
        queryKey: ['worker', workerId],
        queryFn: () => {
            if (!workerId || workerId === 'new') throw new Error('Invalid Worker ID');
            return getWorker(workerId);
        },
        enabled: Boolean(workerId && workerId !== 'new'),
        staleTime: 5 * 60 * 1000,
    });
}
