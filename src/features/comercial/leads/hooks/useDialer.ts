import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { useCommercialScope, getCommercialProfileByUser, COMMERCIAL_DEPARTMENT_ID } from './useLeads';
import type { 
  DialerCampaign, 
  DialerQueueItem, 
  LeadCallLog, 
  SalesScript, 
  CallOutcome, 
  RejectionReason,
  QuickPresupuestoPayload,
  DialerCampaignStatus
} from '../types/dialerTypes';

export interface ScheduledAppointmentItem {
  id: string; // queue_item_id
  campaign_id: string | null;
  lead_id: string;
  assigned_to?: string | null;
  status: string;
  priority: 'high' | 'normal' | 'low';
  scheduled_for: string; // ISO
  scheduled_notes?: string | null;
  tags?: string[];
  origin_campaign_title?: string | null;
  attempts_count: number;
  last_attempt_at?: string | null;
  created_at: string;
  updated_at: string;
  campaign?: {
    id: string;
    title: string;
    empresa_id: string;
  } | null;
  lead?: {
    id: string;
    name: string;
    company_name: string;
    phone?: string;
    email?: string;
    city?: string;
    sector?: string;
    cargo?: string;
    notes?: string;
  };
  assigned_user?: {
    id: string;
    display_name: string;
    email: string;
  } | null;
}

