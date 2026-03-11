import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { toast } from 'sonner';
import { HOUSING_QUERY_KEY } from './useImportHousing';

export function useDeleteHousingBatch() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (batchId: string) => {
            if (!batchId) throw new Error("ID do Lote inválido.");

            const { error, count } = await supabase
                .schema('core_personal')
                .from('worker_benefit_housing')
                .delete({ count: 'exact' })
                .eq('import_batch_id', batchId);

            if (error) throw new Error(error.message);
            return count;
        },
        onSuccess: (count) => {
            queryClient.invalidateQueries({ queryKey: [HOUSING_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: ['workers_with_housing'] });
            toast.success(`${count || 'Os'} benefícios de moradia foram revertidos com sucesso.`);
        },
        onError: (error: Error) => {
            toast.error(`Erro ao tentar reverter lote: ${error.message}`);
        }
    });
}
