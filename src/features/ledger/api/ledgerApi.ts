import { supabase } from '@/shared/supabase/client';
import { mapSupabaseError } from '@/shared/api/supabaseError';
import type { LedgerType, LedgerEntry } from '@/shared/types/corePersonal';

export async function listLedgerTypes(empresaId: string): Promise<LedgerType[]> {
    const { data, error } = await supabase
        .schema('core_personal').from('ledger_types')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('code', { ascending: true }); // Depending on exact schema, either code or type_code

    if (error) {
        throw mapSupabaseError(error);
    }

    return data as LedgerType[];
}

export interface ListLedgerEntriesParams {
    workerId: string;
    year: number;
    month: number;
}

export async function listLedgerEntriesByWorker({ workerId, year, month }: ListLedgerEntriesParams): Promise<LedgerEntry[]> {
    const { data, error } = await supabase
        .schema('core_personal').from('worker_ledger_entries')
        .select('*')
        .eq('worker_id', workerId)
        .eq('competence_year', year)
        .eq('competence_month', month)
        .order('entry_date', { ascending: true });

    if (error) {
        throw mapSupabaseError(error);
    }

    return data as LedgerEntry[];
}

export async function insertLedgerEntry(payload: Omit<LedgerEntry, 'id' | 'created_at'>): Promise<LedgerEntry> {
    const { data, error } = await supabase
        .schema('core_personal').from('worker_ledger_entries')
        .insert(payload)
        .select('*')
        .single();

    if (error) {
        throw mapSupabaseError(error);
    }

    return data as LedgerEntry;
}

export async function updateLedgerEntry(id: string, patch: Partial<LedgerEntry>): Promise<LedgerEntry> {
    const { data, error } = await supabase
        .schema('core_personal').from('worker_ledger_entries')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();

    if (error) {
        throw mapSupabaseError(error);
    }

    return data as LedgerEntry;
}

export async function generateHousingLedger(empresaId: string, year: number, month: number): Promise<number> {
    const { data, error } = await supabase.rpc('generate_housing_ledger', {
        p_empresa_id: empresaId,
        p_year: year,
        p_month: month
    });

    if (error) {
        throw mapSupabaseError(error);
    }

    return data as number;
}