export function extractTagsFromAppointment(
  tags?: string[] | null,
  scheduled_notes?: string | null
): string[] {
  const result = new Set<string>();
  if (Array.isArray(tags)) {
    tags.forEach(t => {
      const cleaned = (t || '').trim().replace(/^#+/, '');
      if (cleaned) result.add(`#${cleaned}`);
    });
  }
  if (scheduled_notes) {
    const matches = scheduled_notes.match(/#[A-Za-zÀ-ÖØ-öø-ÿ0-9_-]+(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ0-9_-]+)*/g);
    if (matches) {
      matches.forEach(m => {
        const cleaned = m.trim();
        if (cleaned.length > 1 && cleaned.length <= 42) {
          result.add(cleaned);
        }
      });
    }
  }
  return Array.from(result);
}

export function useDialerAgenda() {
  const { selectedEmpresaId } = useEmpresa();
  const { isCommercialOperator, loggedCommercialProfile, activeCommercialProfile } = useCommercialScope();

  return useQuery({
    queryKey: ["dialer_agenda", selectedEmpresaId, loggedCommercialProfile?.userId || activeCommercialProfile?.userId || "all"],
    queryFn: async () => {
      if (!selectedEmpresaId) return [];

      const { data: queueItems, error } = await supabase
        .schema("core_comercial")
        .from("dialer_queue_items")
        .select(`
          id,
          campaign_id,
          lead_id,
          assigned_to,
          status,
          priority,
          scheduled_for,
          scheduled_notes,
          tags,
          origin_campaign_title,
          attempts_count,
          last_attempt_at,
          created_at,
          updated_at,
          campaign:dialer_campaigns!campaign_id ( id, title, empresa_id, assigned_to ),
          lead:leads!lead_id ( id, name, company_name, phone, email, city, sector, cargo, notes, empresa_id )
        `)
        .not("scheduled_for", "is", null)
        .order("scheduled_for", { ascending: true });

      if (error) throw error;

      const targetUserId = isCommercialOperator
        ? loggedCommercialProfile?.userId
        : activeCommercialProfile?.userId || null;

      const targetEmpresaId = isCommercialOperator
        ? loggedCommercialProfile?.empresaId || selectedEmpresaId
        : activeCommercialProfile?.empresaId || null;

      const filtered = (queueItems || []).filter((it: any) => {
        if (targetUserId) {
          const itemOwner = it.assigned_to || it.campaign?.assigned_to;
          if (itemOwner) return itemOwner === targetUserId;
          if (targetEmpresaId) {
            return it.campaign?.empresa_id === targetEmpresaId || it.lead?.empresa_id === targetEmpresaId;
          }
          return false;
        }
        if (targetEmpresaId) {
          return (
            it.campaign?.empresa_id === targetEmpresaId ||
            it.lead?.empresa_id === targetEmpresaId ||
            (!it.campaign?.empresa_id && !it.lead?.empresa_id)
          );
        }
        return true;
      });

      const { data: users } = await supabase
        .from("mcs_users")
        .select("id, display_name, email")
        .eq("department_id", COMMERCIAL_DEPARTMENT_ID);

      const userMap = new Map<string, any>();
      (users || []).forEach(u => userMap.set(u.id, u));

      return filtered.map((it: any) => ({
        ...it,
        priority: it.priority || "normal",
        tags: extractTagsFromAppointment(it.tags, it.scheduled_notes),
        origin_campaign_title: it.origin_campaign_title || it.campaign?.title || null,
        assigned_user: (it.assigned_to || it.campaign?.assigned_to)
          ? userMap.get(it.assigned_to || it.campaign?.assigned_to) || null
          : null,
      })) as ScheduledAppointmentItem[];
    },
    enabled: !!selectedEmpresaId,
  });
}

export function useSalesScripts() {
  const { selectedEmpresaId } = useEmpresa();
  const { isCommercialOperator, loggedCommercialProfile, activeCommercialProfile } = useCommercialScope();

  const targetProfile = isCommercialOperator ? loggedCommercialProfile : activeCommercialProfile;
  const effectiveEmpresaId = targetProfile?.empresaId || selectedEmpresaId;

  return useQuery({
    queryKey: ['sales_scripts', effectiveEmpresaId, targetProfile?.key || 'all'],
    queryFn: async () => {
      if (!effectiveEmpresaId) return [];

      let query = supabase
        .schema('core_comercial')
        .from('sales_scripts')
        .select('*');

      if (!isCommercialOperator && !activeCommercialProfile) {
        // Super Admin viewing "Todos": show all official commercial scripts + current company scripts
        query = query.or(`empresa_id.eq.${effectiveEmpresaId},sector.like.oficial_%`);
      } else {
        query = query.eq('empresa_id', effectiveEmpresaId);
      }

      const { data, error } = await query.order('is_default', { ascending: false });
      if (error) throw error;

      const list = (data || []) as SalesScript[];
      if (targetProfile) {
        const expectedPrefix = `oficial_${targetProfile.key}_`;
        return list.sort((a, b) => {
          const aMatch = (a.sector || '').startsWith(expectedPrefix) ? 1 : 0;
          const bMatch = (b.sector || '').startsWith(expectedPrefix) ? 1 : 0;
          if (aMatch !== bMatch) return bMatch - aMatch;
          if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
          return 0;
        });
      }
      return list;
    },
    enabled: !!effectiveEmpresaId,
  });
}

export function useDialerCampaigns() {
  const { selectedEmpresaId } = useEmpresa();
  const { isCommercialOperator, loggedCommercialProfile, activeCommercialProfile } = useCommercialScope();

  return useQuery({
    queryKey: ["dialer_campaigns", selectedEmpresaId, loggedCommercialProfile?.userId || activeCommercialProfile?.userId || "all"],
    queryFn: async () => {
      if (!selectedEmpresaId) return [];

      let query = supabase
        .schema("core_comercial")
        .from("dialer_campaigns")
        .select(`
          *,
          script:sales_scripts(*)
        `)
        .order("created_at", { ascending: false });

      if (isCommercialOperator && loggedCommercialProfile) {
        query = query.eq("assigned_to", loggedCommercialProfile.userId);
      } else if (activeCommercialProfile) {
        query = query.eq("assigned_to", activeCommercialProfile.userId);
      }

      const { data: campaigns, error } = await query;

      if (error) throw error;

      const { data: users } = await supabase
        .from("mcs_users")
        .select("id, display_name, email")
        .eq("department_id", COMMERCIAL_DEPARTMENT_ID);

      const userMap = new Map<string, { id: string; display_name: string; email: string }>();
      (users || []).forEach(u => userMap.set(u.id, u));

      const campaignIds = (campaigns || []).map(c => c.id);
      const statsMap = new Map<string, {
        total: number;
        pending: number;
        callable: number;
        completed: number;
        attempted_leads: number;
        calls_count: number;
        total_duration_seconds: number;
        interested: number;
        converted: number;
        scheduled: number;
        rejected: number;
        no_answer: number;
        skipped: number;
      }>();

      const ensureStats = (campId: string) => {
        let cur = statsMap.get(campId);
        if (!cur) {
          cur = {
            total: 0,
            pending: 0,
            callable: 0,
            completed: 0,
            attempted_leads: 0,
            calls_count: 0,
            total_duration_seconds: 0,
            interested: 0,
            converted: 0,
            scheduled: 0,
            rejected: 0,
            no_answer: 0,
            skipped: 0,
          };
          statsMap.set(campId, cur);
        }
        return cur;
      };

      if (campaignIds.length > 0) {
        // Fetch all queue items across batches (PostgREST 1000-row pagination)
        let fromIdx = 0;
        const pageSize = 1000;
        const allQueueItems: any[] = [];
        while (true) {
          const { data: chunk, error: qErr } = await supabase
            .schema("core_comercial")
            .from("dialer_queue_items")
            .select("campaign_id, status, attempts_count, scheduled_for")
            .in("campaign_id", campaignIds)
            .range(fromIdx, fromIdx + pageSize - 1);
          if (qErr || !chunk || chunk.length === 0) break;
          allQueueItems.push(...chunk);
          if (chunk.length < pageSize) break;
          fromIdx += pageSize;
        }

        const nowMs = Date.now();
        allQueueItems.forEach(item => {
          const current = ensureStats(item.campaign_id);
          current.total += 1;
          if ((item.attempts_count || 0) > 0 || item.status !== "pending") {
            current.attempted_leads += 1;
          }

          if (item.status === "pending" || item.status === "in_progress") {
            if ((item.attempts_count || 0) > 0 && item.status === "pending") {
              // Historical leads where material was sent before 'interested' status existed
              current.interested += 1;
              current.completed += 1;
            } else {
              current.pending += 1;
              current.callable += 1;
            }
          } else if (item.status === "no_answer") {
            current.no_answer += 1;
            current.callable += 1;
          } else if (item.status === "scheduled") {
            current.scheduled += 1;
            const isDue = item.scheduled_for && new Date(item.scheduled_for).getTime() <= nowMs;
            if (isDue) {
              current.callable += 1;
            } else {
              current.completed += 1;
            }
          } else if (item.status === "interested") {
            current.interested += 1;
            current.completed += 1;
          } else if (item.status === "converted") {
            current.converted += 1;
            current.completed += 1;
          } else if (item.status === "rejected") {
            current.rejected += 1;
            current.completed += 1;
          } else if (item.status === "skipped") {
            current.skipped += 1;
            current.completed += 1;
          }
        });

        // Fetch call logs count & duration per campaign
        let logFrom = 0;
        while (true) {
          const { data: logChunk, error: lErr } = await supabase
            .schema("core_comercial")
            .from("lead_call_logs")
            .select("campaign_id, duration_seconds")
            .in("campaign_id", campaignIds)
            .range(logFrom, logFrom + pageSize - 1);
          if (lErr || !logChunk || logChunk.length === 0) break;
          logChunk.forEach((lg: any) => {
            if (!lg.campaign_id) return;
            const current = ensureStats(lg.campaign_id);
            current.calls_count += 1;
            current.total_duration_seconds += Number(lg.duration_seconds) || 0;
          });
          if (logChunk.length < pageSize) break;
          logFrom += pageSize;
        }
      }

      const enriched = (campaigns || []).map(c => {
        const assignedUser = c.assigned_to ? userMap.get(c.assigned_to) || null : null;
        const fallbackTotal = c.total_leads || 0;
        const fallbackCompleted = c.completed_leads || 0;
        const stats = statsMap.get(c.id) || {
          total: fallbackTotal,
          pending: Math.max(0, fallbackTotal - fallbackCompleted),
          callable: Math.max(0, fallbackTotal - fallbackCompleted),
          completed: fallbackCompleted,
          attempted_leads: fallbackCompleted,
          calls_count: 0,
          total_duration_seconds: 0,
          interested: 0,
          converted: 0,
          scheduled: 0,
          rejected: 0,
          no_answer: 0,
          skipped: 0,
        };

        return {
          ...c,
          total_leads: stats.total > 0 ? stats.total : fallbackTotal,
          completed_leads: stats.total > 0 ? stats.completed : fallbackCompleted,
          assigned_user: assignedUser,
          items_count: stats,
        };
      });

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
          script:sales_scripts(*)
        `)
        .eq('id', campaignId)
        .single();

      if (error) throw error;

      let assignedUser = null;
      if (data.assigned_to) {
        const { data: u } = await supabase
          .from('mcs_users')
          .select('id, display_name, email')
          .eq('id', data.assigned_to)
          .single();
        if (u) assignedUser = u;
      }

      return {
        ...data,
        assigned_user: assignedUser,
      } as DialerCampaign;
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

      const now = new Date().getTime();

      const getQueueItemPriority = (item: DialerQueueItem): number => {
        const isDueScheduled =
          item.status === 'scheduled' &&
          item.scheduled_for &&
          new Date(item.scheduled_for).getTime() <= now;
        if (isDueScheduled) return 1;
        if (item.status === 'in_progress') return 2;
        if (item.status === 'pending' && (item.attempts_count || 0) === 0) return 3;
        if (item.status === 'no_answer') return 4;
        // Already processed / future scheduled items
        if (item.status === 'scheduled') return 5;
        if (item.status === 'interested' || (item.status === 'pending' && (item.attempts_count || 0) > 0)) return 6;
        if (item.status === 'converted') return 7;
        if (item.status === 'rejected') return 8;
        if (item.status === 'skipped') return 9;
        return 99;
      };

      return items.sort((a, b) => {
        const prioA = getQueueItemPriority(a);
        const prioB = getQueueItemPriority(b);

        if (prioA !== prioB) return prioA - prioB;

        return a.sort_order - b.sort_order;
      });
    },
    enabled: !!campaignId,
    refetchInterval: 30000,
  });
}

export function useDialerDirectQueueItems(queueItemIds?: string[]) {
  const cleanIds = (queueItemIds || []).filter(Boolean);
  return useQuery({
    queryKey: ['dialer_direct_queue_items', cleanIds.join(',')],
    queryFn: async () => {
      if (cleanIds.length === 0) return [];
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('dialer_queue_items')
        .select(`
          *,
          lead:leads(*)
        `)
        .in('id', cleanIds);

      if (error) throw error;
      const items = (data || []).map((it: any) => ({
        ...it,
        tags: extractTagsFromAppointment(it.tags, it.scheduled_notes),
      })) as DialerQueueItem[];

      // Preserve order of cleanIds if specified, or sort by scheduled_for
      const orderMap = new Map<string, number>();
      cleanIds.forEach((id, idx) => orderMap.set(id, idx));

      return items.sort((a, b) => {
        const idxA = orderMap.get(a.id) ?? 999;
        const idxB = orderMap.get(b.id) ?? 999;
        return idxA - idxB;
      });
    },
    enabled: cleanIds.length > 0,
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
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch users for mapping
      const userIds = Array.from(new Set((data || []).map(l => l.user_id).filter(Boolean)));
      let userMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('mcs_users')
          .select('id, display_name, email')
          .in('id', userIds);
        (users || []).forEach(u => userMap.set(u.id, u));
      }

      const enriched = (data || []).map(log => ({
        ...log,
        user: log.user_id ? userMap.get(log.user_id) || null : null,
      }));

      return enriched as LeadCallLog[];
    },
    enabled: !!leadId,
  });
}

export function useDialerTodaySessionStats() {
  const { selectedEmpresaId } = useEmpresa();
  const { isCommercialOperator, loggedCommercialProfile, activeCommercialProfile } = useCommercialScope();
  const targetUserId = isCommercialOperator
    ? loggedCommercialProfile?.userId || null
    : activeCommercialProfile?.userId || null;

  return useQuery({
    queryKey: ['dialer_today_session_stats', selectedEmpresaId, targetUserId || 'all'],
    queryFn: async () => {
      const now = new Date();
      const startOfDayIso = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        0,
        0,
        0
      ).toISOString();

      let q = supabase
        .schema('core_comercial')
        .from('lead_call_logs')
        .select('id, campaign_id, duration_seconds, outcome, created_at')
        .gte('created_at', startOfDayIso);

      if (targetUserId) {
        q = q.eq('user_id', targetUserId);
      }

      const { data, error } = await q;
      if (error) throw error;

      const rows = data || [];
      let todayCallsCount = 0;
      let todayDurationSeconds = 0;
      const byCampaign: Record<string, { callsCount: number; durationSeconds: number }> = {};

      rows.forEach((r: any) => {
        todayCallsCount += 1;
        const dur = Number(r.duration_seconds) || 0;
        todayDurationSeconds += dur;
        if (r.campaign_id) {
          if (!byCampaign[r.campaign_id]) {
            byCampaign[r.campaign_id] = { callsCount: 0, durationSeconds: 0 };
          }
          byCampaign[r.campaign_id].callsCount += 1;
          byCampaign[r.campaign_id].durationSeconds += dur;
        }
      });

      return {
        todayCallsCount,
        todayDurationSeconds,
        byCampaign,
      };
    },
    enabled: !!selectedEmpresaId,
    refetchInterval: 30000,
  });
}

export type SupervisorPeriodFilter = 'today' | '7d' | '30d' | 'all';

export interface DetailedCallReportRow {
  id: string;
  created_at: string;
  user_id?: string | null;
  userName: string;
  commercialFlag?: string;
  empresaName?: string;
  lead_id: string;
  companyName: string;
  contactName: string;
  phoneCalled: string;
  outcome: string;
  durationSeconds: number;
  notes?: string | null;
  scheduledCallbackAt?: string | null;
  rejectionReason?: string | null;
}

export function useDialerSupervisorKPIs(periodFilter: SupervisorPeriodFilter = 'all') {
  const { selectedEmpresaId } = useEmpresa();
  const { isCommercialOperator, loggedCommercialProfile, activeCommercialProfile } = useCommercialScope();
  const targetUserId = isCommercialOperator
    ? loggedCommercialProfile?.userId || null
    : activeCommercialProfile?.userId || null;

  return useQuery({
    queryKey: ['dialer_supervisor_kpis', selectedEmpresaId, targetUserId || 'all', periodFilter],
    queryFn: async () => {
      if (!selectedEmpresaId) return null;

      // 1. Fetch call logs with lead summary (cross-company when Super Admin views all commercials, or scoped to targetUserId)
      let logQuery = supabase
        .schema('core_comercial')
        .from('lead_call_logs')
        .select(`
          *,
          lead:leads!lead_id ( id, name, company_name, phone, city )
        `)
        .order('created_at', { ascending: false });

      if (targetUserId) {
        logQuery = logQuery.eq('user_id', targetUserId);
      }

      if (periodFilter !== 'all') {
        const now = new Date();
        let sinceIso: string;
        if (periodFilter === 'today') {
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          sinceIso = startOfDay.toISOString();
        } else if (periodFilter === '7d') {
          const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          sinceIso = d.toISOString();
        } else {
          const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          sinceIso = d.toISOString();
        }
        logQuery = logQuery.gte('created_at', sinceIso);
      }

      const { data: logs, error: logError } = await logQuery;

      if (logError) throw logError;

      // 2. Fetch users for names
      const { data: users } = await supabase
        .from('mcs_users')
        .select('id, display_name, email');

      const userMap = new Map<string, { display_name: string; email: string }>();
      (users || []).forEach(u => userMap.set(u.id, u));

      const allLogs = logs || [];
      const totalCalls = allLogs.length;

      const startOfTodayMs = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        new Date().getDate(),
        0,
        0,
        0
      ).getTime();

      let todayCalls = 0;
      let answeredCount = 0;
      let convertedCount = 0;
      let scheduledCount = 0;
      let materialCount = 0;
      let rejectedCount = 0;
      let noAnswerCount = 0;
      let totalDuration = 0;
      let answeredDurationTotal = 0;
      let timedCallsCount = 0;
      let timedAnsweredCount = 0;

      const sdrMap = new Map<string, {
        userId: string;
        userName: string;
        flag?: string;
        empresaName?: string;
        totalCalls: number;
        timedCalls: number;
        todayCalls: number;
        answeredCalls: number;
        convertedCalls: number;
        scheduledCalls: number;
        materialCalls: number;
        rejectedCalls: number;
        totalDuration: number;
        avgDurationSeconds: number;
      }>();

      const rejectionReasonMap: Record<string, number> = {
        has_own_team: 0,
        no_demand: 0,
        price_too_high: 0,
        does_not_outsource: 0,
        bad_contact: 0,
        other: 0,
      };

      const recentCallLogs: DetailedCallReportRow[] = [];

      allLogs.forEach((log: any, idx: number) => {
        const dur = Number(log.duration_seconds) || 0;
        totalDuration += dur;
        if (dur > 0) timedCallsCount += 1;

        const createdMs = new Date(log.created_at).getTime();
        const isToday = createdMs >= startOfTodayMs;
        if (isToday) todayCalls += 1;

        const isAnswered = log.outcome.startsWith('answered');
        if (isAnswered) {
          answeredCount += 1;
          answeredDurationTotal += dur;
          if (dur > 0) timedAnsweredCount += 1;
        }

        if (log.outcome === 'answered_converted') convertedCount += 1;
        else if (log.outcome === 'answered_callback') scheduledCount += 1;
        else if (log.outcome === 'answered_interested') materialCount += 1;
        else if (log.outcome === 'answered_rejected') rejectedCount += 1;
        else if (log.outcome === 'no_answer' || log.outcome === 'busy') noAnswerCount += 1;

        if (log.rejection_reason && rejectionReasonMap[log.rejection_reason] !== undefined) {
          rejectionReasonMap[log.rejection_reason] += 1;
        }

        const uId = log.user_id || 'unassigned';
        const uObj = userMap.get(uId);
        const prof = uObj ? getCommercialProfileByUser({ id: uId, display_name: uObj.display_name, email: uObj.email }) : getCommercialProfileByUser(uId);
        const uName = prof?.displayName || uObj?.display_name || uObj?.email || 'Operador Comercial';

        const sdr = sdrMap.get(uId) || {
          userId: uId,
          userName: uName,
          flag: prof?.flag,
          empresaName: prof?.empresaName,
          totalCalls: 0,
          timedCalls: 0,
          todayCalls: 0,
          answeredCalls: 0,
          convertedCalls: 0,
          scheduledCalls: 0,
          materialCalls: 0,
          rejectedCalls: 0,
          totalDuration: 0,
          avgDurationSeconds: 0,
        };

        sdr.totalCalls += 1;
        if (dur > 0) sdr.timedCalls += 1;
        if (isToday) sdr.todayCalls += 1;
        if (isAnswered) sdr.answeredCalls += 1;
        if (log.outcome === 'answered_converted') sdr.convertedCalls += 1;
        if (log.outcome === 'answered_callback') sdr.scheduledCalls += 1;
        if (log.outcome === 'answered_interested') sdr.materialCalls += 1;
        if (log.outcome === 'answered_rejected') sdr.rejectedCalls += 1;
        sdr.totalDuration += dur;
        sdr.avgDurationSeconds =
          sdr.timedCalls > 0
            ? Math.round(sdr.totalDuration / sdr.timedCalls)
            : 0;

        sdrMap.set(uId, sdr);

        if (idx < 250) {
          recentCallLogs.push({
            id: log.id,
            created_at: log.created_at,
            user_id: log.user_id,
            userName: uName,
            commercialFlag: prof?.flag,
            empresaName: prof?.empresaName,
            lead_id: log.lead_id,
            companyName: log.lead?.company_name || log.contact_person || 'Cliente',
            contactName: log.contact_person || log.lead?.name || '-',
            phoneCalled: log.phone_called || log.lead?.phone || '-',
            outcome: log.outcome,
            durationSeconds: dur,
            notes: log.notes,
            scheduledCallbackAt: log.scheduled_callback_at,
            rejectionReason: log.rejection_reason,
          });
        }
      });

      const contactRate = totalCalls > 0 ? (answeredCount / totalCalls) * 100 : 0;
      const conversionRate = totalCalls > 0 ? (convertedCount / totalCalls) * 100 : 0;
      const avgDuration = timedCallsCount > 0 ? Math.round(totalDuration / timedCallsCount) : (totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0);
      const answeredAvgDuration =
        timedAnsweredCount > 0
          ? Math.round(answeredDurationTotal / timedAnsweredCount)
          : answeredCount > 0
          ? Math.round(answeredDurationTotal / answeredCount)
          : 0;

      const sortedSdrs = Array.from(sdrMap.values()).sort((a, b) => b.totalCalls - a.totalCalls);

      return {
        totalCalls,
        todayCalls,
        answeredCount,
        convertedCount,
        scheduledCount,
        materialCount,
        rejectedCount,
        noAnswerCount,
        contactRate: Number(contactRate.toFixed(1)),
        conversionRate: Number(conversionRate.toFixed(1)),
        totalDurationSeconds: totalDuration,
        avgDurationSeconds: avgDuration,
        answeredAvgDurationSeconds: answeredAvgDuration,
        rejectionBreakdown: rejectionReasonMap,
        sdrPerformances: sortedSdrs,
        recentCallLogs,
      };
    },
    enabled: !!selectedEmpresaId,
  });
}

export function useMutateDialer() {
  const queryClient = useQueryClient();
  const { selectedEmpresaId } = useEmpresa();
  const { loggedCommercialProfile, activeCommercialProfile } = useCommercialScope();

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
      const assignedProfile = getCommercialProfileByUser(assigned_to);
      const effectiveAssignedTo =
        assigned_to ||
        loggedCommercialProfile?.userId ||
        activeCommercialProfile?.userId ||
        null;
      const effectiveEmpresaId =
        assignedProfile?.empresaId ||
        loggedCommercialProfile?.empresaId ||
        activeCommercialProfile?.empresaId ||
        selectedEmpresaId;

      if (!effectiveEmpresaId) throw new Error("Empresa não selecionada");
      if (lead_ids.length === 0) throw new Error("Nenhum lead selecionado para a fila");

      // 1. Create Campaign
      const { data: campaign, error: campError } = await supabase
        .schema("core_comercial")
        .from("dialer_campaigns")
        .insert({
          empresa_id: effectiveEmpresaId,
          title,
          description: description || null,
          assigned_to: effectiveAssignedTo,
          script_id: script_id || null,
          status: "active",
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
        assigned_to: effectiveAssignedTo,
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

  const updateCampaignStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DialerCampaignStatus }) => {
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('dialer_campaigns')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DialerCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialer_campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_campaign'] });
    },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      // 1. Fetch campaign details before deleting so we preserve origin title and operator on scheduled items
      const { data: camp } = await supabase
        .schema('core_comercial')
        .from('dialer_campaigns')
        .select('id, title, assigned_to')
        .eq('id', campaignId)
        .maybeSingle();

      // 2. Find ALL scheduled items belonging to this campaign (scheduled_for IS NOT NULL OR status = 'scheduled')
      const { data: allCampItems } = await supabase
        .schema('core_comercial')
        .from('dialer_queue_items')
        .select('id, assigned_to, status, scheduled_for')
        .eq('campaign_id', campaignId);

      const scheduledItems = (allCampItems || []).filter(
        it => Boolean(it.scheduled_for) || it.status === 'scheduled'
      );
      const nonScheduledIds = (allCampItems || [])
        .filter(it => !it.scheduled_for && it.status !== 'scheduled')
        .map(it => it.id);

      // 3. Detach scheduled appointments from the campaign so they stay 100% intact in the Agenda
      if (scheduledItems.length > 0) {
        for (const item of scheduledItems) {
          await supabase
            .schema('core_comercial')
            .from('dialer_queue_items')
            .update({
              campaign_id: null,
              origin_campaign_title: camp?.title || 'Trabalho Excluído',
              assigned_to: item.assigned_to || camp?.assigned_to || null,
              scheduled_for: item.scheduled_for || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.id);
        }
      }

      // 4. Delete ONLY non-scheduled queue items of this campaign
      if (nonScheduledIds.length > 0) {
        await supabase
          .schema('core_comercial')
          .from('dialer_queue_items')
          .delete()
          .in('id', nonScheduledIds);
      }

      // 5. Delete the campaign itself
      const { error } = await supabase
        .schema('core_comercial')
        .from('dialer_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;
      return { preservedCount: scheduledItems.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialer_campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_agenda'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_queue_items'] });
    },
  });

  const createCampaignFromAgenda = useMutation({
    mutationFn: async ({
      title,
      description,
      assigned_to,
      script_id,
      queue_item_ids,
    }: {
      title: string;
      description?: string;
      assigned_to?: string | null;
      script_id?: string | null;
      queue_item_ids: string[];
    }) => {
      const assignedProfile = getCommercialProfileByUser(assigned_to);
      const effectiveAssignedTo =
        assigned_to ||
        loggedCommercialProfile?.userId ||
        activeCommercialProfile?.userId ||
        null;
      const effectiveEmpresaId =
        assignedProfile?.empresaId ||
        loggedCommercialProfile?.empresaId ||
        activeCommercialProfile?.empresaId ||
        selectedEmpresaId;

      if (!effectiveEmpresaId) throw new Error('Empresa não selecionada');
      if (queue_item_ids.length === 0) throw new Error('Nenhum agendamento selecionado');

      // 1. Create Campaign
      const { data: campaign, error: campError } = await supabase
        .schema('core_comercial')
        .from('dialer_campaigns')
        .insert({
          empresa_id: effectiveEmpresaId,
          title,
          description: description || `Fila criada a partir de ${queue_item_ids.length} agendamento(s) da Agenda`,
          assigned_to: effectiveAssignedTo,
          script_id: script_id || null,
          status: 'active',
          total_leads: queue_item_ids.length,
          completed_leads: 0,
        })
        .select()
        .single();

      if (campError) throw campError;

      // 2. Link existing scheduled queue items to this new campaign while preserving their schedule, notes and tags
      for (let idx = 0; idx < queue_item_ids.length; idx++) {
        const qId = queue_item_ids[idx];
        const updatePayload: Record<string, any> = {
          campaign_id: campaign.id,
          sort_order: idx + 1,
          updated_at: new Date().toISOString(),
        };
        if (effectiveAssignedTo) {
          updatePayload.assigned_to = effectiveAssignedTo;
        }
        await supabase
          .schema('core_comercial')
          .from('dialer_queue_items')
          .update(updatePayload)
          .eq('id', qId);
      }

      return campaign as DialerCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialer_campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_agenda'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_queue_items'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_direct_queue_items'] });
    },
  });

  const logCallAndAdvance = useMutation({
    mutationFn: async ({
      queueItemId,
      campaignId,
      leadId,
      outcome,
      durationSeconds = 0,
      notes,
      phoneCalled,
      contactPerson,
      scheduledCallbackAt,
      rejectionReason,
      priority = 'normal',
      tags,
      userId,
      maxAttempts = 3,
      preserveExistingSchedule = false,
    }: {
      queueItemId: string;
      campaignId?: string | null;
      leadId: string;
      outcome: CallOutcome;
      durationSeconds?: number;
      notes?: string;
      phoneCalled?: string;
      contactPerson?: string;
      scheduledCallbackAt?: string | null;
      rejectionReason?: RejectionReason | null;
      priority?: 'high' | 'normal' | 'low';
      tags?: string[];
      userId?: string | null;
      maxAttempts?: number;
      preserveExistingSchedule?: boolean;
    }) => {
      const { data: authData } = await supabase.auth.getUser();
      const effectiveUserId =
        loggedCommercialProfile?.userId ||
        userId ||
        activeCommercialProfile?.userId ||
        authData?.user?.id ||
        null;

      const effectiveEmpresaId =
        loggedCommercialProfile?.empresaId ||
        activeCommercialProfile?.empresaId ||
        selectedEmpresaId;

      if (!effectiveEmpresaId) throw new Error('Empresa não selecionada');

      // 1. Insert Call Log
      const { data: log, error: logError } = await supabase
        .schema('core_comercial')
        .from('lead_call_logs')
        .insert({
          empresa_id: effectiveEmpresaId,
          lead_id: leadId,
          campaign_id: campaignId || null,
          queue_item_id: queueItemId,
          user_id: effectiveUserId,
          outcome,
          duration_seconds: durationSeconds || 0,
          notes: notes || null,
          phone_called: phoneCalled || null,
          contact_person: contactPerson || null,
          scheduled_callback_at: scheduledCallbackAt || null,
          rejection_reason: rejectionReason || null,
        })
        .select()
        .single();

      if (logError) throw logError;

      // 2. Fetch current queue item attempts & state first so we never overwrite an active callback
      const { data: currentQueueItem } = await supabase
        .schema('core_comercial')
        .from('dialer_queue_items')
        .select('status, scheduled_for, scheduled_notes, priority, attempts_count, sort_order, assigned_to, tags')
        .eq('id', queueItemId)
        .single();

      const newAttempts = (currentQueueItem?.attempts_count || 0) + 1;
      const currentSort = currentQueueItem?.sort_order || 0;

      const appendScheduledNote = (existingNotes?: string | null, addedNote?: string | null) => {
        const cleanExisting = (existingNotes || '').trim();
        const cleanAdded = (addedNote || '').trim();
        if (!cleanAdded) return cleanExisting || null;
        if (cleanExisting && cleanExisting.includes(cleanAdded)) return cleanExisting;
        const stamp = new Intl.DateTimeFormat('pt-PT', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date());
        const formattedAdded = `[${stamp}] ${cleanAdded}`;
        return cleanExisting ? `${cleanExisting}<br/>${formattedAdded}` : cleanAdded;
      };

      const hasExistingSchedule =
        currentQueueItem?.status === 'scheduled' && Boolean(currentQueueItem?.scheduled_for);
      const hasFutureSchedule =
        hasExistingSchedule &&
        new Date(currentQueueItem!.scheduled_for).getTime() > Date.now();

      // 3. Calculate New Queue Item Status & Order
      let nextStatus: string = 'pending';
      let nextScheduledFor: string | null = null;
      let nextScheduledNotes: string | null = notes || null;
      let nextPriority: string = priority || currentQueueItem?.priority || 'normal';
      let nextSortOrderModifier = 0;

      if (preserveExistingSchedule && hasExistingSchedule) {
        nextStatus = 'scheduled';
        nextScheduledFor = currentQueueItem!.scheduled_for;
        nextScheduledNotes = appendScheduledNote(currentQueueItem!.scheduled_notes, notes);
        nextPriority = currentQueueItem!.priority || priority || 'normal';
      } else if (outcome === 'answered_converted') {
        nextStatus = 'converted';
      } else if (outcome === 'answered_rejected') {
        nextStatus = 'rejected';
      } else if (outcome === 'answered_callback') {
        nextStatus = 'scheduled';
        nextScheduledFor = scheduledCallbackAt || currentQueueItem?.scheduled_for || null;
      } else if (outcome === 'answered_interested') {
        // Material sent! Preserve 'converted' or existing 'scheduled' callback if already set
        if (currentQueueItem?.status === 'converted') {
          nextStatus = 'converted';
        } else if (hasExistingSchedule) {
          nextStatus = 'scheduled';
          nextScheduledFor = currentQueueItem!.scheduled_for;
          nextScheduledNotes = appendScheduledNote(currentQueueItem!.scheduled_notes, notes);
          nextPriority = currentQueueItem!.priority || priority || 'normal';
        } else {
          nextStatus = 'interested';
        }
      } else if (outcome === 'no_answer' || outcome === 'busy' || outcome === 'gatekeeper_blocked') {
        // If calling early on a future scheduled appointment and client didn't pick up / gatekeeper, NEVER erase the future appointment!
        if (hasFutureSchedule) {
          nextStatus = 'scheduled';
          nextScheduledFor = currentQueueItem!.scheduled_for;
          nextScheduledNotes = appendScheduledNote(currentQueueItem!.scheduled_notes, notes);
          nextPriority = currentQueueItem!.priority || priority || 'normal';
        } else {
          nextStatus = 'no_answer';
          nextSortOrderModifier = 10000;
        }
      } else {
        nextStatus = 'pending';
      }

      if (nextStatus === 'no_answer' && newAttempts >= maxAttempts) {
        nextStatus = 'skipped';
      }

      // Update Queue Item
      const queueUpdateData: Record<string, any> = {
        status: nextStatus,
        attempts_count: newAttempts,
        scheduled_for: nextScheduledFor,
        scheduled_notes: nextScheduledNotes,
        priority: nextPriority,
        sort_order: currentSort + nextSortOrderModifier,
        last_attempt_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (tags !== undefined) {
        queueUpdateData.tags = extractTagsFromAppointment(tags, nextScheduledNotes || notes);
      } else if (outcome === 'answered_callback' || nextStatus === 'scheduled') {
        queueUpdateData.tags = extractTagsFromAppointment(currentQueueItem?.tags, nextScheduledNotes || notes);
      }

      if (effectiveUserId && (outcome === 'answered_callback' || !currentQueueItem?.assigned_to)) {
        queueUpdateData.assigned_to = effectiveUserId;
      }

      const { error: updateQueueError } = await supabase
        .schema('core_comercial')
        .from('dialer_queue_items')
        .update(queueUpdateData)
        .eq('id', queueItemId);

      if (updateQueueError) throw updateQueueError;

      // 4. Update Lead Record
      const leadUpdatePayload: Record<string, any> = {
        last_called_at: new Date().toISOString(),
        call_attempts_count: newAttempts,
        updated_at: new Date().toISOString(),
      };

      if (outcome === 'answered_rejected') {
        leadUpdatePayload.do_not_call = true;
        leadUpdatePayload.do_not_call_reason = rejectionReason || 'Recusado na prospecção telefônica';
      } else if (outcome === 'answered_callback' || outcome === 'answered_converted') {
        try {
          const { data: leadRow } = await supabase
            .schema('core_comercial')
            .from('leads')
            .select('empresa_id, stage_id, notes')
            .eq('id', leadId)
            .maybeSingle();

          if (preserveExistingSchedule && notes?.trim()) {
            const plainAdded = notes.replace(/<[^>]+>/g, '').trim();
            if (plainAdded) {
              const stamp = new Intl.DateTimeFormat('pt-PT', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date());
              const existingLeadNotes = (leadRow?.notes || '').trim();
              leadUpdatePayload.notes = existingLeadNotes
                ? `${existingLeadNotes}\n[${stamp}] ${plainAdded}`
                : `[${stamp}] ${plainAdded}`;
            }
          }

          const targetEmpId = leadRow?.empresa_id || selectedEmpresaId;
          if (targetEmpId) {
            const { data: empStages } = await supabase
              .schema('core_comercial')
              .from('kanban_stages')
              .select('id, name, name_es, order_index')
              .eq('empresa_id', targetEmpId)
              .order('order_index', { ascending: true });

            if (empStages && empStages.length > 0) {
              const currentStageObj = leadRow?.stage_id
                ? empStages.find(s => s.id === leadRow.stage_id)
                : undefined;
              const currentOrderIdx = currentStageObj?.order_index ?? 1;

              const callStage = empStages.find(s => {
                const n = (s.name || '').toLowerCase();
                const nes = (s.name_es || '').toLowerCase();
                return (
                  n.includes('liga') ||
                  n.includes('llamad') ||
                  n.includes('telemarketing') ||
                  nes.includes('llamad')
                );
              });

              if (callStage && callStage.order_index > currentOrderIdx) {
                leadUpdatePayload.stage_id = callStage.id;
              }
            }
          }
        } catch (stageErr) {
          console.warn('Could not auto-advance call stage:', stageErr);
        }
      }

      await supabase
        .schema('core_comercial')
        .from('leads')
        .update(leadUpdatePayload)
        .eq('id', leadId);

      // 5. Recompute Accurate Campaign Progress & Auto-Complete when no callable leads remain
      let campaignAutoCompleted = false;
      if (campaignId) {
        const { data: campItems } = await supabase
          .schema('core_comercial')
          .from('dialer_queue_items')
          .select('status, attempts_count, scheduled_for')
          .eq('campaign_id', campaignId);

        if (campItems && campItems.length > 0) {
          const nowMs = Date.now();
          let totalCount = campItems.length;
          let completedCount = 0;
          let callableCount = 0;

          campItems.forEach((it: any) => {
            if (it.status === 'pending' || it.status === 'in_progress') {
              if ((it.attempts_count || 0) > 0 && it.status === 'pending') {
                completedCount += 1;
              } else {
                callableCount += 1;
              }
            } else if (it.status === 'no_answer') {
              callableCount += 1;
            } else if (it.status === 'scheduled') {
              const isDue = it.scheduled_for && new Date(it.scheduled_for).getTime() <= nowMs;
              if (isDue) callableCount += 1;
              else completedCount += 1;
            } else {
              // interested, converted, rejected, skipped
              completedCount += 1;
            }
          });

          const campUpdate: Record<string, any> = {
            total_leads: totalCount,
            completed_leads: completedCount,
            updated_at: new Date().toISOString(),
          };

          if (callableCount === 0) {
            campUpdate.status = 'completed';
            campaignAutoCompleted = true;
          }

          await supabase
            .schema('core_comercial')
            .from('dialer_campaigns')
            .update(campUpdate)
            .eq('id', campaignId);
        }
      }

      return { ...log, _campaignAutoCompleted: campaignAutoCompleted };
    },
    onSuccess: (_, vars) => {
      if (vars.campaignId) {
        queryClient.invalidateQueries({ queryKey: ['dialer_queue_items', vars.campaignId] });
        queryClient.invalidateQueries({ queryKey: ['dialer_campaign', vars.campaignId] });
      }
      queryClient.invalidateQueries({ queryKey: ['dialer_direct_queue_items'] });
      queryClient.invalidateQueries({ queryKey: ['lead_call_logs', vars.leadId] });
      queryClient.invalidateQueries({ queryKey: ['dialer_supervisor_kpis'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_today_session_stats'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_agenda'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const completeCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      // Mark any leftover pending / no_answer items as skipped so the job closes cleanly (preserving scheduled, interested, converted, rejected)
      await supabase
        .schema('core_comercial')
        .from('dialer_queue_items')
        .update({
          status: 'skipped',
          updated_at: new Date().toISOString(),
        })
        .eq('campaign_id', campaignId)
        .in('status', ['pending', 'in_progress', 'no_answer']);

      const { count: totalCount } = await supabase
        .schema('core_comercial')
        .from('dialer_queue_items')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId);

      const { data, error } = await supabase
        .schema('core_comercial')
        .from('dialer_campaigns')
        .update({
          status: 'completed',
          completed_leads: totalCount || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId)
        .select()
        .single();

      if (error) throw error;
      return data as DialerCampaign;
    },
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: ['dialer_campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_campaign', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['dialer_queue_items', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['dialer_agenda'] });
    },
  });

  const createQuickPresupuesto = useMutation({
    mutationFn: async (payload: QuickPresupuestoPayload) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');

      const { data: authData } = await supabase.auth.getUser();
      const effectiveUserId = authData?.user?.id || null;

      const randNum = Math.floor(1000 + Math.random() * 9000);
      const codigo = `EST-${new Date().getFullYear()}-${randNum}`;

      let totalRevenue = 0;
      let totalCost = 0;

      const itemsWithCalculations = payload.items.map(item => {
        const totalHours = item.quantity * item.hours_per_day * item.days_per_week * 4;
        const itemRevenue = totalHours * (item.sell_rate_hour || 28);
        const itemCost = totalHours * (item.sell_rate_hour * 0.70);
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

      // Fetch lead context for country, client and address
      let leadCountryId: string | null = '2f487ab4-c7f5-4b70-9c37-995dc4cda125'; // Default Spain
      let leadClientId: string | null = null;
      let postalCode: string | null = payload.work_city || null;

      if (payload.lead_id) {
        const leadFiscalUpdates: Record<string, any> = {};
        if (payload.legal_name?.trim()) leadFiscalUpdates.legal_name = payload.legal_name.trim();
        if (payload.tax_id?.trim()) leadFiscalUpdates.tax_id = payload.tax_id.trim();

        if (Object.keys(leadFiscalUpdates).length > 0) {
          leadFiscalUpdates.updated_at = new Date().toISOString();
          await supabase
            .schema('core_comercial')
            .from('leads')
            .update(leadFiscalUpdates)
            .eq('id', payload.lead_id);
        }

        const { data: leadData } = await supabase
          .schema('core_comercial')
          .from('leads')
          .select('id, client_id, country_id, address_line, postal_code, city')
          .eq('id', payload.lead_id)
          .maybeSingle();

        if (leadData) {
          if (leadData.country_id) leadCountryId = leadData.country_id;
          if (leadData.client_id) leadClientId = leadData.client_id;
          if (leadData.postal_code || leadData.city) {
            postalCode = leadData.postal_code || leadData.city || payload.work_city;
          }
        }
      }

      // Se existir orçamento deste lead para atualizar
      if (payload.existing_estimacion_id) {
        const { data: updatedEst, error: updEstError } = await supabase
          .schema('core_comercial')
          .from('estimaciones')
          .update({
            client_id: leadClientId,
            country_id: leadCountryId,
            postal_code: postalCode,
            contact_name: payload.contact_name,
            contact_email: payload.contact_email,
            expected_start_date: payload.expected_start_date || null,
            general_notes: payload.notes || `Pré-orçamento atualizado via Cockpit Discador. Cidade: ${payload.work_city || 'N/A'}`,
            updated_by: effectiveUserId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payload.existing_estimacion_id)
          .select()
          .single();

        if (updEstError) throw updEstError;

        let targetVersionId = updatedEst.current_version_id;
        if (targetVersionId) {
          await supabase
            .schema('core_comercial')
            .from('estimacion_versions')
            .update({
              total_cost: totalCost,
              total_revenue: totalRevenue,
              margin_percent: marginPercent,
              updated_at: new Date().toISOString(),
            })
            .eq('id', targetVersionId);

          await supabase
            .schema('core_comercial')
            .from('estimacion_items')
            .delete()
            .eq('estimacion_version_id', targetVersionId);
        } else {
          const { data: newVer, error: newVerErr } = await supabase
            .schema('core_comercial')
            .from('estimacion_versions')
            .insert({
              empresa_id: selectedEmpresaId,
              estimacion_id: updatedEst.id,
              version_number: 1,
              status: 'active',
              total_cost: totalCost,
              total_revenue: totalRevenue,
              margin_percent: marginPercent,
              notes: 'Versão atualizada no Cockpit de Prospecção',
            })
            .select()
            .single();

          if (newVerErr) throw newVerErr;
          targetVersionId = newVer.id;
          await supabase
            .schema('core_comercial')
            .from('estimaciones')
            .update({ current_version_id: targetVersionId })
            .eq('id', updatedEst.id);
        }

        if (itemsWithCalculations.length > 0 && targetVersionId) {
          const estItemsToInsert = itemsWithCalculations.map(it => ({
            empresa_id: selectedEmpresaId,
            estimacion_id: updatedEst.id,
            estimacion_version_id: targetVersionId,
            job_function_id: it.job_function_id,
            job_function_name_snapshot: it.job_title || null,
            description: it.job_title || null,
            quantity: it.quantity,
            planned_hours_per_day: it.hours_per_day,
            planned_days_per_week: it.days_per_week,
            planned_total_hours: it.totalHours,
            includes_housing: Boolean(it.includes_accommodation),
            includes_transport: Boolean(it.includes_transport),
            includes_epi: true,
            base_cost_hour: Number((it.sell_rate_hour * 0.70).toFixed(2)),
            recommended_sell_rate_hour: it.sell_rate_hour,
            minimum_sell_rate_hour: Number((it.sell_rate_hour * 0.90).toFixed(2)),
            sell_rate_hour: it.sell_rate_hour,
            margin_percent: marginPercent,
          }));

          const { error: itemsError } = await supabase
            .schema('core_comercial')
            .from('estimacion_items')
            .insert(estItemsToInsert);

          if (itemsError) throw itemsError;
        }

        return updatedEst;
      }

      const { data: estimacion, error: estError } = await supabase
        .schema('core_comercial')
        .from('estimaciones')
        .insert({
          empresa_id: selectedEmpresaId,
          codigo,
          lead_id: payload.lead_id,
          client_id: leadClientId,
          country_id: leadCountryId,
          postal_code: postalCode,
          document_language: 'es',
          estimation_type: 'new_allocation',
          contact_name: payload.contact_name,
          contact_email: payload.contact_email,
          expected_start_date: payload.expected_start_date || null,
          general_notes: payload.notes || `Pré-orçamento gerado via Cockpit Discador. Cidade: ${payload.work_city || 'N/A'}`,
          status: 'draft',
          commercial_owner_id: effectiveUserId,
          created_by: effectiveUserId,
          updated_by: effectiveUserId,
        })
        .select()
        .single();

      if (estError) throw estError;

      const { data: version, error: verError } = await supabase
        .schema('core_comercial')
        .from('estimacion_versions')
        .insert({
          empresa_id: selectedEmpresaId,
          estimacion_id: estimacion.id,
          version_number: 1,
          status: 'active',
          total_cost: totalCost,
          total_revenue: totalRevenue,
          margin_percent: marginPercent,
          notes: 'Versão inicial pré-preenchida no Cockpit de Prospecção',
        })
        .select()
        .single();

      if (verError) throw verError;

      await supabase
        .schema('core_comercial')
        .from('estimaciones')
        .update({ current_version_id: version.id })
        .eq('id', estimacion.id);

      if (itemsWithCalculations.length > 0) {
        const estItemsToInsert = itemsWithCalculations.map(it => ({
          empresa_id: selectedEmpresaId,
          estimacion_id: estimacion.id,
          estimacion_version_id: version.id,
          job_function_id: it.job_function_id,
          job_function_name_snapshot: it.job_title || null,
          description: it.job_title || null,
          quantity: it.quantity,
          planned_hours_per_day: it.hours_per_day,
          planned_days_per_week: it.days_per_week,
          planned_total_hours: it.totalHours,
          includes_housing: Boolean(it.includes_accommodation),
          includes_transport: Boolean(it.includes_transport),
          includes_epi: true,
          base_cost_hour: Number((it.sell_rate_hour * 0.70).toFixed(2)),
          recommended_sell_rate_hour: it.sell_rate_hour,
          minimum_sell_rate_hour: Number((it.sell_rate_hour * 0.90).toFixed(2)),
          sell_rate_hour: it.sell_rate_hour,
          margin_percent: marginPercent,
        }));

        const { error: itemsError } = await supabase
          .schema('core_comercial')
          .from('estimacion_items')
          .insert(estItemsToInsert);

        if (itemsError) throw itemsError;
      }

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

  const saveSalesScript = useMutation({
    mutationFn: async (script: Partial<SalesScript> & { title: string; pitch_opening: string }) => {
      if (!selectedEmpresaId) throw new Error('Empresa não selecionada');

      if (script.id) {
        const { data, error } = await supabase
          .schema('core_comercial')
          .from('sales_scripts')
          .update({
            title: script.title,
            sector: script.sector || 'general',
            pitch_opening: script.pitch_opening,
            qualifying_questions: script.qualifying_questions || [],
            objections_guide: script.objections_guide || [],
            closing_pitch: script.closing_pitch || null,
            image_url: script.image_url || null,
            rich_content_html: script.rich_content_html || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', script.id)
          .select()
          .single();

        if (error) throw error;
        return data as SalesScript;
      } else {
        const { data, error } = await supabase
          .schema('core_comercial')
          .from('sales_scripts')
          .insert({
            empresa_id: selectedEmpresaId,
            title: script.title,
            sector: script.sector || 'general',
            pitch_opening: script.pitch_opening,
            qualifying_questions: script.qualifying_questions || [],
            objections_guide: script.objections_guide || [],
            closing_pitch: script.closing_pitch || null,
            image_url: script.image_url || null,
            rich_content_html: script.rich_content_html || null,
            is_default: false,
          })
          .select()
          .single();

        if (error) throw error;
        return data as SalesScript;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_scripts'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_campaign'] });
    },
  });

  const deleteSalesScript = useMutation({
    mutationFn: async (scriptId: string) => {
      const { error } = await supabase
        .schema('core_comercial')
        .from('sales_scripts')
        .delete()
        .eq('id', scriptId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_scripts'] });
    },
  });

  const updateAppointment = useMutation({
    mutationFn: async ({
      queueItemId,
      scheduled_for,
      scheduled_notes,
      priority,
      status,
      assigned_to,
      tags,
    }: {
      queueItemId: string;
      scheduled_for?: string | null;
      scheduled_notes?: string | null;
      priority?: 'high' | 'normal' | 'low';
      status?: string;
      assigned_to?: string | null;
      tags?: string[];
    }) => {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (scheduled_for !== undefined) updateData.scheduled_for = scheduled_for;
      if (scheduled_notes !== undefined) updateData.scheduled_notes = scheduled_notes;
      if (priority !== undefined) updateData.priority = priority;
      if (status !== undefined) updateData.status = status;
      if (assigned_to !== undefined) updateData.assigned_to = assigned_to;
      if (tags !== undefined) {
        updateData.tags = extractTagsFromAppointment(tags, scheduled_notes);
      }

      const { data, error } = await supabase
        .schema('core_comercial')
        .from('dialer_queue_items')
        .update(updateData)
        .eq('id', queueItemId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialer_agenda'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_queue_items'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_direct_queue_items'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_campaign'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_campaigns'] });
    },
  });

  const deleteAppointment = useMutation({
    mutationFn: async (queueItemId: string) => {
      const { error } = await supabase
        .schema('core_comercial')
        .from('dialer_queue_items')
        .update({
          scheduled_for: null,
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', queueItemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dialer_agenda'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_queue_items'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_direct_queue_items'] });
      queryClient.invalidateQueries({ queryKey: ['dialer_campaign'] });
    },
  });

  return {
    createCampaign: createCampaign.mutateAsync,
    isCreatingCampaign: createCampaign.isPending,
    createCampaignFromAgenda: createCampaignFromAgenda.mutateAsync,
    isCreatingCampaignFromAgenda: createCampaignFromAgenda.isPending,
    updateCampaignStatus: updateCampaignStatus.mutateAsync,
    isUpdatingCampaignStatus: updateCampaignStatus.isPending,
    completeCampaign: completeCampaign.mutateAsync,
    isCompletingCampaign: completeCampaign.isPending,
    deleteCampaign: deleteCampaign.mutateAsync,
    isDeletingCampaign: deleteCampaign.isPending,
    logCallAndAdvance: logCallAndAdvance.mutateAsync,
    isLoggingCall: logCallAndAdvance.isPending,
    createQuickPresupuesto: createQuickPresupuesto.mutateAsync,
    isCreatingPresupuesto: createQuickPresupuesto.isPending,
    saveSalesScript: saveSalesScript.mutateAsync,
    isSavingSalesScript: saveSalesScript.isPending,
    deleteSalesScript: deleteSalesScript.mutateAsync,
    isDeletingSalesScript: deleteSalesScript.isPending,
    updateAppointment: updateAppointment.mutateAsync,
    isUpdatingAppointment: updateAppointment.isPending,
    deleteAppointment: deleteAppointment.mutateAsync,
    isDeletingAppointment: deleteAppointment.isPending,
  };
}
