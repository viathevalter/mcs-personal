import { supabase } from '@/shared/supabase/client';

export interface DiscountCategory {
    id: string;
    empresa_id: string;
    name: string;
    created_at: string;
}

export interface BenefitCategory {
    id: string;
    empresa_id: string;
    name: string;
    created_at: string;
}

export const getDiscountCategories = async (empresaId: string): Promise<DiscountCategory[]> => {
    const { data, error } = await supabase
        .schema('core_personal')
        .from('discount_categories')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('name');

    if (error) throw error;
    return data || [];
};

export const createDiscountCategory = async (empresaId: string, name: string): Promise<DiscountCategory> => {
    const { data, error } = await supabase
        .schema('core_personal')
        .from('discount_categories')
        .insert({ empresa_id: empresaId, name })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateDiscountCategory = async (id: string, name: string): Promise<DiscountCategory> => {
    const { data, error } = await supabase
        .schema('core_personal')
        .from('discount_categories')
        .update({ name })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteDiscountCategory = async (id: string): Promise<void> => {
    const { error } = await supabase
        .schema('core_personal')
        .from('discount_categories')
        .delete()
        .eq('id', id);

    if (error) throw error;
};

export const getBenefitCategories = async (empresaId: string): Promise<BenefitCategory[]> => {
    const { data, error } = await supabase
        .schema('core_personal')
        .from('benefit_categories')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('name');

    if (error) throw error;
    return data || [];
};

export const createBenefitCategory = async (empresaId: string, name: string): Promise<BenefitCategory> => {
    const { data, error } = await supabase
        .schema('core_personal')
        .from('benefit_categories')
        .insert({ empresa_id: empresaId, name })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const updateBenefitCategory = async (id: string, name: string): Promise<BenefitCategory> => {
    const { data, error } = await supabase
        .schema('core_personal')
        .from('benefit_categories')
        .update({ name })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteBenefitCategory = async (id: string): Promise<void> => {
    const { error } = await supabase
        .schema('core_personal')
        .from('benefit_categories')
        .delete()
        .eq('id', id);

    if (error) throw error;
};
