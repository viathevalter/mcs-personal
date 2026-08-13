import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';

export interface TimelineEvent {
  id: string;
  source: 'pedido_event' | 'pedido_status' | 'solicitud_timeline';
  title: string;
  description: string;
  actor_name: string;
  created_at: string;
  metadata?: any;
}

export function usePedidoTimeline(pedidoId: string | undefined, solicitudIds: string[]) {
  return useQuery({
    queryKey: ['pedidoTimeline', pedidoId, solicitudIds],
    queryFn: async () => {
      if (!pedidoId) return [];

      const promises = [
        supabase
          .schema('core_comercial')
          .from('pedido_events')
          .select('*')
          .eq('pedido_id', pedidoId),
        
        supabase
          .schema('core_comercial')
          .from('pedido_status_history')
          .select('*')
          .eq('pedido_id', pedidoId),
      ];

      if (solicitudIds.length > 0) {
        promises.push(
          supabase
            .schema('core_operacoes')
            .from('solicitud_timeline')
            .select('*')
            .in('solicitud_id', solicitudIds)
        );
      }

      const results = await Promise.all(promises);
      const allEvents: TimelineEvent[] = [];

      // Process pedido_events
      if (results[0].data) {
        results[0].data.forEach((evt: any) => {
          allEvents.push({
            id: evt.id,
            source: 'pedido_event',
            title: `Evento: ${evt.event_type}`,
            description: evt.description || '',
            actor_name: evt.actor?.raw_user_meta_data?.full_name || 'Sistema',
            created_at: evt.created_at,
            metadata: evt.metadata
          });
        });
      }

      // Process pedido_status_history
      if (results[1].data) {
        results[1].data.forEach((st: any) => {
          allEvents.push({
            id: st.id,
            source: 'pedido_status',
            title: 'Mudança de Status Comercial',
            description: `De ${st.previous_status || 'N/A'} para ${st.new_status}`,
            actor_name: st.actor?.raw_user_meta_data?.full_name || 'Sistema',
            created_at: st.created_at
          });
        });
      }

      // Process solicitud_timeline
      if (results.length > 2 && results[2].data) {
        results[2].data.forEach((st: any) => {
          allEvents.push({
            id: st.id,
            source: 'solicitud_timeline',
            title: `Solicitud Event: ${st.event_type}`,
            description: st.description || '',
            actor_name: st.actor?.raw_user_meta_data?.full_name || 'Sistema',
            created_at: st.created_at,
            metadata: st.metadata
          });
        });
      }

      // Sort by created_at desc (newest first)
      return allEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!pedidoId,
  });
}
