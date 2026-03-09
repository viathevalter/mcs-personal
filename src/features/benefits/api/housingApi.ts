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

export async function getWorkersWithHousing(empresaId: string): Promise<import('@/shared/types/corePersonal').WorkerWithHousing[]> {
    // 1. Fetch all workers using search_workers RPC to get accurate cliente_nombre and contratante
    const { data: allWorkers, error: workersError } = await supabase.schema('core_personal').rpc('search_workers', {
        p_empresa_id: empresaId,
        p_page: 1,
        p_page_size: 999999 // Fetch all to filter locally
    });

    if (workersError) {
        throw mapSupabaseError(workersError);
    }

    // 2. Fetch all housing benefits for this company
    const { data: housingBenefits, error: housingError } = await supabase
        .schema('core_personal').from('worker_benefit_housing')
        .select('*')
        .eq('empresa_id', empresaId);

    if (housingError) {
        throw mapSupabaseError(housingError);
    }

    const housingMap = new Map();
    housingBenefits?.forEach(h => {
        // Just take the first/active one if there are multiple
        if (!housingMap.has(h.worker_id)) {
            housingMap.set(h.worker_id, h);
        }
    });

    // 3. Filter workers: only those WITH a housing benefit and WITH a valid name
    const workersWithHousing = (allWorkers || [])
        .filter((w: any) => housingMap.has(w.id) && w.nome && w.nome.trim() !== '')
        .map((worker: any) => ({
            ...worker,
            housing_benefit: housingMap.get(worker.id)
        }));

    return workersWithHousing;
}
