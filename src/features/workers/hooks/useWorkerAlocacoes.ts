import { useQuery } from '@tanstack/react-query';
import { getWorkerAlocacoes } from '../api/workersApi';
import type { WorkerAlocacao } from '../api/workersApi';

export function useWorkerAlocacoes(workerCodColab: string) {
    return useQuery<WorkerAlocacao[], Error>({
        queryKey: ['worker-alocacoes', workerCodColab],
        queryFn: () => getWorkerAlocacoes(workerCodColab),
        enabled: Boolean(workerCodColab),
        staleTime: 5 * 60 * 1000,
    });
}
