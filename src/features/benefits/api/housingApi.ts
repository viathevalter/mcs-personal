import { supabase } from '@/shared/supabase/client';
import { mapSupabaseError } from '@/shared/api/supabaseError';
import type { HousingBenefit } from '@/shared/types/corePersonal';
import { isHoldingId } from '@/shared/utils/empresaUtils';

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

export async function insertHousingBatch(payloads: Omit<HousingBenefit, 'id' | 'created_at'>[]): Promise<void> {
    if (!payloads || payloads.length === 0) return;

    const { error } = await supabase
        .schema('core_personal')
        .from('worker_benefit_housing')
        .insert(payloads);

    if (error) {
        throw mapSupabaseError(error);
    }
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

export async function getWorkersWithHousing(empresaId?: string): Promise<import('@/shared/types/corePersonal').WorkerWithHousing[]> {
    try {
        // 1. Fetch housing benefits (if specific subsidiary empresa is provided, filter by it; if holding or all, fetch all)
        let query = supabase
            .schema('core_personal')
            .from('worker_benefit_housing')
            .select('*')
            .order('start_date', { ascending: false });

        if (empresaId && empresaId !== 'all' && !isHoldingId(empresaId)) {
            query = query.eq('empresa_id', empresaId);
        }

        const { data: housingBenefits, error: housingError } = await query;

        if (housingError) {
            throw mapSupabaseError(housingError);
        }

        if (!housingBenefits || housingBenefits.length === 0) {
            return [];
        }

        // 2. Fetch specific workers bypassing the PostgREST 1000-row limit
        const workerIds = [...new Set(housingBenefits.map(h => h.worker_id))];

        const { data: workersData, error: workersError } = await supabase
            .schema('core_personal')
            .from('workers')
            .select('*')
            .in('id', workerIds);

        if (workersError) {
            throw mapSupabaseError(workersError);
        }

        const workersMap = new Map((workersData || []).map(w => [w.id, w]));
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
            } else if (colabsData) {
                colabsData.forEach(c => {
                    colabMap.set(c.cod_colab, c);
                });
            }
        }

        // 2.6 Cache active clients by cod_colab to avoid duplicate RPC calls
        const clientCache = new Map<string, string>();
        const getActiveClient = async (codColab: string): Promise<string> => {
            if (!codColab) return '';
            if (clientCache.has(codColab)) return clientCache.get(codColab)!;
            try {
                const { data: clientData } = await supabase
                    .schema('core_personal')
                    .rpc('fn_get_active_client_for_worker', { p_cod_colab: codColab });
                const val = clientData || '';
                clientCache.set(codColab, val);
                return val;
            } catch {
                clientCache.set(codColab, '');
                return '';
            }
        };

        // Preload active clients in parallel for unique workers
        await Promise.all(codColabs.map(c => getActiveClient(c)));

        // 3. Assemble each housing benefit row enriched with worker information
        const workersWithHousing = housingBenefits.map((h: any) => {
            const w = workersMap.get(h.worker_id) || {
                id: h.worker_id,
                cod_colab: '',
                nome: 'Trabalhador Desconhecido',
                contratante: ''
            };

            const colabData = w.cod_colab ? colabMap.get(w.cod_colab) : undefined;
            const clientNombre = w.cod_colab ? (clientCache.get(w.cod_colab) || '') : '';

            return {
                ...w,
                id: h.id, // Primary key of worker_benefit_housing as unique row key
                worker_id: w.id,
                contratante: colabData?.contratante || w.contratante || '',
                funcion: colabData?.funcion || w.funcion || '',
                cliente_nombre: clientNombre,
                housing_benefit: h
            };
        });

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
