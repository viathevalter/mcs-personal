import { supabase as supaClient } from '@/shared/supabase/client';

export interface DashboardMetrics {
    total_workers: number;
    active_workers: number;
    regularization_workers: number;
}

export async function fetchDashboardMetrics(empresaId: string, _year: number, _month: number): Promise<DashboardMetrics> {
    if (!empresaId) return { total_workers: 0, active_workers: 0, regularization_workers: 0 };

    try {
        // 1. Total workers
        const { data: totalData, error: errTotal } = await supaClient
            .schema('core_personal')
            .rpc('search_workers', {
                p_empresa_id: empresaId,
                p_page: 1,
                p_page_size: 1
            });

        if (errTotal) console.error("Error fetching total workers:", errTotal);
        const total = totalData && totalData.length > 0 ? Number(totalData[0].total_count) : 0;

        // 2. Active workers
        const { data: activeData, error: errActive } = await supaClient
            .schema('core_personal')
            .rpc('search_workers', {
                p_empresa_id: empresaId,
                p_status_trabajador_filter: ['ativos'],
                p_page: 1,
                p_page_size: 1
            });
			
        if (errActive) console.error("Error fetching active workers:", errActive);
        const active = activeData && activeData.length > 0 ? Number(activeData[0].total_count) : 0;

        // 3. Workers in regularization
        const { data: regData, error: errReg } = await supaClient
            .schema('core_personal')
            .rpc('search_workers', {
                p_empresa_id: empresaId,
                p_status_seguridad_filter: ['em_regularizacao'],
                p_page: 1,
                p_page_size: 1
            });
			
        if (errReg) console.error("Error fetching regularization workers:", errReg);
        const regularization = regData && regData.length > 0 ? Number(regData[0].total_count) : 0;

        return {
            total_workers: total,
            active_workers: active,
            regularization_workers: regularization
        };
    } catch (error) {
        console.error("Erro ao carregar métricas reais:", error);
        return { total_workers: 0, active_workers: 0, regularization_workers: 0 };
    }
}
