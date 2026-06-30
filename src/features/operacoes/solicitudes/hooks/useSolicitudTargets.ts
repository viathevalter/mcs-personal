import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';

export function useSolicitudTargets(solicitudId: string | undefined) {
    return useQuery({
        queryKey: ['solicitud-targets', solicitudId],
        queryFn: async () => {
            if (!solicitudId) return [];

            const { data, error } = await supabase
                .schema('core_operacoes')
                .from('solicitud_targets')
                .select(`
                    *,
                    source_worker:workers!solicitud_targets_source_worker_id_fkey(id, nome, cod_colab),
                    source_pedido:pedidos!solicitud_targets_source_pedido_id_fkey(id, codigo),
                    source_client:clients!solicitud_targets_source_client_id_fkey(id, trade_name, legal_name),
                    source_site:client_sites!solicitud_targets_source_client_site_id_fkey(id, name),
                    target_client:clients!solicitud_targets_target_client_id_fkey(id, trade_name, legal_name),
                    target_site:client_sites!solicitud_targets_target_client_site_id_fkey(id, name)
                `)
                .eq('solicitud_id', solicitudId);

            if (error) throw error;
            return data as unknown as any[];
        },
        enabled: !!solicitudId,
    });
}
