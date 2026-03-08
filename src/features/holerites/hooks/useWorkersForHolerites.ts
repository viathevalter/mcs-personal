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

            // Fetch workers using the API that correctly maps cliente_nombre and contratante
            const workersResponse = await listWorkers({
                empresaId,
                statusTrabajador: ['ativos', 'pendientes_ingreso'],
                page: 1,
                pageSize: 10000, // Retrieve all relevant workers
                sortColumn: 'nome',
                sortDirection: 'asc'
            });

            const workersData = workersResponse.data.filter(w => w.nome && w.nome.trim() !== '');

            if (!workersData || workersData.length === 0) return [];

            const workerIds = workersData.map(w => w.id).filter(Boolean);

            if (workerIds.length === 0) return workersData as (Worker & { worker_beneficios_settings?: any })[];

            const { data: settingsData, error: settingsError } = await supabase
                .schema('core_personal')
                .from('worker_beneficios_settings')
                .select('*')
                .in('worker_id', workerIds);

            if (settingsError) {
                console.error("Error fetching benefits settings for holerites:", settingsError);
                // Não bloquear a listagem de folha por causa do fallback default de tarifa_hora
            }

            const mergedData = workersData.map(w => {
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
