import { supabase } from '@/shared/supabase/client';
import type { CreateJobFunctionDTO, JobFunction, UpdateJobFunctionDTO } from '../types';

export const jobFunctionsApi = {
  /**
   * Busca as funções filtrando sempre pela empresa selecionada (segurança extra,
   * embora o RLS também garanta).
   */
  async getJobFunctions(empresaId: string): Promise<JobFunction[]> {
    if (!empresaId) throw new Error('Empresa não selecionada');

    const { data, error } = await supabase
      .schema('core_comercial')
      .from('job_functions')
      .select('*')
      .eq('empresa_id', empresaId)
      // .neq('status', 'archived') // Opcional: podemos trazer todas e filtrar no client para KPIs
      .order('name', { ascending: true });

    if (error) throw error;
    return data as JobFunction[];
  },

  async getJobFunction(id: string): Promise<JobFunction> {
    const { data, error } = await supabase
      .schema('core_comercial')
      .from('job_functions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as JobFunction;
  },

  async createJobFunction(empresaId: string, payload: CreateJobFunctionDTO): Promise<JobFunction> {
    if (!empresaId) throw new Error('Empresa não selecionada');

    const { data, error } = await supabase
      .schema('core_comercial')
      .from('job_functions')
      .insert({
        ...payload,
        empresa_id: empresaId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Já existe uma função ativa com este código.');
      }
      if (error.code === '42501') {
         throw new Error('Você não tem permissão para realizar esta ação nesta empresa.');
      }
      throw error;
    }
    return data as JobFunction;
  },

  async updateJobFunction(id: string, payload: UpdateJobFunctionDTO): Promise<JobFunction> {
    const { data, error } = await supabase
      .schema('core_comercial')
      .from('job_functions')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
       if (error.code === '23505') {
        throw new Error('Já existe uma função ativa com este código.');
      }
      if (error.code === '42501') {
         throw new Error('Você não tem permissão para editar nesta empresa.');
      }
      throw error;
    }
    return data as JobFunction;
  },

  async archiveJobFunction(id: string): Promise<void> {
    const { error } = await supabase
      .schema('core_comercial')
      .from('job_functions')
      .update({ status: 'archived' })
      .eq('id', id);

    if (error) {
       if (error.code === '42501') {
         throw new Error('Você não tem permissão para arquivar nesta empresa.');
      }
      throw error;
    }
  }
};
