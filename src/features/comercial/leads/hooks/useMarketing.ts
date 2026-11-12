import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useCommercialScope } from './useLeads';

export interface MarketingTemplate {
  id: string;
  empresa_id: string;
  title: string;
  subject: string;
  html_content: string;
  created_at: string;
  updated_at: string;
}

export interface MarketingCampaign {
  id: string;
  empresa_id: string;
  template_id: string;
  title: string;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused';
  scheduled_at: string | null;
  assigned_to?: string | null;
  sender_email?: string | null;
  reply_to_email?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  marketing_templates?: MarketingTemplate;
}

export function useMarketingTemplates() {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['marketing_templates', selectedEmpresaId],
    queryFn: async () => {
      if (!selectedEmpresaId) return [];
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('marketing_templates')
        .select('*')
        .eq('empresa_id', selectedEmpresaId)
        .order('title', { ascending: true });

      if (error) throw error;
      return data as MarketingTemplate[];
    },
    enabled: !!selectedEmpresaId,
  });
}

export function useMarketingCampaigns() {
  const { selectedEmpresaId } = useEmpresa();
  const { isCommercialOperator, loggedCommercialProfile, activeCommercialProfile } = useCommercialScope();

  return useQuery({
    queryKey: [
      'marketing_campaigns',
      selectedEmpresaId,
      loggedCommercialProfile?.userId || activeCommercialProfile?.userId || 'all',
    ],
    queryFn: async () => {
      if (!selectedEmpresaId) return [];
      let query = supabase
        .schema('core_comercial')
        .from('marketing_campaigns')
        .select('*, marketing_templates(*)')
        .eq('empresa_id', selectedEmpresaId)
        .order('created_at', { ascending: false });

      if (isCommercialOperator && loggedCommercialProfile) {
        query = query.eq('assigned_to', loggedCommercialProfile.userId);
      } else if (activeCommercialProfile) {
        query = query.eq('assigned_to', activeCommercialProfile.userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MarketingCampaign[];
    },
    enabled: !!selectedEmpresaId,
  });
}

export function useMutateMarketing() {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();
  const { loggedCommercialProfile, activeCommercialProfile } = useCommercialScope();

  // Template mutations
  const createTemplate = useMutation({
    mutationFn: async (payload: { title: string; subject: string; html_content: string }) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('marketing_templates')
        .insert({
          ...payload,
          empresa_id: selectedEmpresaId,
        })
        .select()
        .single();

      if (error) throw error;
      return data as MarketingTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_templates', selectedEmpresaId] });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Omit<MarketingTemplate, 'id' | 'empresa_id' | 'created_at' | 'updated_at'>> }) => {
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('marketing_templates')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MarketingTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_templates', selectedEmpresaId] });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .schema('core_comercial')
        .from('marketing_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_templates', selectedEmpresaId] });
    },
  });

  // Campaign mutations
  const createCampaign = useMutation({
    mutationFn: async (payload: {
      title: string;
      template_id: string;
      assigned_to?: string | null;
      sender_email?: string | null;
      reply_to_email?: string | null;
    }) => {
      const targetEmpresaId = activeCommercialProfile?.empresaId || selectedEmpresaId;
      if (!targetEmpresaId) throw new Error('Empresa não selecionada');
      let targetAssignedTo =
        payload.assigned_to ||
        loggedCommercialProfile?.userId ||
        activeCommercialProfile?.userId ||
        null;
      let targetSenderEmail =
        payload.sender_email ||
        loggedCommercialProfile?.marketingSenderEmail ||
        activeCommercialProfile?.marketingSenderEmail ||
        null;
      let targetReplyToEmail =
        payload.reply_to_email ||
        loggedCommercialProfile?.commercialEmail ||
        activeCommercialProfile?.commercialEmail ||
        null;

      // Na Wiseowe, garantir separação total entre Fatumata (França) e Liseth (Espanha) com base no template selecionado
      if (targetEmpresaId === 'dae64d51-2181-4510-b14f-e63d2f111a8e' && payload.template_id) {
        const { data: tplData } = await supabase
          .schema('core_comercial')
          .from('marketing_templates')
          .select('title, subject, html_content')
          .eq('id', payload.template_id)
          .maybeSingle();

        if (tplData) {
          const tTitle = (tplData.title || '').toLowerCase();
          const tHtml = (tplData.html_content || '').toLowerCase();
          const isLisethTemplate =
            tTitle.includes('liseth') ||
            tTitle.includes('espanha') ||
            tTitle.includes('españa') ||
            tHtml.includes('whatsapp_url_liseth');
          const isGiadaTemplate =
            tTitle.includes('giada') ||
            tTitle.includes('itália') ||
            tTitle.includes('italia') ||
            tHtml.includes('whatsapp_url_giada');

          if (isGiadaTemplate) {
            targetAssignedTo = '76f9a2f5-116a-456e-a7d9-9a6a0401ac65';
            targetSenderEmail = 'comercial4@it.wiseowe.com';
            targetReplyToEmail = 'comercial4@wiseowe.com';
          } else if (isLisethTemplate) {
            targetAssignedTo = 'cdc74a13-e41a-4fa5-b51b-5a27b8f310fa';
            targetSenderEmail = 'comercial2@es.wiseowe.com';
            targetReplyToEmail = 'comercial2@wiseowe.com';
          } else {
            targetAssignedTo = '2a25dd76-8a1b-44ea-8ea9-47e9232beee2';
            targetSenderEmail = 'comercial3@fr.wiseowe.com';
            targetReplyToEmail = 'comercial3@wiseowe.com';
          }
        }
      }

      const { data, error } = await supabase
        .schema('core_comercial')
        .from('marketing_campaigns')
        .insert({
          title: payload.title,
          template_id: payload.template_id,
          empresa_id: targetEmpresaId,
          assigned_to: targetAssignedTo,
          sender_email: targetSenderEmail,
          reply_to_email: targetReplyToEmail,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data as MarketingCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_campaigns'] });
    },
  });

  const updateCampaign = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<Pick<MarketingCampaign, 'title' | 'template_id' | 'sender_email' | 'reply_to_email'>>;
    }) => {
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('marketing_campaigns')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MarketingCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_campaigns'] });
    },
  });

  const startCampaign = useMutation({
    mutationFn: async ({ campaignId, scheduledAt }: { campaignId: string; scheduledAt?: string }) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');

      const { data: existingCamp, error: errFetchCamp } = await supabase
        .schema('core_comercial')
        .from('marketing_campaigns')
        .select('id, template_id')
        .eq('id', campaignId)
        .single();

      if (errFetchCamp) throw errFetchCamp;
      if (!existingCamp?.template_id) {
        throw new Error('Selecione um template de e-mail para esta campanha antes de disparar.');
      }

      const { count: queueCount, error: errCheck } = await supabase
        .schema('core_comercial')
        .from('marketing_campaign_queue')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);

      if (errCheck) throw errCheck;
      if (!queueCount || queueCount === 0) {
        throw new Error('Configure o público-alvo da campanha antes de iniciar o disparo.');
      }
      
      const newStatus = scheduledAt ? 'scheduled' : 'sending';

      const { data: campaign, error: errCamp } = await supabase
        .schema('core_comercial')
        .from('marketing_campaigns')
        .update({
          status: newStatus,
          scheduled_at: scheduledAt || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId)
        .select()
        .single();

      if (errCamp) throw errCamp;

      return campaign as MarketingCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_campaigns'] });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .schema('core_comercial')
        .from('marketing_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_campaigns'] });
    },
  });

  return {
    createTemplate: createTemplate.mutateAsync,
    isCreatingTemplate: createTemplate.isPending,
    updateTemplate: updateTemplate.mutateAsync,
    isUpdatingTemplate: updateTemplate.isPending,
    deleteTemplate: deleteTemplate.mutateAsync,
    isDeletingTemplate: deleteTemplate.isPending,
    
    createCampaign: createCampaign.mutateAsync,
    isCreatingCampaign: createCampaign.isPending,
    updateCampaign: updateCampaign.mutateAsync,
    isUpdatingCampaign: updateCampaign.isPending,
    startCampaign: startCampaign.mutateAsync,
    isStartingCampaign: startCampaign.isPending,
    deleteCampaign: deleteCampaign.mutateAsync,
    isDeletingCampaign: deleteCampaign.isPending,
  };
}
