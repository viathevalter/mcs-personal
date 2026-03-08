import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { HOLERITE_EVENTOS_QUERY_KEY } from './useHoleriteEventos';

export function useDeleteHoleriteEvento() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (eventoId: string) => {
            const { error } = await supabase
                .schema('core_personal')
                .from('holerite_eventos')
                .delete()
                .eq('id', eventoId);

            if (error) {
                console.error("Error deleting holerite evento:", error);
                throw error;
            }
        },
        onSuccess: () => {
            // Invalidate the generic key, as we don't necessarily have the mes_referencia here
            // It will refetch whatever the current active month is.
            queryClient.invalidateQueries({
                queryKey: [HOLERITE_EVENTOS_QUERY_KEY],
            });
        },
    });
}
