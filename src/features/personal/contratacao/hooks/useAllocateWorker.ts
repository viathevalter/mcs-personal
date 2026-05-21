import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { toast } from 'sonner';

interface AllocateWorkerPayload {
  pedido_item_id: string;
  worker_id?: string;
  worker_name?: string;
  worker_document?: string;
  planned_start_date: string;
  solicitud_id?: string;
  notes?: string;
}

export const useAllocateWorker = () => {
  const { selectedEmpresaId } = useEmpresa();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AllocateWorkerPayload) => {
      if (!selectedEmpresaId) throw new Error('Nenhuma empresa selecionada');

      const { data, error } = await supabase.schema('core_personal').rpc('alocar_trabalhador_em_vaga', {
        payload: {
          empresa_id: selectedEmpresaId,
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
    },
    onError: (error: any) => {
      toast.error(`Erro ao alocar: ${error.message || 'Erro desconhecido'}`);
    }
  });
};
