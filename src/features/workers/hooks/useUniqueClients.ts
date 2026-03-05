import { useQuery } from '@tanstack/react-query';
import { getUniqueClients } from '../api/workersApi';

export function useUniqueClients() {
    return useQuery<string[], Error>({
        queryKey: ['unique_clients'],
        queryFn: getUniqueClients,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}
