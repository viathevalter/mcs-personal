import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { listWorkers } from '../api/workersApi';
import type { Worker } from '@/shared/types/corePersonal';

export function useWorkersWithTariffs(params: {
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
    return useQuery({
        queryKey: [
            'workers-tariffs', 
            params.empresaId, 
            params.page, 
            params.pageSize, 
            params.search, 
            params.clienteNombre, 
            params.statusTrabajador, 
            params.statusSeguridad, 
            params.contratante, 
            params.funcion, 
            params.sortColumn, 
            params.sortDirection
        ],
        queryFn: async () => {
            const response = await listWorkers({
                ...params,
                empresaId: params.empresaId || ''
            } as any);
            const workers = response.data;
            const count = response.count;

            if (!workers || workers.length === 0) return { data: [], count };

            const workerIds = workers.map(w => w.id).filter(Boolean);

            if (workerIds.length === 0) return { data: workers as any[], count };

            // Fetch settings for the workers on the current page
            const { data: settingsData, error } = await supabase
                .schema('core_personal')
                .from('worker_beneficios_settings')
                .select('*')
                .in('worker_id', workerIds);

            if (error) {
                console.error("Error fetching benefits settings for tariffs:", error);
            }

            const mergedData = workers.map(w => {
                const setting = settingsData?.find(s => s.worker_id === w.id);
                return {
                    ...w,
                    worker_beneficios_settings: setting || null
                };
            });

            return {
                data: mergedData as (Worker & { worker_beneficios_settings?: any })[],
                count
            };
        },
        enabled: Boolean(params.empresaId),
        refetchOnWindowFocus: false,
    });
}
