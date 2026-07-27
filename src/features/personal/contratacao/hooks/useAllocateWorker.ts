import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { toast } from 'sonner';

interface AllocateWorkerPayload {
  empresa_id?: string;
  pedido_item_id?: string;
  worker_id?: string;
  worker_name?: string;
  worker_document?: string;
  planned_start_date: string;
  planned_end_date?: string;
  solicitud_id?: string;
  notes?: string;
  camiseta?: string;
  pantalones?: string;
  licencia_conducir?: string;
  movil?: string;
  tarifa_acordada?: number;
}

export const useAllocateWorker = () => {
  const { selectedEmpresaId } = useEmpresa();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AllocateWorkerPayload) => {
      const targetEmpresaId = payload.empresa_id || selectedEmpresaId;
      if (!targetEmpresaId) throw new Error('Nenhuma empresa selecionada');

      const { data, error } = await supabase.schema('core_personal').rpc('alocar_trabalhador_em_vaga', {
        payload: {
          empresa_id: targetEmpresaId,
          ...payload
        }
      });

      if (error) {
        console.error('Erro ao alocar trabalhador:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast.success('Trabalhador alocado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['open_positions'] });
      queryClient.invalidateQueries({ queryKey: ['worker_assignments'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedido_items'] });
      queryClient.invalidateQueries({ queryKey: ['inactive_workers'] });
      queryClient.invalidateQueries({ queryKey: ['active_pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['pedido_allocations'] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao alocar: ${error.message || 'Erro desconhecido'}`);
    }
  });
};
