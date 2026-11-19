import { supabase } from '@/shared/supabase/client';
import { mapSupabaseError } from '@/shared/api/supabaseError';

export interface InsertHoleriteEventoPayload {
    trabalhador_id: string;
    empresa_id: string;
    mes_referencia: string; // e.g. "2026-02"
    tipo: 'provento' | 'desconto';
    categoria: string;
    valor: number;
    horas_referencia?: number;
    descricao?: string;
    import_batch_id?: string;
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
        .select('id, worker_id, mes_referencia, empresa_id')
        .in('worker_id', workerIds)
        .in('mes_referencia', monthDates);

    if (fetchErr) throw mapSupabaseError(fetchErr);

    // Filter to only match the requested months (mes_referencia comes back as 2026-02-01)
    const activeHoleritesMap = new Map<string, string>(); // 'worker_id||month||empresa_id' -> 'holerite_id'

    if (existingHolerites) {
        for (const h of existingHolerites) {
            const hMonth = String(h.mes_referencia).substring(0, 7); // '2026-02'
            activeHoleritesMap.set(`${h.worker_id}||${hMonth}||${h.empresa_id}`, h.id);
            if (!activeHoleritesMap.has(`${h.worker_id}||${hMonth}`)) {
                activeHoleritesMap.set(`${h.worker_id}||${hMonth}`, h.id);
            }
        }
    }

