import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { Pedido, PedidoItem } from '../types';

export function usePedidoDetail(pedidoId: string | undefined) {
  return useQuery({
    queryKey: ['pedido', pedidoId],
    queryFn: async () => {
      if (!pedidoId) throw new Error('Pedido não selecionado');

      // Fetch pedido by unique ID
      const { data: pedido, error: pedidoError } = await supabase
        .schema('core_comercial')
        .from('pedidos')
        .select('*')
        .eq('id', pedidoId)
        .maybeSingle();

      if (pedidoError) throw pedidoError;
      if (!pedido) throw new Error('Pedido não encontrado.');

      // Fetch related common data
      const [{ data: client }, { data: site }] = await Promise.all([
        supabase.schema('core_common').from('clients').select('id, legal_name, trade_name').eq('id', pedido.client_id).maybeSingle(),
        supabase.schema('core_common').from('client_sites').select('id, name, address_line, city, postal_code, province, contact_name, contact_phone, contact_email, notes').eq('id', pedido.client_site_id).maybeSingle()
      ]);

      // Fetch items
      const { data: items, error: itemsError } = await supabase
        .schema('core_comercial')
        .from('pedido_items')
        .select(`
          *,
          job_function:job_functions(name)
        `)
        .eq('pedido_id', pedidoId)
        .order('created_at', { ascending: true });

      if (itemsError) throw itemsError;
      
      const mappedItems = (items || []).map((item: any) => ({
        ...item,
        includes_accommodation_snapshot: !!item.includes_housing,
        includes_transport_snapshot: !!item.includes_transport,
        includes_ppe_snapshot: !!item.includes_epi,
        item_status: item.status === 'pending' ? 'pending_fulfillment' : item.status
      }));

      return {
        pedido: {
          ...pedido,
          client: client || undefined,
          client_site: site || undefined
        } as Pedido,
        items: mappedItems as PedidoItem[]
      };
    },
    enabled: !!pedidoId,
  });
}
