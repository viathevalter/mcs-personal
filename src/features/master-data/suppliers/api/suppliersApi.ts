import { supabase } from '@/shared/supabase/client';
import type { CreateSupplierDTO, Supplier, UpdateSupplierDTO } from '../types';

export const suppliersApi = {
  async getSuppliers(empresaId: string): Promise<Supplier[]> {
    if (!empresaId) return [];

    const { data, error } = await supabase
      .schema('core_common')
      .from('suppliers')
      .select('*')
      .eq('empresa_id', empresaId)
      .neq('status', 'archived')
      .order('trade_name', { ascending: true });

    if (error) throw error;
    return data as Supplier[];
  },

  async createSupplier(empresaId: string, payload: CreateSupplierDTO): Promise<Supplier> {
    if (!empresaId) throw new Error('Empresa não selecionada');

    const { data, error } = await supabase
      .schema('core_common')
      .from('suppliers')
      .insert({
        ...payload,
        empresa_id: empresaId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Supplier;
  },

  async updateSupplier(id: string, payload: UpdateSupplierDTO): Promise<Supplier> {
    const { data, error } = await supabase
      .schema('core_common')
      .from('suppliers')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Supplier;
  },

  async archiveSupplier(id: string): Promise<void> {
    const { error } = await supabase
      .schema('core_common')
      .from('suppliers')
      .update({ status: 'archived' })
      .eq('id', id);

    if (error) throw error;
  }
};
