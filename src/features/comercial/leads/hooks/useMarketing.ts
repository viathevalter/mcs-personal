import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';

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

  return useQuery({
    queryKey: ['marketing_campaigns', selectedEmpresaId],
    queryFn: async () => {
      if (!selectedEmpresaId) return [];
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('marketing_campaigns')
        .select('*, marketing_templates(*)')
        .eq('empresa_id', selectedEmpresaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as MarketingCampaign[];
    },
    enabled: !!selectedEmpresaId,
  });
}

export function useMutateMarketing() {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();

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
    mutationFn: async (payload: { title: string; template_id: string }) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('marketing_campaigns')
        .insert({
          ...payload,
          empresa_id: selectedEmpresaId,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data as MarketingCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_campaigns', selectedEmpresaId] });
    },
  });

  const startCampaign = useMutation({
    mutationFn: async ({ campaignId, scheduledAt }: { campaignId: string; scheduledAt?: string }) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      
      const newStatus = scheduledAt ? 'scheduled' : 'sending';

      // 1. Atualizar o status da campanha
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

      // 2. Verificar se a fila já foi pré-configurada/populada (Inteligência de Envios)
      const { count: queueCount, error: errCheck } = await supabase
        .schema('core_comercial')
        .from('marketing_campaign_queue')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);

      if (errCheck) throw errCheck;

      if (queueCount && queueCount > 0) {
        // Se já existe público-alvo configurado na fila, respeitar os alvos e apenas retornar
        console.log(`Campanha ${campaignId} já possui fila configurada com ${queueCount} itens.`);
        return campaign as MarketingCampaign;
      }

      // 3. Caso contrário (fallback): Buscar todos os leads da base global do grupo (excluindo descadastrados)
      const { data: leads, error: errLeads } = await supabase
        .schema('core_comercial')
        .from('leads')
        .select('id, email, name, notes');

      if (errLeads) throw errLeads;

      if (!leads || leads.length === 0) {
        throw new Error('Nenhum lead cadastrado na base de dados.');
      }

      // 4. Montar a fila de disparos (Ignora leads sem email, inválidos ou descadastrados)
      const queueItems = leads
        .filter((l) => {
          if (!l.email || !l.email.includes('@')) return false;
          const isOptedOut = (l.name || '').startsWith('[DESCADASTRADO]') || (l.notes || '').includes('[Opt-out]');
          return !isOptedOut;
        })
        .map((l) => ({
          campaign_id: campaignId,
          lead_id: l.id,
          status: 'pending',
        }));

      if (queueItems.length > 0) {
        const { error: errQueue } = await supabase
          .schema('core_comercial')
          .from('marketing_campaign_queue')
          .insert(queueItems);

        if (errQueue) throw errQueue;
      }

      return campaign as MarketingCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_campaigns', selectedEmpresaId] });
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
      queryClient.invalidateQueries({ queryKey: ['marketing_campaigns', selectedEmpresaId] });
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
    startCampaign: startCampaign.mutateAsync,
    isStartingCampaign: startCampaign.isPending,
    deleteCampaign: deleteCampaign.mutateAsync,
    isDeletingCampaign: deleteCampaign.isPending,
  };
}
