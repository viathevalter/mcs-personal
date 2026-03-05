import { supabase } from '@/shared/supabase/client';
import { mapSupabaseError } from '@/shared/api/supabaseError';
import type { HousingBenefit } from '@/shared/types/corePersonal';

export async function getHousingByWorker(workerId: string): Promise<HousingBenefit[]> {
    const { data, error } = await supabase
        .schema('core_personal').from('worker_benefit_housing')
        .select('*')
        .eq('worker_id', workerId)
        .order('start_date', { ascending: false });

    if (error) {
        throw mapSupabaseError(error);
    }

    return data as HousingBenefit[];
}

export async function upsertHousing(payload: Partial<HousingBenefit> & { worker_id: string; empresa_id: string }): Promise<HousingBenefit> {
    const { data, error } = await supabase
        .schema('core_personal').from('worker_benefit_housing')
        .upsert(payload)
        .select('*')
        .single();

    if (error) {
        throw mapSupabaseError(error);
    }

    return data as HousingBenefit;
}

export async function deleteHousing(id: string): Promise<void> {
    const { error } = await supabase
        .schema('core_personal').from('worker_benefit_housing')
        .delete()
        .eq('id', id);

    if (error) {
        throw mapSupabaseError(error);
    }
}
