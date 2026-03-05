import { useQuery } from '@tanstack/react-query';
import { listWorkers, type ListWorkersParams, type ListWorkersResponse } from '../api/workersApi';

export function useWorkersList(params: ListWorkersParams) {
    return useQuery<ListWorkersResponse, Error>({
        // Include all params in the query key to avoid cache collisions
        queryKey: ['workers', params.empresaId, params.page, params.pageSize, params.search, params.clienteNombre, params.statusTrabajador, params.statusSeguridad, params.contratante, params.funcion, params.sortColumn, params.sortDirection],
        queryFn: () => listWorkers(params),
        enabled: Boolean(params.empresaId), // Only run if empresaId is present
        staleTime: 60 * 1000,
    });
}
