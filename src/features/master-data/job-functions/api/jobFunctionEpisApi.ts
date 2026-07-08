import { supabase } from '@/shared/supabase/client';
import type { CreateJobFunctionEpiDTO, JobFunctionEpi, UpdateJobFunctionEpiDTO, Epi } from '../types';

export const jobFunctionEpisApi = {
  // Lista de EPIs vinculados a uma função (trazendo os dados do EPI através de Join)
  async getJobFunctionEpis(jobFunctionId: string): Promise<JobFunctionEpi[]> {
    if (!jobFunctionId) throw new Error('ID da função não fornecido');

    const { data, error } = await supabase
      .schema('core_logistica')
      .from('job_function_epis')
      .select('*, epi:epis(*)')
      .eq('job_function_id', jobFunctionId)
      .neq('status', 'archived')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as JobFunctionEpi[];
  },

  async getEpis(empresaId: string): Promise<Epi[]> {
    const { data, error } = await supabase
      .schema('core_logistica')
      .from('epis')
      .select('*')
      .eq('status', 'active')
      .order('name', { ascending: true });

    if (error) throw error;
    return data as Epi[];
  },

  async createJobFunctionEpi(empresaId: string, payload: CreateJobFunctionEpiDTO): Promise<JobFunctionEpi> {
    if (!empresaId) throw new Error('Empresa não selecionada');

    const { data, error } = await supabase
      .schema('core_logistica')
      .from('job_function_epis')
      .insert({
        ...payload,
        empresa_id: empresaId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Este EPI já está vinculado a esta função.');
      }
      if (error.code === '42501') {
         throw new Error('Você não tem permissão para vincular EPIs nesta empresa.');
      }
      throw error;
    }
    return data as JobFunctionEpi;
  },

  async updateJobFunctionEpi(id: string, payload: UpdateJobFunctionEpiDTO): Promise<JobFunctionEpi> {
    const { data, error } = await supabase
      .schema('core_logistica')
      .from('job_function_epis')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '42501') {
         throw new Error('Você não tem permissão para editar nesta empresa.');
      }
      throw error;
    }
    return data as JobFunctionEpi;
  },

  async archiveJobFunctionEpi(id: string): Promise<void> {
    const { error } = await supabase
      .schema('core_logistica')
      .from('job_function_epis')
      .update({ status: 'archived' })
      .eq('id', id);

    if (error) {
       throw new Error(error.message);
    }
  }
};
