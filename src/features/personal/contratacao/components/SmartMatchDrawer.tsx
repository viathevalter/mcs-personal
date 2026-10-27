import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Sparkles,
  FileText,
  MessageCircle,
  CheckCircle2,
  UserPlus,
  Building2,
  Calendar,
  Star,
  Search,
  Trash2,
  MapPin,
  ShieldCheck,
  Filter,
  Car,
  RotateCcw,
  ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  contratacaoRecruitmentService,
  calculateProfileMatchScore,
  normalizeProfileText,
  type InactiveWorkerCandidate,
  type ExternalCvCandidate,
  type HiringInterviewRecord,
  type InterviewStage,
} from '../services/contratacaoRecruitmentService';

export interface SmartMatchTargetContext {
  empresaId: string;
  pedidoId: string;
  pedidoCodigo: string;
  pedidoItemId: string;
  solicitudId?: string;
  solicitudTargetId?: string;
  clientName: string;
  obraLocation: string;
  jobFunctionId?: string;
  jobFunctionName: string;
  quantityRequested: number;
  quantityFulfilled: number;
  tarifaReferencia?: number;
}

export interface PreFilledHireCandidate {
  sourceType: 'internal_worker' | 'external_cv';
  workerId?: string;
  candidateName: string;
  candidateDocument?: string;
  candidatePhone?: string;
  camiseta?: string;
  pantalones?: string;
  licenciaConducir?: string;
  tarifaAcordada?: number;
  interviewId?: string;
  notes?: string;
}

interface SmartMatchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  context: SmartMatchTargetContext | null;
  inactiveWorkers: InactiveWorkerCandidate[];
  externalCandidates: ExternalCvCandidate[];
  interviews: HiringInterviewRecord[];
  onRefreshInterviews: () => void;
  onHireCandidate: (candidate: PreFilledHireCandidate, context: SmartMatchTargetContext) => void;
}

