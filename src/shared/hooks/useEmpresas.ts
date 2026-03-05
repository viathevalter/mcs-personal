import { useQuery } from '@tanstack/react-query';
import { listEmpresas } from '../api/coreCommonApi';
import type { Empresa } from '../types/coreCommon';

export function useEmpresas() {
    return useQuery<Empresa[], Error>({
        queryKey: ['empresas'],
        queryFn: listEmpresas,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}
