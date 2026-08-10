import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Zap,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  Building2,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Instagram,
  MapPin,
  RefreshCw,
  Plus,
  Trash2,
  Download,
  ShieldCheck,
  Activity,
  Terminal,
  Layers,
  Sparkles,
  Sliders,
  Filter,
  CheckSquare,
  X,
} from 'lucide-react';
import {
  useProspectingJobs,
  useProspectingResults,
  useCreateProspectingJob,
  useUpdateJobStatus,
  useDeleteJob,
  useImportResults,
} from './hooks/useProspecting';
import { ProspectingService } from './services/prospectingService';
import type { LeadProspectingJob, LeadProspectingResult, SearchSourceEngine } from './types/prospectingTypes';

export function ProspectingPage() {
  const { t } = useTranslation();
  const { data: jobs = [], isLoading: loadingJobs } = useProspectingJobs();
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const { data: results = [], isLoading: loadingResults } = useProspectingResults(selectedJobId);

  const createJobMutation = useCreateProspectingJob();
  const updateStatusMutation = useUpdateJobStatus();
  const deleteJobMutation = useDeleteJob();
  const importResultsMutation = useImportResults();

  // State for new job form modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('Madrid, Espanha');
  const [targetCount, setTargetCount] = useState(25);
  const [delaySeconds, setDelaySeconds] = useState(3);
  const [searchSource, setSearchSource] = useState<SearchSourceEngine>('google_maps');
  const [emailRequired, setEmailRequired] = useState(true);
  const [sectorFilter, setSectorFilter] = useState('industrial');

  // Staging table selections
  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);
  const [filterEmailOnly, setFilterEmailOnly] = useState(false);

  // Live execution state
  const [activeJob, setActiveJob] = useState<LeadProspectingJob | null>(null);
  const [isProcessingLoop, setIsProcessingLoop] = useState(false);
  const [logs, setLogs] = useState<Array<{ timestamp: string; message: string; type: 'info' | 'success' | 'warn' | 'error' }>>([]);
  const isLoopRunningRef = useRef(false);

  // Select first active or recent job by default
  useEffect(() => {
    if (jobs.length > 0 && !selectedJobId) {
      setSelectedJobId(jobs[0].id);
    }
  }, [jobs, selectedJobId]);

  // Keep active job sync
  useEffect(() => {
    if (selectedJobId) {
      const current = jobs.find((j) => j.id === selectedJobId) || null;
      setActiveJob(current);
    } else {
      setActiveJob(null);
    }
  }, [jobs, selectedJobId]);

  // Add log entry
  const addLog = (message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [{ timestamp, message, type }, ...prev.slice(0, 49)]);
  };

  // Start background step process for a job
  const handleStartProcessing = async (job: LeadProspectingJob) => {
    if (isLoopRunningRef.current) return;
    isLoopRunningRef.current = true;
    setIsProcessingLoop(true);

    addLog(`[Motor AIsa Cloud] Iniciando busca via ${job.search_source || 'google_maps'} para "${job.title}"...`, 'info');

    try {
      await updateStatusMutation.mutateAsync({ jobId: job.id, status: 'processing' });

      let currentJob = job;
      while (isLoopRunningRef.current && currentJob.processed_count < currentJob.target_count && currentJob.status !== 'paused') {
        addLog(`[Lote Engine] Raspagem inteligente: "${currentJob.keywords}" em ${currentJob.location}...`, 'info');

        const stepResult = await ProspectingService.processJobStep(currentJob, 5);

        addLog(
          `[Sucesso Lote] Extraídas ${stepResult.processed} empresas (${stepResult.foundEmails} com e-mail corporativo).`,
          'success'
        );

        if (stepResult.completed) {
          addLog(`Missão "${currentJob.title}" concluída com sucesso!`, 'success');
          break;
        }

        // Wait delay to prevent rate limit & IP ban
        const waitMs = (currentJob.delay_seconds || 3) * 1000;
        addLog(`Pausa anti-bloqueio de ${currentJob.delay_seconds}s entre lotes para proteção de IP...`, 'warn');
        await new Promise((resolve) => setTimeout(resolve, waitMs));

        // Refetch latest state
        const updatedJobs = await jobs;
        const refetched = updatedJobs?.find((j) => j.id === currentJob.id);
        if (refetched) {
          currentJob = refetched;
          if (refetched.status === 'paused') break;
        }
      }
    } catch (err: any) {
      addLog(`Erro ao executar lote: ${err.message}`, 'error');
      await updateStatusMutation.mutateAsync({ jobId: job.id, status: 'failed' });
    } finally {
      isLoopRunningRef.current = false;
      setIsProcessingLoop(false);
    }
  };

  // Pause job
  const handlePauseJob = async (job: LeadProspectingJob) => {
    isLoopRunningRef.current = false;
    setIsProcessingLoop(false);
    await updateStatusMutation.mutateAsync({ jobId: job.id, status: 'paused' });
    addLog(`Missão "${job.title}" pausada pelo operador.`, 'warn');
  };

  // Force Complete Job Immediately
  const handleCompleteJobNow = async (job: LeadProspectingJob) => {
    isLoopRunningRef.current = false;
    setIsProcessingLoop(false);
    await updateStatusMutation.mutateAsync({ jobId: job.id, status: 'completed' });
    addLog(`Missão "${job.title}" concluída manualmente pelo operador.`, 'success');
  };

  // Create New Job
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywords || !location) return;

    try {
      const newJob = await createJobMutation.mutateAsync({
        title: title || `${keywords} em ${location}`,
        keywords,
        location,
        target_count: Number(targetCount),
        delay_seconds: Number(delaySeconds),
        search_source: searchSource,
        email_required: emailRequired,
        sector_filter: sectorFilter,
      });

      setIsModalOpen(false);
      setTitle('');
      setKeywords('');
      setSelectedJobId(newJob.id);
      addLog(`Nova missão criada: "${newJob.title}".`, 'info');

      // Auto start execution
      handleStartProcessing(newJob);
    } catch (err: any) {
      alert(`Erro ao criar missão: ${err.message}`);
    }
  };

  // Select all or toggle results
  const filteredResults = results.filter((r) => {
    if (filterEmailOnly && !r.email) return false;
    return true;
  });

  const handleToggleSelectAll = () => {
    if (selectedResultIds.length === filteredResults.length) {
      setSelectedResultIds([]);
    } else {
      setSelectedResultIds(filteredResults.map((r) => r.id));
    }
  };

  const handleToggleSelectResult = (id: string) => {
    setSelectedResultIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk Import
  const handleBulkImport = async () => {
    if (selectedResultIds.length === 0) return;
    try {
      const res = await importResultsMutation.mutateAsync(selectedResultIds);
      addLog(`${res.importedCount} leads importados para o CRM!`, 'success');
      setSelectedResultIds([]);
    } catch (err: any) {
      alert(`Erro na importação: ${err.message}`);
    }
  };

  // Totals calculations for Staging KPIs
  const totalStagingResultsCount = results.length;
  const emailsStagingCount = results.filter((r) => r.email).length;
  const totalLeadsCaptured = jobs.reduce((acc, j) => acc + j.processed_count, 0);
  const totalEmailsFound = jobs.reduce((acc, j) => acc + j.found_emails_count, 0);
  const activeJobsCount = jobs.filter((j) => j.status === 'processing' || j.status === 'pending').length;

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-slate-50 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 min-h-screen transition-colors duration-200">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Zap className="w-64 h-64 text-blue-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Motor Inteligente B2B Cloud
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {t('comercial.prospector.title', 'Máquina de Leads Qualificados')}
            </h1>
            <p className="text-slate-300 mt-1 max-w-2xl text-xs sm:text-sm">
              {t(
                'comercial.prospector.subtitle',
                'Descoberta B2B cadenciada e enriquecimento automático de e-mails corporativos, contatos e redes sociais para prospecção.'
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-xs sm:text-sm"
            >
              <Plus className="w-4 h-4" /> {t('comercial.prospector.btnNewMission', 'Nova Missão de Busca')}
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700/60">
          <div className="bg-slate-800/80 backdrop-blur-md rounded-xl p-4 border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-300 text-xs font-medium">
              <span>{t('comercial.prospector.activeMissions', 'Missões Ativas')}</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-1">{activeJobsCount}</div>
            <div className="text-xs text-slate-400 mt-1">{t('comercial.prospector.activeMissionsDesc', 'Jobs em execução/pendentes')}</div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-md rounded-xl p-4 border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-300 text-xs font-medium">
              <span>{t('comercial.prospector.totalCaptured', 'Total Capturado')}</span>
              <Building2 className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-1">{totalLeadsCaptured}</div>
            <div className="text-xs text-slate-400 mt-1">{t('comercial.prospector.totalCapturedDesc', 'Empresas pesquisadas')}</div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-md rounded-xl p-4 border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-300 text-xs font-medium">
              <span>{t('comercial.prospector.verifiedEmails', 'E-mails Verificados')}</span>
              <Mail className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">{totalEmailsFound}</div>
            <div className="text-xs text-slate-400 mt-1">{t('comercial.prospector.verifiedEmailsDesc', 'E-mails diretos capturados')}</div>
          </div>

          <div className="bg-slate-800/80 backdrop-blur-md rounded-xl p-4 border border-slate-700/60">
            <div className="flex items-center justify-between text-slate-300 text-xs font-medium">
              <span>{t('comercial.prospector.connectionStatus', 'Conexão AIsa Cloud')}</span>
              <ShieldCheck className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-semibold text-emerald-300">
                {t('comercial.prospector.connectionStatusOk', 'Conectado / API Ok')}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1">{t('comercial.prospector.rateLimitActive', 'Rate Limit Pacing Ativo')}</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Control Room & Staging Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Jobs List & Live Control Room */}
        <div className="space-y-6 lg:col-span-1">
          {/* Missões / Jobs Selector */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-sm dark:shadow-lg transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" /> {t('comercial.prospector.searchMissionsTitle', 'Missões de Busca')}
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {jobs.length} {t('comercial.prospector.createdSuffix', 'criadas')}
              </span>
            </div>

            {loadingJobs ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" /> {t('comercial.prospector.loadingMissions', 'Carregando missões...')}
              </div>
            ) : jobs.length === 0 ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4">
                {t('comercial.prospector.noMissions', 'Nenhuma missão iniciada. Clique em "Nova Missão de Busca" para começar.')}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {jobs.map((job) => {
                  const isSelected = job.id === selectedJobId;
                  const progressPct = job.target_count > 0 ? Math.min(100, Math.round((job.processed_count / job.target_count) * 100)) : 0;

                  return (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 dark:border-blue-500/80 ring-1 ring-blue-500/50 shadow-md'
                          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">{job.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" /> {job.location}
                            </span>
                            {job.search_source && (
                              <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono">
                                {job.search_source === 'linkedin' ? 'LinkedIn' : job.search_source === 'web_broad' ? 'Web Broad' : 'Maps'}
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            job.status === 'completed'
                              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30'
                              : job.status === 'processing'
                              ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30 animate-pulse'
                              : job.status === 'paused'
                              ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                          <span>
                            {job.processed_count} de {job.target_count} empresas
                          </span>
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{progressPct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Job Live Control Panel */}
          {activeJob && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-sm dark:shadow-lg space-y-4 transition-colors">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80 pb-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-500" /> {t('comercial.prospector.controlPanelTitle', 'Painel de Controle de Ritmo')}
                </h3>
                <button
                  onClick={() => deleteJobMutation.mutate(activeJob.id)}
                  className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                  title={t('comercial.prospector.deleteMission', 'Excluir Missão')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">{t('comercial.prospector.keywordsLabel', 'Palavras-chave:')}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{activeJob.keywords}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">{t('comercial.prospector.locationLabel', 'Localização:')}</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{activeJob.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">{t('comercial.prospector.delayLabel', 'Delay Anti-bloqueio:')}</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{activeJob.delay_seconds}s entre lotes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">{t('comercial.prospector.emailsExtractedLabel', 'E-mails Extraídos:')}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{emailsStagingCount} e-mails no Staging</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  {activeJob.status === 'processing' || isProcessingLoop ? (
                    <button
                      onClick={() => handlePauseJob(activeJob)}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold py-2.5 px-3 rounded-lg shadow transition-colors"
                    >
                      <Pause className="w-4 h-4" /> {t('comercial.prospector.btnPause', 'Pausar Busca')}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartProcessing(activeJob)}
                      disabled={isProcessingLoop}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold py-2.5 px-3 rounded-lg shadow transition-colors"
                    >
                      <Play className="w-4 h-4" />{' '}
                      {activeJob.status === 'completed'
                        ? 'Reiniciar Captura'
                        : activeJob.status === 'paused'
                        ? t('comercial.prospector.btnContinue', 'Continuar Busca')
                        : t('comercial.prospector.btnStart', 'Iniciar Captura')}
                    </button>
                  )}
                </div>

                {activeJob.status !== 'completed' && (
                  <button
                    onClick={() => handleCompleteJobNow(activeJob)}
                    className="w-full inline-flex items-center justify-center gap-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-semibold py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 transition-colors"
                  >
                    <CheckSquare className="w-4 h-4 text-emerald-500" /> Concluir Missão Agora (100%)
                  </button>
                )}
              </div>

              {/* Console / Log Window */}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-blue-500" /> {t('comercial.prospector.liveTerminalTitle', 'Log de Execução ao Vivo')}
                  </span>
                  <span className="text-[10px] text-slate-400">AIsa API Stream</span>
                </div>
                <div className="bg-slate-950 rounded-lg p-3 font-mono text-[11px] h-36 overflow-y-auto space-y-1 border border-slate-800 text-slate-100">
                  {logs.length === 0 ? (
                    <div className="text-slate-500 italic">{t('comercial.prospector.awaitingCommand', 'Aguardando comando de execução...')}</div>
                  ) : (
                    logs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-slate-500 text-[10px] select-none">[{log.timestamp}]</span>
                        <span
                          className={
                            log.type === 'success'
                              ? 'text-emerald-400'
                              : log.type === 'warn'
                              ? 'text-amber-300'
                              : log.type === 'error'
                              ? 'text-red-400 font-semibold'
                              : 'text-slate-300'
                          }
                        >
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Staging Results Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-sm dark:shadow-lg transition-colors">
            {/* Table Header & Controls with KPI Counters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700/80">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-500" /> {t('comercial.prospector.stagingTitle', 'Leads Capturados em Staging')}
                  </h2>

                  {/* Prominent KPI Badges */}
                  <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 text-xs font-extrabold px-2.5 py-1 rounded-full border border-blue-300 dark:border-blue-700/50 shadow-sm">
                    <Building2 className="w-3.5 h-3.5 text-blue-500" /> {totalStagingResultsCount} {t('comercial.prospector.totalCapturedDesc', 'Empresas')}
                  </span>

                  <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-700/50 shadow-sm">
                    <Mail className="w-3.5 h-3.5 text-emerald-500" /> {emailsStagingCount} {t('comercial.prospector.verifiedEmails', 'E-mails Verificados')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('comercial.prospector.stagingSubtitle', 'Revise os leads qualificados e importe para a lista oficial do CRM.')}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setFilterEmailOnly(!filterEmailOnly)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    filterEmailOnly
                      ? 'bg-indigo-100 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/50'
                      : 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600/50 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 inline mr-1" /> {t('comercial.prospector.btnFilterEmail', 'Apenas com E-mail')}
                </button>

                <button
                  onClick={handleBulkImport}
                  disabled={selectedResultIds.length === 0 || importResultsMutation.isPending}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md transition-all"
                >
                  <Download className="w-4 h-4" /> {t('comercial.prospector.btnImportSelected', 'Importar ({{count}}) para CRM', { count: selectedResultIds.length })}
                </button>
              </div>
            </div>

            {/* Scrollable Table Gallery Container */}
            {loadingResults ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-500" /> {t('comercial.prospector.loadingResults', 'Carregando resultados...')}
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                {t('comercial.prospector.noResults', 'Nenhum lead capturado para a missão selecionada.')}
              </div>
            ) : (
              <div className="max-h-[620px] overflow-y-auto overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700/80 shadow-inner custom-scrollbar">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900/95 backdrop-blur-md text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-700/80 z-10 shadow-sm">
                    <tr>
                      <th className="p-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedResultIds.length === filteredResults.length && filteredResults.length > 0}
                          onChange={handleToggleSelectAll}
                          className="rounded border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="p-3">{t('comercial.prospector.colCompany', 'Empresa')}</th>
                      <th className="p-3">{t('comercial.prospector.colEmail', 'E-mail Corporativo')}</th>
                      <th className="p-3">{t('comercial.prospector.colPhone', 'Telefone')}</th>
                      <th className="p-3">{t('comercial.prospector.colWebSocial', 'Website & Redes')}</th>
                      <th className="p-3">{t('comercial.prospector.colLocation', 'Localidade')}</th>
                      <th className="p-3 text-center">{t('comercial.prospector.colStatus', 'Status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                    {filteredResults.map((item) => {
                      const isSelected = selectedResultIds.includes(item.id);
                      const isImported = item.status === 'imported';

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${
                            isSelected ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                          }`}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              disabled={isImported}
                              checked={isSelected}
                              onChange={() => handleToggleSelectResult(item.id)}
                              className="rounded border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                            />
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-900 dark:text-white text-sm">{item.company_name}</div>
                            {item.address && <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">{item.address}</div>}
                          </td>
                          <td className="p-3">
                            {item.email ? (
                              <div className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800/40">
                                <Mail className="w-3.5 h-3.5" />
                                <span>{item.email}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">{t('comercial.prospector.notFound', 'Não encontrado')}</span>
                            )}
                          </td>
                          <td className="p-3">
                            {item.phone ? (
                              <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                                <Phone className="w-3.5 h-3.5 text-slate-400" /> {item.phone}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              {item.website ? (
                                <a
                                  href={item.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-500 p-1 bg-slate-100 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 transition-colors"
                                  title={`Website Oficial: ${item.website}`}
                                >
                                  <Globe className="w-3.5 h-3.5" />
                                </a>
                              ) : null}

                              {item.linkedin_url ? (
                                <a
                                  href={item.linkedin_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-500 p-1 bg-slate-100 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 transition-colors"
                                  title={`LinkedIn: ${item.linkedin_url}`}
                                >
                                  <Linkedin className="w-3.5 h-3.5" />
                                </a>
                              ) : null}

                              {item.instagram_url ? (
                                <a
                                  href={item.instagram_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-pink-600 dark:text-pink-400 hover:text-pink-500 p-1 bg-slate-100 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 transition-colors"
                                  title={`Instagram: ${item.instagram_url}`}
                                >
                                  <Instagram className="w-3.5 h-3.5" />
                                </a>
                              ) : null}

                              {!item.website && !item.linkedin_url && !item.instagram_url && (
                                <span className="text-[11px] text-slate-400 italic">Sem links públicos</span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="text-slate-700 dark:text-slate-300">{item.city || item.province}</span>
                          </td>
                          <td className="p-3 text-center">
                            {isImported ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" /> {t('comercial.prospector.statusCrm', 'CRM')}
                              </span>
                            ) : (
                              <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                {t('comercial.prospector.statusStaging', 'Staging')}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Nova Missão de Busca Avançada */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 w-full max-w-xl shadow-2xl space-y-5 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" /> {t('comercial.prospector.modalTitle', 'Nova Missão de Prospecção')}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  {t('comercial.prospector.modalMissionTitleLabel', 'Título da Missão (opcional)')}
                </label>
                <input
                  type="text"
                  placeholder="ex: Metalúrgicas Madrid - Q3"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Canal de Origem / Search Source */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-blue-500" /> Canal de Busca & Origem dos Dados
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchSource('google_maps')}
                    className={`p-2.5 rounded-lg border text-center font-medium transition-all ${
                      searchSource === 'google_maps'
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-500 ring-1 ring-blue-500'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <Globe className="w-4 h-4 mx-auto mb-1 text-blue-500" />
                    Google Maps & Locais
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchSource('linkedin')}
                    className={`p-2.5 rounded-lg border text-center font-medium transition-all ${
                      searchSource === 'linkedin'
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-500 ring-1 ring-blue-500'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <Linkedin className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                    LinkedIn B2B
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchSource('web_broad')}
                    className={`p-2.5 rounded-lg border text-center font-medium transition-all ${
                      searchSource === 'web_broad'
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-500 ring-1 ring-blue-500'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <Search className="w-4 h-4 mx-auto mb-1 text-indigo-500" />
                    Busca Web Ampla
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    {t('comercial.prospector.modalKeywordsLabel', 'Palavras-chave / Segmento *')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: metalúrgica, usinagem, fundição"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    {t('comercial.prospector.modalLocationLabel', 'Cidade / Região *')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Madrid, Valencia, Catalunya"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    {t('comercial.prospector.modalTargetLabel', 'Meta de Leads')}
                  </label>
                  <select
                    value={targetCount}
                    onChange={(e) => setTargetCount(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value={10}>10 Empresas</option>
                    <option value={25}>25 Empresas</option>
                    <option value={50}>50 Empresas</option>
                    <option value={100}>100 Empresas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    {t('comercial.prospector.modalDelayLabel', 'Delay Anti-bloqueio')}
                  </label>
                  <select
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value={1}>1s (Rápido)</option>
                    <option value={3}>3s (Recomendado)</option>
                    <option value={5}>5s (Seguro)</option>
                    <option value={10}>10s (Ultra Seguro)</option>
                  </select>
                </div>
              </div>

              {/* Qualificação de E-mail Checkbox */}
              <div className="bg-slate-100 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-slate-800 dark:text-slate-200 font-medium">
                  <input
                    type="checkbox"
                    checked={emailRequired}
                    onChange={(e) => setEmailRequired(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span>Filtrar e trazer apenas leads com e-mail corporativo verificado</span>
                </label>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 pl-6">
                  Garante que todas as empresas retornadas possuem e-mail de contato válido para suas campanhas.
                </p>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold"
                >
                  {t('comercial.prospector.modalBtnCancel', 'Cancelar')}
                </button>
                <button
                  type="submit"
                  disabled={createJobMutation.isPending}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-semibold shadow-lg shadow-blue-600/30"
                >
                  {t('comercial.prospector.modalBtnSubmit', 'Criar e Iniciar Captura')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
