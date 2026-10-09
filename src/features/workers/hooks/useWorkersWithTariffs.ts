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

            // Fetch settings and assignments in parallel for the workers on the current page
            const [{ data: settingsData, error: settingsError }, { data: assignmentsData, error: assignmentsError }] = await Promise.all([
                supabase
                    .schema('core_personal')
                    .from('worker_beneficios_settings')
                    .select('*')
                    .in('worker_id', workerIds),
                supabase
                    .schema('core_personal')
                    .from('worker_assignments')
                    .select('worker_id, tarifa_acordada, planned_start_date, created_at')
                    .in('worker_id', workerIds)
                    .not('tarifa_acordada', 'is', null)
                    .order('created_at', { ascending: false })
            ]);

            if (settingsError) {
                console.error("Error fetching benefits settings for tariffs:", settingsError);
            }
            if (assignmentsError) {
                console.error("Error fetching assignments for tariffs:", assignmentsError);
            }

            const mergedData = workers.map(w => {
                const setting = settingsData?.find(s => s.worker_id === w.id);
                const assignment = assignmentsData?.find(a => a.worker_id === w.id);
                
                // Priority: 1) worker_beneficios_settings.tarifa_hora > 0; 2) assignment.tarifa_acordada > 0
                const settingTariff = Number(setting?.tarifa_hora || 0);
                const assignmentTariff = Number(assignment?.tarifa_acordada || 0);
                const effectiveTariff = settingTariff > 0 ? settingTariff : assignmentTariff;

                const finalSetting = setting 
                    ? { ...setting, tarifa_hora: effectiveTariff }
                    : effectiveTariff > 0 
                        ? { worker_id: w.id, tarifa_hora: effectiveTariff } 
                        : null;

                return {
                    ...w,
                    worker_beneficios_settings: finalSetting
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
