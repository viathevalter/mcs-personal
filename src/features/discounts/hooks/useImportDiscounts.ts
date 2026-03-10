import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { toast } from 'sonner';
import type { CreateWorkerDiscountInput } from '../types';

export function useImportDiscounts() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (payloads: CreateWorkerDiscountInput[]) => {
            if (!payloads.length) return;

            // Using insert for bulk inserting discounts
            const { error } = await supabase
                .from('worker_discounts')
                .insert(payloads);

            if (error) {
                console.error('Error importing discounts:', error);
                throw new Error(`Falha ao importar ${payloads.length} descontos: ${error.message}`);
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['all-worker-discounts'] });
            queryClient.invalidateQueries({ queryKey: ['worker-discounts'] });
            toast.success(`Descontos importados com sucesso (${variables.length} registros).`);
        },
        onError: (error: any) => {
            toast.error(error.message || 'Erro ao importar descontos.');
        }
    });
}
