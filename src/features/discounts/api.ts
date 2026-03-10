import { supabase } from '@/shared/supabase/client';
import type { WorkerDiscount, CreateWorkerDiscountInput, UpdateWorkerDiscountInput } from './types';

// Fetch all discounts for a specific worker
export async function fetchWorkerDiscounts(workerId: string): Promise<WorkerDiscount[]> {
    console.log("🔍 [API] FETCH_DISCOUNTS_POR_TRABALHADOR:", workerId);
    console.time(`fetch-discounts-${workerId}`);

    const { data, error } = await supabase
        .from('worker_discounts')
        .select('*')
        .eq('worker_id', workerId)
        .order('reference_date', { ascending: false });

    console.timeEnd(`fetch-discounts-${workerId}`);
    console.log(`🔍 [API] RESULTADO FETCH_DISCOUNTS_POR_TRABALHADOR (${data?.length || 0} rows):`, { data, error });

    if (error) {
        console.error("🔍 [API] ERRO NO FETCH_DISCOUNTS_POR_TRABALHADOR:", error);
        throw error;
    }
    return data as WorkerDiscount[];
}

// Fetch a single discount by ID
export async function fetchDiscountById(id: string): Promise<WorkerDiscount> {
    const { data, error } = await supabase
        .from('worker_discounts')
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data as WorkerDiscount;
}

// Create a new discount
export async function createWorkerDiscount(input: CreateWorkerDiscountInput): Promise<WorkerDiscount> {
    console.log("🔥 [API] INICIANDO INSERT_DISCOUNT COM:", input);

    const { data, error } = await supabase
        .from('worker_discounts')
        .insert([input])
        .select()
        .single();

    console.log("🔥 [API] RESULTADO DO INSERT_DISCOUNT:", { data, error });

    if (error) {
        console.error("🔥 [API] ERRO FATAL INSERT_DISCOUNT:", error);
        throw error;
    }
    return data as WorkerDiscount;
}

// Update an existing discount
export async function updateWorkerDiscount({ id, ...updates }: UpdateWorkerDiscountInput): Promise<WorkerDiscount> {
    console.log("🔥 [API] INICIANDO UPDATE_DISCOUNT ID:", id, "COM:", updates);
    const { data, error } = await supabase
        .from('worker_discounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    console.log("🔥 [API] RESULTADO DO UPDATE_DISCOUNT:", { data, error });

    if (error) throw error;
    return data as WorkerDiscount;
}

// Delete a discount
export async function deleteWorkerDiscount(id: string): Promise<void> {
    const { error } = await supabase
        .from('worker_discounts')
        .delete()
        .eq('id', id);

    if (error) throw error;
}
