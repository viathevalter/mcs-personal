import { supabase } from '@/shared/supabase/client';
import { mapSupabaseError } from '@/shared/api/supabaseError';

export interface InsertHoleriteEventoPayload {
    trabalhador_id: string;
    empresa_id: string;
    mes_referencia: string; // e.g. "2026-02"
    tipo: 'provento' | 'desconto';
    categoria: 'adiantamento' | 'multa_transito' | 'sinistro_carro' | 'dias_faltas' | 'bonus' | 'outros' | 'total_horas';
    valor: number;
    horas_referencia?: number;
    descricao?: string;
}

export async function insertHoleriteEventosBatch(events: InsertHoleriteEventoPayload[]): Promise<void> {
    if (!events || events.length === 0) return;

    // Fast-path: group by month (usually just 1, but let's be safe). Ensure full date string YYYY-MM-01 for postgres DATE type.
    const monthDates = Array.from(new Set(events.map(e => `${e.mes_referencia}-01`)));
    const workerIds = Array.from(new Set(events.map(e => e.trabalhador_id)));

    // 1. Fetch current 'holerites' (paychecks) for these workers and months
    const { data: existingHolerites, error: fetchErr } = await supabase
        .schema('core_personal')
        .from('holerites')
        .select('id, worker_id, mes_referencia')
        .in('worker_id', workerIds)
        .in('mes_referencia', monthDates);

    if (fetchErr) throw mapSupabaseError(fetchErr);

    // Filter to only match the requested months (mes_referencia comes back as 2026-02-01)
    const activeHoleritesMap = new Map<string, string>(); // 'worker_id||month' -> 'holerite_id'

    if (existingHolerites) {
        for (const h of existingHolerites) {
            const hMonth = h.mes_referencia.substring(0, 7); // '2026-02'
            activeHoleritesMap.set(`${h.worker_id}||${hMonth}`, h.id);
        }
    }

    // 2. Identify missing holerites that need to be created
    const holeritesToCreateMap = new Map<string, any>(); // Ensure unique inserts
    for (const e of events) {
        const key = `${e.trabalhador_id}||${e.mes_referencia}`;
        if (!activeHoleritesMap.has(key) && !holeritesToCreateMap.has(key)) {
            holeritesToCreateMap.set(key, {
                empresa_id: e.empresa_id,
                worker_id: e.trabalhador_id,
                mes_referencia: `${e.mes_referencia}-01`,
                status: 'rascunho'
            });
        }
    }

    // 3. Insert newly discovered missing parent holerites
    if (holeritesToCreateMap.size > 0) {
        const payloadToCreate = Array.from(holeritesToCreateMap.values());
        const { data: newHolerites, error: createErr } = await supabase
            .schema('core_personal')
            .from('holerites')
            .insert(payloadToCreate)
            .select('id, worker_id, mes_referencia');

        if (createErr) throw mapSupabaseError(createErr);

        if (newHolerites) {
            for (const h of newHolerites) {
                const hMonth = h.mes_referencia.substring(0, 7);
                activeHoleritesMap.set(`${h.worker_id}||${hMonth}`, h.id);
            }
        }
    }

    // 4. Map the initial payload into DB-ready child 'holerite_eventos' lines
    const insertedHoleriteIdsThatNeedCleaning = new Set<string>();

    const dbEventsToInsert = events.map(e => {
        const key = `${e.trabalhador_id}||${e.mes_referencia}`;
        const holerite_id = activeHoleritesMap.get(key);
        if (!holerite_id) throw new Error("Could not map or create parent holerite for worker: " + e.trabalhador_id);

        if (e.categoria === 'total_horas') {
            insertedHoleriteIdsThatNeedCleaning.add(holerite_id);
        }

        return {
            holerite_id,
            tipo_evento: e.tipo,
            categoria: e.categoria,
            descricao: e.descricao || 'Adicionado via Sistema',
            valor: e.valor,
            referencia_dias_horas: e.horas_referencia || null
        };
    });

    // 5. Cleanup: If we are importing "Total Horas", delete any existing ones for this month so we don't duplicate them
    if (insertedHoleriteIdsThatNeedCleaning.size > 0) {
        const { error: delErr } = await supabase
            .schema('core_personal')
            .from('holerite_eventos')
            .delete()
            .in('holerite_id', Array.from(insertedHoleriteIdsThatNeedCleaning))
            .eq('categoria', 'total_horas');

        if (delErr) throw mapSupabaseError(delErr);
    }

    // 6. Finally, bulk insert the true child events
    const { error: insErr } = await supabase
        .schema('core_personal')
        .from('holerite_eventos')
        .insert(dbEventsToInsert);

    if (insErr) {
        throw mapSupabaseError(insErr);
    }
}
