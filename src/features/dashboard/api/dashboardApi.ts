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
        const { count: total, error: errTotal } = await supaClient
            .schema('core_personal')
            .from('workers')
            .select('*', { count: 'exact', head: true })
            .eq('empresa_id', empresaId);

        if (errTotal) console.error("Error fetching total workers:", errTotal);

        // Query active workers
        const { count: active, error: errActive } = await supaClient
            .schema('core_personal')
            .from('workers')
            .select('*', { count: 'exact', head: true })
            .eq('empresa_id', empresaId)
            .eq('status_trabajador', 'Ativo');
			
        if (errActive) console.error("Error fetching active workers:", errActive);

        // Query workers in regularization
        const { count: regularization, error: errReg } = await supaClient
            .schema('core_personal')
            .from('workers')
            .select('*', { count: 'exact', head: true })
            .eq('empresa_id', empresaId)
            .ilike('status_seguridad', '%Em Regularização%');
			
        if (errReg) console.error("Error fetching regularization workers:", errReg);

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
