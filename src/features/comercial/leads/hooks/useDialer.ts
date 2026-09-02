import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import type { 
  DialerCampaign, 
  DialerQueueItem, 
  LeadCallLog, 
  SalesScript, 
  CallOutcome, 
  RejectionReason,
  QuickPresupuestoPayload
} from '../types/dialerTypes';

export function useSalesScripts() {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['sales_scripts', selectedEmpresaId],
    queryFn: async () => {
      if (!selectedEmpresaId) return [];
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('sales_scripts')
        .select('*')
        .eq('empresa_id', selectedEmpresaId)
        .order('is_default', { ascending: false });

      if (error) throw error;
      return (data || []) as SalesScript[];
    },
    enabled: !!selectedEmpresaId,
  });
}

export function useDialerCampaigns() {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['dialer_campaigns', selectedEmpresaId],
    queryFn: async () => {
      if (!selectedEmpresaId) return [];
      
      const { data: campaigns, error } = await supabase
        .schema('core_comercial')
        .from('dialer_campaigns')
        .select(`
          *,
          script:sales_scripts(*),
          assigned_user:mcs_users!dialer_campaigns_assigned_to_fkey(id, display_name, email)
        `)
        .eq('empresa_id', selectedEmpresaId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch queue items stats for each campaign
      const campaignIds = (campaigns || []).map(c => c.id);
      let statsMap = new Map<string, any>();

      if (campaignIds.length > 0) {
        const { data: queueItems } = await supabase
          .schema('core_comercial')
          .from('dialer_queue_items')
          .select('campaign_id, status')
          .in('campaign_id', campaignIds);

        if (queueItems) {
          queueItems.forEach(item => {
            const current = statsMap.get(item.campaign_id) || {
              total: 0,
              pending: 0,
              converted: 0,
              scheduled: 0,
              rejected: 0,
              no_answer: 0,
            };
            current.total += 1;
            if (item.status === 'pending' || item.status === 'in_progress') current.pending += 1;
            else if (item.status === 'converted') current.converted += 1;
            else if (item.status === 'scheduled') current.scheduled += 1;
            else if (item.status === 'rejected') current.rejected += 1;
            else if (item.status === 'no_answer') current.no_answer += 1;
            statsMap.set(item.campaign_id, current);
          });
        }
      }

      const enriched = (campaigns || []).map(c => ({
        ...c,
        items_count: statsMap.get(c.id) || {
          total: c.total_leads || 0,
          pending: (c.total_leads || 0) - (c.completed_leads || 0),
          converted: 0,
          scheduled: 0,
          rejected: 0,
          no_answer: 0,
        }
      }));

      return enriched as DialerCampaign[];
    },
    enabled: !!selectedEmpresaId,
  });
}

export function useDialerCampaign(campaignId?: string | null) {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['dialer_campaign', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('dialer_campaigns')
        .select(`
          *,
          script:sales_scripts(*),
          assigned_user:mcs_users!dialer_campaigns_assigned_to_fkey(id, display_name, email)
        `)
        .eq('id', campaignId)
        .single();

      if (error) throw error;
      return data as DialerCampaign;
    },
    enabled: !!campaignId,
  });
}

