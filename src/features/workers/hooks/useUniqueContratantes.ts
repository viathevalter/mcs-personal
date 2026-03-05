import { useQuery } from '@tanstack/react-query';
import { getUniqueContratantes } from '../api/workersApi';

export function useUniqueContratantes() {
    return useQuery<string[], Error>({
        queryKey: ['uniqueContratantes'],
        queryFn: getUniqueContratantes,
        staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    });
}