    // 2. Identify missing holerites that need to be created
    const holeritesToCreateMap = new Map<string, any>(); // Ensure unique inserts
    for (const e of events) {
        const validEmpresaId = (e.empresa_id && e.empresa_id.length > 20)
            ? e.empresa_id
            : 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d';

        const exactKey = `${e.trabalhador_id}||${e.mes_referencia}||${validEmpresaId}`;
        if (!activeHoleritesMap.has(exactKey) && !holeritesToCreateMap.has(exactKey)) {
            holeritesToCreateMap.set(exactKey, {
                empresa_id: validEmpresaId,
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
            .select('id, worker_id, mes_referencia, empresa_id');

        if (createErr) throw mapSupabaseError(createErr);

        if (newHolerites) {
            for (const h of newHolerites) {
                const hMonth = String(h.mes_referencia).substring(0, 7);
                activeHoleritesMap.set(`${h.worker_id}||${hMonth}||${h.empresa_id}`, h.id);
                if (!activeHoleritesMap.has(`${h.worker_id}||${hMonth}`)) {
                    activeHoleritesMap.set(`${h.worker_id}||${hMonth}`, h.id);
                }
            }
        }
    }

    // 4. Map the initial payload into DB-ready child 'holerite_eventos' lines
    const insertedHoleriteIdsThatNeedCleaning = new Set<string>();

    const dbEventsToInsert = events.map(e => {
        const validEmpresaId = (e.empresa_id && e.empresa_id.length > 20)
            ? e.empresa_id
            : 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d';

        const exactKey = `${e.trabalhador_id}||${e.mes_referencia}||${validEmpresaId}`;
        const holerite_id = activeHoleritesMap.get(exactKey) || activeHoleritesMap.get(`${e.trabalhador_id}||${e.mes_referencia}`);
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
            referencia_dias_horas: e.horas_referencia || null,
            import_batch_id: e.import_batch_id || null
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

export interface ClientHoursTariffOverride {
    clientName: string;
    hours: number;
    tarifaHora: number;
}

export function parseManualClientsEvent(evento: any): { clients: ClientHoursTariffOverride[]; motivo?: string } | null {
    if (!evento || evento.categoria !== 'ajuste_manual_clientes' || !evento.descricao) return null;
    try {
        const rawStr = String(evento.descricao).trim();
        const jsonStart = rawStr.indexOf('{');
        if (jsonStart === -1) return null;
        const parsed = JSON.parse(rawStr.substring(jsonStart));
        if (parsed && Array.isArray(parsed.clients) && parsed.clients.length > 0) {
            return {
                clients: parsed.clients.map((c: any) => ({
                    clientName: String(c.clientName || ''),
                    hours: Number(c.hours || 0),
                    tarifaHora: Number(c.tarifaHora || 0)
                })),
                motivo: parsed.motivo ? String(parsed.motivo) : undefined
            };
        }
    } catch {
        return null;
    }
    return null;
}

export interface SaveWorkerMonthlyOverrideParams {
    workerId: string;
    empresaId?: string;
    empresaName?: string;
    mesReferencia: string; // e.g. "2026-08"
    manualHours: number | null; // null = clear manual hours override
    manualTarifa: number | null; // null = clear manual tariff override
    clientOverrides?: ClientHoursTariffOverride[] | null;
    updateCadastroTarifa?: boolean;
    motivo?: string;
}

export async function saveWorkerMonthlyOverride(params: SaveWorkerMonthlyOverrideParams): Promise<void> {
    const {
        workerId,
        empresaId,
        empresaName,
        mesReferencia,
        manualHours,
        manualTarifa,
        clientOverrides = null,
        updateCadastroTarifa = false,
        motivo
    } = params;

    const monthDate = `${mesReferencia.substring(0, 7)}-01`;
    const validEmpresaId = (empresaId && empresaId.length > 20)
        ? empresaId
        : 'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d';

    // 1. Find existing holerites for this worker + competence month
    const { data: existingHolerites, error: fetchErr } = await supabase
        .schema('core_personal')
        .from('holerites')
        .select('id, worker_id, mes_referencia, empresa_id')
        .eq('worker_id', workerId)
        .eq('mes_referencia', monthDate);

    if (fetchErr) throw mapSupabaseError(fetchErr);

    let targetHoleriteId: string | undefined = existingHolerites?.find(
        (h: any) => String(h.empresa_id) === String(validEmpresaId)
    )?.id;

    if (!targetHoleriteId && existingHolerites && existingHolerites.length === 1 && (!empresaId || empresaId.length <= 20)) {
        targetHoleriteId = existingHolerites[0].id;
    }

    // 2. If we need to insert any override event and no parent holerite exists yet for this company, create it
    const hasClientOverrides = Boolean(clientOverrides && clientOverrides.length > 0);
    const needsEventInsert =
        hasClientOverrides ||
        (manualHours !== null && !isNaN(manualHours)) ||
        (manualTarifa !== null && !isNaN(manualTarifa) && manualTarifa > 0);

    if (!targetHoleriteId && needsEventInsert) {
        const { data: createdHolerite, error: createErr } = await supabase
            .schema('core_personal')
            .from('holerites')
            .insert({
                empresa_id: validEmpresaId,
                worker_id: workerId,
                mes_referencia: monthDate,
                status: 'rascunho'
            })
            .select('id')
            .single();

        if (createErr) throw mapSupabaseError(createErr);
        targetHoleriteId = createdHolerite?.id;
    }

    // 3. Clean up any existing manual hours/tariff/client override events on the target holerite
    const holeriteIdsToClean = targetHoleriteId
        ? [targetHoleriteId]
        : (existingHolerites || []).map((h: any) => h.id);

    if (holeriteIdsToClean.length > 0) {
        const { error: delErr } = await supabase
            .schema('core_personal')
            .from('holerite_eventos')
            .delete()
            .in('holerite_id', holeriteIdsToClean)
            .in('categoria', ['ajuste_manual_horas', 'ajuste_manual_tarifa', 'ajuste_manual_clientes']);

        if (delErr) throw mapSupabaseError(delErr);
    }

    // 4. Insert new manual override events if provided
    if (targetHoleriteId && needsEventInsert) {
        const eventsToInsert: any[] = [];
        const labelPrefix = empresaName && empresaName !== '-' ? `[${empresaName}] ` : '';

        if (hasClientOverrides && clientOverrides) {
            const totalClientHours = clientOverrides.reduce((acc, c) => acc + Number(c.hours || 0), 0);
            eventsToInsert.push({
                holerite_id: targetHoleriteId,
                tipo_evento: 'provento',
                categoria: 'ajuste_manual_clientes',
                descricao: JSON.stringify({
                    clients: clientOverrides,
                    motivo: motivo?.trim() || undefined
                }),
                valor: 0,
                referencia_dias_horas: Math.round((totalClientHours + Number.EPSILON) * 100) / 100
            });
        } else {
            if (manualHours !== null && !isNaN(manualHours)) {
                eventsToInsert.push({
                    holerite_id: targetHoleriteId,
                    tipo_evento: 'provento',
                    categoria: 'ajuste_manual_horas',
                    descricao: motivo?.trim() ? `${labelPrefix}${motivo.trim()}` : `${labelPrefix}Ajuste manual de horas na folha`,
                    valor: 0,
                    referencia_dias_horas: manualHours
                });
            }

            if (manualTarifa !== null && !isNaN(manualTarifa) && manualTarifa > 0) {
                eventsToInsert.push({
                    holerite_id: targetHoleriteId,
                    tipo_evento: 'provento',
                    categoria: 'ajuste_manual_tarifa',
                    descricao: motivo?.trim() ? `${labelPrefix}${motivo.trim()}` : `${labelPrefix}Ajuste manual de tarifa na folha`,
                    valor: 0,
                    referencia_dias_horas: manualTarifa
                });
            }
        }

        if (eventsToInsert.length > 0) {
            const { error: insErr } = await supabase
                .schema('core_personal')
                .from('holerite_eventos')
                .insert(eventsToInsert);

            if (insErr) throw mapSupabaseError(insErr);
        }
    }

    // 5. Optionally update permanent worker_beneficios_settings.tarifa_hora and record competence schedule + audit log
    if (updateCadastroTarifa && manualTarifa !== null && !isNaN(manualTarifa) && manualTarifa > 0) {
        const cleanMonth = mesReferencia.substring(0, 7);
        const nowIso = new Date().toISOString();

        // Read previous tariff before overwriting
        const { data: prevSetting } = await supabase
            .schema('core_personal')
            .from('worker_beneficios_settings')
            .select('tarifa_hora')
            .eq('worker_id', workerId)
            .maybeSingle();

        const prevTarifa = Number(prevSetting?.tarifa_hora || 0);

        const { error: settingsErr } = await supabase
            .schema('core_personal')
            .from('worker_beneficios_settings')
            .upsert(
                {
                    worker_id: workerId,
                    tarifa_hora: manualTarifa,
                    updated_at: nowIso
                },
                { onConflict: 'worker_id' }
            );

        if (settingsErr) throw mapSupabaseError(settingsErr);

        // Record schedule for mesReferencia onwards and audit log if rate changed
        await supabase
            .schema('core_personal')
            .from('worker_tariff_schedules')
            .upsert(
                {
                    worker_id: workerId,
                    tarifa_hora: manualTarifa,
                    mes_inicio: cleanMonth,
                    aprovado_por_nome: 'Ajuste na Folha',
                    aprovado_em: nowIso
                },
                { onConflict: 'worker_id,mes_inicio' }
            );

        if (prevTarifa > 0 && Math.abs(prevTarifa - manualTarifa) > 0.005) {
            await supabase
                .schema('core_personal')
                .from('worker_tariff_audit_logs')
                .insert({
                    worker_id: workerId,
                    tarifa_anterior: prevTarifa,
                    tarifa_nova: manualTarifa,
                    mes_vigencia: cleanMonth,
                    alterado_por_nome: 'Ajuste na Folha',
                    autorizado_por_nome: 'Ajuste na Folha',
                    motivo: motivo?.trim() || `Atualização de tarifa padrão a partir da competência ${cleanMonth}`,
                    created_at: nowIso
                });
        }
    }
}

