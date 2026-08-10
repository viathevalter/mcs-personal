import React, { useState, useEffect, useRef } from 'react';
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
  Key,
} from 'lucide-react';
import {
  useProspectingJobs,
  useProspectingResults,
  useCreateProspectingJob,
  useUpdateJobStatus,
  useDeleteJob,
  useImportResults,
} from './hooks/useProspecting';
import { ProspectingService, DEFAULT_AISA_API_KEY } from './services/prospectingService';
import type { LeadProspectingJob, LeadProspectingResult } from './types/prospectingTypes';

export function ProspectingPage() {
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
  const [apiKeyOverride, setApiKeyOverride] = useState(DEFAULT_AISA_API_KEY);

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

    addLog(`Iniciando missão de captura "${job.title}" via API AIsa.one...`, 'info');

    try {
      await updateStatusMutation.mutateAsync({ jobId: job.id, status: 'processing' });

      let currentJob = job;
      while (isLoopRunningRef.current && currentJob.processed_count < currentJob.target_count && currentJob.status !== 'paused') {
        addLog(`[Lote AIsa] Buscando empresas para "${currentJob.keywords}" em ${currentJob.location}...`, 'info');

        const stepResult = await ProspectingService.processJobStep(currentJob, 5);

        addLog(
          `[Lote Concluído] Capturadas ${stepResult.processed} empresas (${stepResult.foundEmails} com e-mail verificado).`,
          'success'
        );

        if (stepResult.completed) {
          addLog(`Missão "${currentJob.title}" concluída com sucesso!`, 'success');
          break;
        }

        // Wait delay to prevent rate limit & IP ban
        const waitMs = (currentJob.delay_seconds || 3) * 1000;
        addLog(`Pausa anti-bloqueio de ${currentJob.delay_seconds}s para evitar rate-limit...`, 'warn');
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
    addLog(`Missão "${job.title}" pausada pelo usuário.`, 'warn');
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
        api_key_override: apiKeyOverride || DEFAULT_AISA_API_KEY,
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
      addLog(`${res.importedCount} leads importados para o CRM com sucesso!`, 'success');
      setSelectedResultIds([]);
    } catch (err: any) {
      alert(`Erro na importação: ${err.message}`);
    }
  };

  // Totals calculations
  const totalLeadsCaptured = jobs.reduce((acc, j) => acc + j.processed_count, 0);
  const totalEmailsFound = jobs.reduce((acc, j) => acc + j.found_emails_count, 0);
  const activeJobsCount = jobs.filter((j) => j.status === 'processing' || j.status === 'pending').length;

  return (
    <div className="p-6 space-y-6 bg-slate-900/90 text-slate-100 min-h-screen font-sans">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 border border-slate-700/60 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Zap className="w-64 h-64 text-blue-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Motor Inteligente AIsa.one
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Máquina de Leads Qualificados
            </h1>
            <p className="text-slate-300 mt-1 max-w-2xl text-sm">
              Descoberta B2B cadenciada e enriquecimento automático de e-mails corporativos, contatos e redes sociais para prospecção na Espanha e Europa.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-blue-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus className="w-5 h-5" /> Nova Missão de Busca
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700/50">
          <div className="bg-slate-800/60 backdrop-blur-md rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Missões Ativas</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-1">{activeJobsCount}</div>
            <div className="text-xs text-slate-400 mt-1">Jobs em execução/pendentes</div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-md rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Total Capturado</span>
              <Building2 className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-1">{totalLeadsCaptured}</div>
            <div className="text-xs text-slate-400 mt-1">Empresas pesquisadas</div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-md rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>E-mails Verificados</span>
              <Mail className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">{totalEmailsFound}</div>
            <div className="text-xs text-slate-400 mt-1">E-mails diretos capturados</div>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-md rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
              <span>Conexão AIsa.one</span>
              <ShieldCheck className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-semibold text-emerald-300">Conectado / API Ok</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">Rate Limit Pacing Ativo</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Control Room & Staging Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Jobs List & Live Control Room */}
        <div className="space-y-6 lg:col-span-1">
          {/* Missões / Jobs Selector */}
          <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700/80 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" /> Missões de Busca
              </h2>
              <span className="text-xs text-slate-400">{jobs.length} criadas</span>
            </div>

            {loadingJobs ? (
              <div className="py-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400" /> Carregando missões...
              </div>
            ) : jobs.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm border border-dashed border-slate-700 rounded-lg p-4">
                Nenhuma missão iniciada. Clique em "Nova Missão de Busca" para começar.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {jobs.map((job) => {
                  const isSelected = job.id === selectedJobId;
                  const progressPct = job.target_count > 0 ? Math.round((job.processed_count / job.target_count) * 100) : 0;

                  return (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJobId(job.id)}
                      className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-950/60 border-blue-500/80 ring-1 ring-blue-500/50 shadow-md'
                          : 'bg-slate-900/60 border-slate-700/60 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-sm text-white line-clamp-1">{job.title}</h3>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" /> {job.location}
                            </span>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            job.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : job.status === 'processing'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse'
                              : job.status === 'paused'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {job.status}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span>
                            {job.processed_count} de {job.target_count} empresas
                          </span>
                          <span className="font-semibold text-blue-400">{progressPct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
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
            <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700/80 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" /> Painel de Controle de Ritmo
                </h3>
                <button
                  onClick={() => deleteJobMutation.mutate(activeJob.id)}
                  className="text-slate-400 hover:text-red-400 p-1 rounded transition-colors"
                  title="Excluir Missão"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Palavras-chave:</span>
                  <span className="font-semibold text-white">{activeJob.keywords}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Localização:</span>
                  <span className="font-semibold text-white">{activeJob.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Delay Anti-bloqueio:</span>
                  <span className="font-semibold text-amber-400">{activeJob.delay_seconds}s entre lotes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">E-mails Extraídos:</span>
                  <span className="font-semibold text-emerald-400">{activeJob.found_emails_count} e-mails</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                {activeJob.status === 'processing' || isProcessingLoop ? (
                  <button
                    onClick={() => handlePauseJob(activeJob)}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold py-2.5 px-3 rounded-lg shadow transition-colors"
                  >
                    <Pause className="w-4 h-4" /> Pausar Busca
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartProcessing(activeJob)}
                    disabled={activeJob.processed_count >= activeJob.target_count}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold py-2.5 px-3 rounded-lg shadow transition-colors"
                  >
                    <Play className="w-4 h-4" /> {activeJob.status === 'paused' ? 'Continuar Busca' : 'Iniciar Captura'}
                  </button>
                )}
              </div>

              {/* Console / Log Window */}
              <div className="mt-4 pt-4 border-t border-slate-700/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-blue-400" /> Log de Execução ao Vivo
                  </span>
                  <span className="text-[10px] text-slate-400">AIsa API Stream</span>
                </div>
                <div className="bg-slate-950 rounded-lg p-3 font-mono text-[11px] h-36 overflow-y-auto space-y-1 border border-slate-800">
                  {logs.length === 0 ? (
                    <div className="text-slate-400 italic">Aguardando comando de execução...</div>
                  ) : (
                    logs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-slate-400 text-[10px] select-none">[{log.timestamp}]</span>
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
          <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700/80 shadow-lg">
            {/* Table Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-700/80">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-400" /> Leads Capturados em Staging
                </h2>
                <p className="text-xs text-slate-400">
                  Revise os leads qualificados e importe para a lista oficial do CRM.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setFilterEmailOnly(!filterEmailOnly)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    filterEmailOnly
                      ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                      : 'bg-slate-700/50 text-slate-300 border-slate-600/50 hover:bg-slate-700'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5 inline mr-1" /> Apenas com E-mail
                </button>

                <button
                  onClick={handleBulkImport}
                  disabled={selectedResultIds.length === 0 || importResultsMutation.isPending}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md transition-all"
                >
                  <Download className="w-4 h-4" /> Importar ({selectedResultIds.length}) para CRM
                </button>
              </div>
            </div>

            {/* Results Table */}
            {loadingResults ? (
              <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-400" /> Carregando resultados...
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm border border-dashed border-slate-700 rounded-lg">
                Nenhum lead capturado para a missão selecionada.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-700/80">
                    <tr>
                      <th className="p-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedResultIds.length === filteredResults.length && filteredResults.length > 0}
                          onChange={handleToggleSelectAll}
                          className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="p-3">Empresa</th>
                      <th className="p-3">E-mail Corporativo</th>
                      <th className="p-3">Telefone</th>
                      <th className="p-3">Website & Redes</th>
                      <th className="p-3">Localidade</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {filteredResults.map((item) => {
                      const isSelected = selectedResultIds.includes(item.id);
                      const isImported = item.status === 'imported';

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-700/30 transition-colors ${
                            isSelected ? 'bg-blue-950/30' : ''
                          }`}
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              disabled={isImported}
                              checked={isSelected}
                              onChange={() => handleToggleSelectResult(item.id)}
                              className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                            />
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-white text-sm">{item.company_name}</div>
                            {item.address && <div className="text-[11px] text-slate-400 line-clamp-1">{item.address}</div>}
                          </td>
                          <td className="p-3">
                            {item.email ? (
                              <div className="inline-flex items-center gap-1.5 text-emerald-400 font-medium bg-emerald-950/40 px-2 py-1 rounded border border-emerald-800/40">
                                <Mail className="w-3.5 h-3.5" />
                                <span>{item.email}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Não encontrado</span>
                            )}
                          </td>
                          <td className="p-3">
                            {item.phone ? (
                              <div className="flex items-center gap-1 text-slate-300">
                                <Phone className="w-3.5 h-3.5 text-slate-400" /> {item.phone}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {item.website && (
                                <a
                                  href={item.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 p-1 bg-slate-900 rounded border border-slate-700"
                                  title={item.website}
                                >
                                  <Globe className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {item.linkedin_url && (
                                <a
                                  href={item.linkedin_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 p-1 bg-slate-900 rounded border border-slate-700"
                                  title="LinkedIn"
                                >
                                  <Linkedin className="w-3.5 h-3.5" />
                                </a>
                              )}
                              {item.instagram_url && (
                                <a
                                  href={item.instagram_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-pink-400 hover:text-pink-300 p-1 bg-slate-900 rounded border border-slate-700"
                                  title="Instagram"
                                >
                                  <Instagram className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="text-slate-300">{item.city || item.province}</span>
                          </td>
                          <td className="p-3 text-center">
                            {isImported ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" /> CRM
                              </span>
                            ) : (
                              <span className="bg-slate-700 text-slate-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                Staging
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

      {/* Modal: Nova Missão de Busca */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" /> Nova Missão de Prospecção
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Título da Missão (opcional)</label>
                <input
                  type="text"
                  placeholder="ex: Metalúrgicas Madrid"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Palavras-chave / Segmento *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: metalúrgica, construção civil, usinagem"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Cidade / Região *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Madrid, Valencia, Barcelona"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Meta de Leads</label>
                  <select
                    value={targetCount}
                    onChange={(e) => setTargetCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value={10}>10 Empresas</option>
                    <option value={25}>25 Empresas</option>
                    <option value={50}>50 Empresas</option>
                    <option value={100}>100 Empresas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Delay Anti-bloqueio</label>
                  <select
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value={1}>1s (Rápido)</option>
                    <option value={3}>3s (Recomendado)</option>
                    <option value={5}>5s (Seguro)</option>
                    <option value={10}>10s (Ultra Seguro)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" /> Chave API AIsa.one
                </label>
                <input
                  type="password"
                  value={apiKeyOverride}
                  onChange={(e) => setApiKeyOverride(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-[11px]"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Usando API Key oficial cadastrada pelo operador.
                </p>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createJobMutation.isPending}
                  className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg font-semibold shadow-lg shadow-blue-600/30"
                >
                  Criar e Iniciar Captura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
