import { supabase as supaClient } from '@/shared/supabase/client';

export interface DashboardMetrics {
    total_workers: number;
    active_workers: number;
    regularization_workers: number;
}

export async function fetchDashboardMetrics(empresaId: string, _year: number, _month: number): Promise<DashboardMetrics> {
    if (!empresaId) return { total_workers: 0, active_workers: 0, regularization_workers: 0 };

    try {
        // Query total workers
        const { count: total } = await supaClient
            .from('workers')
            .select('*', { count: 'exact', head: true })
            .eq('empresa_id', empresaId);

        // Query active workers
        const { count: active } = await supaClient
            .from('workers')
            .select('*', { count: 'exact', head: true })
            .eq('empresa_id', empresaId)
            .eq('status_trabajador', 'Ativo');

        // Query workers in regularization
        const { count: regularization } = await supaClient
            .from('workers')
            .select('*', { count: 'exact', head: true })
            .eq('empresa_id', empresaId)
            .ilike('status_seguridad', '%Em Regularização%');

        return {
            total_workers: total || 0,
            active_workers: active || 0,
            regularization_workers: regularization || 0
        };
    } catch (error) {
        console.error("Erro ao carregar métricas reais:", error);
        return { total_workers: 0, active_workers: 0, regularization_workers: 0 };
    }
}
