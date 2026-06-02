import { useQuery } from '@tanstack/react-query';
import { listSalaryReportWorkers, getSalaryReportKpis, type ListSalaryReportWorkersParams, type SalaryReportKpis, type ListSalaryReportWorkersResponse } from '../api/workersApi';

export function useSalaryReportWorkers(params: ListSalaryReportWorkersParams & { enabled?: boolean }) {
    const { enabled = true, ...restParams } = params;
    return useQuery<ListSalaryReportWorkersResponse, Error>({
        queryKey: [
            'salary-report-workers',
            restParams.empresaId,
            restParams.periodYear,
            restParams.periodMonth,
            restParams.search,
            restParams.contratante,
            restParams.clienteNombre,
            restParams.sortColumn,
            restParams.sortDirection,
            restParams.page,
            restParams.pageSize
        ],
        queryFn: () => listSalaryReportWorkers(restParams),
        enabled: Boolean(restParams.empresaId) && enabled,
        staleTime: 30 * 1000,
    });
}

export function useSalaryReportKpis(params: {
    empresaId: string;
    periodYear: number;
    periodMonth: number;
    search: string | null;
    contratante: string | null;
    clienteNombre: string[] | null;
    enabled?: boolean;
}) {
    const { enabled = true, empresaId, periodYear, periodMonth, search, contratante, clienteNombre } = params;
    return useQuery<SalaryReportKpis, Error>({
        queryKey: [
            'salary-report-kpis',
            empresaId,
            periodYear,
            periodMonth,
            search,
            contratante,
            clienteNombre
        ],
        queryFn: () => getSalaryReportKpis(empresaId, periodYear, periodMonth, search, contratante, clienteNombre),
        enabled: Boolean(empresaId) && enabled,
        staleTime: 30 * 1000,
    });
}
