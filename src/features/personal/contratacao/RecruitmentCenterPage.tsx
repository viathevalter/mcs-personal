import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  FileText,
  Sparkles,
  Bell,
  Star,
  Search,
  MessageCircle,
  Calendar,
  CheckCircle2,
  Building2,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Ban,
  Megaphone,
  ExternalLink,
  RefreshCw,
  Filter,
  Trash2,
  UserCheck,
  Briefcase,
  Car,
  Clock,
  Globe,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  contratacaoRecruitmentService,
  calculateProfileMatchScore,
  type InactiveWorkerCandidate,
  type ExternalCvCandidate,
  type HiringInterviewRecord,
  type InterviewStage,
  type RehireStatus,
} from './services/contratacaoRecruitmentService';
import { JobBroadcastModal } from './components/JobBroadcastModal';

const OFFER_PROFILES = [
  'SOLDADOR TIG/GTAW',
  'SOLDADOR MIG MAG/GMAW/FCAW',
  'SOLDADOR ELECTRODO REVESTIDA/SMAW',
  'TUBERO',
  'ELECTRICISTA',
  'CALDERERO/ARMADOR',
  'MECÁNICO MONTADOR',
  'MONTADOR DE ESTRUCTURA',
  'PINTOR INDUSTRIAL',
  'OPERADOR CNC/TORNERO CNC',
  'AISLADOR TERMICO',
  'ENCARGADO / SUPERVISOR',
];

const REHIRE_STATUS_META: Record<
  RehireStatus,
  { label: string; badgeClass: string; icon: React.ElementType }
> = {
  pending_review: {
    label: '🔔 Nova Baixa (Revisar)',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300',
    icon: Bell,
  },
  standby: {
    label: '⭐ Na Manga (Prioridade)',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300',
    icon: Star,
  },
  available: {
    label: '✅ Disponível p/ Contratar',
    badgeClass:
      'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300',
    icon: UserCheck,
  },
  conditional: {
    label: '⚠️ Com Ressalvas',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300',
    icon: AlertTriangle,
  },
  blocked: {
    label: '🚫 Não Recontratar',
    badgeClass: 'bg-slate-200 text-slate-700 border-slate-400 dark:bg-slate-800 dark:text-slate-400',
    icon: Ban,
  },
};

