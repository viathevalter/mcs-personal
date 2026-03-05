import { useQuery } from '@tanstack/react-query';
import { fetchDashboardMetrics, type DashboardMetrics } from '../api/dashboardApi';

export function useDashboardMetrics(empresaId: string, year: number, month: number) {
    return useQuery<DashboardMetrics, Error>({
        queryKey: ['dashboard_metrics', empresaId, year, month],
        queryFn: () => fetchDashboardMetrics(empresaId, year, month),
        enabled: Boolean(empresaId && year && month),
        staleTime: 5 * 60 * 1000 // 5 minutes cache
    });
}
