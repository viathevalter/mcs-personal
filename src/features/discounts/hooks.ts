import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWorkerDiscounts, createWorkerDiscount, updateWorkerDiscount, deleteWorkerDiscount } from './api';
import type { CreateWorkerDiscountInput, UpdateWorkerDiscountInput } from './types';

export function useWorkerDiscounts(workerId: string) {
    return useQuery({
        queryKey: ['worker-discounts', workerId],
        queryFn: () => fetchWorkerDiscounts(workerId),
        enabled: !!workerId,
    });
}

export function useCreateDiscount() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: CreateWorkerDiscountInput) => createWorkerDiscount(input),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['worker-discounts', variables.worker_id] });
        },
    });
}

export function useUpdateDiscount() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (input: UpdateWorkerDiscountInput) => updateWorkerDiscount(input),
        onSuccess: (data) => {
            // Invalidate both the list and the specific worker's discounts
            if (data?.worker_id) {
                queryClient.invalidateQueries({ queryKey: ['worker-discounts', data.worker_id] });
            }
        },
    });
}

export function useDeleteDiscount(workerId: string) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteWorkerDiscount,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['worker-discounts', workerId] });
        },
    });
}
