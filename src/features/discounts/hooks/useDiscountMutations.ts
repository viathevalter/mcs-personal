import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { toast } from 'sonner';
import type { CreateWorkerDiscountInput, UpdateWorkerDiscountInput } from '../types';

export function useCreateDiscount() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: CreateWorkerDiscountInput) => {
            const { data, error } = await supabase
                .from('worker_discounts')
                .insert(input)
                .select()
                .single();

            if (error) throw new Error(error.message);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-worker-discounts'] });
            queryClient.invalidateQueries({ queryKey: ['worker-discounts'] });
            queryClient.invalidateQueries({ queryKey: ['holerite_eventos'] });
            toast.success('Desconto cadastrado com sucesso.');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao cadastrar desconto: ${error.message}`);
        }
    });
}

export function useUpdateDiscount() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...updates }: UpdateWorkerDiscountInput) => {
            const { data, error } = await supabase
                .from('worker_discounts')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw new Error(error.message);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-worker-discounts'] });
            queryClient.invalidateQueries({ queryKey: ['worker-discounts'] });
            queryClient.invalidateQueries({ queryKey: ['holerite_eventos'] });
            toast.success('Desconto atualizado com sucesso.');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao atualizar desconto: ${error.message}`);
        }
    });
}

export function useDeleteDiscount(workerId?: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('worker_discounts')
                .delete()
                .eq('id', id);

            if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-worker-discounts'] });
            queryClient.invalidateQueries({ queryKey: ['worker-discounts'] });
            if (workerId) {
                queryClient.invalidateQueries({ queryKey: ['worker-discounts', workerId] });
            }
            queryClient.invalidateQueries({ queryKey: ['holerite_eventos'] });
            toast.success('Desconto excluído com sucesso.');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao excluir desconto: ${error.message}`);
        }
    });
}

export function useDeleteDiscountBatch() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (batchId: string) => {
            if (!batchId) throw new Error("ID do Lote inválido.");
            const { error, count } = await supabase
                .from('worker_discounts')
                .delete({ count: 'exact' })
                .eq('import_batch_id', batchId);

            if (error) throw new Error(error.message);
            return count;
        },
        onSuccess: (count) => {
            queryClient.invalidateQueries({ queryKey: ['all-worker-discounts'] });
            queryClient.invalidateQueries({ queryKey: ['worker-discounts'] });
            queryClient.invalidateQueries({ queryKey: ['holerite_eventos'] });
            toast.success(`${count || 'Os'} descontos do lote foram revertidos com sucesso.`);
        },
        onError: (error: Error) => {
            toast.error(`Erro ao tentar reverter o lote: ${error.message}`);
        }
    });
}