export function useDialerQueue(campaignId?: string | null, userId?: string | null) {
  return useQuery({
    queryKey: ['dialer_queue_items', campaignId, userId],
    queryFn: async () => {
      if (!campaignId) return [];

      let query = supabase
        .schema('core_comercial')
        .from('dialer_queue_items')
        .select(`
          *,
          lead:leads(*)
        `)
        .eq('campaign_id', campaignId);

      if (userId) {
        query = query.or(`assigned_to.eq.${userId},assigned_to.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const items = (data || []) as DialerQueueItem[];

      // Intelligent sort:
      // 1. Scheduled callbacks due NOW or in the past (Priority 1 - Top of Queue)
      // 2. Scheduled callbacks due in the future
      // 3. Pending / In progress leads sorted by sort_order
      // 4. No Answer (re-queued at the end of the line)
      // 5. Converted / Rejected (already finished)
      const now = new Date().getTime();

      return items.sort((a, b) => {
        const isADueScheduled = a.status === 'scheduled' && a.scheduled_for && new Date(a.scheduled_for).getTime() <= now;
        const isBDueScheduled = b.status === 'scheduled' && b.scheduled_for && new Date(b.scheduled_for).getTime() <= now;

        if (isADueScheduled && !isBDueScheduled) return -1;
        if (!isADueScheduled && isBDueScheduled) return 1;

        // Both pending or regular:
        const statusPriority: Record<string, number> = {
          'scheduled': 1,
          'in_progress': 2,
          'pending': 3,
          'no_answer': 4,
          'converted': 5,
          'rejected': 6,
          'skipped': 7
        };

        const prioA = statusPriority[a.status] || 99;
        const prioB = statusPriority[b.status] || 99;

        if (prioA !== prioB) return prioA - prioB;

        return a.sort_order - b.sort_order;
      });
    },
    enabled: !!campaignId,
    refetchInterval: 30000, // auto check for due callbacks every 30s
  });
}

export function useLeadCallLogs(leadId?: string | null) {
  return useQuery({
    queryKey: ['lead_call_logs', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('lead_call_logs')
        .select(`
          *,
          user:mcs_users!lead_call_logs_user_id_fkey(id, display_name, email)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as LeadCallLog[];
    },
    enabled: !!leadId,
  });
}

export function useDialerSupervisorKPIs() {
  const { selectedEmpresaId } = useEmpresa();

  return useQuery({
    queryKey: ['dialer_supervisor_kpis', selectedEmpresaId],
    queryFn: async () => {
      if (!selectedEmpresaId) return null;

      // 1. Fetch all call logs for company
      const { data: logs, error: logError } = await supabase
        .schema('core_comercial')
        .from('lead_call_logs')
        .select(`
          id,
          outcome,
          duration_seconds,
          created_at,
          user_id,
          rejection_reason,
          user:mcs_users!lead_call_logs_user_id_fkey(id, display_name, email)
        `)
        .eq('empresa_id', selectedEmpresaId)
        .order('created_at', { ascending: false });

      if (logError) throw logError;

      const allLogs = logs || [];
      const totalCalls = allLogs.length;

      // Metrics:
      let answeredCount = 0;
      let convertedCount = 0;
      let scheduledCount = 0;
      let rejectedCount = 0;
      let noAnswerCount = 0;
      let totalDuration = 0;

      const sdrMap = new Map<string, {
        userId: string;
        userName: string;
        totalCalls: number;
        answeredCalls: number;
        convertedCalls: number;
        scheduledCalls: number;
        rejectedCalls: number;
        totalDuration: number;
      }>();

      const rejectionReasonMap: Record<string, number> = {
        has_own_team: 0,
        no_demand: 0,
        price_too_high: 0,
        does_not_outsource: 0,
        bad_contact: 0,
        other: 0,
      };

      allLogs.forEach(log => {
        totalDuration += log.duration_seconds || 0;
        const isAnswered = log.outcome.startsWith('answered');
        if (isAnswered) answeredCount += 1;

        if (log.outcome === 'answered_converted') convertedCount += 1;
        else if (log.outcome === 'answered_callback') scheduledCount += 1;
        else if (log.outcome === 'answered_rejected') rejectedCount += 1;
        else if (log.outcome === 'no_answer' || log.outcome === 'busy') noAnswerCount += 1;

        if (log.rejection_reason && rejectionReasonMap[log.rejection_reason] !== undefined) {
          rejectionReasonMap[log.rejection_reason] += 1;
        }

        const uId = log.user_id || 'unassigned';
        const uName = (log.user as any)?.display_name || (log.user as any)?.email || 'Operador';

        const sdr = sdrMap.get(uId) || {
          userId: uId,
          userName: uName,
          totalCalls: 0,
          answeredCalls: 0,
          convertedCalls: 0,
          scheduledCalls: 0,
          rejectedCalls: 0,
          totalDuration: 0,
        };

        sdr.totalCalls += 1;
        if (isAnswered) sdr.answeredCalls += 1;
        if (log.outcome === 'answered_converted') sdr.convertedCalls += 1;
        if (log.outcome === 'answered_callback') sdr.scheduledCalls += 1;
        if (log.outcome === 'answered_rejected') sdr.rejectedCalls += 1;
        sdr.totalDuration += log.duration_seconds || 0;

        sdrMap.set(uId, sdr);
      });

      const contactRate = totalCalls > 0 ? (answeredCount / totalCalls) * 100 : 0;
      const conversionRate = totalCalls > 0 ? (convertedCount / totalCalls) * 100 : 0;
      const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

      return {
        totalCalls,
        answeredCount,
        convertedCount,
        scheduledCount,
        rejectedCount,
        noAnswerCount,
        contactRate: Number(contactRate.toFixed(1)),
        conversionRate: Number(conversionRate.toFixed(1)),
        avgDurationSeconds: avgDuration,
        rejectionBreakdown: rejectionReasonMap,
        sdrPerformances: Array.from(sdrMap.values()),
      };
    },
    enabled: !!selectedEmpresaId,
  });
}

export function useMutateDialer() {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();

  const createCampaign = useMutation({
    mutationFn: async ({
      title,
      description,
      assigned_to,
      script_id,
      lead_ids,
    }: {
      title: string;
      description?: string;
      assigned_to?: string | null;
      script_id?: string | null;
      lead_ids: string[];
    }) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');
      if (lead_ids.length === 0) throw new Error('Nenhum lead selecionado para a fila');

      // 1. Create Campaign
      const { data: campaign, error: campError } = await supabase
        .schema('core_comercial')
        .from('dialer_campaigns')
        .insert({
          empresa_id: selectedEmpresaId,
          title,
          description: description || null,
          assigned_to: assigned_to || null,
          script_id: script_id || null,
          status: 'active',
          total_leads: lead_ids.length,
          completed_leads: 0,
        })
        .select()
        .single();

      if (campError) throw campError;

      // 2. Create Queue Items in Batch
      const queueItems = lead_ids.map((leadId, idx) => ({
        campaign_id: campaign.id,
        lead_id: leadId,
        assigned_to: assigned_to || null,
        status: 'pending',
        attempts_count: 0,
        max_attempts: 3,
        sort_order: idx + 1,
      }));

      const { error: queueError } = await supabase
        .schema('core_comercial')
        .from('dialer_queue_items')
        .insert(queueItems);

      if (queueError) throw queueError;

      return campaign as DialerCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialer_campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const logCallAndAdvance = useMutation({
    mutationFn: async ({
      queueItemId,
      campaignId,
      leadId,
      outcome,
      durationSeconds,
      notes,
      phoneCalled,
      contactPerson,
      scheduledCallbackAt,
      rejectionReason,
      userId,
      maxAttempts = 3,
    }: {
      queueItemId: string;
      campaignId: string;
      leadId: string;
      outcome: CallOutcome;
      durationSeconds: number;
      notes?: string;
      phoneCalled?: string;
      contactPerson?: string;
      scheduledCallbackAt?: string | null;
      rejectionReason?: RejectionReason | null;
      userId?: string | null;
      maxAttempts?: number;
    }) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');

      // 1. Insert Call Log
      const { data: log, error: logError } = await supabase
        .schema('core_comercial')
        .from('lead_call_logs')
        .insert({
          empresa_id: selectedEmpresaId,
          lead_id: leadId,
          campaign_id: campaignId,
          queue_item_id: queueItemId,
          user_id: userId || null,
          outcome,
          duration_seconds: durationSeconds,
          notes: notes || null,
          phone_called: phoneCalled || null,
          contact_person: contactPerson || null,
          scheduled_callback_at: scheduledCallbackAt || null,
          rejection_reason: rejectionReason || null,
        })
        .select()
        .single();

      if (logError) throw logError;

      // 2. Calculate New Queue Item Status & Order
      let nextStatus: string = 'pending';
      let nextScheduledFor: string | null = null;
      let nextSortOrderModifier = 0;

      if (outcome === 'answered_converted') {
        nextStatus = 'converted';
      } else if (outcome === 'answered_rejected') {
        nextStatus = 'rejected';
      } else if (outcome === 'answered_callback') {
        nextStatus = 'scheduled';
        nextScheduledFor = scheduledCallbackAt || null;
      } else if (outcome === 'no_answer' || outcome === 'busy' || outcome === 'gatekeeper_blocked') {
        // Send to bottom of today's queue (rodízio)
        nextStatus = 'no_answer';
        nextSortOrderModifier = 10000; // puts at end
      } else {
        nextStatus = 'pending';
      }

      // 3. Fetch current queue item attempts
      const { data: currentQueueItem } = await supabase
        .schema('core_comercial')
        .from('dialer_queue_items')
        .select('attempts_count, sort_order')
        .eq('id', queueItemId)
        .single();

      const newAttempts = (currentQueueItem?.attempts_count || 0) + 1;
      const currentSort = currentQueueItem?.sort_order || 0;

      // If exceeded max attempts without contact, mark as completed/skipped
      if (nextStatus === 'no_answer' && newAttempts >= maxAttempts) {
        nextStatus = 'skipped';
      }

      // Update Queue Item
      const { error: updateQueueError } = await supabase
        .schema('core_comercial')
        .from('dialer_queue_items')
        .update({
          status: nextStatus,
          attempts_count: newAttempts,
          scheduled_for: nextScheduledFor,
          scheduled_notes: notes || null,
          sort_order: currentSort + nextSortOrderModifier,
          last_attempt_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', queueItemId);

      if (updateQueueError) throw updateQueueError;

      // 4. Update Lead Record (last called, call attempts, blacklist if rejected)
      const leadUpdatePayload: Record<string, any> = {
        last_called_at: new Date().toISOString(),
        call_attempts_count: newAttempts,
        updated_at: new Date().toISOString(),
      };

      if (outcome === 'answered_rejected') {
        leadUpdatePayload.do_not_call = true;
        leadUpdatePayload.do_not_call_reason = rejectionReason || 'Recusado na prospecção telefônica';
      }

      await supabase
        .schema('core_comercial')
        .from('leads')
        .update(leadUpdatePayload)
        .eq('id', leadId);

      // 5. Update Campaign Progress Counter
      if (['converted', 'rejected', 'skipped'].includes(nextStatus)) {
        await supabase
          .schema('core_comercial')
          .from('dialer_campaigns')
          .update({
            completed_leads: supabase.rpc ? undefined : 1, // fallback increment
            updated_at: new Date().toISOString(),
          })
          .eq('id', campaignId);
      }

      return log;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['dialer_queue_items', vars.campaignId] });
      queryClient.invalidateQueries({ queryKey: ['lead_call_logs', vars.leadId] });
      queryClient.invalidateQueries({ queryKey: ['dialer_supervisor_kpis'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const createQuickPresupuesto = useMutation({
    mutationFn: async (payload: QuickPresupuestoPayload) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');

      // 1. Generate unique code
      const randNum = Math.floor(1000 + Math.random() * 9000);
      const codigo = `EST-${new Date().getFullYear()}-${randNum}`;

      // Calculate totals
      let totalRevenue = 0;
      let totalCost = 0;

      const itemsWithCalculations = payload.items.map(item => {
        const totalHours = item.quantity * item.hours_per_day * item.days_per_week * 4; // 1 month standard
        const itemRevenue = totalHours * (item.sell_rate_hour || 28);
        const itemCost = totalHours * (item.sell_rate_hour * 0.70); // 30% margin default
        totalRevenue += itemRevenue;
        totalCost += itemCost;
        return {
          ...item,
          totalHours,
          itemRevenue,
          itemCost,
        };
      });

      const marginPercent = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 30;

      // 2. Insert Estimacion in core_comercial.estimaciones
      const { data: estimacion, error: estError } = await supabase
        .schema('core_comercial')
        .from('estimaciones')
        .insert({
          empresa_id: selectedEmpresaId,
          codigo,
          lead_id: payload.lead_id,
          estimation_type: 'new_allocation',
          contact_name: payload.contact_name,
          contact_email: payload.contact_email,
          expected_start_date: payload.expected_start_date || null,
          general_notes: payload.notes || `Pré-orçamento gerado via Cockpit Discador (Power Dialer). Cidade: ${payload.work_city || 'N/A'}`,
          status: 'draft',
        })
        .select()
        .single();

      if (estError) throw estError;

      // 3. Insert Version
      const { data: version, error: verError } = await supabase
        .schema('core_comercial')
        .from('estimacion_versions')
        .insert({
          empresa_id: selectedEmpresaId,
          estimacion_id: estimacion.id,
          version_number: 1,
          status: 'draft',
          total_estimated_cost: totalCost,
          total_estimated_revenue: totalRevenue,
          estimated_margin_percent: marginPercent,
          notes: 'Versão inicial pré-preenchida no Cockpit de Prospecção',
        })
        .select()
        .single();

      if (verError) throw verError;

      // 4. Update Estimacion with current_version_id
      await supabase
        .schema('core_comercial')
        .from('estimaciones')
        .update({ current_version_id: version.id })
        .eq('id', estimacion.id);

      // 5. Insert Estimacion Items
      if (itemsWithCalculations.length > 0) {
        const estItemsToInsert = itemsWithCalculations.map(it => ({
          empresa_id: selectedEmpresaId,
          estimacion_version_id: version.id,
          job_function_id: it.job_function_id,
          quantity: it.quantity,
          planned_hours_per_day: it.hours_per_day,
          planned_days_per_week: it.days_per_week,
          total_hours: it.totalHours,
          includes_accommodation: it.includes_accommodation,
          includes_transport: it.includes_transport,
          includes_ppe: true,
          base_cost_hour: Number((it.sell_rate_hour * 0.70).toFixed(2)),
          recommended_sell_rate: it.sell_rate_hour,
          minimum_sell_rate: Number((it.sell_rate_hour * 0.90).toFixed(2)),
          sell_rate_hour: it.sell_rate_hour,
          margin_percent: marginPercent,
        }));

        await supabase
          .schema('core_comercial')
          .from('estimacion_items')
          .insert(estItemsToInsert);
      }

      // 6. Move Lead stage in Kanban to "Presupuesto Solicitado" / "Negociación" if exists
      const { data: stages } = await supabase
        .schema('core_comercial')
        .from('kanban_stages')
        .select('id, name')
        .eq('empresa_id', selectedEmpresaId);

      if (stages) {
        const budgetStage = stages.find(s => 
          s.name.toLowerCase().includes('orçamento') || 
          s.name.toLowerCase().includes('presupuesto') || 
          s.name.toLowerCase().includes('negocia')
        );
        if (budgetStage) {
          await supabase
            .schema('core_comercial')
            .from('leads')
            .update({ stage_id: budgetStage.id })
            .eq('id', payload.lead_id);
        }
      }

      return estimacion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estimaciones'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['kanban_stages'] });
    },
  });

  return {
    createCampaign: createCampaign.mutateAsync,
    isCreatingCampaign: createCampaign.isPending,
    logCallAndAdvance: logCallAndAdvance.mutateAsync,
    isLoggingCall: logCallAndAdvance.isPending,
    createQuickPresupuesto: createQuickPresupuesto.mutateAsync,
    isCreatingPresupuesto: createQuickPresupuesto.isPending,
  };
}
