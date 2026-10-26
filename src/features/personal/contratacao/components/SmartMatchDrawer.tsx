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
  Phone,
  MessageCircle,
  CheckCircle2,
  UserPlus,
  Building2,
  Calendar,
  Star,
  Search,
  ExternalLink,
  AlertTriangle,
  Clock,
  Trash2,
  Award,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  contratacaoRecruitmentService,
  calculateProfileMatchScore,
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
  const [docFilter, setDocFilter] = useState<string>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const targetProfile = context?.jobFunctionName || '';

  // Entrevistas vinculadas a este pedido/vaga
  const vacancyInterviews = useMemo(() => {
    if (!context) return [];
    return interviews.filter(
      i =>
        (context.pedidoItemId && i.pedido_item_id === context.pedidoItemId) ||
        (context.pedidoId && i.pedido_id === context.pedidoId && i.job_function_name === context.jobFunctionName)
    );
  }, [interviews, context]);

  const inPipelineWorkerIds = useMemo(
    () => new Set(vacancyInterviews.map(i => i.worker_id).filter(Boolean)),
    [vacancyInterviews]
  );

  const inPipelineExtIds = useMemo(
    () => new Set(vacancyInterviews.map(i => i.external_candidate_id).filter(Boolean)),
    [vacancyInterviews]
  );

  // 1. Filtrar e ranquear Ex-Colaboradores Inativos MCS
  const matchedInternalWorkers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return inactiveWorkers
      .filter(w => w.rehire_status !== 'blocked')
      .map(w => {
        const matchInfo = calculateProfileMatchScore(targetProfile, [
          w.funcion,
          ...w.all_functions_executed,
          ...w.rehire_skills,
        ]);
        let totalScore = matchInfo.score;
        if (w.rehire_status === 'standby') totalScore += 20;
        else if (w.rehire_status === 'available') totalScore += 10;
        return { worker: w, matchInfo, totalScore };
      })
      .filter(({ worker, matchInfo }) => {
        if (!showAllProfiles && !matchInfo.matches) return false;
        if (!q) return true;
        return (
          worker.nome.toLowerCase().includes(q) ||
          worker.cod_colab.toLowerCase().includes(q) ||
          (worker.funcion || '').toLowerCase().includes(q) ||
          (worker.cliente_ultimo || '').toLowerCase().includes(q) ||
          worker.history.some(h => h.client_name.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.totalScore - a.totalScore);
  }, [inactiveWorkers, targetProfile, searchQuery, showAllProfiles]);

  // 2. Filtrar e ranquear Candidatos do Banco Externo (+4.444 Currículos)
  const matchedExternalCandidates = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return externalCandidates
      .map(c => {
        const matchInfo = calculateProfileMatchScore(targetProfile, [c.offer]);
        let totalScore = matchInfo.score;
        if (c.documentation?.toLowerCase().includes('europeo') || c.documentation?.toLowerCase().includes('válido')) {
          totalScore += 10;
        }
        if (c.files.length > 0) totalScore += 5;
        return { candidate: c, matchInfo, totalScore };
      })
      .filter(({ candidate, matchInfo }) => {
        if (!showAllProfiles && !matchInfo.matches) return false;
        if (docFilter === 'valid_doc') {
          const d = (candidate.documentation || '').toLowerCase();
          if (!d.includes('europeo') && !d.includes('válido') && !d.includes('residencia')) {
            return false;
          }
        }
        if (!q) return true;
        return (
          candidate.raw_name.toLowerCase().includes(q) ||
          candidate.offer.toLowerCase().includes(q) ||
          candidate.location.toLowerCase().includes(q) ||
          (candidate.raw_phone || '').toLowerCase().includes(q) ||
          (candidate.documentation || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 150);
  }, [externalCandidates, targetProfile, searchQuery, showAllProfiles, docFilter]);

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
        candidate_has_license: w.licencia_conducir?.toLowerCase() === 'si' || w.licencia_conducir?.toLowerCase() === 'sim',
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

  const handleNotesBlur = async (interview: HiringInterviewRecord, notes: string, rateStr: string) => {
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
      <DialogContent className="sm:max-w-[1180px] max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 bg-slate-50 dark:bg-slate-950">
        {/* Header da Vaga */}
        <DialogHeader className="p-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-emerald-600 text-white font-bold">
                  🎯 MATCH INTELIGENTE & ENTREVISTAS
                </Badge>
                <Badge variant="outline" className="font-mono text-xs">
                  {context.pedidoCodigo}
                </Badge>
                <span className="text-xs text-slate-500 font-medium">
                  • {context.clientName} ({context.obraLocation})
                </span>
              </div>
              <DialogTitle className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3">
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
                O sistema filtrou automaticamente os Ex-Colaboradores MCS que já exerceram essa função e os Currículos do banco externo compatíveis.
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

          {/* Barra de Busca e Filtros Rápidos */}
          {activeTab !== 'pipeline' && (
            <div className="pt-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[260px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={
                    activeTab === 'internal'
                      ? 'Buscar por nome, código, cliente onde trabalhou ou função...'
                      : 'Buscar por nome, país/cidade, documentação ou função...'
                  }
                  className="pl-9 h-9 text-xs bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="flex items-center gap-2">
                {activeTab === 'external' && (
                  <select
                    value={docFilter}
                    onChange={e => setDocFilter(e.target.value)}
                    className="h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                  >
                    <option value="all">Todas as Documentações</option>
                    <option value="valid_doc">Apenas Doc. Europeia / Permissão Válida</option>
                  </select>
                )}

                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
                  <input
                    type="checkbox"
                    checked={showAllProfiles}
                    onChange={e => setShowAllProfiles(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Mostrar também outros perfis/funções
                </label>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Corpo Principal com Scroll */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ABA 1: EX-COLABORADORES MCS (INATIVOS) */}
          {activeTab === 'internal' && (
            <div className="space-y-3">
              {matchedInternalWorkers.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Nenhum ex-colaborador inativo encontrado com o perfil "{targetProfile}".
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Marque a opção "Mostrar também outros perfis/funções" acima ou consulte a aba "Banco de Currículos (+4.444)".
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {matchedInternalWorkers.map(({ worker: w, matchInfo, totalScore }) => {
                    const alreadyInPipeline = inPipelineWorkerIds.has(w.id);
                    return (
                      <div
                        key={w.id}
                        className={`p-4 rounded-xl border bg-white dark:bg-slate-900 flex flex-col justify-between gap-3 transition-all hover:shadow-md ${
                          w.rehire_status === 'standby'
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
                              </div>
                            </div>

                            <div className="flex flex-col items-end">
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
                                    <span className="font-semibold truncate">
                                      • {h.client_name}{' '}
                                      <span className="text-slate-400 font-normal">
                                        ({h.job_function_name})
                                      </span>
                                    </span>
                                    <span className="text-[11px] font-mono text-slate-500 flex-shrink-0">
                                      {formatDateShort(h.start_date)} → {formatDateShort(h.end_date)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                • Último Cliente registrado:{' '}
                                <strong>{w.cliente_ultimo || 'Não informado'}</strong>
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
                            {alreadyInPipeline ? (
                              <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                                ✓ Em Entrevista
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
                                    candidateDocument: w.pasaporte || w.nif || w.nie || w.dni || '',
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
                  })}
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
                  {matchedExternalCandidates.map(({ candidate: c, matchInfo, totalScore }) => {
                    const alreadyInPipeline = inPipelineExtIds.has(c.id);
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

                          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600 dark:text-slate-400">
                            {c.documentation && (
                              <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" /> {c.documentation}
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
                            {alreadyInPipeline ? (
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
                  })}
                </div>
              )}
            </div>
          )}

          {/* ABA 3: PIPELINE DE ENTREVISTAS DESTA VAGA */}
          {activeTab === 'pipeline' && (
            <div className="space-y-3">
              {vacancyInterviews.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Nenhum candidato em entrevista para esta vaga ainda.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Selecione candidatos nas abas "Ex-Colaboradores MCS" ou "Banco de Currículos" e clique em "+ Entrevista".
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
