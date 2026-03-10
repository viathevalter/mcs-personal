import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { toast } from 'sonner';
import { HOLERITE_EVENTOS_QUERY_KEY } from './useHoleriteEventos';

export function useDeleteHorasBatch() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (batchId: string) => {
            if (!batchId) throw new Error("ID do Lote inválido.");

            // Reverter as horas significa deletar eventos da categoria 'total_horas' gerados nessa importação
            const { error, count } = await supabase
                .schema('core_personal')
                .from('holerite_eventos')
                .delete({ count: 'exact' })
                .eq('import_batch_id', batchId)
                .eq('categoria', 'total_horas');

            if (error) throw new Error(error.message);
            return count;
        },
        onSuccess: (count) => {
            queryClient.invalidateQueries({ queryKey: [HOLERITE_EVENTOS_QUERY_KEY] });
            toast.success(`${count || 'Os'} registros de horas foram revertidos com sucesso.`);
        },
        onError: (error: Error) => {
            toast.error(`Erro ao tentar reverter horas: ${error.message}`);
        }
    });
}
