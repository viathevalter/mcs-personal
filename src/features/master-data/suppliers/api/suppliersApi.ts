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

  async getNextSupplierCode(empresaId: string): Promise<string> {
    if (!empresaId) return 'FOR-001';

    const { data, error } = await supabase
      .schema('core_common')
      .from('suppliers')
      .select('codigo')
      .eq('empresa_id', empresaId);

    if (error) throw error;

    let maxNum = 0;
    if (data) {
      for (const item of data) {
        if (!item.codigo) continue;
        const match = item.codigo.match(/FOR-(\d+)/i) || item.codigo.match(/(\d+)/);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }

    const nextNum = maxNum + 1;
    return `FOR-${String(nextNum).padStart(3, '0')}`;
  },

  async createSupplier(empresaId: string, payload: CreateSupplierDTO): Promise<Supplier> {
    if (!empresaId) throw new Error('Empresa não selecionada');

    let codigo = payload.codigo?.trim();
    if (!codigo) {
      codigo = await suppliersApi.getNextSupplierCode(empresaId);
    }

    const { data, error } = await supabase
      .schema('core_common')
      .from('suppliers')
      .insert({
        ...payload,
        codigo,
        empresa_id: empresaId,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Supplier;
  },

  async bulkCreateSuppliers(empresaId: string, payloadList: CreateSupplierDTO[]): Promise<Supplier[]> {
    if (!empresaId) throw new Error('Empresa não selecionada');
    if (!payloadList.length) return [];

    let currentNextCode = await suppliersApi.getNextSupplierCode(empresaId);
    let nextNum = parseInt(currentNextCode.replace(/^FOR-/i, ''), 10);
    if (isNaN(nextNum)) nextNum = 1;

    const itemsToInsert = payloadList.map((item) => {
      let codigo = item.codigo?.trim();
      if (!codigo) {
        codigo = `FOR-${String(nextNum).padStart(3, '0')}`;
        nextNum++;
      }
      return {
        ...item,
        codigo,
        empresa_id: empresaId,
      };
    });

    const { data, error } = await supabase
      .schema('core_common')
      .from('suppliers')
      .insert(itemsToInsert)
      .select();

    if (error) throw error;
    return data as Supplier[];
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

