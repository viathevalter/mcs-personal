import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';

export interface KanbanStage {
  id: string;
  empresa_id: string;
  name: string;
  name_es?: string;
  color: string;
  order_index: number;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommercialKanbanCampaignItem {
  id: string;
  kind: 'marketing' | 'dialer';
  title: string;
  status: string;
  total_leads: number;
  sent_count: number;
  created_at: string;
}

export function useCommercialCampaignLeadScope(options: {
  empresaId?: string | null;
  assignedTo?: string | null;
  selectedCampaignKey?: string;
}) {
  const { selectedEmpresaId } = useEmpresa();
  const targetEmpresaId = options.empresaId !== undefined ? options.empresaId : selectedEmpresaId;
  const targetAssignedTo = options.assignedTo || null;
  const selectedKey = options.selectedCampaignKey || 'all_campaigns';

  const campaignsQuery = useQuery({
    queryKey: ['kanban_commercial_campaigns', targetEmpresaId, targetAssignedTo],
    queryFn: async () => {
      if (!targetEmpresaId) return { campaigns: [] as CommercialKanbanCampaignItem[], activeStage1LeadIds: [] as string[] };

      let mktQuery = supabase
        .schema('core_comercial')
        .from('marketing_campaigns')
        .select('id, title, status, scheduled_at, created_at, assigned_to')
        .eq('empresa_id', targetEmpresaId)
        .order('created_at', { ascending: false });

      if (targetAssignedTo) {
        mktQuery = mktQuery.eq('assigned_to', targetAssignedTo);
      }

      let dialerQuery = supabase
        .schema('core_comercial')
        .from('dialer_campaigns')
        .select('id, title, status, total_leads, completed_leads, created_at, assigned_to')
        .eq('empresa_id', targetEmpresaId)
        .order('created_at', { ascending: false });

      if (targetAssignedTo) {
        dialerQuery = dialerQuery.eq('assigned_to', targetAssignedTo);
      }

      const [mktRes, dialerRes] = await Promise.all([mktQuery, dialerQuery]);
      if (mktRes.error) throw mktRes.error;
      if (dialerRes.error) throw dialerRes.error;

      const mktList: CommercialKanbanCampaignItem[] = (mktRes.data || []).map((c: any) => ({
        id: c.id,
        kind: 'marketing',
        title: c.title,
        status: c.status,
        total_leads: c.total_leads || 0,
        sent_count: c.sent_count || 0,
        created_at: c.created_at,
      }));

      const dialerList: CommercialKanbanCampaignItem[] = (dialerRes.data || []).map((d: any) => ({
        id: d.id,
        kind: 'dialer',
        title: d.title,
        status: d.status,
        total_leads: d.total_leads || 0,
        sent_count: d.completed_leads || 0,
        created_at: d.created_at,
      }));

      const dialerIds = dialerList.map(d => d.id);
      const recentMktIds = mktList.filter(m => m.status === 'sending').map(m => m.id);

      const stage1Set = new Set<string>();

      if (dialerIds.length > 0) {
        const { data: dItems } = await supabase
          .schema('core_comercial')
          .from('dialer_queue_items')
          .select('lead_id')
          .in('campaign_id', dialerIds)
          .limit(5000);
        (dItems || []).forEach((row: any) => {
          if (row.lead_id) stage1Set.add(row.lead_id);
        });
      }

      if (recentMktIds.length > 0) {
        const { data: mItems } = await supabase
          .schema('core_comercial')
          .from('marketing_campaign_queue')
          .select('lead_id')
          .in('campaign_id', recentMktIds)
          .limit(5000);
        (mItems || []).forEach((row: any) => {
          if (row.lead_id) stage1Set.add(row.lead_id);
        });
      }

      return {
        campaigns: [...mktList, ...dialerList],
        activeStage1LeadIds: Array.from(stage1Set),
      };
    },
    enabled: !!targetEmpresaId,
  });

  const specificCampaignLeadsQuery = useQuery({
    queryKey: ['kanban_specific_campaign_leads', selectedKey],
    queryFn: async () => {
      if (!selectedKey || selectedKey === 'all_campaigns' || selectedKey === 'all_including_cold') {
        return null;
      }

      const [kind, campaignId] = selectedKey.split(':');
      if (!campaignId) return null;

      const leadIds: string[] = [];
      const pageSize = 1000;
      let from = 0;

      if (kind === 'dialer') {
        while (true) {
          const { data, error } = await supabase
            .schema('core_comercial')
            .from('dialer_queue_items')
            .select('lead_id')
            .eq('campaign_id', campaignId)
            .range(from, from + pageSize - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          data.forEach((r: any) => {
            if (r.lead_id) leadIds.push(r.lead_id);
          });
          if (data.length < pageSize) break;
          from += pageSize;
        }
      } else {
        while (true) {
          const { data, error } = await supabase
            .schema('core_comercial')
            .from('marketing_campaign_queue')
            .select('lead_id')
            .eq('campaign_id', campaignId)
            .range(from, from + pageSize - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          data.forEach((r: any) => {
            if (r.lead_id) leadIds.push(r.lead_id);
          });
          if (data.length < pageSize) break;
          from += pageSize;
        }
      }

      return leadIds;
    },
    enabled: !!selectedKey && selectedKey !== 'all_campaigns' && selectedKey !== 'all_including_cold',
  });

  return {
    campaigns: campaignsQuery.data?.campaigns || [],
    activeStage1LeadIds: campaignsQuery.data?.activeStage1LeadIds || [],
    specificCampaignLeadIds: specificCampaignLeadsQuery.data || null,
    isLoadingScope: campaignsQuery.isLoading || specificCampaignLeadsQuery.isLoading,
  };
}

export function useKanbanStages() {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['kanban_stages', selectedEmpresaId],
    queryFn: async () => {
      if (!selectedEmpresaId) return [];
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('kanban_stages')
        .select('*')
        .eq('empresa_id', selectedEmpresaId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as KanbanStage[];
    },
    enabled: !!selectedEmpresaId,
  });
}

export function useAllKanbanStages() {
  return useQuery({
    queryKey: ['kanban_stages', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('kanban_stages')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data as KanbanStage[];
    },
  });
}

export function useMutateKanban() {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();

  const createStage = useMutation({
    mutationFn: async (payload: { name: string; name_es?: string; color?: string; order_index: number }) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('kanban_stages')
        .insert({
          ...payload,
          empresa_id: selectedEmpresaId,
          is_system: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as KanbanStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban_stages', selectedEmpresaId] });
    },
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Omit<KanbanStage, 'id' | 'empresa_id' | 'is_system' | 'created_at' | 'updated_at'>> }) => {
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('kanban_stages')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as KanbanStage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban_stages', selectedEmpresaId] });
    },
  });

  const deleteStage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .schema('core_comercial')
        .from('kanban_stages')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban_stages', selectedEmpresaId] });
    },
  });

  const moveLead = useMutation({
    mutationFn: async ({ leadId, stageId }: { leadId: string; stageId: string }) => {
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('leads')
        .update({
          stage_id: stageId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const reorderStages = useMutation({
    mutationFn: async (orderedStages: { id: string; order_index: number }[]) => {
      for (const item of orderedStages) {
        const { error } = await supabase
          .schema('core_comercial')
          .from('kanban_stages')
          .update({ order_index: item.order_index })
          .eq('id', item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban_stages', selectedEmpresaId] });
    },
  });

  return {
    createStage: createStage.mutateAsync,
    isCreatingStage: createStage.isPending,
    updateStage: updateStage.mutateAsync,
    isUpdatingStage: updateStage.isPending,
    deleteStage: deleteStage.mutateAsync,
    isDeletingStage: deleteStage.isPending,
    reorderStages: reorderStages.mutateAsync,
    isReorderingStages: reorderStages.isPending,
    moveLead: moveLead.mutateAsync,
    isMovingLead: moveLead.isPending,
  };
}