const STAGE_LABELS: Record<InterviewStage, { label: string; color: string }> = {
  to_contact: {
    label: 'Para Contatar',
    color: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
  },
  contacted: {
    label: '1º Contato / WhatsApp',
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300',
  },
  scheduled: {
    label: 'Entrevista Agendada',
    color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300',
  },
  interviewed: {
    label: 'Entrevistado',
    color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300',
  },
  approved: {
    label: 'Aprovado p/ Contratar',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
  hired: {
    label: 'Contratado na Vaga',
    color: 'bg-emerald-600 text-white border-emerald-600',
  },
  rejected: {
    label: 'Sem Interesse / Descartado',
    color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300',
  },
};

const formatDateShort = (d?: string | null) => {
  if (!d) return '—';
  const clean = String(d).split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return clean;
};

/**
 * Verifica se um trabalhador inativo já trabalhou em determinado cliente
 */
function workerWorkedAtClient(w: InactiveWorkerCandidate, clientName?: string | null): boolean {
  if (!clientName) return false;
  const normClient = normalizeProfileText(clientName);
  if (!normClient) return false;

  // Ignorar palavras genéricas curtas na comparação parcial
  const mainToken = normClient
    .split(' ')
    .filter(t => t.length >= 4 && !['sl', 'slu', 'sa', 'ltda', 'montajes', 'industrial'].includes(t))[0];

  const candidates = [w.cliente_ultimo, ...w.history.map(h => h.client_name)].filter(Boolean) as string[];
  return candidates.some(c => {
    const nc = normalizeProfileText(c);
    if (nc === normClient || nc.includes(normClient) || normClient.includes(nc)) return true;
    if (mainToken && mainToken.length >= 5 && nc.includes(mainToken)) return true;
    return false;
  });
}

export const SmartMatchDrawer: React.FC<SmartMatchDrawerProps> = ({
  isOpen,
  onClose,
  context,
  inactiveWorkers,
  externalCandidates,
  interviews,
  onRefreshInterviews,
  onHireCandidate,
}) => {
  const [activeTab, setActiveTab] = useState<'internal' | 'external' | 'pipeline'>('internal');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllProfiles, setShowAllProfiles] = useState(false);

  // Filtros Inteligentes para Ex-Colaboradores MCS
  const [clientHistoryFilter, setClientHistoryFilter] = useState<string>('all'); // 'all' | '__REQUESTING_CLIENT__' | '__NEVER_REQUESTING_CLIENT__' | nome do cliente
  const [rehireQualificationFilter, setRehireQualificationFilter] = useState<string>('all'); // 'all' | 'standby' | 'new_baixa' | 'available'
  const [interviewStatusFilter, setInterviewStatusFilter] = useState<string>('all'); // 'all' | 'in_any_interview' | 'in_this_vacancy' | 'not_interviewed'
  const [licenseFilter, setLicenseFilter] = useState<string>('all'); // 'all' | 'yes'
  const [recencyFilter, setRecencyFilter] = useState<string>('all'); // 'all' | '30d' | '90d' | 'rate_match'
  const [sortBy, setSortBy] = useState<'match' | 'same_client' | 'recent_baixa' | 'lowest_rate'>('match');

  // Filtros Inteligentes para Banco Externo de Currículos (+4.444)
  const [docFilter, setDocFilter] = useState<string>('all');
  const [countryCvFilter, setCountryCvFilter] = useState<string>('all');
  const [languageCvFilter, setLanguageCvFilter] = useState<string>('all');

  // Filtros para Aba 3 (Entrevistas)
  const [showAllVacanciesInterviews, setShowAllVacanciesInterviews] = useState(false);
  const [pipelineClientFilter, setPipelineClientFilter] = useState<string>('all');
  const [pipelineStageFilter, setPipelineStageFilter] = useState<string>('all');

  const [busyId, setBusyId] = useState<string | null>(null);

  const targetProfile = context?.jobFunctionName || '';
  const requestingClientName = context?.clientName || '';

  // Mapa completo de entrevistas por worker_id e external_candidate_id (em qualquer pedido/vaga)
  const interviewsByWorkerMap = useMemo(() => {
    const map = new Map<string, HiringInterviewRecord[]>();
    interviews.forEach(i => {
      if (i.worker_id) {
        const arr = map.get(i.worker_id) || [];
        arr.push(i);
        map.set(i.worker_id, arr);
      }
    });
    return map;
  }, [interviews]);

  const interviewsByExtMap = useMemo(() => {
    const map = new Map<string, HiringInterviewRecord[]>();
    interviews.forEach(i => {
      if (i.external_candidate_id) {
        const arr = map.get(i.external_candidate_id) || [];
        arr.push(i);
        map.set(i.external_candidate_id, arr);
      }
    });
    return map;
  }, [interviews]);

  // Entrevistas vinculadas a este pedido/vaga (ou todas se o usuário marcar para ver de outros pedidos)
  const vacancyInterviews = useMemo(() => {
    if (!context) return [];
    const base = showAllVacanciesInterviews
      ? interviews
      : interviews.filter(
          i =>
            (context.pedidoItemId && i.pedido_item_id === context.pedidoItemId) ||
            (context.pedidoId &&
              i.pedido_id === context.pedidoId &&
              i.job_function_name === context.jobFunctionName)
        );

    return base.filter(i => {
      if (pipelineClientFilter !== 'all' && i.client_name !== pipelineClientFilter) return false;
      if (pipelineStageFilter !== 'all' && i.stage !== pipelineStageFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          i.candidate_name.toLowerCase().includes(q) ||
          (i.candidate_code || '').toLowerCase().includes(q) ||
          (i.client_name || '').toLowerCase().includes(q) ||
          (i.pedido_codigo || '').toLowerCase().includes(q) ||
          (i.interviewer_notes || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [
    interviews,
    context,
    showAllVacanciesInterviews,
    pipelineClientFilter,
    pipelineStageFilter,
    searchQuery,
  ]);

  const inThisVacancyWorkerIds = useMemo(() => {
    if (!context) return new Set<string>();
    return new Set(
      interviews
        .filter(
          i =>
            (context.pedidoItemId && i.pedido_item_id === context.pedidoItemId) ||
            (context.pedidoId && i.pedido_id === context.pedidoId)
        )
        .map(i => i.worker_id)
        .filter(Boolean) as string[]
    );
  }, [interviews, context]);

  const inThisVacancyExtIds = useMemo(() => {
    if (!context) return new Set<string>();
    return new Set(
      interviews
        .filter(
          i =>
            (context.pedidoItemId && i.pedido_item_id === context.pedidoItemId) ||
            (context.pedidoId && i.pedido_id === context.pedidoId)
        )
        .map(i => i.external_candidate_id)
        .filter(Boolean) as string[]
    );
  }, [interviews, context]);

  // Lista única de todos os Clientes onde os trabalhadores inativos já trabalharam
  const allPreviousClientsList = useMemo(() => {
    const counts = new Map<string, number>();
    inactiveWorkers.forEach(w => {
      const workerClients = new Set<string>();
      if (w.cliente_ultimo && w.cliente_ultimo.trim()) {
        workerClients.add(w.cliente_ultimo.trim());
      }
      w.history.forEach(h => {
        if (h.client_name && h.client_name.trim() && h.client_name !== 'Cliente') {
          workerClients.add(h.client_name.trim());
        }
      });
      workerClients.forEach(c => counts.set(c, (counts.get(c) || 0) + 1));
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [inactiveWorkers]);

  // Quantos já trabalharam exatamente no cliente que está pedindo a vaga
  const workedAtRequestingClientCount = useMemo(() => {
    if (!requestingClientName) return 0;
    return inactiveWorkers.filter(w => {
      if (w.rehire_status === 'blocked') return false;
      const m = calculateProfileMatchScore(targetProfile, [
        w.funcion,
        ...w.all_functions_executed,
        ...w.rehire_skills,
      ]);
      if (!showAllProfiles && !m.matches) return false;
      return workerWorkedAtClient(w, requestingClientName);
    }).length;
  }, [inactiveWorkers, requestingClientName, targetProfile, showAllProfiles]);

  // Lista de países/localizações únicos nos currículos externos
  const externalCountriesList = useMemo(() => {
    const set = new Set<string>();
    externalCandidates.forEach(c => {
      const loc = (c.current_country || c.location || '').trim();
      if (loc) {
        if (loc.toLowerCase().includes('espa')) set.add('España');
        else if (loc.toLowerCase().includes('portug')) set.add('Portugal');
        else if (loc.toLowerCase().includes('fran')) set.add('Francia');
        else if (loc.toLowerCase().includes('ital')) set.add('Italia');
        else if (loc.toLowerCase().includes('alem')) set.add('Alemania');
        else if (loc.length < 25) set.add(loc);
      }
    });
    return Array.from(set).sort();
  }, [externalCandidates]);

  // Lista de clientes únicos que possuem entrevistas abertas
  const pipelineClientsList = useMemo(() => {
    const set = new Set<string>();
    interviews.forEach(i => {
      if (i.client_name) set.add(i.client_name);
    });
    return Array.from(set).sort();
  }, [interviews]);

  // 1. Filtrar e ranquear Ex-Colaboradores Inativos MCS
  const matchedInternalWorkers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const nowMs = Date.now();

    return inactiveWorkers
      .filter(w => w.rehire_status !== 'blocked')
      .map(w => {
        const matchInfo = calculateProfileMatchScore(targetProfile, [
          w.funcion,
          ...w.all_functions_executed,
          ...w.rehire_skills,
        ]);
        const workedAtReqClient = workerWorkedAtClient(w, requestingClientName);
        const workerInterviews = interviewsByWorkerMap.get(w.id) || [];

        let totalScore = matchInfo.score;
        if (workedAtReqClient) totalScore += 25;
        if (w.rehire_status === 'standby') totalScore += 20;
        else if (w.rehire_status === 'available') totalScore += 10;

        return {
          worker: w,
          matchInfo,
          totalScore,
          workedAtReqClient,
          workerInterviews,
        };
      })
      .filter(({ worker, matchInfo, workedAtReqClient, workerInterviews }) => {
        // 1. Perfil
        if (!showAllProfiles && !matchInfo.matches) return false;

        // 2. Filtro por Cliente onde Trabalhou
        if (clientHistoryFilter === '__REQUESTING_CLIENT__') {
          if (!workedAtReqClient) return false;
        } else if (clientHistoryFilter === '__NEVER_REQUESTING_CLIENT__') {
          if (workedAtReqClient) return false;
        } else if (clientHistoryFilter !== 'all') {
          if (!workerWorkedAtClient(worker, clientHistoryFilter)) return false;
        }

        // 3. Filtro por Qualificação / Status Pós-Baixa
        if (rehireQualificationFilter === 'standby' && worker.rehire_status !== 'standby') {
          return false;
        }
        if (rehireQualificationFilter === 'new_baixa' && !worker.is_new_baixa) {
          return false;
        }
        if (rehireQualificationFilter === 'available' && worker.rehire_status !== 'available') {
          return false;
        }

        // 4. Filtro por Status de Entrevista ("Já filtrados lá")
        if (interviewStatusFilter === 'in_any_interview' && workerInterviews.length === 0) {
          return false;
        }
        if (interviewStatusFilter === 'in_this_vacancy' && !inThisVacancyWorkerIds.has(worker.id)) {
          return false;
        }
        if (interviewStatusFilter === 'not_interviewed' && workerInterviews.length > 0) {
          return false;
        }

        // 5. Filtro por CNH
        if (licenseFilter === 'yes') {
          const lic = (worker.licencia_conducir || '').toLowerCase().trim();
          if (lic !== 'si' && lic !== 'sim' && lic !== 'yes' && lic !== 's') return false;
        }

        // 6. Filtro por Recência da Baixa / Tarifa
        if (recencyFilter === '30d' || recencyFilter === '90d') {
          if (!worker.data_baixa) return false;
          const bTime = new Date(worker.data_baixa).getTime();
          if (isNaN(bTime)) return false;
          const maxDays = recencyFilter === '30d' ? 30 : 90;
          if ((nowMs - bTime) / (1000 * 60 * 60 * 24) > maxDays) return false;
        } else if (recencyFilter === 'rate_match' && context?.tarifaReferencia) {
          if (worker.last_tarifa && worker.last_tarifa > context.tarifaReferencia) return false;
        }

        // 7. Busca textual livre (nome, código, cliente, função, notas, telefone)
        if (!q) return true;
        return (
          worker.nome.toLowerCase().includes(q) ||
          worker.cod_colab.toLowerCase().includes(q) ||
          (worker.movil || '').toLowerCase().includes(q) ||
          (worker.funcion || '').toLowerCase().includes(q) ||
          (worker.cliente_ultimo || '').toLowerCase().includes(q) ||
          (worker.rehire_notes || '').toLowerCase().includes(q) ||
          worker.history.some(
            h =>
              h.client_name.toLowerCase().includes(q) ||
              h.job_function_name.toLowerCase().includes(q) ||
              (h.pedido_codigo || '').toLowerCase().includes(q)
          )
        );
      })
      .sort((a, b) => {
        if (sortBy === 'same_client') {
          if (a.workedAtReqClient && !b.workedAtReqClient) return -1;
          if (!a.workedAtReqClient && b.workedAtReqClient) return 1;
        } else if (sortBy === 'recent_baixa') {
          const dA = a.worker.data_baixa ? new Date(a.worker.data_baixa).getTime() : 0;
          const dB = b.worker.data_baixa ? new Date(b.worker.data_baixa).getTime() : 0;
          return dB - dA;
        } else if (sortBy === 'lowest_rate') {
          const rA = a.worker.last_tarifa ?? 999;
          const rB = b.worker.last_tarifa ?? 999;
          return rA - rB;
        }
        return b.totalScore - a.totalScore;
      });
  }, [
    inactiveWorkers,
    targetProfile,
    requestingClientName,
    interviewsByWorkerMap,
    inThisVacancyWorkerIds,
    showAllProfiles,
    clientHistoryFilter,
    rehireQualificationFilter,
    interviewStatusFilter,
    licenseFilter,
    recencyFilter,
    sortBy,
    searchQuery,
    context?.tarifaReferencia,
  ]);

  // 2. Filtrar e ranquear Candidatos do Banco Externo (+4.444 Currículos)
  const matchedExternalCandidates = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return externalCandidates
      .map(c => {
        const matchInfo = calculateProfileMatchScore(targetProfile, [c.offer]);
        const extInterviews = interviewsByExtMap.get(c.id) || [];
        let totalScore = matchInfo.score;
        if (
          c.documentation?.toLowerCase().includes('europeo') ||
          c.documentation?.toLowerCase().includes('válido')
        ) {
          totalScore += 10;
        }
        if (c.files.length > 0) totalScore += 5;
        return { candidate: c, matchInfo, totalScore, extInterviews };
      })
      .filter(({ candidate, matchInfo, extInterviews }) => {
        if (!showAllProfiles && !matchInfo.matches) return false;

        if (docFilter === 'valid_doc') {
          const d = (candidate.documentation || '').toLowerCase();
          if (!d.includes('europeo') && !d.includes('válido') && !d.includes('residencia')) {
            return false;
          }
        } else if (docFilter === 'with_pdf' && candidate.files.length === 0) {
          return false;
        }

        if (countryCvFilter !== 'all') {
          const loc = (candidate.current_country || candidate.location || '').toLowerCase();
          if (!loc.includes(countryCvFilter.toLowerCase())) return false;
        }

        if (languageCvFilter !== 'all') {
          const hasLang = (candidate.languages || []).some(l =>
            l.toLowerCase().includes(languageCvFilter.toLowerCase())
          );
          if (!hasLang) return false;
        }

        if (licenseFilter === 'yes' && !candidate.has_driver_license) {
          return false;
        }

        if (interviewStatusFilter === 'in_any_interview' && extInterviews.length === 0) {
          return false;
        }
        if (interviewStatusFilter === 'in_this_vacancy' && !inThisVacancyExtIds.has(candidate.id)) {
          return false;
        }
        if (interviewStatusFilter === 'not_interviewed' && extInterviews.length > 0) {
          return false;
        }

        if (!q) return true;
        return (
          candidate.raw_name.toLowerCase().includes(q) ||
          candidate.offer.toLowerCase().includes(q) ||
          candidate.location.toLowerCase().includes(q) ||
          (candidate.raw_phone || '').toLowerCase().includes(q) ||
          (candidate.documentation || '').toLowerCase().includes(q) ||
          (candidate.internal_notes || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 150);
  }, [
    externalCandidates,
    targetProfile,
    interviewsByExtMap,
    inThisVacancyExtIds,
    searchQuery,
    showAllProfiles,
    docFilter,
    countryCvFilter,
    languageCvFilter,
    licenseFilter,
    interviewStatusFilter,
  ]);

  const hasActiveFilters =
    clientHistoryFilter !== 'all' ||
    rehireQualificationFilter !== 'all' ||
    interviewStatusFilter !== 'all' ||
    licenseFilter !== 'all' ||
    recencyFilter !== 'all' ||
    docFilter !== 'all' ||
    countryCvFilter !== 'all' ||
    languageCvFilter !== 'all' ||
    searchQuery.trim() !== '' ||
    showAllProfiles;

  const resetAllFilters = () => {
    setClientHistoryFilter('all');
    setRehireQualificationFilter('all');
    setInterviewStatusFilter('all');
    setLicenseFilter('all');
    setRecencyFilter('all');
    setDocFilter('all');
    setCountryCvFilter('all');
    setLanguageCvFilter('all');
    setSearchQuery('');
    setShowAllProfiles(false);
    setSortBy('match');
  };

  const handleOpenWhatsApp = (phone: string | null | undefined, name: string) => {
    if (!phone) {
      toast.error('Este candidato não possui telefone cadastrado.');
      return;
    }
    const clean = phone.replace(/[^0-9]/g, '');
    const msg = `Hola ${name.split(' ')[0]}! Te contactamos de MCS Industrial por una vacante de *${targetProfile}* para proyecto en *${context?.obraLocation || 'España'}*. ¿Estás disponible actualmente para conversar?`;
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleAddInternalToInterview = async (w: InactiveWorkerCandidate, openWa = false) => {
    if (!context) return;
    setBusyId(w.id);
    try {
      const historySummary = w.history
        .slice(0, 3)
        .map(
          h =>
            `${h.client_name} (${formatDateShort(h.start_date)} a ${formatDateShort(h.end_date)})`
        )
        .join(' | ');

      await contratacaoRecruitmentService.createInterview({
        empresa_id: context.empresaId,
        pedido_id: context.pedidoId,
        pedido_codigo: context.pedidoCodigo,
        pedido_item_id: context.pedidoItemId,
        solicitud_id: context.solicitudId || null,
        solicitud_target_id: context.solicitudTargetId || null,
        client_name: context.clientName,
        obra_location: context.obraLocation,
        job_function_name: context.jobFunctionName,
        source_type: 'internal_worker',
        worker_id: w.id,
        candidate_name: w.nome,
        candidate_code: w.cod_colab,
        candidate_phone: w.movil,
        candidate_email: w.email,
        candidate_document: w.pasaporte || w.nif || w.nie || w.dni || null,
        candidate_location: w.nacionalidade || null,
        candidate_has_license:
          w.licencia_conducir?.toLowerCase() === 'si' ||
          w.licencia_conducir?.toLowerCase() === 'sim',
        previous_clients_summary: historySummary || w.cliente_ultimo || null,
        expected_rate: w.last_tarifa || context.tarifaReferencia || null,
        interviewer_notes: w.rehire_notes || null,
        stage: openWa ? 'contacted' : 'to_contact',
      });

      toast.success(`${w.nome} adicionado ao Controle de Entrevistas desta vaga!`);
      onRefreshInterviews();
      if (openWa) {
        handleOpenWhatsApp(w.movil, w.nome);
      }
    } catch (err: any) {
      toast.error('Erro ao adicionar na entrevista: ' + (err.message || 'Erro'));
    } finally {
      setBusyId(null);
    }
  };

  const handleAddExternalToInterview = async (c: ExternalCvCandidate, openWa = false) => {
    if (!context) return;
    setBusyId(c.id);
    try {
      await contratacaoRecruitmentService.createInterview({
        empresa_id: context.empresaId,
        pedido_id: context.pedidoId,
        pedido_codigo: context.pedidoCodigo,
        pedido_item_id: context.pedidoItemId,
        solicitud_id: context.solicitudId || null,
        solicitud_target_id: context.solicitudTargetId || null,
        client_name: context.clientName,
        obra_location: context.obraLocation,
        job_function_name: context.jobFunctionName,
        source_type: 'external_cv',
        external_candidate_id: c.id,
        candidate_name: c.raw_name,
        candidate_phone: c.raw_phone,
        candidate_email: c.raw_email || null,
        candidate_location: c.location || c.current_country || null,
        candidate_documentation_type: c.documentation || null,
        candidate_languages: c.languages || [],
        candidate_has_license: !!c.has_driver_license,
        candidate_cv_url: c.files[0]?.url || null,
        expected_rate: context.tarifaReferencia || null,
        interviewer_notes: c.internal_notes || c.observations || null,
        stage: openWa ? 'contacted' : 'to_contact',
      });

      toast.success(`${c.raw_name} adicionado ao Controle de Entrevistas desta vaga!`);
      onRefreshInterviews();
      if (openWa) {
        handleOpenWhatsApp(c.raw_phone, c.raw_name);
      }
    } catch (err: any) {
      toast.error('Erro ao adicionar candidato: ' + (err.message || 'Erro'));
    } finally {
      setBusyId(null);
    }
  };

  const handleStageChange = async (interview: HiringInterviewRecord, newStage: InterviewStage) => {
    try {
      await contratacaoRecruitmentService.updateInterview(interview.id, { stage: newStage });
      onRefreshInterviews();
      toast.success(`Status atualizado para: ${STAGE_LABELS[newStage].label}`);
    } catch (err) {
      toast.error('Erro ao atualizar etapa da entrevista.');
    }
  };

  const handleNotesBlur = async (
    interview: HiringInterviewRecord,
    notes: string,
    rateStr: string
  ) => {
    try {
      const expectedRate = rateStr ? Number(rateStr) : null;
      await contratacaoRecruitmentService.updateInterview(interview.id, {
        interviewer_notes: notes,
        expected_rate: expectedRate,
      });
      onRefreshInterviews();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteInterview = async (id: string) => {
    try {
      await contratacaoRecruitmentService.deleteInterview(id);
      onRefreshInterviews();
      toast.success('Removido da fila de entrevistas.');
    } catch (err) {
      toast.error('Erro ao remover entrevista.');
    }
  };

  if (!context) return null;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[1220px] max-h-[94vh] overflow-hidden flex flex-col p-0 gap-0 bg-slate-50 dark:bg-slate-950">
        {/* Header da Vaga + Filtros Inteligentes */}
        <DialogHeader className="p-5 pb-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-emerald-600 text-white font-bold">
                  🎯 MATCH INTELIGENTE & ENTREVISTAS
                </Badge>
                <Badge variant="outline" className="font-mono text-xs">
                  {context.pedidoCodigo}
                </Badge>
                <span className="text-xs text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  Cliente Solicitante: {context.clientName}{' '}
                  <span className="font-normal text-slate-400">({context.obraLocation})</span>
                </span>
              </div>
              <DialogTitle className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3 flex-wrap">
                <span>Perfil Buscado: {context.jobFunctionName}</span>
                <Badge variant="secondary" className="text-xs font-bold">
                  {context.quantityFulfilled} / {context.quantityRequested} Contratados
                </Badge>
                {context.tarifaReferencia ? (
                  <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-xs">
                    Tarifa Ref: {Number(context.tarifaReferencia).toFixed(2)} €/h
                  </Badge>
                ) : null}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Filtre abaixo pelo cliente solicitante ({context.clientName}), por qualquer outro cliente do histórico, status na manga ou candidatos já filtrados em entrevista.
              </DialogDescription>
            </div>

            {/* Navegação das 3 Abas */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('internal')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                  activeTab === 'internal'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                Ex-Colaboradores MCS
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {matchedInternalWorkers.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('external')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                  activeTab === 'external'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                Banco de Currículos (+4.444)
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  {matchedExternalCandidates.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('pipeline')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
                  activeTab === 'pipeline'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Entrevistas desta Vaga
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  {vacancyInterviews.length}
                </span>
              </button>
            </div>
          </div>

          {/* =================================================================
              PAINEL DE FILTROS INTELIGENTES (EX-COLABORADORES & CURRÍCULOS)
             ================================================================= */}
          <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            {/* Linha 1: Busca + Atalho 1-Clique do Cliente Solicitante + Dropdown de Clientes */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={
                    activeTab === 'internal'
                      ? 'Buscar trabalhador por nome, código (E2238), cliente anterior, função ou telefone...'
                      : activeTab === 'external'
                        ? 'Buscar candidato por nome, país/cidade, documentação, telefone...'
                        : 'Buscar nas entrevistas por trabalhador, cliente ou código do pedido...'
                  }
                  className="pl-9 h-9 text-xs bg-slate-50 dark:bg-slate-950"
                />
              </div>

              {activeTab === 'internal' && (
                <>
                  {/* Botão 1-Clique: Já trabalhou neste Cliente Solicitante */}
                  <button
                    type="button"
                    onClick={() =>
                      setClientHistoryFilter(prev =>
                        prev === '__REQUESTING_CLIENT__' ? 'all' : '__REQUESTING_CLIENT__'
                      )
                    }
                    className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all ${
                      clientHistoryFilter === '__REQUESTING_CLIENT__'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-indigo-50/70 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                    }`}
                    title={`Filtrar quem já trabalhou em ${requestingClientName}`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    Já trabalhou em {requestingClientName.slice(0, 22)}
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15">
                      {workedAtRequestingClientCount}
                    </span>
                  </button>

                  {/* Seletor Dropdown: Filtrar por Qualquer Cliente onde trabalhou */}
                  <select
                    value={clientHistoryFilter}
                    onChange={e => setClientHistoryFilter(e.target.value)}
                    className="h-9 max-w-[250px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
                  >
                    <option value="all">🏢 Filtrar por Cliente Anterior (Todos)</option>
                    <option value="__REQUESTING_CLIENT__">
                      ⭐ Já trabalhou neste cliente ({requestingClientName})
                    </option>
                    <option value="__NEVER_REQUESTING_CLIENT__">
                      🆕 Nunca trabalhou neste cliente ({requestingClientName})
                    </option>
                    <optgroup label="Clientes no Histórico MCS">
                      {allPreviousClientsList.map(c => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({c.count})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </>
              )}

              {activeTab === 'external' && (
                <>
                  <select
                    value={docFilter}
                    onChange={e => setDocFilter(e.target.value)}
                    className="h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 text-xs font-semibold"
                  >
                    <option value="all">📋 Todas as Documentações</option>
                    <option value="valid_doc">🇪🇺 Passaporte UE / Permissão Válida</option>
                    <option value="with_pdf">📎 Apenas com Currículo PDF Anexado</option>
                  </select>

                  <select
                    value={countryCvFilter}
                    onChange={e => setCountryCvFilter(e.target.value)}
                    className="h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 text-xs font-semibold"
                  >
                    <option value="all">🌍 Todos os Países / Locais</option>
                    {externalCountriesList.map(loc => (
                      <option key={loc} value={loc}>
                        📍 {loc}
                      </option>
                    ))}
                  </select>

                  <select
                    value={languageCvFilter}
                    onChange={e => setLanguageCvFilter(e.target.value)}
                    className="h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 text-xs font-semibold"
                  >
                    <option value="all">🗣️ Todos os Idiomas</option>
                    <option value="Español">Español</option>
                    <option value="Portugués">Portugués</option>
                    <option value="Inglés">Inglés</option>
                    <option value="Francés">Francés</option>
                  </select>
                </>
              )}

              {activeTab === 'pipeline' && (
                <>
                  <select
                    value={pipelineClientFilter}
                    onChange={e => setPipelineClientFilter(e.target.value)}
                    className="h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 text-xs font-semibold"
                  >
                    <option value="all">🏢 Todos os Clientes Solicitantes</option>
                    {pipelineClientsList.map(cn => (
                      <option key={cn} value={cn}>
                        {cn}
                      </option>
                    ))}
                  </select>

                  <select
                    value={pipelineStageFilter}
                    onChange={e => setPipelineStageFilter(e.target.value)}
                    className="h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 text-xs font-semibold"
                  >
                    <option value="all">📌 Todas as Etapas</option>
                    <option value="to_contact">1. Para Contatar</option>
                    <option value="contacted">2. Contatado (WhatsApp)</option>
                    <option value="scheduled">3. Entrevista Agendada</option>
                    <option value="interviewed">4. Entrevistado</option>
                    <option value="approved">5. Aprovado p/ Contratar</option>
                    <option value="rejected">❌ Descartado</option>
                  </select>

                  <label className="flex items-center gap-2 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 px-3 py-1.5 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAllVacanciesInterviews}
                      onChange={e => setShowAllVacanciesInterviews(e.target.checked)}
                      className="rounded border-purple-300"
                    />
                    Ver candidatos filtrados em todos os pedidos ({interviews.length})
                  </label>
                </>
              )}
            </div>

            {/* Linha 2: Filtros Rápidos Secundários (Status de Entrevista, Qualificação, CNH, Recência, Ordenação) */}
            {activeTab !== 'pipeline' && (
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Filtro por Trabalhadores já filtrados em Entrevista */}
                  <select
                    value={interviewStatusFilter}
                    onChange={e => setInterviewStatusFilter(e.target.value)}
                    className={`h-8 rounded-lg border px-2.5 text-xs font-semibold ${
                      interviewStatusFilter !== 'all'
                        ? 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <option value="all">💜 Status em Entrevista: Todos</option>
                    <option value="not_interviewed">🆕 Ainda NÃO filtrados p/ Entrevista</option>
                    <option value="in_this_vacancy">💜 Já filtrados NESTA Vaga</option>
                    <option value="in_any_interview">
                      💜 Já filtrados em Entrevista (Qualquer Pedido)
                    </option>
                  </select>

                  {activeTab === 'internal' && (
                    <>
                      <select
                        value={rehireQualificationFilter}
                        onChange={e => setRehireQualificationFilter(e.target.value)}
                        className="h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
                      >
                        <option value="all">⭐ Qualificação: Todos</option>
                        <option value="standby">⭐ Apenas Na Manga (Prioridade)</option>
                        <option value="new_baixa">🔔 Apenas Baixas Recentes</option>
                        <option value="available">✅ Disponíveis Validados</option>
                      </select>

                      <select
                        value={recencyFilter}
                        onChange={e => setRecencyFilter(e.target.value)}
                        className="h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
                      >
                        <option value="all">📅 Período Baixa / Tarifa: Todos</option>
                        <option value="30d">🔥 Baixa nos últimos 30 dias</option>
                        <option value="90d">📅 Baixa nos últimos 90 dias</option>
                        {context.tarifaReferencia && (
                          <option value="rate_match">
                            💶 Últ. Tarifa ≤ {Number(context.tarifaReferencia).toFixed(2)} €/h
                          </option>
                        )}
                      </select>

                      <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as any)}
                        className="h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
                      >
                        <option value="match">⬆️ Ordenar: Maior Match</option>
                        <option value="same_client">
                          🏢 Ordenar: Já trabalhou em {requestingClientName.slice(0, 15)}
                        </option>
                        <option value="recent_baixa">🕒 Ordenar: Baixa mais recente</option>
                        <option value="lowest_rate">💶 Ordenar: Menor Última Tarifa</option>
                      </select>
                    </>
                  )}

                  {/* Filtro CNH */}
                  <button
                    type="button"
                    onClick={() => setLicenseFilter(prev => (prev === 'yes' ? 'all' : 'yes'))}
                    className={`h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all ${
                      licenseFilter === 'yes'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <Car className="w-3.5 h-3.5" />
                    Com CNH
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg">
                    <input
                      type="checkbox"
                      checked={showAllProfiles}
                      onChange={e => setShowAllProfiles(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    Mostrar outros perfis/funções
                  </label>

                  {hasActiveFilters && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={resetAllFilters}
                      className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Limpar Filtros
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Corpo Principal com Scroll */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ABA 1: EX-COLABORADORES MCS (INATIVOS) */}
          {activeTab === 'internal' && (
            <div className="space-y-3">
              {matchedInternalWorkers.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <Users className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Nenhum ex-colaborador inativo encontrado para esta combinação de filtros.
                  </p>
                  {hasActiveFilters && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={resetAllFilters}
                      className="text-xs mt-2"
                    >
                      Limpar filtros aplicados
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {matchedInternalWorkers.map(
                    ({ worker: w, matchInfo, totalScore, workedAtReqClient, workerInterviews }) => {
                      const alreadyInThisVacancy = inThisVacancyWorkerIds.has(w.id);
                      const otherInterview = workerInterviews.find(
                        i => i.pedido_id !== context.pedidoId
                      );

                      return (
                        <div
                          key={w.id}
                          className={`p-4 rounded-xl border bg-white dark:bg-slate-900 flex flex-col justify-between gap-3 transition-all hover:shadow-md ${
                            workedAtReqClient
                              ? 'border-indigo-300 dark:border-indigo-700 ring-1 ring-indigo-200/60'
                              : w.rehire_status === 'standby'
                                ? 'border-amber-300 dark:border-amber-700 ring-1 ring-amber-200/50'
                                : 'border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <div className="space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                    {w.cod_colab}
                                  </span>
                                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                                    {w.nome}
                                  </h4>
                                  {workedAtReqClient && (
                                    <Badge className="bg-indigo-600 text-white text-[10px] gap-1">
                                      <Building2 className="w-3 h-3" /> Já atuou neste Cliente
                                    </Badge>
                                  )}
                                  {w.rehire_status === 'standby' && (
                                    <Badge className="bg-amber-500 text-white text-[10px] gap-1">
                                      <Star className="w-3 h-3 fill-current" /> NA MANGA
                                    </Badge>
                                  )}
                                  {w.is_new_baixa && (
                                    <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px]">
                                      🔔 Baixa Recente
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <Badge variant="secondary" className="text-[11px] font-semibold">
                                    {w.funcion || 'Sem função principal'}
                                  </Badge>
                                  {matchInfo.matchedReason && (
                                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                      ✓ {matchInfo.matchedReason}
                                    </span>
                                  )}
                                  {(w.licencia_conducir?.toLowerCase() === 'si' ||
                                    w.licencia_conducir?.toLowerCase() === 'sim') && (
                                    <Badge variant="outline" className="text-[10px] gap-1">
                                      <Car className="w-3 h-3 text-emerald-600" /> CNH
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col items-end flex-shrink-0">
                                <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Match {Math.min(100, totalScore)}%
                                </span>
                                {w.last_tarifa && (
                                  <span className="text-[11px] text-slate-500 mt-1">
                                    Últ. Tarifa: <strong>{w.last_tarifa.toFixed(2)} €/h</strong>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Alerta se já foi filtrado em outra entrevista */}
                            {otherInterview && (
                              <div className="px-2.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-[11px] text-purple-800 dark:text-purple-300 flex items-center justify-between gap-2">
                                <span>
                                  💜 <strong>Já filtrado em entrevista:</strong>{' '}
                                  {otherInterview.client_name || otherInterview.pedido_codigo || 'Geral'} (
                                  {STAGE_LABELS[otherInterview.stage]?.label || otherInterview.stage})
                                </span>
                              </div>
                            )}

                            {/* Histórico de Clientes e Períodos onde Trabalhou */}
                            <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 space-y-1.5">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                <Building2 className="w-3 h-3" /> Histórico de Clientes & Períodos no MCS:
                              </p>
                              {w.history.length > 0 ? (
                                <div className="space-y-1">
                                  {w.history.slice(0, 3).map(h => (
                                    <div
                                      key={h.id}
                                      className="text-xs flex items-center justify-between gap-2 text-slate-700 dark:text-slate-300"
                                    >
                                      <button
                                        type="button"
                                        onClick={() => setClientHistoryFilter(h.client_name)}
                                        className="font-semibold truncate hover:text-indigo-600 hover:underline text-left"
                                        title={`Clique para filtrar todos que trabalharam em ${h.client_name}`}
                                      >
                                        • {h.client_name}{' '}
                                        <span className="text-slate-400 font-normal">
                                          ({h.job_function_name})
                                        </span>
                                      </button>
                                      <span className="text-[11px] font-mono text-slate-500 flex-shrink-0">
                                        {formatDateShort(h.start_date)} → {formatDateShort(h.end_date)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                  • Último Cliente registrado:{' '}
                                  {w.cliente_ultimo ? (
                                    <button
                                      type="button"
                                      onClick={() => setClientHistoryFilter(w.cliente_ultimo!)}
                                      className="font-bold hover:text-indigo-600 hover:underline"
                                      title={`Clique para filtrar todos que trabalharam em ${w.cliente_ultimo}`}
                                    >
                                      {w.cliente_ultimo}
                                    </button>
                                  ) : (
                                    <strong>Não informado</strong>
                                  )}
                                  {w.data_baixa ? ` (Baixa em ${formatDateShort(w.data_baixa)})` : ''}
                                </p>
                              )}
                            </div>

                            {w.rehire_notes && (
                              <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/30 px-2.5 py-1.5 rounded border border-amber-200/60">
                                💬 <strong>Nota de Recrutamento:</strong> {w.rehire_notes}
                              </p>
                            )}
                          </div>

                          {/* Botões de Ação Rápida */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenWhatsApp(w.movil, w.nome)}
                                className="h-8 text-xs gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                {w.movil || 'Sem Tel'}
                              </Button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {alreadyInThisVacancy ? (
                                <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                                  ✓ Em Entrevista nesta Vaga
                                </Badge>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  disabled={busyId === w.id}
                                  onClick={() => handleAddInternalToInterview(w, false)}
                                  className="h-8 text-xs gap-1"
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                  + Entrevista
                                </Button>
                              )}

                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  onHireCandidate(
                                    {
                                      sourceType: 'internal_worker',
                                      workerId: w.id,
                                      candidateName: w.nome,
                                      candidateDocument:
                                        w.pasaporte || w.nif || w.nie || w.dni || '',
                                      candidatePhone: w.movil || '',
                                      camiseta: w.camiseta || '',
                                      pantalones: w.pantalones || '',
                                      licenciaConducir: w.licencia_conducir || '',
                                      tarifaAcordada: w.last_tarifa || context.tarifaReferencia,
                                    },
                                    context
                                  );
                                }}
                                className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                Contratar Direto
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          )}

          {/* ABA 2: BANCO EXTERNO DE CURRÍCULOS (+4.444 CVs) */}
          {activeTab === 'external' && (
            <div className="space-y-3">
              {matchedExternalCandidates.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Nenhum currículo externo encontrado para o filtro atual.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {matchedExternalCandidates.map(
                    ({ candidate: c, totalScore, extInterviews }) => {
                      const alreadyInThisVacancy = inThisVacancyExtIds.has(c.id);
                      const otherInterview = extInterviews.find(
                        i => i.pedido_id !== context.pedidoId
                      );

                      return (
                        <div
                          key={c.id}
                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-3 hover:shadow-md transition-all"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                  {c.raw_name}
                                  <span className="text-[10px] font-normal text-slate-400">
                                    ({formatDateShort(c.created_at)})
                                  </span>
                                </h4>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[11px]">
                                    {c.offer}
                                  </Badge>
                                  {c.location && (
                                    <span className="text-xs text-slate-500 flex items-center gap-1">
                                      <MapPin className="w-3 h-3" /> {c.location}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                Match {Math.min(100, totalScore)}%
                              </span>
                            </div>

                            {otherInterview && (
                              <div className="px-2.5 py-1 rounded bg-purple-50 dark:bg-purple-950/40 border border-purple-200 text-[11px] text-purple-800 dark:text-purple-300">
                                💜 <strong>Já filtrado em:</strong>{' '}
                                {otherInterview.client_name || otherInterview.pedido_codigo || 'Entrevista'} (
                                {STAGE_LABELS[otherInterview.stage]?.label || otherInterview.stage})
                              </div>
                            )}

                            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 dark:text-slate-400">
                              {c.documentation && (
                                <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />{' '}
                                  {c.documentation}
                                </span>
                              )}
                              {c.languages?.length > 0 && (
                                <span className="text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                  🗣️ {c.languages.join(', ')}
                                </span>
                              )}
                            </div>

                            {(c.internal_notes || c.observations) && (
                              <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-100 dark:border-slate-800 line-clamp-2">
                                {c.internal_notes || c.observations}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenWhatsApp(c.raw_phone, c.raw_name)}
                                className="h-8 text-xs gap-1 text-emerald-700 border-emerald-200"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                WhatsApp
                              </Button>

                              {c.files.length > 0 && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(c.files[0].url, '_blank')}
                                  className="h-8 text-xs gap-1 text-blue-600 border-blue-200"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  Abrir CV (PDF)
                                </Button>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              {alreadyInThisVacancy ? (
                                <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                                  ✓ Em Entrevista
                                </Badge>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  disabled={busyId === c.id}
                                  onClick={() => handleAddExternalToInterview(c, false)}
                                  className="h-8 text-xs gap-1"
                                >
                                  <Calendar className="w-3.5 h-3.5" />
                                  + Entrevista
                                </Button>
                              )}

                              <Button
                                type="button"
                                size="sm"
                                onClick={() =>
                                  onHireCandidate(
                                    {
                                      sourceType: 'external_cv',
                                      candidateName: c.raw_name,
                                      candidatePhone: c.raw_phone,
                                      licenciaConducir: c.has_driver_license ? 'Si' : 'No',
                                      tarifaAcordada: context.tarifaReferencia,
                                      notes: `Captado do Banco de Currículos (${c.offer})`,
                                    },
                                    context
                                  )
                                }
                                className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                Contratar
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          )}

          {/* ABA 3: PIPELINE DE ENTREVISTAS DESTA VAGA (OU GERAL) */}
          {activeTab === 'pipeline' && (
            <div className="space-y-3">
              {vacancyInterviews.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Nenhum candidato em entrevista para este filtro.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Selecione candidatos nas abas "Ex-Colaboradores MCS" ou "Banco de Currículos" e clique em "+ Entrevista", ou marque "Ver candidatos filtrados em todos os pedidos".
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {vacancyInterviews.map(interview => (
                    <div
                      key={interview.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={
                              interview.source_type === 'internal_worker'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                                : 'bg-blue-50 text-blue-700 border-blue-200 text-[10px]'
                            }
                          >
                            {interview.source_type === 'internal_worker'
                              ? `Ex-MCS (${interview.candidate_code || 'Colab'})`
                              : 'Banco Currículos'}
                          </Badge>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {interview.candidate_name}
                          </h4>
                          {interview.client_name && (
                            <Badge variant="secondary" className="text-[10px]">
                              🏢 {interview.client_name}{' '}
                              {interview.pedido_codigo ? `(${interview.pedido_codigo})` : ''}
                            </Badge>
                          )}
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                              STAGE_LABELS[interview.stage]?.color || ''
                            }`}
                          >
                            {STAGE_LABELS[interview.stage]?.label || interview.stage}
                          </span>
                        </div>

                        {interview.previous_clients_summary && (
                          <p className="text-xs text-slate-500">
                            🏢 <strong>Histórico MCS:</strong> {interview.previous_clients_summary}
                          </p>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                          <div className="sm:col-span-2">
                            <Input
                              defaultValue={interview.interviewer_notes || ''}
                              placeholder="Anotações da entrevista (disponibilidade, experiência, observações)..."
                              onBlur={e =>
                                handleNotesBlur(
                                  interview,
                                  e.target.value,
                                  String(interview.expected_rate || '')
                                )
                              }
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Input
                              type="number"
                              step="0.5"
                              defaultValue={interview.expected_rate || ''}
                              placeholder="Pretensão €/h"
                              onBlur={e =>
                                handleNotesBlur(
                                  interview,
                                  interview.interviewer_notes || '',
                                  e.target.value
                                )
                              }
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                        <select
                          value={interview.stage}
                          onChange={e =>
                            handleStageChange(interview, e.target.value as InterviewStage)
                          }
                          className="h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 text-xs font-semibold"
                        >
                          <option value="to_contact">1. Para Contatar</option>
                          <option value="contacted">2. Contatado (WhatsApp)</option>
                          <option value="scheduled">3. Entrevista Agendada</option>
                          <option value="interviewed">4. Entrevistado</option>
                          <option value="approved">5. Aprovado p/ Contratar</option>
                          <option value="rejected">❌ Sem Interesse / Rejeitado</option>
                        </select>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleOpenWhatsApp(interview.candidate_phone, interview.candidate_name)
                          }
                          className="h-8 text-xs gap-1 text-emerald-700 border-emerald-200"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          WhatsApp
                        </Button>

                        {interview.candidate_cv_url && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(interview.candidate_cv_url!, '_blank')}
                            className="h-8 text-xs gap-1 text-blue-600"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            CV
                          </Button>
                        )}

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            onHireCandidate(
                              {
                                sourceType: interview.source_type,
                                workerId: interview.worker_id || undefined,
                                candidateName: interview.candidate_name,
                                candidateDocument: interview.candidate_document || '',
                                candidatePhone: interview.candidate_phone || '',
                                licenciaConducir: interview.candidate_has_license ? 'Si' : 'No',
                                tarifaAcordada:
                                  interview.expected_rate || context.tarifaReferencia,
                                interviewId: interview.id,
                                notes: interview.interviewer_notes || undefined,
                              },
                              context
                            );
                          }}
                          className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Efetivar Contratação
                        </Button>

                        <button
                          type="button"
                          onClick={() => handleDeleteInterview(interview.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                          title="Remover entrevista"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
