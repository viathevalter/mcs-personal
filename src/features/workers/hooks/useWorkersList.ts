import { useQuery } from '@tanstack/react-query';
import { listWorkers, type ListWorkersResponse } from '../api/workersApi';

export function useWorkersList(params: {
    empresaId: string;
    search?: string;
    clienteNombre?: string[];
    statusTrabajador?: string[];
    statusSeguridad?: string[];
    contratante?: string;
    funcion?: string;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
    page: number;
    pageSize: number;
}) {
    return useQuery<ListWorkersResponse, Error>({
        // Include all params in the query key to avoid cache collisions
        queryKey: ['workers', params.empresaId, params.page, params.pageSize, params.search, params.clienteNombre, params.statusTrabajador, params.statusSeguridad, params.contratante, params.funcion, params.sortColumn, params.sortDirection],
        queryFn: () => listWorkers(params as any),
        enabled: Boolean(params.empresaId),
        staleTime: 60 * 1000,
    });
}
