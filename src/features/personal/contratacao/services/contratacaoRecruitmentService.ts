import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/shared/supabase/client';

// Cliente Supabase secundário em tempo real para o banco de +4.444 currículos (Wolters / MCS-Contratacao)
const EXTERNAL_CV_SUPABASE_URL =
  import.meta.env.VITE_CV_SUPABASE_URL || 'https://xxzfaskfqtfnmormiabx.supabase.co';
const EXTERNAL_CV_SUPABASE_ANON_KEY =
  import.meta.env.VITE_CV_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4emZhc2tmcXRmbm1vcm1pYWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTM3MzUsImV4cCI6MjA4NjU4OTczNX0.Izn_TRipX86uH-bOqYVv7eBWVKHqVmxBNDGdXFCp3Yg';

export const externalCvSupabase = createClient(
  EXTERNAL_CV_SUPABASE_URL,
  EXTERNAL_CV_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

export type RehireStatus = 'pending_review' | 'standby' | 'available' | 'conditional' | 'blocked';

export interface WorkerAssignmentHistoryItem {
  id: string;
  pedido_codigo: string | null;
  client_name: string;
  obra_name: string | null;
  job_function_name: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  tarifa_acordada: number | null;
}

export interface InactiveWorkerCandidate {
  id: string;
  cod_colab: string;
  nome: string;
  movil: string | null;
  email: string | null;
  pasaporte: string | null;
  nif: string | null;
  nie: string | null;
  dni: string | null;
  niss: string | null;
  licencia_conducir: string | null;
  nacionalidade: string | null;
  camiseta: string | null;
  pantalones: string | null;
  funcion: string | null;
  cliente_ultimo: string | null;
  contratante: string | null;
  status_trabajador: string | null;
  status_seguridad: string | null;
  data_baixa: string | null;
  departure_reason: string | null;
  rehire_status: RehireStatus;
  rehire_notes: string | null;
  rehire_skills: string[];
  rehire_reviewed_at: string | null;
  is_new_baixa: boolean;
  history: WorkerAssignmentHistoryItem[];
  all_functions_executed: string[];
  last_tarifa: number | null;
}

export interface ExternalCvFileMeta {
  name: string;
  path?: string;
  size?: number;
  type?: string;
}

export interface ExternalCvCandidate {
  id: string;
  created_at: string;
  status: string;
  source: string;
  raw_name: string;
  raw_phone: string;
  raw_email?: string | null;
  internal_notes?: string | null;
  offer: string;
  location: string;
  current_country?: string;
  documentation: string;
  languages: string[];
  has_driver_license?: boolean;
  european_residence?: string;
  observations?: string;
  files: Array<{ name: string; url: string }>;
}

export type InterviewStage =
  | 'to_contact'
  | 'contacted'
  | 'scheduled'
  | 'interviewed'
  | 'approved'
  | 'hired'
  | 'rejected';

export interface HiringInterviewRecord {
  id: string;
  empresa_id: string | null;
  pedido_id: string | null;
  pedido_codigo: string | null;
  pedido_item_id: string | null;
  solicitud_id: string | null;
  solicitud_target_id: string | null;
  client_name: string | null;
  obra_location: string | null;
  job_function_name: string;
  source_type: 'internal_worker' | 'external_cv';
  worker_id: string | null;
  external_candidate_id: string | null;
  candidate_name: string;
  candidate_code: string | null;
  candidate_phone: string | null;
  candidate_email: string | null;
  candidate_document: string | null;
  candidate_location: string | null;
  candidate_documentation_type: string | null;
  candidate_languages: string[] | null;
  candidate_has_license: boolean | null;
  candidate_cv_url: string | null;
  previous_clients_summary: string | null;
  stage: InterviewStage;
  interview_date: string | null;
  expected_rate: number | null;
  availability_notes: string | null;
  interviewer_notes: string | null;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface BroadcastChannel {
  id: string;
  name: string;
  platform: 'whatsapp' | 'facebook' | 'telegram' | 'linkedin' | 'other';
  category: string | null;
  url: string;
  members_estimate: string | null;
  notes: string | null;
  is_active: boolean;
}

// Mapa de sinônimos para cruzamento inteligente entre funções de Pedidos MCS e Currículos / Inativos
const FUNCTION_SYNONYM_GROUPS: string[][] = [
  ['soldador tig', 'tig', 'gtaw', 'soldador gtaw', 'soldador 3p', 'soldador argon'],
  ['soldador mig', 'soldador mag', 'mig mag', 'gmaw', 'fcaw', 'fio tubular', 'hilo', 'semleautomatica'],
  ['soldador eletrodo', 'soldador electrodo', 'smaw', 'eletrodo revestido', 'electrodo revestida'],
  ['tubero', 'tubeiro', 'encanador industrial', 'tubista', 'piping'],
  ['electricista', 'eletricista', 'eletrotecnico', 'quadrista', 'montador eletrico'],
  ['calderero', 'caldeireiro', 'armador', 'serralheiro', 'montador armador', 'montador metalico'],
  ['mecanico', 'mecânico', 'mecanico montador', 'mecanico industrial', 'ajustador mecanico'],
  ['montador', 'montador de estructura', 'montador estrutural', 'montador industrial', 'montador mecanico'],
  ['pintor', 'pintor industrial', 'jateador', 'chorreador'],
  ['cnc', 'operador cnc', 'tornero', 'torneiro', 'fresador'],
  ['aislador', 'isolador', 'isolador termico', 'calorifugador'],
  ['encarregado', 'encargado', 'supervisor', 'chefe de equipa', 'jefe de equipo', 'capataz'],
  ['ajudante', 'ayudante', 'auxiliar', 'peao', 'peon'],
];

export function normalizeProfileText(text?: string | null): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calcula o score de compatibilidade (0 a 100) entre o perfil buscado no Pedido
 * e as funções do candidato (Inativo MCS ou Currículo Externo).
 */
export function calculateProfileMatchScore(
  targetProfile: string,
  candidateFunctions: (string | null | undefined)[]
): { matches: boolean; score: number; matchedReason: string } {
  const normTarget = normalizeProfileText(targetProfile);
  if (!normTarget) return { matches: true, score: 50, matchedReason: 'Busca geral' };

  const validCandidateFuncs = candidateFunctions
    .map(f => ({ raw: f || '', norm: normalizeProfileText(f) }))
    .filter(f => f.norm.length > 0);

  if (validCandidateFuncs.length === 0) {
    return { matches: false, score: 0, matchedReason: '' };
  }

  // 1. Match Exato ou Substring Direta
  for (const cf of validCandidateFuncs) {
    if (cf.norm === normTarget) {
      return { matches: true, score: 100, matchedReason: `Função exata: ${cf.raw}` };
    }
    if (cf.norm.includes(normTarget) || normTarget.includes(cf.norm)) {
      return { matches: true, score: 92, matchedReason: `Perfil compatível: ${cf.raw}` };
    }
  }

  // 2. Match por Grupo de Sinônimos Industriais
  for (const group of FUNCTION_SYNONYM_GROUPS) {
    const targetInGroup = group.some(term => normTarget.includes(term) || term.includes(normTarget));
    if (targetInGroup) {
      for (const cf of validCandidateFuncs) {
        const candInGroup = group.some(term => cf.norm.includes(term) || term.includes(cf.norm));
        if (candInGroup) {
          return {
            matches: true,
            score: 85,
            matchedReason: `Equivalência técnica: ${cf.raw}`,
          };
        }
      }
    }
  }

  // 3. Match parcial por palavras-chave relevantes (> 3 letras)
  const targetTokens = normTarget.split(' ').filter(t => t.length >= 4);
  for (const cf of validCandidateFuncs) {
    const matchedToken = targetTokens.find(t => cf.norm.includes(t));
    if (matchedToken) {
      return {
        matches: true,
        score: 70,
        matchedReason: `Área correlata (${matchedToken.toUpperCase()}): ${cf.raw}`,
      };
    }
  }

  return { matches: false, score: 0, matchedReason: '' };
}

export function getExternalCvPublicUrl(path?: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const { data } = externalCvSupabase.storage.from('applications').getPublicUrl(path);
  return data.publicUrl;
}

export const contratacaoRecruitmentService = {
  /**
   * Busca todos os trabalhadores Inativos / Desligados do MCS enriquecidos com
   * o histórico completo de alocações (Clientes, Obras, Períodos, Funções e Tarifas).
   */
  async fetchInactiveWorkersWithHistory(): Promise<InactiveWorkerCandidate[]> {
    // 1. Buscar trabalhadores inativos / desligados no core_personal.workers
    const { data: workersData, error: workersErr } = await supabase
      .schema('core_personal')
      .from('workers')
      .select(
        'id, cod_colab, nome, movil, email, pasaporte, nif, nie, dni, niss, licencia_conducir, nacionalidade, camiseta, pantalones, funcion, cliente, contratante, status_trabajador, status_seguridad, data_baixa, departure_reason, rehire_status, rehire_notes, rehire_skills, rehire_reviewed_at'
      )
      .or(
        'status_trabajador.ilike.%inativ%,status_trabajador.ilike.%inactiv%,status_trabajador.ilike.%desligad%,status_trabajador.ilike.%baja%'
      )
      .order('data_baixa', { ascending: false, nullsFirst: false });

    if (workersErr) {
      console.error('Erro ao buscar trabalhadores inativos:', workersErr);
      return [];
    }

    const workers = workersData || [];
    if (workers.length === 0) return [];

    // 2. Buscar histórico de alocações em worker_assignments para esses trabalhadores
    const workerIds = workers.map(w => w.id);
    const chunkSize = 200;
    const allAssignments: any[] = [];

    for (let i = 0; i < workerIds.length; i += chunkSize) {
      const slice = workerIds.slice(i, i + chunkSize);
      const { data: assignData } = await supabase
        .schema('core_personal')
        .from('worker_assignments')
        .select(
          'id, worker_id, pedido_id, client_id, client_site_id, job_function_name_snapshot, planned_start_date, planned_end_date, start_date, end_date, status, tarifa_acordada, created_at'
        )
        .in('worker_id', slice)
        .order('created_at', { ascending: false });

      if (assignData) allAssignments.push(...assignData);
    }

    // Buscar nomes de clientes, sites e códigos de pedidos das alocações
    const clientIds = [...new Set(allAssignments.map(a => a.client_id).filter(Boolean))];
    const siteIds = [...new Set(allAssignments.map(a => a.client_site_id).filter(Boolean))];
    const pedidoIds = [...new Set(allAssignments.map(a => a.pedido_id).filter(Boolean))];

    const [clientsRes, sitesRes, pedidosRes] = await Promise.all([
      clientIds.length > 0
        ? supabase
            .schema('core_common')
            .from('clients')
            .select('id, trade_name, legal_name')
            .in('id', clientIds)
        : Promise.resolve({ data: [] }),
      siteIds.length > 0
        ? supabase
            .schema('core_common')
            .from('client_sites')
            .select('id, name, city')
            .in('id', siteIds)
        : Promise.resolve({ data: [] }),
      pedidoIds.length > 0
        ? supabase
            .schema('core_comercial')
            .from('pedidos')
            .select('id, codigo')
            .in('id', pedidoIds)
        : Promise.resolve({ data: [] }),
    ]);

    const clientsMap = new Map(
      (clientsRes.data || []).map((c: any) => [c.id, c.trade_name || c.legal_name || 'Cliente'])
    );
    const sitesMap = new Map(
      (sitesRes.data || []).map((s: any) => [s.id, [s.name, s.city].filter(Boolean).join(' - ')])
    );
    const pedidosMap = new Map((pedidosRes.data || []).map((p: any) => [p.id, p.codigo]));

    const assignmentsByWorker = new Map<string, WorkerAssignmentHistoryItem[]>();
    for (const a of allAssignments) {
      const list = assignmentsByWorker.get(a.worker_id) || [];
      list.push({
        id: a.id,
        pedido_codigo: pedidosMap.get(a.pedido_id) || null,
        client_name: clientsMap.get(a.client_id) || 'Cliente',
        obra_name: sitesMap.get(a.client_site_id) || null,
        job_function_name: a.job_function_name_snapshot || 'Função',
        start_date: a.start_date || a.planned_start_date || null,
        end_date: a.end_date || a.planned_end_date || null,
        status: a.status,
        tarifa_acordada: a.tarifa_acordada ? Number(a.tarifa_acordada) : null,
      });
      assignmentsByWorker.set(a.worker_id, list);
    }

    return workers.map((w: any) => {
      const history = assignmentsByWorker.get(w.id) || [];
      const skills = Array.isArray(w.rehire_skills) ? w.rehire_skills : [];
      const allFuncsSet = new Set<string>();
      if (w.funcion) allFuncsSet.add(w.funcion.trim());
      skills.forEach((s: string) => {
        if (s && s.trim()) allFuncsSet.add(s.trim());
      });
      history.forEach(h => {
        if (h.job_function_name && h.job_function_name !== 'Função') {
          allFuncsSet.add(h.job_function_name.trim());
        }
      });

      const lastTarifa =
        history.find(h => h.tarifa_acordada != null && h.tarifa_acordada > 0)?.tarifa_acordada ||
        null;

      const rehireStatus: RehireStatus = (w.rehire_status as RehireStatus) || 'pending_review';
      const isNewBaixa = !w.rehire_reviewed_at && rehireStatus === 'pending_review';

      return {
        id: w.id,
        cod_colab: w.cod_colab || '',
        nome: w.nome || '',
        movil: w.movil || null,
        email: w.email || null,
        pasaporte: w.pasaporte || null,
        nif: w.nif || null,
        nie: w.nie || null,
        dni: w.dni || null,
        niss: w.niss || null,
        licencia_conducir: w.licencia_conducir || null,
        nacionalidade: w.nacionalidade || null,
        camiseta: w.camiseta || null,
        pantalones: w.pantalones || null,
        funcion: w.funcion || null,
        cliente_ultimo: w.cliente || history[0]?.client_name || null,
        contratante: w.contratante || null,
        status_trabajador: w.status_trabajador || 'Inativo',
        status_seguridad: w.status_seguridad || null,
        data_baixa: w.data_baixa || history[0]?.end_date || null,
        departure_reason: w.departure_reason || null,
        rehire_status: rehireStatus,
        rehire_notes: w.rehire_notes || null,
        rehire_skills: skills,
        rehire_reviewed_at: w.rehire_reviewed_at || null,
        is_new_baixa: isNewBaixa,
        history,
        all_functions_executed: Array.from(allFuncsSet),
        last_tarifa: lastTarifa,
      };
    });
  },

  /**
   * Atualiza a qualificação Pós-Baixa ("Banco na Manga" / Standby) de um trabalhador inativo
   */
  async qualifyInactiveWorker(params: {
    workerId: string;
    rehireStatus: RehireStatus;
    rehireNotes: string;
    rehireSkills: string[];
    funcionPrincipal?: string;
  }): Promise<void> {
    const { data: userData } = await supabase.auth.getUser();
    const updates: Record<string, any> = {
      rehire_status: params.rehireStatus,
      rehire_notes: params.rehireNotes,
      rehire_skills: params.rehireSkills,
      rehire_reviewed_at: new Date().toISOString(),
      rehire_reviewed_by: userData.user?.id || null,
    };
    if (params.funcionPrincipal && params.funcionPrincipal.trim()) {
      updates.funcion = params.funcionPrincipal.trim();
    }

    const { error } = await supabase
      .schema('core_personal')
      .from('workers')
      .update(updates)
      .eq('id', params.workerId);

    if (error) throw error;
  },

  /**
   * Busca os +4.444 currículos em tempo real direto no Supabase do MCS-Contratacao (Wolters)
   */
  async fetchExternalCvCandidates(limit = 5000): Promise<ExternalCvCandidate[]> {
    const { data, error } = await externalCvSupabase
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao conectar no banco externo de currículos:', error);
      return [];
    }

    return (data || []).map((row: any) => {
      const payload = row.payload || {};
      const fileMetas: ExternalCvFileMeta[] = Array.isArray(payload.file_metas)
        ? payload.file_metas
        : payload.file_meta
          ? [payload.file_meta]
          : [];

      const files = fileMetas
        .filter(f => f && f.path)
        .map(f => ({
          name: f.name || 'Curriculo.pdf',
          url: getExternalCvPublicUrl(f.path),
        }));

      const rawPhone = [row.ddi, row.raw_phone]
        .filter(Boolean)
        .join('')
        .replace(/\s+/g, '');

      return {
        id: row.id,
        created_at: row.created_at,
        status: row.status || 'new',
        source: row.source || 'webform',
        raw_name: row.raw_name || 'Candidato',
        raw_phone: rawPhone || row.raw_phone || '',
        raw_email: row.raw_email || null,
        internal_notes: row.internal_notes || null,
        offer: payload.offer || 'Otro',
        location: payload.location || payload.current_country || '',
        current_country: payload.current_country || '',
        documentation: payload.documentation || '',
        languages: Array.isArray(payload.languages) ? payload.languages : [],
        has_driver_license: payload.has_driver_license,
        european_residence: payload.european_residence,
        observations: payload.observations || '',
        files,
      };
    });
  },

  /**
   * Atualiza o status/notas do candidato também no banco externo de currículos
   */
  async updateExternalCandidateNotes(
    candidateId: string,
    status: string,
    internalNotes: string
  ): Promise<void> {
    await externalCvSupabase
      .from('candidates')
      .update({
        status,
        internal_notes: internalNotes,
      })
      .eq('id', candidateId);
  },

  /**
   * Lista todas as entrevistas registradas no módulo MCS Contratação
   */
  async fetchInterviews(pedidoId?: string | null): Promise<HiringInterviewRecord[]> {
    let query = supabase
      .schema('core_personal')
      .from('hiring_interviews')
      .select('*')
      .order('updated_at', { ascending: false });

    if (pedidoId) {
      query = query.eq('pedido_id', pedidoId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Erro ao buscar entrevistas:', error);
      return [];
    }
    return (data || []) as HiringInterviewRecord[];
  },

  /**
   * Adiciona um candidato (Trabalhador Inativo MCS ou Currículo Externo) ao Controle de Entrevistas
   */
  async createInterview(
    payload: Partial<HiringInterviewRecord> & {
      candidate_name: string;
      job_function_name: string;
      source_type: 'internal_worker' | 'external_cv';
    }
  ): Promise<HiringInterviewRecord> {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .schema('core_personal')
      .from('hiring_interviews')
      .insert({
        ...payload,
        created_by: userData.user?.id || null,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as HiringInterviewRecord;
  },

  /**
   * Atualiza etapa, notas, avaliação ou expectativa salarial de uma entrevista
   */
  async updateInterview(
    id: string,
    updates: Partial<HiringInterviewRecord>
  ): Promise<HiringInterviewRecord> {
    const { data, error } = await supabase
      .schema('core_personal')
      .from('hiring_interviews')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as HiringInterviewRecord;
  },

  async deleteInterview(id: string): Promise<void> {
    const { error } = await supabase
      .schema('core_personal')
      .from('hiring_interviews')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  /**
   * Canais e Grupos Favoritos de Divulgação (WhatsApp / Facebook)
   */
  async fetchBroadcastChannels(): Promise<BroadcastChannel[]> {
    const { data, error } = await supabase
      .schema('core_personal')
      .from('hiring_broadcast_channels')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar canais de divulgação:', error);
      return [];
    }
    return (data || []) as BroadcastChannel[];
  },

  async createBroadcastChannel(
    channel: Omit<BroadcastChannel, 'id' | 'is_active'>
  ): Promise<BroadcastChannel> {
    const { data, error } = await supabase
      .schema('core_personal')
      .from('hiring_broadcast_channels')
      .insert({ ...channel, is_active: true })
      .select('*')
      .single();

    if (error) throw error;
    return data as BroadcastChannel;
  },

  async deleteBroadcastChannel(id: string): Promise<void> {
    const { error } = await supabase
      .schema('core_personal')
      .from('hiring_broadcast_channels')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
