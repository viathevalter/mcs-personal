import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { fetchAllPages, fetchInChunks } from '@/shared/supabase/pagination';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { Pedido } from '../types';

interface UsePedidosFilters {
  search?: string;
  client_id?: string;
  commercial_status?: string;
  operational_status?: string;
  empresa_id?: string;
}

export function usePedidos(filters?: UsePedidosFilters) {
  const { selectedEmpresaId, activeEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['pedidos', selectedEmpresaId, activeEmpresaId, filters],
    queryFn: async () => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');

      const data = await fetchAllPages<any>((from, to) => {
        let query = supabase
          .schema('core_comercial')
          .from('pedidos')
          .select('*')
          .order('created_at', { ascending: false });

        if (filters?.empresa_id && filters.empresa_id !== 'all') {
          query = query.eq('empresa_id', filters.empresa_id);
        } else if (activeEmpresaId) {
          query = query.eq('empresa_id', activeEmpresaId);
        }

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

        return query.range(from, to);
      });

      if (!data || data.length === 0) return { pedidos: [], itemsMap: {} };

      const clientIds = [...new Set(data.map(d => d.client_id).filter(Boolean))];
      const siteIds = [...new Set(data.map(d => d.client_site_id).filter(Boolean))];
      const empresaIds = [...new Set(data.map(d => d.empresa_id).filter(Boolean))];
      const pedidoIds = data.map(d => d.id);

      const [clients, sites, items, empresas] = await Promise.all([
        fetchInChunks<any>(clientIds, chunk =>
          supabase.schema('core_common').from('clients').select('id, legal_name, trade_name').in('id', chunk)
        ),
        fetchInChunks<any>(siteIds, chunk =>
          supabase.schema('core_common').from('client_sites').select('id, name').in('id', chunk)
        ),
        fetchInChunks<any>(pedidoIds, chunk =>
          supabase.schema('core_comercial').from('pedido_items').select('pedido_id, quantity_requested, quantity_fulfilled').in('pedido_id', chunk)
        ),
        fetchInChunks<any>(empresaIds, chunk =>
          supabase.schema('core_common').from('empresas').select('id, nome, trade_name, legal_name').in('id', chunk)
        )
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
          client_site: sites?.find((s: any) => s.id === pedido.client_site_id),
          empresa: empresas?.find((e: any) => e.id === pedido.empresa_id)
        })) as Pedido[],
        itemsMap
      };
    },
    enabled: !!selectedEmpresaId,
  });
}
