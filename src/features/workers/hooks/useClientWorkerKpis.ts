import { useQuery } from '@tanstack/react-query';
import { getClientWorkerKpis, type ClientWorkerKpi } from '../api/workersApi';

export function useClientWorkerKpis(
    empresaId: string,
    search: string | null,
    clienteNombre: string[] | null,
    contratante: string | null,
    funcion: string | null
) {
    return useQuery<ClientWorkerKpi, Error>({
        queryKey: ['worker_kpis', empresaId, search, clienteNombre, contratante, funcion],
        queryFn: () => getClientWorkerKpis(empresaId, search, clienteNombre, contratante, funcion),
        enabled: Boolean(empresaId),
        staleTime: 60 * 1000, // 1 minute
    });
}
