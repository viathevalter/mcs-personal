import { supabase } from '@/shared/supabase/client';
import { mapSupabaseError } from './supabaseError';
import type { Empresa, UserMembership } from '../types/coreCommon';

export async function listEmpresas(): Promise<Empresa[]> {
    const { data, error } = await supabase
        .schema('core_common')
        .from('empresas')
        .select('*')
        .eq('is_active', true)
        .order('codigo', { ascending: true });

    if (error) {
        throw mapSupabaseError(error);
    }

    return data as Empresa[];
}

export async function listMyMemberships(userId: string): Promise<UserMembership[]> {
    const { data, error } = await supabase
        .schema('core_common')
        .from('user_memberships')
        .select('empresa_id, role, is_active')
        .eq('user_id', userId)
        .eq('is_active', true);

    if (error) {
        throw mapSupabaseError(error);
    }

    return (data || []) as UserMembership[];
}
