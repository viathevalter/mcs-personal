import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { Pedido } from '../types';

interface UsePedidosFilters {
  search?: string;
  client_id?: string;
  commercial_status?: string;
  operational_status?: string;
}

export function usePedidos(filters?: UsePedidosFilters) {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['pedidos', selectedEmpresaId, filters],
    queryFn: async () => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');

      let query = supabase
        .schema('core_comercial')
        .from('pedidos')
        .select('*')
        .eq('empresa_id', selectedEmpresaId)
        .order('created_at', { ascending: false });

      if (filters?.commercial_status && filters.commercial_status !== 'all') {
        query = query.eq('commercial_status', filters.commercial_status);
      }
      if (filters?.operational_status && filters.operational_status !== 'all') {
        query = query.eq('operational_status', filters.operational_status);
      }
      if (filters?.client_id && filters.client_id !== 'all') {
        query = query.eq('client_id', filters.client_id);
      }
      if (filters?.search) {
        query = query.or(`codigo.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      
      console.log('--- DEBUG: usePedidos ---');
      console.log('selectedEmpresaId:', selectedEmpresaId);
      console.log('filtros aplicados:', filters);
      console.log('quantidade de pedidos retornados:', data?.length || 0);
      if (error) console.error('erro Supabase:', error);

      if (error) throw error;
      if (!data || data.length === 0) return { pedidos: [], itemsMap: {} };

      const clientIds = [...new Set(data.map(d => d.client_id).filter(Boolean))];
      const siteIds = [...new Set(data.map(d => d.client_site_id).filter(Boolean))];
      const pedidoIds = data.map(d => d.id);
      
      console.log('IDs de client_id usados na busca:', clientIds);

      const [{ data: clients }, { data: sites }, { data: items }] = await Promise.all([
        clientIds.length > 0 ? supabase.schema('core_common').from('clients').select('id, legal_name, trade_name').in('id', clientIds) : Promise.resolve({ data: [] }),
        siteIds.length > 0 ? supabase.schema('core_common').from('client_sites').select('id, name').in('id', siteIds) : Promise.resolve({ data: [] }),
        pedidoIds.length > 0 ? supabase.schema('core_comercial').from('pedido_items').select('pedido_id, quantity_requested, quantity_fulfilled').in('pedido_id', pedidoIds) : Promise.resolve({ data: [] })
      ]);

      const itemsMap: Record<string, { requested: number; fulfilled: number }> = {};
      
      if (items) {
        items.forEach((item: any) => {
          if (!itemsMap[item.pedido_id]) itemsMap[item.pedido_id] = { requested: 0, fulfilled: 0 };
          itemsMap[item.pedido_id].requested += item.quantity_requested;
          itemsMap[item.pedido_id].fulfilled += item.quantity_fulfilled;
        });
      }

      return {
        pedidos: data.map(pedido => ({
          ...pedido,
          client: clients?.find((c: any) => c.id === pedido.client_id),
          client_site: sites?.find((s: any) => s.id === pedido.client_site_id)
        })) as Pedido[],
        itemsMap
      };
    },
    enabled: !!selectedEmpresaId,
  });
}
