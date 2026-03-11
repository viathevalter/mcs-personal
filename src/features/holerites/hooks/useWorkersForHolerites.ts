import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import type { Worker } from '@/shared/types/corePersonal';
import { listWorkers } from '@/features/workers/api/workersApi';

export const WORKERS_HOLERITES_QUERY_KEY = 'workers_holerites';

export function useWorkersForHolerites(empresaId: string | undefined) {
    return useQuery({
        queryKey: [WORKERS_HOLERITES_QUERY_KEY, empresaId],
        queryFn: async () => {
            if (!empresaId) return [];

            // The search_workers RPC is capped at 1000 results internally, so we must paginate to get all workers.
            let allWorkersData: any[] = [];
            let currentPage = 1;
            const pageSize = 1000;
            let hasMore = true;

            while (hasMore) {
                const workersResponse = await listWorkers({
                    empresaId,
                    statusTrabajador: ['ativos', 'pendientes_ingreso'],
                    page: currentPage,
                    pageSize: pageSize,
                    sortColumn: 'nome',
                    sortDirection: 'asc'
                });

                const pageData = workersResponse.data.filter(w => w.nome && w.nome.trim() !== '');
                allWorkersData = [...allWorkersData, ...pageData];

                if (workersResponse.data.length < pageSize) {
                    hasMore = false;
                } else {
                    currentPage++;
                }
            }

            if (!allWorkersData || allWorkersData.length === 0) return [];

            const workerIds = allWorkersData.map(w => w.id).filter(Boolean);

            if (workerIds.length === 0) return allWorkersData as (Worker & { worker_beneficios_settings?: any })[];

            // Fetch settings in chunks to avoid URL length limit (414)
            const chunkSize = 150;
            const settingsData: any[] = [];
            
            for (let i = 0; i < workerIds.length; i += chunkSize) {
                const chunk = workerIds.slice(i, i + chunkSize);
                const { data, error } = await supabase
                    .schema('core_personal')
                    .from('worker_beneficios_settings')
                    .select('*')
                    .in('worker_id', chunk);

                if (error) {
                    console.error("Error fetching benefits settings for holerites (chunk):", error);
                    // Não bloquear a listagem de folha por causa do fallback default de tarifa_hora
                }
                
                if (data) {
                    settingsData.push(...data);
                }
            }

            const mergedData = allWorkersData.map(w => {
                const setting = settingsData?.find(s => s.worker_id === w.id);
                return {
                    ...w,
                    worker_beneficios_settings: setting || null
                };
            });

            return mergedData as (Worker & { worker_beneficios_settings?: any })[];
        },
        enabled: Boolean(empresaId),
        refetchOnWindowFocus: false,
    });
}
