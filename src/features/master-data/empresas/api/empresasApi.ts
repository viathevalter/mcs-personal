import { supabase } from '@/shared/supabase/client';
import type { CreateEmpresaDTO, Empresa, UpdateEmpresaDTO } from '../types';

export const empresasApi = {
  async getEmpresas(): Promise<Empresa[]> {
    const { data, error } = await supabase
      .schema('core_common')
      .from('empresas')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;
    return data as Empresa[];
  },

  async createEmpresa(payload: CreateEmpresaDTO): Promise<Empresa> {
    const { data, error } = await supabase
      .schema('core_common')
      .from('empresas')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as Empresa;
  },

  async updateEmpresa(id: string, payload: UpdateEmpresaDTO): Promise<Empresa> {
    const { data, error } = await supabase
      .schema('core_common')
      .from('empresas')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Empresa;
  }
};
