import { supabase } from '@/shared/supabase/client';
import type { TaxRule, CreateTaxRulePayload, UpdateTaxRulePayload } from './types';

export async function fetchTaxRules(): Promise<TaxRule[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Não autenticado');

    const { data, error } = await supabase
        .from('tax_rules')
        .select('*')
        .order('tax_type', { ascending: true })
        .order('valid_from', { ascending: false });

    if (error) {
        console.error('Error fetching tax rules:', error);
        throw error;
    }

    return data as TaxRule[];
}

export async function createTaxRule(payload: CreateTaxRulePayload): Promise<TaxRule[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Não autenticado');

    // Assign created_by and updated_by
    const completePayload = {
        ...payload,
        created_by: session.user.id,
        updated_by: session.user.id,
    };

    const { data, error } = await supabase
        .from('tax_rules')
        .insert(completePayload)
        .select();

    if (error) {
        console.error('Error creating tax rule:', error);
        throw error;
    }

    return data as TaxRule[];
}

export async function updateTaxRule(id: string, payload: UpdateTaxRulePayload): Promise<TaxRule[]> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error('Não autenticado');

    const completePayload = {
        ...payload,
        updated_by: session.user.id,
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from('tax_rules')
        .update(completePayload)
        .eq('id', id)
        .select();

    if (error) {
        console.error('Error updating tax rule:', error);
        throw error;
    }

    return data as TaxRule[];
}

export async function deleteTaxRule(id: string): Promise<void> {
    const { error } = await supabase
        .from('tax_rules')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting tax rule:', error);
        throw error;
    }
}
