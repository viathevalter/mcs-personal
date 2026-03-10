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
    try {
        // 1. Fetch all housing benefits for this company (Usually a small list)
        const { data: housingBenefits, error: housingError } = await supabase
            .schema('core_personal')
            .from('worker_benefit_housing')
            .select('*')
            .eq('empresa_id', empresaId);

        if (housingError) {
            throw mapSupabaseError(housingError);
        }

        if (!housingBenefits || housingBenefits.length === 0) {
            return [];
        }

        const housingMap = new Map();
        const workerIds: string[] = [];

        housingBenefits.forEach(h => {
            if (!housingMap.has(h.worker_id)) {
                housingMap.set(h.worker_id, h);
                workerIds.push(h.worker_id);
            }
        });

        // 2. Fetch specific workers bypassing the PostgREST 1000-row limit
        const { data: workersData, error: workersError } = await supabase
            .schema('core_personal')
            .from('workers')
            .select('*')
            .in('id', workerIds);

        if (workersError) {
            throw mapSupabaseError(workersError);
        }

        const codColabs = (workersData || []).map(w => w.cod_colab).filter(Boolean);

        // 2.5 Fetch 'colaboradores' manually since PostgREST might lack the foreign key definition 
        let colabMap = new Map();
        if (codColabs.length > 0) {
            const { data: colabsData, error: colabsErr } = await supabase
                .schema('public')
                .from('colaboradores')
                .select('cod_colab, contratante, funcion')
                .in('cod_colab', codColabs);

            if (colabsErr) {
                console.error("ColabsErr:", colabsErr);
                throw new Error("Colaboradores Query: " + colabsErr.message);
            }

            (colabsData || []).forEach(c => {
                colabMap.set(c.cod_colab, c);
            });
        }

        // 3. Assemble the final worker array, resolving the active client for each
        const workersWithHousing = await Promise.all((workersData || []).map(async (w: any) => {

            let clientNombre = '';
            try {
                // Retrieve active client specific to this worker
                const { data: clientData } = await supabase
                    .schema('core_personal')
                    .rpc('fn_get_active_client_for_worker', { p_cod_colab: w.cod_colab });
                clientNombre = clientData || '';
            } catch (e) {
                console.error('Failed to get active client for worker', w.cod_colab, e);
            }

            const colabData = colabMap.get(w.cod_colab);

            return {
                ...w,
                contratante: colabData?.contratante || '',
                funcion: colabData?.funcion || '',
                cliente_nombre: clientNombre,
                housing_benefit: housingMap.get(w.id)
            };
        }));

        // Defensive check to ensure no nameless/null workers break UI.
        return workersWithHousing.filter(w => w.nome && w.nome.trim() !== '');

    } catch (criticalError: any) {
        return [{
            id: 'debug-error',
            empresa_id: empresaId,
            cod_colab: 'CRASH',
            nome: `ERRO JS: ${criticalError?.message?.substring(0, 100) || 'Unknown JS Error'}`,
            cliente_nombre: `STACK: ${criticalError?.stack?.substring(0, 80) || ''}`,
            contratante: 'CRASH',
            status_trabajador: 'CRASH',
            status_seguridad: 'CRASH',
            housing_benefit: {
                id: 'err',
                worker_id: 'err',
                empresa_id: empresaId,
                monthly_amount: 999,
                start_date: '2026-01-01',
                end_date: null,
                proration_method: 'daily_actual',
                created_at: new Date().toISOString()
            }
        } as any];
    }
}
