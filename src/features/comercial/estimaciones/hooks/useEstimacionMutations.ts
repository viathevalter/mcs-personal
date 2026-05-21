import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { toast } from 'sonner';

export function useEstimacionMutations() {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();

  const aprovarEstimacion = useMutation({
    mutationFn: async (estimacionId: string) => {
      const { data, error } = await supabase.schema('core_comercial').rpc('aprovar_estimacion', {
        p_estimacion_id: estimacionId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any, estimacionId) => {
      toast.success('Estimación Aprovada e Convertida!', { 
        description: `Pedido ${data?.pedido_codigo || ''} gerado com sucesso.` 
      });
      queryClient.invalidateQueries({ queryKey: ['estimaciones', selectedEmpresaId] });
      queryClient.invalidateQueries({ queryKey: ['estimacion-detail', selectedEmpresaId, estimacionId] });
    },
    onError: (error: any) => {
      console.error(error);
      toast.error('Erro ao aprovar estimación', { description: error.message });
    },
  });

  const criarEstimacion = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.schema('core_comercial').rpc('criar_estimacion_completa', {
        p_payload: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Estimación criada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['estimaciones', selectedEmpresaId] });
    },
    onError: (error: any) => {
      console.error(error);
      toast.error('Erro ao criar estimación', { description: error.message });
    },
  });

  return {
    aprovarEstimacion,
    criarEstimacion,
  };
}
