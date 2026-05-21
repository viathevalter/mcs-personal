import { supabase } from '@/shared/supabase/client';
import type { CreateJobFunctionQuestionDTO, JobFunctionQuestion, UpdateJobFunctionQuestionDTO } from '../types';

export const jobFunctionQuestionsApi = {
  async getQuestions(jobFunctionId: string): Promise<JobFunctionQuestion[]> {
    if (!jobFunctionId) throw new Error('ID da função não fornecido');

    const { data, error } = await supabase
      .schema('core_comercial')
      .from('job_function_questions')
      .select('*')
      .eq('job_function_id', jobFunctionId)
      .neq('status', 'archived')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as JobFunctionQuestion[];
  },

  async createQuestion(empresaId: string, payload: CreateJobFunctionQuestionDTO): Promise<JobFunctionQuestion> {
    if (!empresaId) throw new Error('Empresa não selecionada');

    const { data, error } = await supabase
      .schema('core_comercial')
      .from('job_function_questions')
      .insert({
        ...payload,
        empresa_id: empresaId,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '42501') {
         throw new Error('Você não tem permissão para cadastrar perguntas nesta empresa.');
      }
      throw error;
    }
    return data as JobFunctionQuestion;
  },

  async updateQuestion(id: string, payload: UpdateJobFunctionQuestionDTO): Promise<JobFunctionQuestion> {
    const { data, error } = await supabase
      .schema('core_comercial')
      .from('job_function_questions')
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
    return data as JobFunctionQuestion;
  },

  async archiveQuestion(id: string): Promise<void> {
    // Soft delete para preservar os histórico
    const { error } = await supabase
      .schema('core_comercial')
      .from('job_function_questions')
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
