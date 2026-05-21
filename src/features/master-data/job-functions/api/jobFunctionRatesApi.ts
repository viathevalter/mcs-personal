import { supabase } from '@/shared/supabase/client';
import type { CreateJobFunctionRateRefDTO, JobFunctionRateRef, UpdateJobFunctionRateRefDTO } from '../types';

export const jobFunctionRatesApi = {
  async getRates(jobFunctionId: string): Promise<JobFunctionRateRef[]> {
    if (!jobFunctionId) throw new Error('ID da função não fornecido');

    const { data, error } = await supabase
      .schema('core_comercial')
      .from('job_function_rate_refs')
      .select('*')
      .eq('job_function_id', jobFunctionId)
      .neq('status', 'archived')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as JobFunctionRateRef[];
  },

  async createRate(empresaId: string, payload: CreateJobFunctionRateRefDTO): Promise<JobFunctionRateRef> {
    if (!empresaId) throw new Error('Empresa não selecionada');

    const { data, error } = await supabase
      .schema('core_comercial')
      .from('job_function_rate_refs')
      .insert({
        ...payload,
        empresa_id: empresaId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '42501') {
         throw new Error('Você não tem permissão para cadastrar tarifas nesta empresa.');
      }
      throw error;
    }
    return data as JobFunctionRateRef;
  },

  async updateRate(id: string, payload: UpdateJobFunctionRateRefDTO): Promise<JobFunctionRateRef> {
    const { data, error } = await supabase
      .schema('core_comercial')
      .from('job_function_rate_refs')
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
    return data as JobFunctionRateRef;
  },

  async archiveRate(id: string): Promise<void> {
    const { error } = await supabase
      .schema('core_comercial')
      .from('job_function_rate_refs')
      .update({ status: 'archived' })
      .eq('id', id);

    if (error) {
       if (error.code === '42501') {
         throw new Error('Você não tem permissão para remover nesta empresa.');
      }
      throw error;
    }
  }
};
