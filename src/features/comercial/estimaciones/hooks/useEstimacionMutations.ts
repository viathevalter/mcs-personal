import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { toast } from 'sonner';
import { generateProposal } from '@/features/documents/api/proposalsApi';

export function useEstimacionMutations() {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();

  const aprovarEstimacion = useMutation({
    mutationFn: async (estimacionId: string) => {
      const { data, error } = await supabase.schema('core_comercial').rpc('aprovar_estimacion', {
        p_estimacion_id: estimacionId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any, estimacionId) => {
      toast.success('Estimación Aprovada e Convertida!', { 
        description: `Pedido ${data?.pedido_codigo || ''} gerado com sucesso.` 
      });
      queryClient.invalidateQueries({ queryKey: ['estimaciones', selectedEmpresaId] });
      queryClient.invalidateQueries({ queryKey: ['estimacion-detail', selectedEmpresaId, estimacionId] });
    },
    onError: (error: any) => {
      console.error(error);
      toast.error('Erro ao aprovar estimación', { description: error.message });
    },
  });

  const criarEstimacion = useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.schema('core_comercial').rpc('criar_estimacion_completa', {
        p_payload: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Estimación criada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['estimaciones', selectedEmpresaId] });
    },
    onError: (error: any) => {
      console.error(error);
      toast.error('Erro ao criar estimación', { description: error.message });
    },
  });

  const atualizarEstimacion = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data, error } = await supabase.schema('core_comercial').rpc('atualizar_estimacion_completa', {
        p_estimacion_id: id,
        p_payload: payload,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success('Estimación atualizada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['estimaciones', selectedEmpresaId] });
      queryClient.invalidateQueries({ queryKey: ['estimacion-detail', selectedEmpresaId, variables.id] });
    },
    onError: (error: any) => {
      console.error(error);
      toast.error('Erro ao atualizar estimación', { description: error.message });
    },
  });

  const enviarProposta = useMutation({
    mutationFn: async (estimacionId: string) => {
      return await generateProposal(estimacionId);
    },
    onSuccess: (data, estimacionId) => {
      toast.success('Proposta comercial enviada!', {
        description: data.email_sent
          ? 'Link de assinatura enviado com sucesso para o cliente.'
          : `Proposta gerada! No entanto, o e-mail não pôde ser disparado via Microsoft Outlook (${data.email_error || 'verifique as credenciais da empresa'}).`
      });
      queryClient.invalidateQueries({ queryKey: ['estimacion-detail', selectedEmpresaId, estimacionId] });
    },
    onError: (error: any) => {
      console.error(error);
      toast.error('Erro ao enviar proposta', { description: error.message });
    },
  });

  const decidirAprovacaoGerente = useMutation({
    mutationFn: async ({ id, aprovado }: { id: string; aprovado: boolean }) => {
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('estimaciones')
        .update({ 
          status: 'draft', 
          is_approved_by_manager: aprovado 
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any, variables) => {
      toast.success(
        variables.aprovado 
          ? 'Orçamento aprovado pelo gerente comercial!' 
          : 'Orçamento rejeitado pelo gerente comercial!'
      );
      queryClient.invalidateQueries({ queryKey: ['estimaciones', selectedEmpresaId] });
      queryClient.invalidateQueries({ queryKey: ['estimacion-detail', selectedEmpresaId, variables.id] });
    },
    onError: (error: any) => {
      console.error(error);
      toast.error('Erro ao processar decisão do gerente', { description: error.message });
    },
  });

  const criarNovaVersao = useMutation({
    mutationFn: async ({ estimacionId, notes }: { estimacionId: string; notes: string }) => {
      const { data, error } = await supabase.schema('core_comercial').rpc('criar_nova_versao_estimacion', {
        p_estimacion_id: estimacionId,
        p_notes: notes,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any, variables) => {
      toast.success('Nova versão criada!', {
        description: `Versão V${data?.version_number || ''} iniciada em rascunho.`
      });
      queryClient.invalidateQueries({ queryKey: ['estimaciones', selectedEmpresaId] });
      queryClient.invalidateQueries({ queryKey: ['estimacion-detail', selectedEmpresaId, variables.estimacionId] });
    },
    onError: (error: any) => {
      console.error(error);
      toast.error('Erro ao criar nova versão', { description: error.message });
    },
  });

  const decidirContratoCustomizado = useMutation({
    mutationFn: async ({ id, aprovado }: { id: string; aprovado: boolean }) => {
      const updatePayload: any = {
        is_custom_contract_approved: aprovado,
      };
      if (aprovado) {
        updatePayload.status = 'draft'; // Mantém em draft para permitir envio, mas agora com aprovação true
      } else {
        updatePayload.custom_contract_url = null;
        updatePayload.status = 'draft';
      }
      
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('estimaciones')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any, variables) => {
      toast.success(
        variables.aprovado 
          ? 'Contrato customizado aprovado com sucesso!' 
          : 'Contrato customizado rejeitado (removido).'
      );
      queryClient.invalidateQueries({ queryKey: ['estimaciones', selectedEmpresaId] });
      queryClient.invalidateQueries({ queryKey: ['estimacion-detail', selectedEmpresaId, variables.id] });
    },
    onError: (error: any) => {
      console.error(error);
      toast.error('Erro ao processar decisão do contrato', { description: error.message });
    },
  });

  const submeterParaRevisao = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('estimaciones')
        .update({ status: 'review' })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, id) => {
      toast.success('Orçamento enviado para aprovação do gerente!');
      queryClient.invalidateQueries({ queryKey: ['estimaciones', selectedEmpresaId] });
      queryClient.invalidateQueries({ queryKey: ['estimacion-detail', selectedEmpresaId, id] });
    },
    onError: (error: any) => {
      console.error(error);
      toast.error('Erro ao enviar para aprovação', { description: error.message });
    },
  });

  return {
    aprovarEstimacion,
    criarEstimacion,
    atualizarEstimacion,
    enviarProposta,
    decidirAprovacaoGerente,
    criarNovaVersao,
    decidirContratoCustomizado,
    submeterParaRevisao,
  };
}
