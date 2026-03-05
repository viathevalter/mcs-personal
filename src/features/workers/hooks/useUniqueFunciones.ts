import { useQuery } from '@tanstack/react-query';
import { getUniqueFunciones } from '../api/workersApi';

export function useUniqueFunciones() {
    return useQuery<string[], Error>({
        queryKey: ['uniqueFunciones'],
        queryFn: getUniqueFunciones,
        staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    });
}
