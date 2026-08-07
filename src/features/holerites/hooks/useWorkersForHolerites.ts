import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import type { Worker } from '@/shared/types/corePersonal';

export const WORKERS_HOLERITES_QUERY_KEY = 'workers_holerites';

export function useWorkersForHolerites(empresaId: string | undefined) {
    return useQuery({
        queryKey: [WORKERS_HOLERITES_QUERY_KEY, empresaId || 'all'],
        queryFn: async () => {
            // Direct query on core_personal.workers to fetch ALL workers (both active and inactive who worked during the period)
            const { data: rawWorkers, error } = await supabase
                .schema('core_personal')
                .from('workers')
                .select('*')
                .order('nome', { ascending: true });

            if (error) {
                console.error("Error fetching workers for holerites:", error);
                throw error;
            }

            if (!rawWorkers || rawWorkers.length === 0) return [];

            // Filter out empty names and map `cliente` to `cliente_nombre` for compatibility
            const allWorkersData = rawWorkers
                .filter(w => w.nome && w.nome.trim() !== '')
                .map(w => ({
                    ...w,
                    cliente_nombre: w.cliente || w.cliente_nombre || null
                }));

            const workerIds = allWorkersData.map(w => w.id).filter(Boolean);

            if (workerIds.length === 0) return allWorkersData as (Worker & { worker_beneficios_settings?: any })[];

            // Fetch settings in chunks to avoid URL length limit (414)
            const chunkSize = 150;
            const settingsMap = new Map<string, any>();

            for (let i = 0; i < workerIds.length; i += chunkSize) {
                const chunk = workerIds.slice(i, i + chunkSize);
                const { data: settings, error: settingsError } = await supabase
                    .schema('core_personal')
                    .from('worker_beneficios_settings')
                    .select('*')
                    .in('worker_id', chunk);

                if (settingsError) {
                    console.error("Error fetching benefits settings for holerites (chunk):", settingsError);
                } else if (settings) {
                    settings.forEach(s => settingsMap.set(s.worker_id, s));
                }
            }

            return allWorkersData.map(w => ({
                ...w,
                worker_beneficios_settings: settingsMap.get(w.id) || null
            })) as (Worker & { worker_beneficios_settings?: any })[];
        },
        staleTime: 60 * 1000,
    });
}
