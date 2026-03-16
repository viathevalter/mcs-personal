import { useQuery } from '@tanstack/react-query';
import { getGlobalWorkerStatusHistory, type MovementHistoryFilters } from '../api/movementHistoryApi';

export function useGlobalMovementHistory(filters: MovementHistoryFilters = {}) {
    return useQuery({
        queryKey: ['globalMovementHistory', filters],
        queryFn: () => getGlobalWorkerStatusHistory(filters),
    });
}