const STAGE_META: Record<InterviewStage, { label: string; badgeClass: string }> = {
  to_contact: {
    label: '1. Para Contatar',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
  },
  contacted: {
    label: '2. Contatado (WhatsApp)',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  scheduled: {
    label: '3. Entrevista Agendada',
    badgeClass: 'bg-purple-100 text-purple-700 border-purple-300',
  },
  interviewed: {
    label: '4. Entrevistado',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  approved: {
    label: '5. Aprovado p/ Contratar',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  hired: {
    label: '6. Contratado',
    badgeClass: 'bg-emerald-600 text-white border-emerald-600',
  },
  rejected: {
    label: '❌ Descartado / Sem Interesse',
    badgeClass: 'bg-red-100 text-red-700 border-red-300',
  },
};

const formatDate = (d?: string | null) => {
  if (!d) return '—';
  const clean = String(d).split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return clean;
};

export const RecruitmentCenterPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Determinar aba ativa pela URL
  const initialTab = useMemo(() => {
    if (location.pathname.includes('baixas-radar')) return 'baixas';
    if (location.pathname.includes('curriculos')) return 'curriculos';
    if (location.pathname.includes('divulgacao')) return 'divulgacao';
    return 'entrevistas';
  }, [location.pathname]);

  const [activeSection, setActiveSection] = useState<'entrevistas' | 'baixas' | 'curriculos'>(
    initialTab === 'divulgacao' ? 'entrevistas' : initialTab
  );
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(initialTab === 'divulgacao');

  useEffect(() => {
    if (location.pathname.includes('baixas-radar')) setActiveSection('baixas');
    else if (location.pathname.includes('curriculos')) setActiveSection('curriculos');
    else if (location.pathname.includes('divulgacao')) setIsBroadcastOpen(true);
    else setActiveSection('entrevistas');
  }, [location.pathname]);

  // =========================================================================
  // FILTROS INTELIGENTES GLOBAIS E POR ABA
  // =========================================================================
  const [selectedProfileFilter, setSelectedProfileFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filtro por Cliente Solicitante (Pedidos / Entrevistas)
  const [requestingClientFilter, setRequestingClientFilter] = useState<string>('all');

  // Filtro por Cliente Anterior onde o trabalhador já atuou no MCS
  const [previousClientFilter, setPreviousClientFilter] = useState<string>('all');

  // Filtro por Trabalhador já filtrado em Entrevista ("já filtraram lá")
  const [interviewPresenceFilter, setInterviewPresenceFilter] = useState<
    'all' | 'in_interview' | 'not_in_interview' | 'in_selected_client_interview'
  >('all');

  // Filtros de Ex-Colaboradores
  const [baixaSubFilter, setBaixaSubFilter] = useState<'all' | RehireStatus>('all');
  const [baixaRecencyFilter, setBaixaRecencyFilter] = useState<'all' | '30d' | '90d'>('all');
  const [onlyWithLicense, setOnlyWithLicense] = useState<boolean>(false);
  const [inactiveSortBy, setInactiveSortBy] = useState<'priority' | 'recent_baixa' | 'lowest_rate'>(
    'priority'
  );

  // Filtros de Controle de Entrevistas
  const [interviewStageFilter, setInterviewStageFilter] = useState<'all' | InterviewStage>('all');
  const [interviewSourceFilter, setInterviewSourceFilter] = useState<
    'all' | 'internal_worker' | 'external_cv'
  >('all');

  // Filtros de Banco de Currículos (+4.444 CVs)
  const [cvDocFilter, setCvDocFilter] = useState<'all' | 'valid_eu' | 'has_pdf'>('all');
  const [cvCountryFilter, setCvCountryFilter] = useState<string>('all');
  const [cvLanguageFilter, setCvLanguageFilter] = useState<string>('all');
  const [cvPage, setCvPage] = useState(1);

  // Modal de Qualificação Pós-Baixa ("Na Manga")
  const [qualifyingWorker, setQualifyingWorker] = useState<InactiveWorkerCandidate | null>(null);
  const [qualStatus, setQualStatus] = useState<RehireStatus>('standby');
  const [qualNotes, setQualNotes] = useState('');
  const [qualFuncion, setQualFuncion] = useState('');
  const [qualSkillsText, setQualSkillsText] = useState('');
  const [isSavingQual, setIsSavingQual] = useState(false);

  // Modal de Visualização de PDF do Currículo
  const [previewCv, setPreviewCv] = useState<{ name: string; url: string } | null>(null);

  // Queries
  const {
    data: inactiveWorkers = [],
    isLoading: isLoadingInactive,
    refetch: refetchInactive,
  } = useQuery({
    queryKey: ['contratacao_inactive_workers_history'],
    queryFn: () => contratacaoRecruitmentService.fetchInactiveWorkersWithHistory(),
  });

  const {
    data: externalCandidates = [],
    isLoading: isLoadingExternal,
    refetch: refetchExternal,
  } = useQuery({
    queryKey: ['contratacao_external_cvs_realtime'],
    queryFn: () => contratacaoRecruitmentService.fetchExternalCvCandidates(5000),
    staleTime: 1000 * 60 * 3,
  });

  const {
    data: interviews = [],
    isLoading: isLoadingInterviews,
    refetch: refetchInterviews,
  } = useQuery({
    queryKey: ['contratacao_interviews_all'],
    queryFn: () => contratacaoRecruitmentService.fetchInterviews(),
  });

  // =========================================================================
  // MAPAS INTELIGENTES: QUEM JÁ FOI FILTRADO LÁ NAS ENTREVISTAS E LISTA DE CLIENTES
  // =========================================================================
  const interviewsByWorkerMap = useMemo(() => {
    const map = new Map<string, HiringInterviewRecord[]>();
    interviews.forEach(i => {
      if (i.worker_id) {
        const list = map.get(i.worker_id) || [];
        list.push(i);
        map.set(i.worker_id, list);
      }
    });
    return map;
  }, [interviews]);

  const interviewsByExtMap = useMemo(() => {
    const map = new Map<string, HiringInterviewRecord[]>();
    interviews.forEach(i => {
      if (i.external_candidate_id) {
        const list = map.get(i.external_candidate_id) || [];
        list.push(i);
        map.set(i.external_candidate_id, list);
      }
    });
    return map;
  }, [interviews]);

  // Lista de todos os Clientes Solicitantes presentes nas entrevistas + clientes históricos
  const requestingClientsList = useMemo(() => {
    const counts = new Map<string, number>();
    interviews.forEach(i => {
      const c = (i.client_name || '').trim().toUpperCase();
      if (c) counts.set(c, (counts.get(c) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [interviews]);

  // Lista de todos os Clientes onde trabalhadores inativos já atuaram no MCS
  const allPreviousClientsList = useMemo(() => {
    const counts = new Map<string, number>();
    inactiveWorkers.forEach(w => {
      const uniqueClientsForWorker = new Set<string>();
      if (w.cliente_ultimo && w.cliente_ultimo.trim()) {
        uniqueClientsForWorker.add(w.cliente_ultimo.trim().toUpperCase());
      }
      w.history.forEach(h => {
        if (h.client_name && h.client_name.trim() && h.client_name !== 'Cliente não informado') {
          uniqueClientsForWorker.add(h.client_name.trim().toUpperCase());
        }
      });
      uniqueClientsForWorker.forEach(c => {
        counts.set(c, (counts.get(c) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [inactiveWorkers]);

  // Lista de Países / Localizações dos CVs externos
  const externalCountriesList = useMemo(() => {
    const counts = new Map<string, number>();
    externalCandidates.forEach(c => {
      const country = (c.current_country || c.location || '').trim();
      if (country && country.length > 1) {
        counts.set(country, (counts.get(country) || 0) + 1);
      }
    });
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 35);
  }, [externalCandidates]);

  // Contadores de Radar Pós-Baixa e Entrevistas
  const newBaixasCount = useMemo(
    () => inactiveWorkers.filter(w => w.is_new_baixa).length,
    [inactiveWorkers]
  );
  const standbyCount = useMemo(
    () => inactiveWorkers.filter(w => w.rehire_status === 'standby').length,
    [inactiveWorkers]
  );
  const inactiveAlreadyInInterviewCount = useMemo(
    () => inactiveWorkers.filter(w => interviewsByWorkerMap.has(w.id)).length,
    [inactiveWorkers, interviewsByWorkerMap]
  );
  const externalAlreadyInInterviewCount = useMemo(
    () => externalCandidates.filter(c => interviewsByExtMap.has(c.id)).length,
    [externalCandidates, interviewsByExtMap]
  );

  const hasActiveSmartFilters = Boolean(
    selectedProfileFilter ||
      searchQuery.trim() ||
      requestingClientFilter !== 'all' ||
      previousClientFilter !== 'all' ||
      interviewPresenceFilter !== 'all' ||
      baixaSubFilter !== 'all' ||
      baixaRecencyFilter !== 'all' ||
      onlyWithLicense ||
      interviewStageFilter !== 'all' ||
      interviewSourceFilter !== 'all' ||
      cvDocFilter !== 'all' ||
      cvCountryFilter !== 'all' ||
      cvLanguageFilter !== 'all'
  );

  const resetAllSmartFilters = () => {
    setSelectedProfileFilter('');
    setSearchQuery('');
    setRequestingClientFilter('all');
    setPreviousClientFilter('all');
    setInterviewPresenceFilter('all');
    setBaixaSubFilter('all');
    setBaixaRecencyFilter('all');
    setOnlyWithLicense(false);
    setInterviewStageFilter('all');
    setInterviewSourceFilter('all');
    setCvDocFilter('all');
    setCvCountryFilter('all');
    setCvLanguageFilter('all');
    setCvPage(1);
  };

  // =========================================================================
  // 1. FILTRAGEM DE TRABALHADORES INATIVOS (RADAR PÓS-BAIXA & BANCO NA MANGA)
  // =========================================================================
  const filteredInactiveWorkers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const nowMs = Date.now();

    return inactiveWorkers
      .filter(w => {
        if (baixaSubFilter === 'pending_review' && !w.is_new_baixa) return false;
        if (
          baixaSubFilter !== 'all' &&
          baixaSubFilter !== 'pending_review' &&
          w.rehire_status !== baixaSubFilter
        ) {
          return false;
        }

        // Filtro por Perfil / Função
        if (selectedProfileFilter) {
          const match = calculateProfileMatchScore(selectedProfileFilter, [
            w.funcion,
            ...w.all_functions_executed,
            ...w.rehire_skills,
          ]);
          if (!match.matches) return false;
        }

        // Filtro por Cliente onde trabalhou (ou Cliente Solicitante caso selecionado)
        const targetClientToMatch =
          previousClientFilter !== 'all'
            ? previousClientFilter
            : requestingClientFilter !== 'all'
              ? requestingClientFilter
              : null;

        if (targetClientToMatch) {
          const targetUpper = targetClientToMatch.toUpperCase();
          const workedInClient =
            (w.cliente_ultimo || '').toUpperCase().includes(targetUpper) ||
            w.history.some(h => (h.client_name || '').toUpperCase().includes(targetUpper));
          if (!workedInClient) return false;
        }

        // Filtro por Trabalhador já filtrado em Entrevista ("já filtraram lá")
        const workerInterviews = interviewsByWorkerMap.get(w.id) || [];
        if (interviewPresenceFilter === 'in_interview' && workerInterviews.length === 0) {
          return false;
        }
        if (interviewPresenceFilter === 'not_in_interview' && workerInterviews.length > 0) {
          return false;
        }
        if (interviewPresenceFilter === 'in_selected_client_interview') {
          if (requestingClientFilter === 'all') {
            if (workerInterviews.length === 0) return false;
          } else {
            const reqUpper = requestingClientFilter.toUpperCase();
            if (
              !workerInterviews.some(i => (i.client_name || '').toUpperCase().includes(reqUpper))
            ) {
              return false;
            }
          }
        }

        // Filtro de CNH
        if (onlyWithLicense) {
          const hasLic = Boolean(
            w.licencia_conducir &&
              !['no', 'não', 'nao', 'false', '0'].includes(w.licencia_conducir.toLowerCase().trim())
          );
          if (!hasLic) return false;
        }

        // Filtro de Recência da Baixa
        if (baixaRecencyFilter !== 'all') {
          if (!w.data_baixa) return false;
          const daysAgo = (nowMs - new Date(w.data_baixa).getTime()) / (1000 * 60 * 60 * 24);
          if (baixaRecencyFilter === '30d' && daysAgo > 30) return false;
          if (baixaRecencyFilter === '90d' && daysAgo > 90) return false;
        }

        if (!q) return true;
        return (
          w.nome.toLowerCase().includes(q) ||
          w.cod_colab.toLowerCase().includes(q) ||
          (w.funcion || '').toLowerCase().includes(q) ||
          (w.cliente_ultimo || '').toLowerCase().includes(q) ||
          (w.rehire_notes || '').toLowerCase().includes(q) ||
          w.history.some(
            h =>
              h.client_name.toLowerCase().includes(q) ||
              h.job_function_name.toLowerCase().includes(q)
          ) ||
          workerInterviews.some(
            i =>
              (i.client_name || '').toLowerCase().includes(q) ||
              (i.pedido_codigo || '').toLowerCase().includes(q)
          )
        );
      })
      .sort((a, b) => {
        if (inactiveSortBy === 'recent_baixa') {
          const da = a.data_baixa ? new Date(a.data_baixa).getTime() : 0;
          const db = b.data_baixa ? new Date(b.data_baixa).getTime() : 0;
          if (db !== da) return db - da;
        }
        if (inactiveSortBy === 'lowest_rate') {
          const ra = a.last_tarifa ?? 999;
          const rb = b.last_tarifa ?? 999;
          if (ra !== rb) return ra - rb;
        }
        if (a.rehire_status === 'standby' && b.rehire_status !== 'standby') return -1;
        if (b.rehire_status === 'standby' && a.rehire_status !== 'standby') return 1;
        if (a.is_new_baixa && !b.is_new_baixa) return -1;
        if (b.is_new_baixa && !a.is_new_baixa) return 1;
        return 0;
      });
  }, [
    inactiveWorkers,
    baixaSubFilter,
    selectedProfileFilter,
    previousClientFilter,
    requestingClientFilter,
    interviewPresenceFilter,
    interviewsByWorkerMap,
    onlyWithLicense,
    baixaRecencyFilter,
    inactiveSortBy,
    searchQuery,
  ]);

  // =========================================================================
  // 2. FILTRAGEM DE CURRÍCULOS EXTERNOS (+4.444 CVs)
  // =========================================================================
  const filteredExternalCandidates = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return externalCandidates.filter(c => {
      if (selectedProfileFilter) {
        const match = calculateProfileMatchScore(selectedProfileFilter, [c.offer]);
        if (!match.matches) return false;
      }

      if (cvDocFilter === 'valid_eu') {
        const d = (c.documentation || '').toLowerCase();
        if (!d.includes('europeo') && !d.includes('válido') && !d.includes('residencia')) {
          return false;
        }
      } else if (cvDocFilter === 'has_pdf') {
        if (!c.files || c.files.length === 0) return false;
      }

      if (onlyWithLicense && !c.has_driver_license) {
        return false;
      }

      if (cvCountryFilter !== 'all') {
        const loc = `${c.current_country || ''} ${c.location || ''}`.toLowerCase();
        if (!loc.includes(cvCountryFilter.toLowerCase())) return false;
      }

      if (cvLanguageFilter !== 'all') {
        const langs = (c.languages || []).join(' ').toLowerCase();
        if (!langs.includes(cvLanguageFilter.toLowerCase())) return false;
      }

      // Filtro por Candidato já filtrado em Entrevista ("já filtraram lá")
      const extInterviews = interviewsByExtMap.get(c.id) || [];
      if (interviewPresenceFilter === 'in_interview' && extInterviews.length === 0) {
        return false;
      }
      if (interviewPresenceFilter === 'not_in_interview' && extInterviews.length > 0) {
        return false;
      }
      if (interviewPresenceFilter === 'in_selected_client_interview') {
        if (requestingClientFilter === 'all') {
          if (extInterviews.length === 0) return false;
        } else {
          const reqUpper = requestingClientFilter.toUpperCase();
          if (!extInterviews.some(i => (i.client_name || '').toUpperCase().includes(reqUpper))) {
            return false;
          }
        }
      }

      if (!q) return true;
      return (
        c.raw_name.toLowerCase().includes(q) ||
        c.offer.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        (c.raw_phone || '').toLowerCase().includes(q) ||
        (c.documentation || '').toLowerCase().includes(q) ||
        (c.internal_notes || '').toLowerCase().includes(q) ||
        extInterviews.some(
          i =>
            (i.client_name || '').toLowerCase().includes(q) ||
            (i.pedido_codigo || '').toLowerCase().includes(q)
        )
      );
    });
  }, [
    externalCandidates,
    selectedProfileFilter,
    cvDocFilter,
    onlyWithLicense,
    cvCountryFilter,
    cvLanguageFilter,
    interviewPresenceFilter,
    requestingClientFilter,
    interviewsByExtMap,
    searchQuery,
  ]);

  const paginatedExternalCandidates = useMemo(() => {
    return filteredExternalCandidates.slice(0, cvPage * 60);
  }, [filteredExternalCandidates, cvPage]);

  // =========================================================================
  // 3. FILTRAGEM DE ENTREVISTAS (PIPELINE)
  // =========================================================================
  const filteredInterviews = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return interviews.filter(i => {
      if (interviewStageFilter !== 'all' && i.stage !== interviewStageFilter) return false;
      if (interviewSourceFilter !== 'all' && i.source_type !== interviewSourceFilter) return false;

      if (requestingClientFilter !== 'all') {
        const reqUpper = requestingClientFilter.toUpperCase();
        if (!(i.client_name || '').toUpperCase().includes(reqUpper)) return false;
      }

      if (previousClientFilter !== 'all') {
        const prevUpper = previousClientFilter.toUpperCase();
        const workedInPrev =
          (i.previous_clients_summary || '').toUpperCase().includes(prevUpper) ||
          (i.client_name || '').toUpperCase().includes(prevUpper);
        if (!workedInPrev) return false;
      }

      if (onlyWithLicense && !i.candidate_has_license) return false;

      if (selectedProfileFilter) {
        const match = calculateProfileMatchScore(selectedProfileFilter, [i.job_function_name]);
        if (!match.matches) return false;
      }

      if (!q) return true;
      return (
        i.candidate_name.toLowerCase().includes(q) ||
        i.job_function_name.toLowerCase().includes(q) ||
        (i.client_name || '').toLowerCase().includes(q) ||
        (i.pedido_codigo || '').toLowerCase().includes(q) ||
        (i.previous_clients_summary || '').toLowerCase().includes(q) ||
        (i.interviewer_notes || '').toLowerCase().includes(q)
      );
    });
  }, [
    interviews,
    interviewStageFilter,
    interviewSourceFilter,
    requestingClientFilter,
    previousClientFilter,
    onlyWithLicense,
    selectedProfileFilter,
    searchQuery,
  ]);

  const handleOpenQualifyModal = (w: InactiveWorkerCandidate) => {
    setQualifyingWorker(w);
    setQualStatus(w.rehire_status === 'pending_review' ? 'standby' : w.rehire_status);
    setQualNotes(w.rehire_notes || '');
    setQualFuncion(w.funcion || w.all_functions_executed[0] || '');
    setQualSkillsText(
      (w.rehire_skills.length > 0 ? w.rehire_skills : w.all_functions_executed).join(', ')
    );
  };

  const handleSaveQualification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qualifyingWorker) return;
    setIsSavingQual(true);
    try {
      const skills = qualSkillsText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      await contratacaoRecruitmentService.qualifyInactiveWorker({
        workerId: qualifyingWorker.id,
        rehireStatus: qualStatus,
        rehireNotes: qualNotes,
        rehireSkills: skills,
        funcionPrincipal: qualFuncion,
      });

      toast.success(`Qualificação de ${qualifyingWorker.nome} atualizada com sucesso!`);
      setQualifyingWorker(null);
      refetchInactive();
      queryClient.invalidateQueries({ queryKey: ['contratacao_baixas_badge'] });
    } catch (err: any) {
      toast.error('Erro ao salvar qualificação: ' + (err.message || 'Erro'));
    } finally {
      setIsSavingQual(false);
    }
  };

  const handleQuickCreateInterviewFromInactive = async (w: InactiveWorkerCandidate) => {
    try {
      const historySummary = w.history
        .slice(0, 3)
        .map(h => `${h.client_name} (${formatDate(h.start_date)} a ${formatDate(h.end_date)})`)
        .join(' | ');

      await contratacaoRecruitmentService.createInterview({
        client_name:
          requestingClientFilter !== 'all'
            ? requestingClientFilter
            : previousClientFilter !== 'all'
              ? previousClientFilter
              : null,
        job_function_name: selectedProfileFilter || w.funcion || 'PERFIL INDUSTRIAL',
        source_type: 'internal_worker',
        worker_id: w.id,
        candidate_name: w.nome,
        candidate_code: w.cod_colab,
        candidate_phone: w.movil,
        candidate_email: w.email,
        candidate_document: w.pasaporte || w.nif || w.nie || w.dni || null,
        candidate_location: w.nacionalidade || null,
        candidate_has_license: Boolean(
          w.licencia_conducir &&
            !['no', 'não', 'nao', 'false', '0'].includes(w.licencia_conducir.toLowerCase().trim())
        ),
        previous_clients_summary: historySummary || w.cliente_ultimo || null,
        expected_rate: w.last_tarifa || null,
        interviewer_notes: w.rehire_notes || null,
        stage: 'to_contact',
      });
      toast.success(`${w.nome} enviado para o Controle de Entrevistas!`);
      refetchInterviews();
    } catch (err: any) {
      toast.error('Erro ao criar entrevista: ' + err.message);
    }
  };

  const handleQuickCreateInterviewFromExternal = async (c: ExternalCvCandidate) => {
    try {
      await contratacaoRecruitmentService.createInterview({
        client_name: requestingClientFilter !== 'all' ? requestingClientFilter : null,
        job_function_name: selectedProfileFilter || c.offer || 'PERFIL INDUSTRIAL',
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
        interviewer_notes: c.internal_notes || c.observations || null,
        stage: 'to_contact',
      });
      toast.success(`${c.raw_name} enviado para o Controle de Entrevistas!`);
      refetchInterviews();
    } catch (err: any) {
      toast.error('Erro ao criar entrevista: ' + err.message);
    }
  };

  const handleWhatsApp = (phone?: string | null, name?: string, role?: string) => {
    if (!phone) {
      toast.error('Candidato sem telefone registrado.');
      return;
    }
    const clean = phone.replace(/[^0-9]/g, '');
    const clientPart =
      requestingClientFilter !== 'all' ? ` para proyecto en *${requestingClientFilter}*` : '';
    const msg = `Hola ${(name || '').split(' ')[0]}! Te escribimos del equipo de Contratación de MCS Industrial por una oportunidad como *${role || selectedProfileFilter || 'Profesional Industrial'}*${clientPart}. ¿Tienes disponibilidad actualmente?`;
    window.open(`https://wa.me/${clean}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Principal + Alerta de Novas Baixas RH */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Inteligência de Captação, Radar Pós-Baixa & Currículos
            </h1>
            <Badge className="bg-emerald-600 text-white text-xs">EM TEMPO REAL</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Cruze automaticamente os trabalhadores que já atuaram no MCS com os +
            {externalCandidates.length.toLocaleString('pt-BR')} currículos capturados no portal
            externo.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {newBaixasCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setActiveSection('baixas');
                setBaixaSubFilter('pending_review');
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold shadow-sm hover:bg-rose-100 transition-all animate-pulse"
            >
              <Bell className="w-4 h-4 text-rose-600" />
              <span>🔔 {newBaixasCount} Novas Baixas do RH p/ Qualificar</span>
            </button>
          )}

          <Button
            type="button"
            onClick={() => setIsBroadcastOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 h-10 rounded-xl shadow-sm"
          >
            <Megaphone className="w-4 h-4" />
            📢 Divulgar Vaga (WhatsApp / Facebook / Card PNG)
          </Button>
        </div>
      </div>

      {/* =====================================================================
          PAINEL CENTRAL DE ABAS + FILTROS INTELIGENTES MULTIDIMENSIONAIS
         ===================================================================== */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveSection('entrevistas')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeSection === 'entrevistas'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Controle de Entrevistas
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20">
                {filteredInterviews.length}/{interviews.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('baixas')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeSection === 'baixas'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Ex-Colaboradores MCS & Radar de Baixas
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/15">
                {filteredInactiveWorkers.length}/{inactiveWorkers.length}
              </span>
              {newBaixasCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-600 text-white font-black">
                  +{newBaixasCount} novos
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('curriculos')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeSection === 'curriculos'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              Banco de Currículos em Tempo Real
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20">
                {filteredExternalCandidates.length.toLocaleString('pt-BR')}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveSmartFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetAllSmartFilters}
                className="h-9 text-xs gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpar Todos os Filtros
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                refetchInactive();
                refetchExternal();
                refetchInterviews();
                toast.success('Bases sincronizadas em tempo real!');
              }}
              className="h-9 text-xs gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sincronizar Agora
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/contratacao/vagas')}
              className="text-xs gap-1.5 h-9 font-semibold border-emerald-200 text-emerald-700"
            >
              <Briefcase className="w-3.5 h-3.5" />
              Ir p/ Vagas Abertas
            </Button>
          </div>
        </div>

        {/* LINHA 1 DE FILTROS INTELIGENTES: Busca Livre + Perfil/Função + Cliente Solicitante + Cliente Histórico + Status em Entrevista */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Busca Livre */}
          <div className="md:col-span-3 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCvPage(1);
              }}
              placeholder="Buscar trabalhador, código, cliente, pedido, tel..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Perfil / Função */}
          <div className="md:col-span-3">
            <select
              value={selectedProfileFilter}
              onChange={e => {
                setSelectedProfileFilter(e.target.value);
                setCvPage(1);
              }}
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="">🎯 Função / Perfil: Todos os Perfis</option>
              {OFFER_PROFILES.map(prof => (
                <option key={prof} value={prof}>
                  🔍 Preciso de: {prof}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Cliente Solicitante (Vaga / Entrevista) */}
          <div className="md:col-span-2">
            <select
              value={requestingClientFilter}
              onChange={e => {
                setRequestingClientFilter(e.target.value);
                setCvPage(1);
              }}
              className={`w-full h-9 rounded-lg border px-2.5 text-xs font-bold ${
                requestingClientFilter !== 'all'
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200'
              }`}
            >
              <option value="all">🏗️ Cliente Solicitante: Todos</option>
              {requestingClientsList.map(c => (
                <option key={c.name} value={c.name}>
                  📌 Pedido: {c.name} ({c.count} entr.)
                </option>
              ))}
              {allPreviousClientsList
                .filter(c => !requestingClientsList.some(r => r.name === c.name))
                .map(c => (
                  <option key={c.name} value={c.name}>
                    🏢 {c.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Filtro por Cliente Onde Já Trabalhou (Histórico MCS) */}
          <div className="md:col-span-2">
            <select
              value={previousClientFilter}
              onChange={e => {
                setPreviousClientFilter(e.target.value);
                setCvPage(1);
              }}
              className={`w-full h-9 rounded-lg border px-2.5 text-xs font-bold ${
                previousClientFilter !== 'all'
                  ? 'border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200'
              }`}
            >
              <option value="all">🏢 Já Trabalhou no Cliente: Todos</option>
              {allPreviousClientsList.map(c => (
                <option key={c.name} value={c.name}>
                  🏢 {c.name} ({c.count} colab.)
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Trabalhadores que JÁ FILTRARAM LÁ nas Entrevistas */}
          <div className="md:col-span-2">
            <select
              value={interviewPresenceFilter}
              onChange={e => {
                setInterviewPresenceFilter(e.target.value as any);
                setCvPage(1);
              }}
              className={`w-full h-9 rounded-lg border px-2.5 text-xs font-bold ${
                interviewPresenceFilter !== 'all'
                  ? 'border-purple-500 bg-purple-50 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200'
              }`}
            >
              <option value="all">💜 Status em Entrevista: Todos</option>
              <option value="in_interview">
                💜 Já filtrados em Entrevista (
                {activeSection === 'curriculos'
                  ? externalAlreadyInInterviewCount
                  : inactiveAlreadyInInterviewCount}
                )
              </option>
              <option value="not_in_interview">🆕 Ainda NÃO filtrados p/ Entrevista</option>
              {requestingClientFilter !== 'all' && (
                <option value="in_selected_client_interview">
                  💜 Já filtrados p/ {requestingClientFilter}
                </option>
              )}
            </select>
          </div>
        </div>

        {/* PÍLULAS RÁPIDAS INTELIGENTES ("1-CLIQUE") */}
        <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-emerald-600" /> Filtros Rápidos:
            </span>

            {/* Botão 1-Clique: Já filtrados lá em Entrevista */}
            <button
              type="button"
              onClick={() =>
                setInterviewPresenceFilter(
                  interviewPresenceFilter === 'in_interview' ? 'all' : 'in_interview'
                )
              }
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                interviewPresenceFilter === 'in_interview'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                  : 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              💜 Já Filtrados em Entrevista (
              {activeSection === 'curriculos'
                ? externalAlreadyInInterviewCount
                : inactiveAlreadyInInterviewCount}
              )
            </button>

            {/* Botão 1-Clique: Ainda não filtrados */}
            <button
              type="button"
              onClick={() =>
                setInterviewPresenceFilter(
                  interviewPresenceFilter === 'not_in_interview' ? 'all' : 'not_in_interview'
                )
              }
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                interviewPresenceFilter === 'not_in_interview'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              🆕 Ainda Não Filtrados
            </button>

            {/* Botão 1-Clique: Com CNH */}
            <button
              type="button"
              onClick={() => {
                setOnlyWithLicense(!onlyWithLicense);
                setCvPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                onlyWithLicense
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              <Car className="w-3.5 h-3.5" />
              🚗 Com Carta de Condução (CNH)
            </button>

            {activeSection === 'baixas' && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setBaixaRecencyFilter(baixaRecencyFilter === '30d' ? 'all' : '30d')
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
                    baixaRecencyFilter === '30d'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Clock className="w-3 h-3" /> Baixa últimos 30 dias
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setBaixaRecencyFilter(baixaRecencyFilter === '90d' ? 'all' : '90d')
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 ${
                    baixaRecencyFilter === '90d'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Clock className="w-3 h-3" /> Baixa últimos 90 dias
                </button>
              </>
            )}
          </div>

          {/* Ordenação Inteligente para aba de Ex-Colaboradores */}
          {activeSection === 'baixas' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">Ordenar:</span>
              <select
                value={inactiveSortBy}
                onChange={e => setInactiveSortBy(e.target.value as any)}
                className="h-7 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 text-[11px] font-bold"
              >
                <option value="priority">⭐ Prioridade (Na Manga & Novas Baixas)</option>
                <option value="recent_baixa">📅 Baixa mais recente primeiro</option>
                <option value="lowest_rate">💶 Menor Última Tarifa (€/h)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          SEÇÃO 1: CONTROLE DE ENTREVISTAS (PIPELINE)
         ===================================================================== */}
      {activeSection === 'entrevistas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {(
                [
                  ['all', `Todas (${filteredInterviews.length})`],
                  ['to_contact', '1. Para Contatar'],
                  ['contacted', '2. Contatados'],
                  ['scheduled', '3. Agendados'],
                  ['interviewed', '4. Entrevistados'],
                  ['approved', '5. Aprovados p/ Contratar'],
                  ['hired', '6. Contratados'],
                  ['rejected', 'Descartados'],
                ] as const
              ).map(([st, lbl]) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setInterviewStageFilter(st as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    interviewStageFilter === st
                      ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {/* Filtro rápido por Origem do Candidato na Entrevista */}
            <div className="flex items-center gap-1.5">
              {(
                [
                  ['all', 'Todas as Origens'],
                  ['internal_worker', '👷 Ex-Colaboradores MCS'],
                  ['external_cv', '📄 Banco de Currículos'],
                ] as const
              ).map(([src, label]) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setInterviewSourceFilter(src)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                    interviewSourceFilter === src
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Pílulas de Clientes Solicitantes nas Entrevistas para filtrar com 1 clique */}
          {requestingClientsList.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap bg-slate-100/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-500 mr-1">
                🏗️ Filtrar Entrevistas por Cliente Solicitante:
              </span>
              <button
                type="button"
                onClick={() => setRequestingClientFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                  requestingClientFilter === 'all'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200'
                }`}
              >
                Todos ({interviews.length})
              </button>
              {requestingClientsList.map(c => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() =>
                    setRequestingClientFilter(requestingClientFilter === c.name ? 'all' : c.name)
                  }
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                    requestingClientFilter === c.name
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 hover:border-emerald-400'
                  }`}
                >
                  🏢 {c.name} ({c.count})
                </button>
              ))}
            </div>
          )}

          {isLoadingInterviews ? (
            <div className="p-12 text-center text-sm text-slate-500">Carregando entrevistas...</div>
          ) : filteredInterviews.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
              <Sparkles className="w-10 h-10 text-purple-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Nenhuma entrevista registrada neste filtro
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Você pode adicionar candidatos ao Controle de Entrevistas diretamente pelas abas{' '}
                <strong>"Ex-Colaboradores MCS & Radar de Baixas"</strong>,{' '}
                <strong>"Banco de Currículos"</strong> ou clicando em{' '}
                <strong>"🎯 Match & Entrevistas"</strong> dentro de qualquer Pedido aberto.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredInterviews.map(item => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:shadow-sm transition-all"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={
                          item.source_type === 'internal_worker'
                            ? 'bg-amber-50 text-amber-800 border-amber-300 text-[10px]'
                            : 'bg-blue-50 text-blue-700 border-blue-200 text-[10px]'
                        }
                      >
                        {item.source_type === 'internal_worker'
                          ? `Ex-Colaborador MCS (${item.candidate_code || 'Colab'})`
                          : 'Banco de Currículos (+4.444)'}
                      </Badge>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {item.candidate_name}
                      </h4>
                      <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 text-xs">
                        {item.job_function_name}
                      </Badge>
                      {(item.pedido_codigo || item.client_name) && (
                        <button
                          type="button"
                          onClick={() => {
                            if (item.client_name) {
                              setRequestingClientFilter(
                                requestingClientFilter === item.client_name.toUpperCase()
                                  ? 'all'
                                  : item.client_name.toUpperCase()
                              );
                            }
                          }}
                          className="font-mono text-xs px-2 py-0.5 rounded border border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 font-bold hover:bg-emerald-100 transition-colors"
                          title="Clique para filtrar todas as entrevistas deste cliente"
                        >
                          {item.pedido_codigo ? `${item.pedido_codigo} • ` : ''}
                          {item.client_name || 'Cliente Geral'}
                        </button>
                      )}
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          STAGE_META[item.stage]?.badgeClass || ''
                        }`}
                      >
                        {STAGE_META[item.stage]?.label || item.stage}
                      </span>
                    </div>

                    {item.previous_clients_summary && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        🏢 <strong>Histórico de Clientes MCS:</strong>{' '}
                        {item.previous_clients_summary}
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
                      <div className="sm:col-span-3">
                        <Input
                          defaultValue={item.interviewer_notes || ''}
                          placeholder="Observações da entrevista / disponibilidade / experiência..."
                          onBlur={async e => {
                            await contratacaoRecruitmentService.updateInterview(item.id, {
                              interviewer_notes: e.target.value,
                            });
                            refetchInterviews();
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          step="0.5"
                          defaultValue={item.expected_rate || ''}
                          placeholder="Tarifa €/h"
                          onBlur={async e => {
                            await contratacaoRecruitmentService.updateInterview(item.id, {
                              expected_rate: e.target.value ? Number(e.target.value) : null,
                            });
                            refetchInterviews();
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={item.stage}
                      onChange={async e => {
                        await contratacaoRecruitmentService.updateInterview(item.id, {
                          stage: e.target.value as InterviewStage,
                        });
                        refetchInterviews();
                        toast.success('Etapa da entrevista atualizada!');
                      }}
                      className="h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2.5 text-xs font-bold"
                    >
                      <option value="to_contact">1. Para Contatar</option>
                      <option value="contacted">2. Contatado (WhatsApp)</option>
                      <option value="scheduled">3. Entrevista Agendada</option>
                      <option value="interviewed">4. Entrevistado</option>
                      <option value="approved">5. Aprovado p/ Contratar</option>
                      <option value="hired">6. Contratado</option>
                      <option value="rejected">❌ Descartado</option>
                    </select>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleWhatsApp(
                          item.candidate_phone,
                          item.candidate_name,
                          item.job_function_name
                        )
                      }
                      className="h-8 text-xs gap-1 text-emerald-700 border-emerald-200"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </Button>

                    {item.candidate_cv_url && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setPreviewCv({
                            name: item.candidate_name,
                            url: item.candidate_cv_url!,
                          })
                        }
                        className="h-8 text-xs gap-1 text-blue-600"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Ver CV
                      </Button>
                    )}

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => navigate('/contratacao/vagas')}
                      className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Alocar em Vaga
                    </Button>

                    <button
                      type="button"
                      onClick={async () => {
                        await contratacaoRecruitmentService.deleteInterview(item.id);
                        refetchInterviews();
                        toast.success('Entrevista removida.');
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600"
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

      {/* =====================================================================
          SEÇÃO 2: EX-COLABORADORES MCS & RADAR PÓS-BAIXA RH ("NA MANGA")
         ===================================================================== */}
      {activeSection === 'baixas' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setBaixaSubFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                baixaSubFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200'
              }`}
            >
              Todos os Inativos ({filteredInactiveWorkers.length}/{inactiveWorkers.length})
            </button>

            <button
              type="button"
              onClick={() => setBaixaSubFilter('pending_review')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                baixaSubFilter === 'pending_review'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              🔔 Novas Baixas RH s/ Triagem ({newBaixasCount})
            </button>

            <button
              type="button"
              onClick={() => setBaixaSubFilter('standby')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                baixaSubFilter === 'standby'
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              ⭐ Na Manga / Prioridade ({standbyCount})
            </button>

            <button
              type="button"
              onClick={() => setBaixaSubFilter('available')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                baixaSubFilter === 'available'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              ✅ Disponíveis
            </button>

            <button
              type="button"
              onClick={() => setBaixaSubFilter('conditional')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                baixaSubFilter === 'conditional'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              ⚠️ Com Ressalvas
            </button>

            <button
              type="button"
              onClick={() => setBaixaSubFilter('blocked')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
                baixaSubFilter === 'blocked'
                  ? 'bg-slate-700 text-white border-slate-700'
                  : 'bg-slate-100 text-slate-600 border-slate-300'
              }`}
            >
              🚫 Bloqueados / Não Recontratar
            </button>
          </div>

          {isLoadingInactive ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Carregando histórico de ex-colaboradores MCS...
            </div>
          ) : filteredInactiveWorkers.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 p-12 text-center text-sm text-slate-500">
              Nenhum trabalhador inativo encontrado para esta combinação de filtros.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredInactiveWorkers.map(w => {
                const statusMeta =
                  REHIRE_STATUS_META[w.rehire_status] || REHIRE_STATUS_META.pending_review;
                const workerInterviews = interviewsByWorkerMap.get(w.id) || [];

                return (
                  <div
                    key={w.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-all hover:shadow-md ${
                      workerInterviews.length > 0
                        ? 'border-purple-300 dark:border-purple-700 ring-1 ring-purple-200/60'
                        : w.rehire_status === 'standby'
                          ? 'border-amber-300 dark:border-amber-700 ring-1 ring-amber-200/50'
                          : w.is_new_baixa
                            ? 'border-rose-200 dark:border-rose-900/60'
                            : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {w.cod_colab}
                            </span>
                            <h3 className="font-bold text-base text-slate-900 dark:text-white">
                              {w.nome}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <Badge className="bg-slate-900 text-white dark:bg-slate-700 text-xs">
                              {w.funcion || 'Função não informada'}
                            </Badge>
                            {w.all_functions_executed
                              .filter(f => f !== w.funcion)
                              .map(f => (
                                <Badge key={f} variant="outline" className="text-[11px]">
                                  {f}
                                </Badge>
                              ))}
                          </div>
                        </div>

                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.label}
                        </span>
                      </div>

                      {/* BANNER SE JÁ FOI FILTRADO EM ENTREVISTA ("JÁ FILTRARAM LÁ") */}
                      {workerInterviews.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-purple-900 dark:text-purple-200">
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                              💜 Já filtrado em Entrevista ({workerInterviews.length})
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveSection('entrevistas');
                                setSearchQuery(w.nome);
                              }}
                              className="underline hover:text-purple-700"
                            >
                              Abrir na Entrevista →
                            </button>
                          </div>
                          {workerInterviews.slice(0, 2).map(iv => (
                            <div
                              key={iv.id}
                              className="text-[11px] flex items-center justify-between text-purple-800 dark:text-purple-300"
                            >
                              <span className="truncate">
                                • {iv.pedido_codigo ? `${iv.pedido_codigo} • ` : ''}
                                <strong>{iv.client_name || 'Pipeline Geral'}</strong> (
                                {iv.job_function_name})
                              </span>
                              <span className="font-bold ml-2 flex-shrink-0">
                                {STAGE_META[iv.stage]?.label || iv.stage}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Histórico de Clientes e Períodos (Clicável para filtrar pelo cliente!) */}
                      <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" /> Clientes & Períodos Trabalhados
                            (clique p/ filtrar)
                          </span>
                          {w.last_tarifa && (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Últ. Tarifa: {w.last_tarifa.toFixed(2)} €/h
                            </span>
                          )}
                        </div>

                        {w.history.length > 0 ? (
                          <div className="space-y-1 pt-1">
                            {w.history.slice(0, 4).map(h => (
                              <div
                                key={h.id}
                                className="text-xs flex items-center justify-between gap-2 text-slate-700 dark:text-slate-300"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviousClientFilter(
                                      previousClientFilter === h.client_name.toUpperCase()
                                        ? 'all'
                                        : h.client_name.toUpperCase()
                                    )
                                  }
                                  className="font-semibold truncate text-left hover:text-emerald-600 hover:underline"
                                  title="Filtrar todos os trabalhadores que já atuaram neste cliente"
                                >
                                  • {h.client_name}{' '}
                                  <span className="text-slate-400 font-normal">
                                    ({h.job_function_name})
                                  </span>
                                </button>
                                <span className="text-[11px] font-mono text-slate-500 flex-shrink-0">
                                  {formatDate(h.start_date)} → {formatDate(h.end_date)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-600 dark:text-slate-400 pt-1">
                            • Último Cliente:{' '}
                            {w.cliente_ultimo ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviousClientFilter(
                                    previousClientFilter === w.cliente_ultimo!.toUpperCase()
                                      ? 'all'
                                      : w.cliente_ultimo!.toUpperCase()
                                  )
                                }
                                className="font-bold hover:text-emerald-600 hover:underline"
                              >
                                {w.cliente_ultimo}
                              </button>
                            ) : (
                              <strong>Não registrado</strong>
                            )}
                            {w.data_baixa ? ` • Data Baixa: ${formatDate(w.data_baixa)}` : ''}
                          </p>
                        )}

                        {w.departure_reason && (
                          <p className="text-[11px] text-rose-600 dark:text-rose-400 pt-1">
                            Motivo da Baixa RH: <strong>{w.departure_reason}</strong>
                          </p>
                        )}
                      </div>

                      {w.rehire_notes && (
                        <div className="p-2.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/70 text-xs text-amber-900 dark:text-amber-200">
                          💬 <strong>Avaliação Contratação:</strong> {w.rehire_notes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleWhatsApp(w.movil, w.nome, w.funcion || undefined)}
                          className="h-8 text-xs gap-1 text-emerald-700 border-emerald-200"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          {w.movil || 'Sem Tel'}
                        </Button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenQualifyModal(w)}
                          className="h-8 text-xs gap-1 font-semibold border-amber-300 text-amber-800 hover:bg-amber-50 dark:text-amber-300"
                        >
                          <Star className="w-3.5 h-3.5" />
                          Qualificar / Na Manga
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleQuickCreateInterviewFromInactive(w)}
                          className="h-8 text-xs gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          {workerInterviews.length > 0 ? '+ Nova Entrevista' : '+ Entrevista'}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          SEÇÃO 3: BANCO EXTERNO DE CURRÍCULOS EM TEMPO REAL (+4.444 CVs)
         ===================================================================== */}
      {activeSection === 'curriculos' && (
        <div className="space-y-4">
          {/* Sub-barra de filtros específicos para Currículos Externos */}
          <div className="flex items-center justify-between flex-wrap gap-2 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setCvDocFilter('all');
                  setCvPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                  cvDocFilter === 'all'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200'
                }`}
              >
                Todos ({filteredExternalCandidates.length.toLocaleString('pt-BR')})
              </button>
              <button
                type="button"
                onClick={() => {
                  setCvDocFilter('valid_eu');
                  setCvPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                  cvDocFilter === 'valid_eu'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200'
                }`}
              >
                🇪🇺 Passaporte UE / Permissão Válida
              </button>
              <button
                type="button"
                onClick={() => {
                  setCvDocFilter('has_pdf');
                  setCvPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                  cvDocFilter === 'has_pdf'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white dark:bg-slate-900 text-slate-600 border-slate-200'
                }`}
              >
                📎 Com PDF Anexado
              </button>

              {/* Filtro por País / Localização */}
              <div className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={cvCountryFilter}
                  onChange={e => {
                    setCvCountryFilter(e.target.value);
                    setCvPage(1);
                  }}
                  className="h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 text-xs font-bold"
                >
                  <option value="all">🌍 País / Local: Todos</option>
                  {externalCountriesList.map(c => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Idioma */}
              <select
                value={cvLanguageFilter}
                onChange={e => {
                  setCvLanguageFilter(e.target.value);
                  setCvPage(1);
                }}
                className="h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 text-xs font-bold"
              >
                <option value="all">🗣️ Idioma: Todos</option>
                <option value="español">Español</option>
                <option value="portugu">Português</option>
                <option value="ingl">Inglês</option>
                <option value="franc">Francês</option>
              </select>
            </div>

            <span className="text-xs text-slate-500">
              Exibindo {paginatedExternalCandidates.length} de{' '}
              {filteredExternalCandidates.length.toLocaleString('pt-BR')} currículos
            </span>
          </div>

          {isLoadingExternal ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Conectando em tempo real ao banco de +4.444 currículos...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedExternalCandidates.map(c => {
                  const extInterviews = interviewsByExtMap.get(c.id) || [];
                  return (
                    <div
                      key={c.id}
                      className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 flex flex-col justify-between gap-3 hover:shadow-md transition-all ${
                        extInterviews.length > 0
                          ? 'border-purple-300 dark:border-purple-700 ring-1 ring-purple-200/60'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                              {c.raw_name}
                            </h3>
                            <span className="text-[11px] text-slate-400">
                              Cadastrado em {formatDate(c.created_at)}
                            </span>
                          </div>
                          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                            {c.offer}
                          </Badge>
                        </div>

                        {/* BANNER SE JÁ FOI FILTRADO EM ENTREVISTA ("JÁ FILTRARAM LÁ") */}
                        {extInterviews.length > 0 && (
                          <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-bold text-purple-900 dark:text-purple-200">
                              <span>💜 Já filtrado em Entrevista ({extInterviews.length})</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveSection('entrevistas');
                                  setSearchQuery(c.raw_name);
                                }}
                                className="underline"
                              >
                                Ver →
                              </button>
                            </div>
                            {extInterviews.slice(0, 2).map(iv => (
                              <div
                                key={iv.id}
                                className="text-[10px] flex items-center justify-between text-purple-800 dark:text-purple-300"
                              >
                                <span className="truncate">
                                  • {iv.client_name || 'Pipeline Geral'} ({iv.job_function_name})
                                </span>
                                <span className="font-bold ml-1">
                                  {STAGE_META[iv.stage]?.label || iv.stage}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 dark:text-slate-400">
                          {c.location && (
                            <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                              <MapPin className="w-3 h-3 text-slate-500" /> {c.location}
                            </span>
                          )}
                          {c.documentation && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded text-[11px]">
                              <ShieldCheck className="w-3 h-3" /> {c.documentation}
                            </span>
                          )}
                          {c.has_driver_license && (
                            <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-[11px]">
                              <Car className="w-3 h-3" /> CNH
                            </span>
                          )}
                        </div>

                        {(c.internal_notes || c.observations) && (
                          <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-950 p-2 rounded border border-slate-100 dark:border-slate-800 line-clamp-2">
                            {c.internal_notes || c.observations}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleWhatsApp(c.raw_phone, c.raw_name, c.offer)}
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
                              onClick={() =>
                                setPreviewCv({ name: c.raw_name, url: c.files[0].url })
                              }
                              className="h-8 text-xs gap-1 text-blue-600 border-blue-200"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Ver CV
                            </Button>
                          )}
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleQuickCreateInterviewFromExternal(c)}
                          className="h-8 text-xs gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          {extInterviews.length > 0 ? '+ Nova Entrevista' : '+ Entrevista'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {paginatedExternalCandidates.length < filteredExternalCandidates.length && (
                <div className="flex justify-center pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCvPage(p => p + 1)}
                    className="px-8"
                  >
                    Carregar mais currículos (+60)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal de Qualificação Pós-Baixa ("Deixar na Manga") */}
      <Dialog
        open={!!qualifyingWorker}
        onOpenChange={open => !open && setQualifyingWorker(null)}
      >
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
              Qualificar Trabalhador Pós-Baixa (Banco na Manga)
            </DialogTitle>
            <DialogDescription>
              Classifique <strong>{qualifyingWorker?.nome}</strong> ({qualifyingWorker?.cod_colab})
              para futuras contratações quando abrir vaga do perfil dele.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveQualification} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                Classificação de Recontratação
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ['standby', '⭐ Na Manga (Prioridade)'],
                    ['available', '✅ Disponível Normal'],
                    ['conditional', '⚠️ Com Ressalvas'],
                    ['blocked', '🚫 Não Recontratar'],
                  ] as const
                ).map(([val, text]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setQualStatus(val)}
                    className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                      qualStatus === val
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-600'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Função Principal Validada
              </label>
              <Input
                value={qualFuncion}
                onChange={e => setQualFuncion(e.target.value)}
                placeholder="Ex: SOLDADOR TIG"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Outras Funções / Especialidades (separadas por vírgula)
              </label>
              <Input
                value={qualSkillsText}
                onChange={e => setQualSkillsText(e.target.value)}
                placeholder="Ex: SOLDADOR TIG, TUBERO INDUSTRIAL, ARMADOR"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
                Observações / Avaliação da Equipe de Contratação
              </label>
              <textarea
                rows={3}
                value={qualNotes}
                onChange={e => setQualNotes(e.target.value)}
                placeholder="Ex: Ótimo profissional na obra da Faysol, pontual, disponível para viajar no próximo mês..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setQualifyingWorker(null)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingQual}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {isSavingQual ? 'Salvando...' : 'Salvar Qualificação'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização de Currículo PDF */}
      <Dialog open={!!previewCv} onOpenChange={open => !open && setPreviewCv(null)}>
        <DialogContent className="sm:max-w-[920px] h-[88vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
            <div className="flex items-center justify-between pr-6">
              <DialogTitle className="text-base font-bold">
                Currículo: {previewCv?.name}
              </DialogTitle>
              {previewCv?.url && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(previewCv.url, '_blank')}
                  className="text-xs gap-1"
                >
                  Abrir em Nova Aba <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </DialogHeader>
          <div className="flex-1 bg-slate-900">
            {previewCv?.url && (
              <iframe
                src={previewCv.url}
                title={previewCv.name}
                className="w-full h-full border-0"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Divulgação de Vagas (WhatsApp / Facebook / Arte PNG) */}
      <JobBroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => {
          setIsBroadcastOpen(false);
          if (location.pathname.includes('divulgacao')) {
            navigate('/contratacao/entrevistas');
          }
        }}
        initialData={{
          jobFunctionName: selectedProfileFilter || 'SOLDADOR TIG (GTAW)',
        }}
      />
    </div>
  );
};
