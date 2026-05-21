import { supabase } from '@/shared/supabase/client';
import type { Epi, CreateEpiDTO, UpdateEpiDTO } from '../types';

export const episApi = {
  async getEpis(): Promise<Epi[]> {
    const { data, error } = await supabase
      .schema('core_logistica')
      .from('epis')
      .select('*')
      .neq('status', 'archived')
      .order('name');
    
    if (error) throw error;
    return data as Epi[];
  },

  async createEpi(payload: CreateEpiDTO & { empresa_id: string }): Promise<Epi> {
    const { data, error } = await supabase
      .schema('core_logistica')
      .from('epis')
      .insert(payload)
      .select()
      .single();
    
    if (error) throw error;
    return data as Epi;
  },

  async updateEpi(id: string, payload: UpdateEpiDTO): Promise<Epi> {
    const { data, error } = await supabase
      .schema('core_logistica')
      .from('epis')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Epi;
  },

  async deleteEpi(id: string): Promise<void> {
    const { error } = await supabase
      .schema('core_logistica')
      .from('epis')
      .update({ status: 'archived' })
      .eq('id', id);
    
    if (error) throw error;
  }
};
