import { supabase } from '@/shared/supabase/client';
import type { WorkerDiscount, CreateWorkerDiscountInput, UpdateWorkerDiscountInput } from './types';

// Fetch all discounts for a specific worker
export async function fetchWorkerDiscounts(workerId: string): Promise<WorkerDiscount[]> {
    const { data, error } = await supabase
        .from('worker_discounts')
        .select('*')
        .eq('worker_id', workerId)
        .order('reference_date', { ascending: false });

    if (error) throw error;
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
    const { data, error } = await supabase
        .from('worker_discounts')
        .insert([input])
        .select()
        .single();

    if (error) throw error;
    return data as WorkerDiscount;
}

// Update an existing discount
export async function updateWorkerDiscount({ id, ...updates }: UpdateWorkerDiscountInput): Promise<WorkerDiscount> {
    const { data, error } = await supabase
        .from('worker_discounts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

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
