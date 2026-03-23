import { supabase } from '@/shared/supabase/client';

export interface UpsertBankAccountInput {
    worker_id: string;
    banco: string | null;
    iban: string | null;
    observacoes?: string | null;
    import_batch_id: string | null;
}

export const upsertWorkerBankBatch = async (payloads: UpsertBankAccountInput[]): Promise<void> => {
    if (!payloads.length) return;
    
    // Extract unique worker IDs to deactivate their current active IBANs
    const workerIds = [...new Set(payloads.map(p => p.worker_id))];
    
    // First, set all currently ATIVO ibans for these workers to INATIVO
    await supabase
        .schema('core_personal')
        .from('worker_ibans')
        .update({ status: 'INATIVO' })
        .eq('status', 'ATIVO')
        .in('worker_id', workerIds);

    // Then, insert the new ones
    const inserts = payloads.map(p => ({
        worker_id: p.worker_id,
        banco: p.banco,
        iban: p.iban,
        status: 'ATIVO',
        observacoes: p.observacoes || null,
        // Since we removed import_batch_id from the db schema, we store it in observacoes or omit. 
        // We'll just omit it, relying on created_at for history logic.
    }));

    const { error } = await supabase
        .schema('core_personal')
        .from('worker_ibans')
        .insert(inserts);

    if (error) {
        console.error('Error inserting bank accounts batch:', error);
        throw error;
    }
};

export const deleteBankBatch = async (batchId: string): Promise<void> => {
    // Rather than deleting the row (which might contain other settings),
    // we should simply nullify the bank fields for the given import_batch_id.
    // This is safer if worker_beneficios_settings contains other unrelated data.
    const { error } = await supabase
        .schema('core_personal')
        .from('worker_beneficios_settings')
        .update({
            banco: null,
            iban: null,
            import_batch_id: null
        })
        .eq('import_batch_id', batchId);

    if (error) {
        console.error('Error reverting bank accounts batch:', error);
        throw error;
    }
};
