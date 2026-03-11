import { supabase } from '@/shared/supabase/client';

export interface UpsertBankAccountInput {
    worker_id: string;
    banco: string | null;
    iban: string | null;
    import_batch_id: string | null;
}

export const upsertWorkerBankBatch = async (payloads: UpsertBankAccountInput[]): Promise<void> => {
    // Supabase upsert on table 'worker_beneficios_settings'
    // This table assumes worker_id is the primary key or unique identifier for the settings
    const { error } = await supabase
        .schema('core_personal')
        .from('worker_beneficios_settings')
        .upsert(payloads, { onConflict: 'worker_id' });

    if (error) {
        console.error('Error upserting bank accounts batch:', error);
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
