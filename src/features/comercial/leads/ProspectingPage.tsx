import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Tag,
  FileText,
  Loader2,
  Bookmark,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useProspectingJobs,
  useProspectingResults,
  useCreateProspectingJob,
  useUpdateJobStatus,
  useDeleteJob,
  useClearEmpresaProspectingJobs,
  useImportResults,
} from './hooks/useProspecting';
import { ProspectingService, normalizeSectorName } from './services/prospectingService';
import type { LeadProspectingJob, LeadProspectingResult, SearchSourceEngine } from './types/prospectingTypes';
import { supabase } from '@/shared/supabase/client';

const ensureAbsoluteUrl = (url?: string | null): string => {
  if (!url) return '#';
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#' || trimmed === 'null') return '#';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

export function ProspectingPage() {
  const { t } = useTranslation();
  const { data: jobs = [], isLoading: loadingJobs } = useProspectingJobs();
  const [selectedJobId, setSelectedJobId] = useState<string>('all');
  const { data: results = [], isLoading: loadingResults } = useProspectingResults(selectedJobId);

  const createJobMutation = useCreateProspectingJob();
  const updateStatusMutation = useUpdateJobStatus();
  const deleteJobMutation = useDeleteJob();
  const clearAllJobsMutation = useClearEmpresaProspectingJobs();
  const importResultsMutation = useImportResults();

  const handleDeleteSingleJob = (jobId: string, jobTitle: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm(`Tem certeza que deseja excluir a missão "${jobTitle}" e seus leads em staging?`)) {
      deleteJobMutation.mutate(jobId, {
        onSuccess: () => {
          toast.success(`Missão "${jobTitle}" excluída com sucesso!`);
          if (selectedJobId === jobId) {
            setSelectedJobId('all');
          }
        },
        onError: (err: any) => {
          toast.error(`Erro ao excluir missão: ${err.message || 'Erro desconhecido'}`);
        }
      });
    }
  };

  const handleClearAllJobs = () => {
    if (confirm('Atenção: Deseja realmente excluir TODAS as missões de busca e leads em staging desta empresa?')) {
      clearAllJobsMutation.mutate(undefined, {
        onSuccess: () => {
          toast.success('Todas as missões da empresa foram limpas com sucesso.');
          setSelectedJobId('all');
        },
        onError: (err: any) => {
          toast.error(`Erro ao limpar missões: ${err.message || 'Erro desconhecido'}`);
        }
      });
    }
  };

  const handleResumeOrExpandJob = async (job: LeadProspectingJob, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newTarget = job.processed_count >= job.target_count ? job.target_count + 500 : job.target_count;
    try {
      await updateStatusMutation.mutateAsync({ jobId: job.id, status: 'processing' });
      addLog(`Missão "${job.title}" reativada para buscar mais empresas (Alvo: ${newTarget}).`, 'info');
      handleStartProcessing({ ...job, status: 'processing', target_count: newTarget });
    } catch (err: any) {
      toast.error(`Erro ao reativar missão: ${err.message}`);
    }
  };

  // State for new job form modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('Madrid, Espanha');
  const [missionCountry, setMissionCountry] = useState('ES');
  const [targetCount, setTargetCount] = useState<number>(500);
  const [delaySeconds, setDelaySeconds] = useState<number>(3);
  const [searchSource, setSearchSource] = useState<SearchSourceEngine>('google_maps');
  const [emailRequired, setEmailRequired] = useState(true);
  const [sectorFilter, setSectorFilter] = useState('industrial');

  // Import modal state (Tagging, Sector & Custom Notes for Audience Segmentation)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [audienceTag, setAudienceTag] = useState('');
  const [importSector, setImportSector] = useState('Calderería & Tubería Industrial');
  const [importCountry, setImportCountry] = useState('ES');
  const [customNotes, setCustomNotes] = useState('');

  // Live execution state
  const [activeJob, setActiveJob] = useState<LeadProspectingJob | null>(null);
  const [isProcessingLoop, setIsProcessingLoop] = useState(false);
  const [logs, setLogs] = useState<Array<{ timestamp: string; message: string; type: 'info' | 'success' | 'warn' | 'error' }>>([]);
  const isLoopRunningRef = useRef(false);

  // Reset ref on unmount
  useEffect(() => {
    return () => {
      isLoopRunningRef.current = false;
    };
  }, []);

  // Automatic Sequential Queue Runner for All Pending/Processing Missions
  useEffect(() => {
    if (!isLoopRunningRef.current && jobs.length > 0) {
      // Auto-heal any jobs in state that reached their target count (or within 5 leads, e.g. 499 of 500)
      const reachedTargetJobs = jobs.filter(
        (j) =>
          j.status !== 'completed' &&
          (j.processed_count >= j.target_count - 5 || (j.email_required && j.found_emails_count >= j.target_count - 5))
      );
      if (reachedTargetJobs.length > 0) {
        reachedTargetJobs.forEach((j) => {
          updateStatusMutation.mutate({ jobId: j.id, status: 'completed' });
        });
      }

      // Pick next job that is pending or processing BUT has NOT reached target count yet (in strict chronological order)
      const sortedJobs = [...jobs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const nextPendingJob = sortedJobs.find(
        (j) =>
          (j.status === 'processing' || j.status === 'pending') &&
          j.processed_count < j.target_count - 5 &&
          (!j.email_required || j.found_emails_count < j.target_count - 5)
      );
      if (nextPendingJob) {
        handleStartProcessing(nextPendingJob);
      }
    }
  }, [jobs, isProcessingLoop]);

  // Keep active job sync
  useEffect(() => {
    if (selectedJobId && selectedJobId !== 'all') {
      const current = jobs.find((j) => j.id === selectedJobId) || null;
      setActiveJob(current);
      if (current) {
        setAudienceTag(current.title || current.keywords);
        setImportSector(current.sector_filter || 'Calderería & Tubería Industrial');
        setCustomNotes(`Leads qualificados capturados na missão "${current.title}" em ${current.location}.`);
      }
    } else {
      setActiveJob(null);
      setAudienceTag('Prospecção Geral Espanha');
      setImportSector('Calderería & Tubería Industrial');
      setCustomNotes('Leads qualificados importados via AIsa Prospecting.');
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

    const isEmailTargetInitial = job.email_required ?? true;
    const initialMetric = isEmailTargetInitial ? job.found_emails_count : job.processed_count;

    setActiveJob(job);
    setSelectedJobId(job.id);

    addLog(`[Motor AIsa Cloud] Iniciando busca via ${job.search_source || 'google_maps'} para "${job.title}"...`, 'info');

    try {
      await updateStatusMutation.mutateAsync({ jobId: job.id, status: 'processing' });

      let currentJob = job;
      let shouldContinue = true;
      let consecutiveEmptyBatches = 0;

      while (isLoopRunningRef.current && shouldContinue) {
        const isEmailTarget = currentJob.email_required ?? true;
        const currentMetric = isEmailTarget ? currentJob.found_emails_count : currentJob.processed_count;

        if (currentMetric >= currentJob.target_count - 5) {
          await updateStatusMutation.mutateAsync({ jobId: currentJob.id, status: 'completed' });
          addLog(`Missão "${currentJob.title}" atingiu a meta de ${currentJob.target_count} leads com sucesso!`, 'success');
          shouldContinue = false;
          break;
        }

        if (currentJob.status === 'paused') {
          shouldContinue = false;
          break;
        }

        addLog(`[Lote Engine] Raspagem inteligente: "${currentJob.keywords}" em ${currentJob.location}...`, 'info');

        const stepResult = await ProspectingService.processJobStep(currentJob, 40);

        if (stepResult.processed <= 1) {
          consecutiveEmptyBatches++;
        } else {
          consecutiveEmptyBatches = 0;
        }

        addLog(
          `[Sucesso Lote] Extraídas ${stepResult.processed} novas empresas (${stepResult.foundEmails} com e-mail corporativo).`,
          stepResult.processed > 0 ? 'success' : 'warn'
        );

        if (stepResult.completed || (consecutiveEmptyBatches >= 2 && currentMetric >= 30)) {
          await updateStatusMutation.mutateAsync({ jobId: currentJob.id, status: 'completed' });
          addLog(
            `Missão "${currentJob.title}" concluída com saturação máxima (${currentMetric} empresas reais verificadas). Avançando para a próxima da fila...`,
            'success'
          );
          shouldContinue = false;
          break;
        }

        // Optimized anti-blocking delay
        const waitMs = Math.max(500, (currentJob.delay_seconds || 1) * 1000);
        addLog(`Pausa otimizada de ${waitMs / 1000}s entre lotes...`, 'info');
        await new Promise((resolve) => setTimeout(resolve, waitMs));

        // Refetch latest state directly from DB
        const { data: refetched } = await supabase
          .schema('core_comercial')
          .from('lead_prospecting_jobs')
          .select('*')
          .eq('id', currentJob.id)
          .maybeSingle();

        if (refetched) {
          currentJob = refetched as LeadProspectingJob;
          if (currentJob.status === 'paused') {
            addLog(`Missão "${currentJob.title}" pausada pelo operador.`, 'warn');
            shouldContinue = false;
            break;
          }
          if (currentJob.status === 'completed') {
            shouldContinue = false;
            break;
          }
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

  // Mission filtering state
  const [jobStatusFilter, setJobStatusFilter] = useState<'all' | 'processing' | 'pending' | 'completed' | 'paused'>('all');
  const [jobSearchTerm, setJobSearchTerm] = useState('');

  const jobCounts = {
    total: jobs.length,
    processing: jobs.filter((j) => j.status === 'processing').length,
    pending: jobs.filter((j) => j.status === 'pending').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    paused: jobs.filter((j) => j.status === 'paused').length,
  };

  const filteredJobs = jobs.filter((j) => {
    if (jobStatusFilter !== 'all' && j.status !== jobStatusFilter) return false;
    if (!jobSearchTerm) return true;
    const term = jobSearchTerm.toLowerCase().trim();
    return (
      (j.title && j.title.toLowerCase().includes(term)) ||
      (j.location && j.location.toLowerCase().includes(term)) ||
      (j.keywords && j.keywords.toLowerCase().includes(term))
    );
  });

  // Staging table selections & filters
  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);
  const [filterEmailOnly, setFilterEmailOnly] = useState(false);
  const [filterCorporateDomainOnly, setFilterCorporateDomainOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'raw' | 'imported'>('all');
  const [stagingSearchTerm, setStagingSearchTerm] = useState('');
  const [stagingCountryFilter, setStagingCountryFilter] = useState<string>('all');
  const [stagingSectorFilter, setStagingSectorFilter] = useState<string>('all');
  const [stagingCurrentPage, setStagingCurrentPage] = useState<number>(1);
  const [stagingPageSize, setStagingPageSize] = useState<number>(50);

  const jobMap = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);

  const detectResultSector = useCallback(
    (item: LeadProspectingResult) => {
      const job = jobMap.get(item.job_id);
      const text = `${job?.sector_filter || ''} ${job?.keywords || ''} ${job?.title || ''} ${item.company_name || ''}`;
      return normalizeSectorName(text);
    },
    [jobMap]
  );

  const stagingSectorCounts = useMemo(() => {
    const counts = {
      total: results.length,
      naval: 0,
      caldereria: 0,
      estructuras: 0,
      quimica: 0,
      epc: 0,
      construccion: 0,
      geral: 0,
    };
    results.forEach((r) => {
      const sec = detectResultSector(r);
      if (sec === 'Construção & Reparação Naval') counts.naval++;
      else if (sec === 'Calderería & Tubería Industrial') counts.caldereria++;
      else if (sec === 'Estructuras Metálicas & Montajes') counts.estructuras++;
      else if (sec === 'Industria Química & Petroquímica') counts.quimica++;
      else if (sec === 'Ingeniería & Contratistas EPC') counts.epc++;
      else if (sec === 'Construcción & Obras') counts.construccion++;
      else counts.geral++;
    });
    return counts;
  }, [results, detectResultSector]);

  const detectResultCountry = (item: LeadProspectingResult) => {
    if (item.country) {
      const c = item.country.toLowerCase();
      if (c.includes('espan') || c.includes('spain') || c === 'es') return 'ES';
      if (c.includes('portug') || c === 'pt') return 'PT';
      if (c.includes('fran') || c === 'fr') return 'FR';
      if (c.includes('alem') || c.includes('germ') || c === 'de') return 'DE';
      if (c.includes('ital') || c === 'it') return 'IT';
      if (c.includes('holan') || c.includes('nether') || c === 'nl') return 'NL';
      if (c.includes('belg') || c === 'be') return 'BE';
      if (c.includes('uk') || c.includes('brit') || c.includes('reino') || c === 'gb') return 'GB';
    }
    if (item.phone) {
      if (item.phone.startsWith('+34') || item.phone.startsWith('34')) return 'ES';
      if (item.phone.startsWith('+351') || item.phone.startsWith('351')) return 'PT';
      if (item.phone.startsWith('+33') || item.phone.startsWith('33')) return 'FR';
      if (item.phone.startsWith('+49') || item.phone.startsWith('49')) return 'DE';
      if (item.phone.startsWith('+39') || item.phone.startsWith('39')) return 'IT';
      if (item.phone.startsWith('+31') || item.phone.startsWith('31')) return 'NL';
      if (item.phone.startsWith('+32') || item.phone.startsWith('32')) return 'BE';
      if (item.phone.startsWith('+44') || item.phone.startsWith('44')) return 'GB';
    }
    if (item.email) {
      if (item.email.endsWith('.es')) return 'ES';
      if (item.email.endsWith('.pt')) return 'PT';
      if (item.email.endsWith('.fr')) return 'FR';
      if (item.email.endsWith('.de')) return 'DE';
      if (item.email.endsWith('.it')) return 'IT';
      if (item.email.endsWith('.nl')) return 'NL';
      if (item.email.endsWith('.be')) return 'BE';
      if (item.email.endsWith('.uk') || item.email.endsWith('.co.uk')) return 'GB';
    }
    return 'ES';
  };

  const countryLabels: Record<string, { name: string; flag: string }> = {
    ES: { name: 'Espanha', flag: '🇪🇸' },
    PT: { name: 'Portugal', flag: '🇵🇹' },
    FR: { name: 'França', flag: '🇫🇷' },
    DE: { name: 'Alemanha', flag: '🇩🇪' },
    IT: { name: 'Itália', flag: '🇮🇹' },
    NL: { name: 'Holanda', flag: '🇳🇱' },
    BE: { name: 'Bélgica', flag: '🇧🇪' },
    GB: { name: 'Reino Unido', flag: '🇬🇧' },
    OTHER: { name: 'Outros', flag: '🌍' },
  };

  const [filterCorporateDomainOnlyState, setFilterCorporateDomainOnlyState] = useState(false);

  const isFreeEmailDomain = (email?: string | null) => {
    if (!email) return false;
    const domain = email.split('@')[1]?.toLowerCase().trim();
    return ['gmail.com', 'hotmail.com', 'yahoo.com', 'yahoo.es', 'outlook.com', 'icloud.com'].includes(domain || '');
  };

  // Select all or toggle results
  const filteredResults = results.filter((r) => {
    if (filterEmailOnly && !r.email) return false;
    if (filterCorporateDomainOnly && (!r.email || isFreeEmailDomain(r.email))) return false;
    if (statusFilter === 'raw' && r.status !== 'raw') return false;
    if (statusFilter === 'imported' && r.status !== 'imported') return false;
    if (stagingCountryFilter !== 'all' && detectResultCountry(r) !== stagingCountryFilter) return false;
    if (stagingSectorFilter !== 'all' && detectResultSector(r) !== stagingSectorFilter) return false;
    if (stagingSearchTerm) {
      const term = stagingSearchTerm.toLowerCase().trim();
      const matchCompany = r.company_name?.toLowerCase().includes(term);
      const matchEmail = r.email?.toLowerCase().includes(term);
      const matchPhone = r.phone?.includes(term);
      const matchCity = r.city?.toLowerCase().includes(term);
      const matchProvince = r.province?.toLowerCase().includes(term);
      const matchAddress = r.address?.toLowerCase().includes(term);
      const matchWebsite = r.website?.toLowerCase().includes(term);
      if (!matchCompany && !matchEmail && !matchPhone && !matchCity && !matchProvince && !matchAddress && !matchWebsite) {
        return false;
      }
    }
    return true;
  });

  const totalStagingPages = Math.max(1, Math.ceil(filteredResults.length / stagingPageSize));
  const paginatedResults = filteredResults.slice(
    (stagingCurrentPage - 1) * stagingPageSize,
    stagingCurrentPage * stagingPageSize
  );

  const handleToggleSelectAll = () => {
    const currentPageIds = paginatedResults.map((r) => r.id);
    const allPageSelected = currentPageIds.every((id) => selectedResultIds.includes(id));
    if (allPageSelected) {
      setSelectedResultIds((prev) => prev.filter((id) => !currentPageIds.includes(id)));
    } else {
      setSelectedResultIds((prev) => Array.from(new Set([...prev, ...currentPageIds])));
    }
  };

  const handleSelectAllFiltered = () => {
    setSelectedResultIds(filteredResults.map((r) => r.id));
    toast.success(`${filteredResults.length} leads selecionados para importação!`);
  };

  const handleSelectAllVerified = () => {
    const verifiedIds = filteredResults.filter((r) => r.email).map((r) => r.id);
    setSelectedResultIds(verifiedIds);
    toast.success(`${verifiedIds.length} e-mails verificados selecionados para importação!`);
  };

  const handleQuickConvertMissionLeads = () => {
    const verifiedIds = results.filter((r) => r.email).map((r) => r.id);
    if (verifiedIds.length === 0) {
      toast.error('Nenhum e-mail verificado encontrado nesta missão.');
      return;
    }
    setSelectedResultIds(verifiedIds);
    if (activeJob) {
      setAudienceTag(activeJob.title || activeJob.keywords);
      setImportSector(activeJob.sector_filter || 'Calderería & Tubería Industrial');
      setCustomNotes(`Leads qualificados capturados na missão "${activeJob.title}" em ${activeJob.location}.`);
    }
    setIsImportModalOpen(true);
  };

  const handleSelectAndConvertSector = (sectorName: string) => {
    const verifiedSectorLeads = results.filter(
      (r) => r.email && (sectorName === 'all' || detectResultSector(r) === sectorName)
    );
    if (verifiedSectorLeads.length === 0) {
      toast.error('Nenhum e-mail verificado encontrado para este setor.');
      return;
    }
    const ids = verifiedSectorLeads.map((r) => r.id);
    setSelectedResultIds(ids);
    setImportSector(sectorName === 'all' ? 'Calderería & Tubería Industrial' : sectorName);
    setAudienceTag(`Lote ${sectorName === 'all' ? 'Mailing Geral' : sectorName} - Espanha`);
    setCustomNotes(`Leads qualificados do setor "${sectorName}" capturados e higienizados via AIsa Prospecting.`);
    setIsImportModalOpen(true);
  };

  const handleToggleSelectResult = (id: string) => {
    setSelectedResultIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Open Import Modal
  const handleOpenImportModal = () => {
    if (selectedResultIds.length === 0) return;
    if (stagingSectorFilter !== 'all') {
      setImportSector(stagingSectorFilter);
      setAudienceTag(`Lote ${stagingSectorFilter} - Espanha`);
      setCustomNotes(`Leads qualificados do setor "${stagingSectorFilter}" capturados e higienizados via AIsa Prospecting.`);
    }
    setIsImportModalOpen(true);
  };

  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);

  // Execute Bulk Import with Tagging & Sector Classification
  const handleConfirmBulkImport = async () => {
    if (selectedResultIds.length === 0) return;
    const totalCount = selectedResultIds.length;
    setImportProgress({ current: 0, total: totalCount });

    try {
      const res = await importResultsMutation.mutateAsync({
        resultIds: selectedResultIds,
        options: {
          audienceTag: audienceTag || activeJob?.title || 'Prospecção AI',
          sector: importSector || activeJob?.keywords || 'Calderería & Tubería Industrial',
          customNotes: customNotes,
          onProgress: (current, total) => {
            setImportProgress({ current, total });
          },
        },
      });

      addLog(`${res.importedCount} leads gravados no CRM com a tag "${audienceTag}" e setor "${importSector}"!`, 'success');
      setSelectedResultIds([]);
      setIsImportModalOpen(false);
      setImportProgress(null);
    } catch (err: any) {
      alert(`Erro na importação: ${err.message}`);
      setImportProgress(null);
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
              <span>{t('comercial.prospector.connectionStatus', 'Conexão Google Gemini')}</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-semibold text-emerald-300">
                {t('comercial.prospector.connectionStatusOk', 'Gemini Flash Ativo / 100% Ok')}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1">{t('comercial.prospector.rateLimitActive', 'Econômico & Ultrarrápido')}</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Control Room & Staging Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Jobs List & Live Control Room */}
        <div className="space-y-6 lg:col-span-1">
          {/* Missões / Jobs Selector & History Repository */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-sm dark:shadow-lg transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" /> {t('comercial.prospector.searchMissionsTitle', 'Histórico de Missões')}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {jobs.length} criadas
                </span>
                {jobs.length > 0 && (
                  <button
                    onClick={handleClearAllJobs}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition-colors"
                    title="Excluir todas as missões desta empresa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Global Repositoriy Selector */}
            <button
              onClick={() => setSelectedJobId(null)}
              className={`w-full mb-3 p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all ${
                selectedJobId === null
                  ? 'bg-blue-600 text-white border-blue-700 shadow-md'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <Bookmark className="w-4 h-4" /> Ver Repositório Global (Todas as Missões)
              </span>
              <span className="bg-slate-900/20 px-2 py-0.5 rounded text-[10px] font-bold">
                {totalLeadsCaptured}
              </span>
            </button>

            {/* Quick Status Filter Tabs for Missions */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] mb-2.5">
              <button
                onClick={() => setJobStatusFilter('all')}
                className={`py-1 rounded font-semibold transition-colors text-center ${
                  jobStatusFilter === 'all'
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Todas ({jobCounts.total})
              </button>
              <button
                onClick={() => setJobStatusFilter('processing')}
                className={`py-1 rounded font-semibold transition-colors text-center ${
                  jobStatusFilter === 'processing'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-blue-500'
                }`}
                title="Missões ativas executando raspagem"
              >
                ⚡ Ativas ({jobCounts.processing})
              </button>
              <button
                onClick={() => setJobStatusFilter('pending')}
                className={`py-1 rounded font-semibold transition-colors text-center ${
                  jobStatusFilter === 'pending'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Missões na fila de espera"
              >
                ⏳ Fila ({jobCounts.pending})
              </button>
              <button
                onClick={() => setJobStatusFilter('completed')}
                className={`py-1 rounded font-semibold transition-colors text-center ${
                  jobStatusFilter === 'completed'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-emerald-500'
                }`}
                title="Missões finalizadas"
              >
                ✅ Fim ({jobCounts.completed})
              </button>
            </div>

            {/* Quick Search Input for Missions */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por nome, cidade ou setor..."
                value={jobSearchTerm}
                onChange={(e) => setJobSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>

            {loadingJobs ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" /> {t('comercial.prospector.loadingMissions', 'Carregando missões...')}
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-4">
                Nenhuma missão encontrada com os filtros selecionados.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {filteredJobs.map((job) => {
                  const isSelected = job.id === selectedJobId;
                  const isEmailTarget = job.email_required ?? true;
                  const currentMetric = isEmailTarget ? job.found_emails_count : job.processed_count;
                  const progressPct = job.target_count > 0 ? Math.min(100, Math.round((currentMetric / job.target_count) * 100)) : 0;

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
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
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
                        <div className="flex items-center gap-1.5">
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

                          {job.status !== 'processing' && (
                            <button
                              onClick={(e) => handleResumeOrExpandJob(job, e)}
                              className="p-1 text-blue-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded transition-colors"
                              title="Continuar / Reativar Busca (+ Empresas)"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          )}

                          <button
                            onClick={(e) => handleDeleteSingleJob(job.id, job.title, e)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Excluir Missão"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                          <span>
                            {isEmailTarget ? (
                              <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                                <Mail className="w-3 h-3 inline" /> {job.found_emails_count} de {job.target_count} e-mails
                              </span>
                            ) : (
                              <span>{job.processed_count} de {job.target_count} empresas</span>
                            )}
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
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{emailsStagingCount} e-mails nesta missão</span>
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

                {emailsStagingCount > 0 && (
                  <button
                    onClick={handleQuickConvertMissionLeads}
                    className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold py-2.5 px-3 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5"
                    title="Converter todos os e-mails qualificados desta missão em leads oficiais do CRM"
                  >
                    <Download className="w-4 h-4" /> ⚡ Converter ({emailsStagingCount}) Leads Desta Missão no CRM
                  </button>
                )}

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

        {/* Right Column: Staging Results Table & History */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-sm dark:shadow-lg transition-colors">
            {/* Table Header & Controls with KPI Counters & Sector Pills */}
            <div className="space-y-4 mb-4 pb-4 border-b border-slate-200 dark:border-slate-700/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-500" /> {t('comercial.prospector.stagingTitle', 'Leads Capturados em Staging')}
                    </h2>

                    {/* Prominent KPI Badges */}
                    <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 text-xs font-extrabold px-2.5 py-1 rounded-full border border-blue-300 dark:border-blue-700/50 shadow-sm">
                      <Building2 className="w-3.5 h-3.5 text-blue-500" /> {filteredResults.length} Filtrados / {totalStagingResultsCount} Total
                    </span>

                    <span className="inline-flex items-center gap-1 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-700/50 shadow-sm">
                      <Mail className="w-3.5 h-3.5 text-emerald-500" /> {filteredResults.filter((r) => r.email).length} E-mails Verificados
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {selectedJobId === 'all'
                      ? 'Visualizando Repositório Global de Todas as Missões de Busca.'
                      : `Visualizando leads da missão selecionada.`}
                  </p>
                </div>

                {/* Import to CRM button */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleSelectAllFiltered}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 transition-colors"
                    title="Selecionar todos os leads filtrados nesta busca"
                  >
                    <CheckSquare className="w-3.5 h-3.5 inline mr-1 text-indigo-500" />
                    Sel. Todos ({filteredResults.length})
                  </button>

                  <button
                    onClick={handleSelectAllVerified}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    title="Selecionar todos os e-mails qualificados da lista atual para importação"
                  >
                    <Mail className="w-3.5 h-3.5 inline mr-1 text-blue-500" />
                    Sel. E-mails ({filteredResults.filter((r) => r.email).length})
                  </button>

                  {stagingSectorFilter !== 'all' && (
                    <button
                      onClick={() => handleSelectAndConvertSector(stagingSectorFilter)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 hover:bg-amber-100 transition-colors"
                      title="Selecionar todos os e-mails deste setor e abrir conversão para CRM"
                    >
                      <Sparkles className="w-3.5 h-3.5 inline mr-1 text-amber-600 dark:text-amber-400" />
                      Converter Setor ({filteredResults.filter((r) => r.email).length})
                    </button>
                  )}

                  <button
                    onClick={handleOpenImportModal}
                    disabled={selectedResultIds.length === 0 || importResultsMutation.isPending}
                    className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-md transition-all"
                  >
                    <Download className="w-4 h-4" /> Converter ({selectedResultIds.length}) para CRM
                  </button>
                </div>
              </div>

              {/* Sector Quick Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                {[
                  { key: 'all', label: '🏢 Todos os Setores', count: stagingSectorCounts.total },
                  { key: 'Construção & Reparação Naval', label: '🚢 Naval', count: stagingSectorCounts.naval },
                  { key: 'Calderería & Tubería Industrial', label: '🏗️ Calderería', count: stagingSectorCounts.caldereria },
                  { key: 'Estructuras Metálicas & Montajes', label: '⚙️ Estructuras', count: stagingSectorCounts.estructuras },
                  { key: 'Industria Química & Petroquímica', label: '🧪 Química', count: stagingSectorCounts.quimica },
                  { key: 'Ingeniería & Contratistas EPC', label: '📐 Engenharia EPC', count: stagingSectorCounts.epc },
                  { key: 'Construcción & Obras', label: '🧱 Construção', count: stagingSectorCounts.construccion },
                  { key: 'Industrial Geral', label: '🏬 Geral', count: stagingSectorCounts.geral },
                ].map((sec) => {
                  const isActive = stagingSectorFilter === sec.key;
                  return (
                    <button
                      key={sec.key}
                      onClick={() => {
                        setStagingSectorFilter(sec.key);
                        setStagingCurrentPage(1);
                      }}
                      className={`whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-700 shadow-sm font-semibold'
                          : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{sec.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive
                            ? 'bg-blue-700 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {sec.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Filter Row: Search + Country + Sector Dropdown + Status + Quick Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 pt-2">
                {/* Search Text */}
                <div className="lg:col-span-3 relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar empresa, cidade, e-mail, telefone..."
                    value={stagingSearchTerm}
                    onChange={(e) => {
                      setStagingSearchTerm(e.target.value);
                      setStagingCurrentPage(1);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Country Filter */}
                <div className="lg:col-span-2">
                  <select
                    value={stagingCountryFilter}
                    onChange={(e) => {
                      setStagingCountryFilter(e.target.value);
                      setStagingCurrentPage(1);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none font-medium cursor-pointer"
                  >
                    <option value="all">🌐 Todos os Países</option>
                    <option value="ES">🇪🇸 Espanha</option>
                    <option value="PT">🇵🇹 Portugal</option>
                    <option value="FR">🇫🇷 França</option>
                    <option value="DE">🇩🇪 Alemanha</option>
                    <option value="IT">🇮🇹 Itália</option>
                    <option value="NL">🇳🇱 Holanda</option>
                    <option value="BE">🇧🇪 Bélgica</option>
                    <option value="GB">🇬🇧 Reino Unido</option>
                    <option value="OTHER">🌍 Outros</option>
                  </select>
                </div>

                {/* Sector Dropdown */}
                <div className="lg:col-span-3">
                  <select
                    value={stagingSectorFilter}
                    onChange={(e) => {
                      setStagingSectorFilter(e.target.value);
                      setStagingCurrentPage(1);
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none font-medium cursor-pointer"
                  >
                    <option value="all">🏢 Todos os Setores ({stagingSectorCounts.total})</option>
                    <option value="Construção & Reparação Naval">🚢 Naval ({stagingSectorCounts.naval})</option>
                    <option value="Calderería & Tubería Industrial">🏗️ Calderería & Tubería ({stagingSectorCounts.caldereria})</option>
                    <option value="Estructuras Metálicas & Montajes">⚙️ Estructuras Metálicas ({stagingSectorCounts.estructuras})</option>
                    <option value="Industria Química & Petroquímica">🧪 Petroquímica & Química ({stagingSectorCounts.quimica})</option>
                    <option value="Ingeniería & Contratistas EPC">📐 Engenharia EPC ({stagingSectorCounts.epc})</option>
                    <option value="Construcción & Obras">🧱 Construcción & Obras ({stagingSectorCounts.construccion})</option>
                    <option value="Industrial Geral">🏬 Industrial Geral ({stagingSectorCounts.geral})</option>
                  </select>
                </div>

                {/* Status Tabs */}
                <div className="lg:col-span-2 inline-flex p-0.5 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setStagingCurrentPage(1);
                    }}
                    className={`flex-1 py-1 rounded-md font-medium text-center transition-colors text-[11px] ${
                      statusFilter === 'all'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter('raw');
                      setStagingCurrentPage(1);
                    }}
                    className={`flex-1 py-1 rounded-md font-medium text-center transition-colors text-[11px] ${
                      statusFilter === 'raw'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Staging
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter('imported');
                      setStagingCurrentPage(1);
                    }}
                    className={`flex-1 py-1 rounded-md font-medium text-center transition-colors text-[11px] ${
                      statusFilter === 'imported'
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    CRM
                  </button>
                </div>

                {/* Toggles */}
                <div className="lg:col-span-2 flex items-center gap-1">
                  <button
                    onClick={() => {
                      setFilterEmailOnly(!filterEmailOnly);
                      setStagingCurrentPage(1);
                    }}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium border text-center transition-colors ${
                      filterEmailOnly
                        ? 'bg-indigo-100 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/50 font-bold'
                        : 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600/50'
                    }`}
                  >
                    <Mail className="w-3 h-3 inline mr-1" /> E-mail
                  </button>

                  <button
                    onClick={() => {
                      setFilterCorporateDomainOnly(!filterCorporateDomainOnly);
                      setStagingCurrentPage(1);
                    }}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-medium border text-center transition-colors ${
                      filterCorporateDomainOnly
                        ? 'bg-emerald-100 dark:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/50 font-bold'
                        : 'bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600/50'
                    }`}
                    title="Apenas e-mails corporativos de domínio próprio"
                  >
                    <Building2 className="w-3 h-3 inline mr-1 text-emerald-500" /> Domínio
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Table Gallery Container */}
            {loadingResults ? (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-500" /> {t('comercial.prospector.loadingResults', 'Carregando resultados...')}
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="py-16 text-center text-slate-500 dark:text-slate-400 text-sm border border-dashed border-slate-300 dark:border-slate-700 rounded-lg">
                Nenhum lead encontrado com os filtros selecionados.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="max-h-[580px] overflow-y-auto overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700/80 shadow-inner custom-scrollbar">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900/95 backdrop-blur-md text-slate-600 dark:text-slate-300 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-700/80 z-10 shadow-sm">
                      <tr>
                        <th className="p-3 w-8">
                          <input
                            type="checkbox"
                            checked={
                              paginatedResults.length > 0 &&
                              paginatedResults.every((r) => selectedResultIds.includes(r.id))
                            }
                            onChange={handleToggleSelectAll}
                            className="rounded border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            title="Selecionar/desmarcar todos da página atual"
                          />
                        </th>
                        <th className="p-3">{t('comercial.prospector.colCompany', 'Empresa')}</th>
                        <th className="p-3">{t('comercial.prospector.colEmail', 'E-mail Corporativo')}</th>
                        <th className="p-3">{t('comercial.prospector.colPhone', 'Telefone')}</th>
                        <th className="p-3">{t('comercial.prospector.colWebSocial', 'Website & Redes')}</th>
                        <th className="p-3">{t('comercial.prospector.colLocation', 'Localidade & País')}</th>
                        <th className="p-3 text-center">{t('comercial.prospector.colStatus', 'Status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                      {paginatedResults.map((item) => {
                        const isSelected = selectedResultIds.includes(item.id);
                        const isImported = item.status === 'imported';
                        const countryCode = detectResultCountry(item);
                        const countryInfo = countryLabels[countryCode] || countryLabels.ES;

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
                                checked={isSelected}
                                onChange={() => handleToggleSelectResult(item.id)}
                                className="rounded border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-blue-600 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-900 dark:text-white text-sm">{item.company_name}</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600/50">
                                  {detectResultSector(item)}
                                </span>
                              </div>
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
                                    href={ensureAbsoluteUrl(item.website)}
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
                                    href={ensureAbsoluteUrl(item.linkedin_url)}
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
                                    href={ensureAbsoluteUrl(item.instagram_url)}
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
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                  <span>{countryInfo.flag}</span>
                                  <span>{countryCode}</span>
                                </span>
                                <span className="text-slate-700 dark:text-slate-300 font-medium">
                                  {item.city || item.province || countryInfo.name}
                                </span>
                              </div>
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

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
                  <div>
                    Mostrando{' '}
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {(stagingCurrentPage - 1) * stagingPageSize + 1}
                    </span>{' '}
                    a{' '}
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {Math.min(stagingCurrentPage * stagingPageSize, filteredResults.length)}
                    </span>{' '}
                    de{' '}
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {filteredResults.length}
                    </span>{' '}
                    leads
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStagingCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={stagingCurrentPage === 1}
                      className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-300 rounded font-semibold transition-colors"
                    >
                      Anterior
                    </button>
                    <span className="px-2 font-bold text-slate-900 dark:text-white">
                      Pág. {stagingCurrentPage} de {totalStagingPages}
                    </span>
                    <button
                      onClick={() => setStagingCurrentPage((p) => Math.min(totalStagingPages, p + 1))}
                      disabled={stagingCurrentPage >= totalStagingPages}
                      className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-300 rounded font-semibold transition-colors"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
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

              {/* Seletor Rápido de Setor / CNAE Oficial */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                  <span>🏢 Seleção por CNAE Industrial Oficial (Espanha)</span>
                  <span className="text-[10px] text-blue-500 font-normal">Clique para auto-preencher</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-2">
                  {[
                    { label: '🚢 Naval (CNAE 3011)', kw: 'Astilleros, Construcción Naval, Reparación de buques, Calderería naval, Soldadores 6G', titlePref: '🚢 Astilleros y Reparación Naval' },
                    { label: '🏗️ Calderería (CNAE 2529)', kw: 'Calderería pesada, Depósitos a presión, Tubería industrial, Soldadura TIG MIG', titlePref: '🏗️ Calderería Pesada y Tubería' },
                    { label: '⚙️ Estructuras (CNAE 2511)', kw: 'Fabricación de estructuras metálicas, Carpintería metálica, Siderurgia, Naves industriales', titlePref: '⚙️ Estructuras Metálicas y Talleres' },
                    { label: '🧪 Química (CNAE 2011)', kw: 'Plantas petroquímicas, Refinerías, Paradas de planta, Tubería de alta presión', titlePref: '🧪 Petroquímica y Refinarias' },
                    { label: '📐 Engenharia EPC (CNAE 7112)', kw: 'Contratistas EPC, Montajes industriales, Mantenimiento mecánico, Plantas industriales', titlePref: '📐 Engenharia EPC e Montagens' },
                    { label: '🧱 Construção (CNAE 4120)', kw: 'Construcción industrial, Obra civil pesada, Estructuras de hormigón y metal', titlePref: '🧱 Construção Industrial e Obras' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setKeywords(preset.kw);
                        if (!title || title.startsWith('🚢') || title.startsWith('🏗️') || title.startsWith('⚙️') || title.startsWith('🧪') || title.startsWith('📐') || title.startsWith('🧱')) {
                          setTitle(`${preset.titlePref}${location ? ` - ${location}` : ''}`);
                        }
                      }}
                      className="text-left px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 text-[11px] font-medium transition-all"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    {t('comercial.prospector.modalKeywordsLabel', 'Palavras-chave / Segmento / CNAE *')}
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
                    País de Busca *
                  </label>
                  <select
                    value={missionCountry}
                    onChange={(e) => setMissionCountry(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                  >
                    <option value="ES">🇪🇸 Espanha</option>
                    <option value="PT">🇵🇹 Portugal</option>
                    <option value="FR">🇫🇷 França</option>
                    <option value="DE">🇩🇪 Alemanha</option>
                    <option value="IT">🇮🇹 Itália</option>
                    <option value="NL">🇳🇱 Holanda</option>
                    <option value="BE">🇧🇪 Bélgica</option>
                    <option value="GB">🇬🇧 Reino Unido</option>
                    <option value="OTHER">🌍 Outro País</option>
                  </select>
                </div>
              </div>

              {/* Seletor Rápido de Províncias da Espanha */}
              {missionCountry === 'ES' && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
                    <span>📍 Províncias / Pólos Industriais</span>
                    <span className="text-[10px] text-blue-500 font-normal">Clique para selecionar polo</span>
                  </label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {[
                      { name: 'País Vasco', loc: 'Bilbao, Zamudio, Barakaldo, Vitoria (País Vasco)' },
                      { name: 'Galicia', loc: 'Vigo, Ferrol, A Coruña, Pontevedra (Galicia)' },
                      { name: 'Asturias', loc: 'Gijón, Avilés, Oviedo (Asturias)' },
                      { name: 'Cantabria', loc: 'Santander, Torrelavega (Cantabria)' },
                      { name: 'Andalucía', loc: 'Cádiz, Puerto Real, Huelva, Sevilla (Andalucía)' },
                      { name: 'Cataluña', loc: 'Barcelona, Tarragona, Granollers (Cataluña)' },
                      { name: 'Madrid', loc: 'Madrid, Coslada, Getafe, Alcalá (Madrid)' },
                      { name: 'Valencia', loc: 'Valencia, Sagunto, Castellón (Com. Valenciana)' },
                      { name: 'Murcia / Cartagena', loc: 'Cartagena, Murcia (Región de Murcia)' },
                      { name: 'Toda a Espanha', loc: 'Espanha (Nacional)' },
                    ].map((prov) => (
                      <button
                        key={prov.name}
                        type="button"
                        onClick={() => {
                          setLocation(prov.loc);
                          if (title && (title.includes(' - ') || title.startsWith('🚢') || title.startsWith('🏗️') || title.startsWith('⚙️') || title.startsWith('🧪') || title.startsWith('📐') || title.startsWith('🧱'))) {
                            const prefix = title.split(' - ')[0];
                            setTitle(`${prefix} - ${prov.name}`);
                          }
                        }}
                        className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[10px] font-medium transition-all"
                      >
                        {prov.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  {t('comercial.prospector.modalLocationLabel', 'Cidade / Região / Província *')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Madrid, Valencia, Catalunya, Porto, Lisboa..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
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
                    <option value={25}>25 Empresas</option>
                    <option value={50}>50 Empresas</option>
                    <option value={100}>100 Empresas</option>
                    <option value={250}>250 Empresas</option>
                    <option value={500}>500 Empresas (Grande Escala)</option>
                    <option value={1000}>1.000 Empresas (Escala Regional)</option>
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
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 italic">
                💡 O motor B2B divide a busca em lotes automatizados com pausa anti-bloqueio. Você pode buscar até 1.000 empresas por missão em total segurança.
              </p>

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

      {/* Modal: Importar para o CRM com Tag de Público Alvo */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-5 h-5 text-emerald-500" /> Importar ({selectedResultIds.length}) Leads para o CRM
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className={importResultsMutation.isPending ? 'pointer-events-none opacity-60 space-y-4' : 'space-y-4'}>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-500" /> Tag de Público Alvo / Nome do Lote *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={importResultsMutation.isPending}
                    placeholder="ex: Caldererías Zaragoza, Prospecção Espanha Q3"
                    value={audienceTag}
                    onChange={(e) => setAudienceTag(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    Essa tag permitirá selecionar esse público-alvo específico na hora de criar Campanhas de Marketing de e-mail.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-yellow-500" /> Setor Comercial *
                    </label>
                    <select
                      disabled={importResultsMutation.isPending}
                      value={importSector}
                      onChange={(e) => setImportSector(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-xs font-medium"
                    >
                      <option value="Construção & Reparação Naval">🚢 Construção & Reparação Naval</option>
                      <option value="Calderería & Tubería Industrial">🏗️ Calderería & Tubería Industrial</option>
                      <option value="Estructuras Metálicas & Montajes">⚙️ Estructuras Metálicas & Montajes</option>
                      <option value="Industria Química & Petroquímica">🧪 Industria Química & Petroquímica</option>
                      <option value="Ingeniería & Contratistas EPC">📐 Ingeniería & Contratistas EPC</option>
                      <option value="Construcción & Obras">🧱 Construcción & Obras</option>
                      <option value="Industrial Geral">🏬 Industrial Geral</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-500" /> País de Destino *
                    </label>
                    <select
                      disabled={importResultsMutation.isPending}
                      value={importCountry}
                      onChange={(e) => setImportCountry(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-xs font-medium"
                    >
                      <option value="ES">🇪🇸 Espanha</option>
                      <option value="PT">🇵🇹 Portugal</option>
                      <option value="FR">🇫🇷 França</option>
                      <option value="DE">🇩🇪 Alemanha</option>
                      <option value="IT">🇮🇹 Itália</option>
                      <option value="NL">🇳🇱 Holanda</option>
                      <option value="BE">🇧🇪 Bélgica</option>
                      <option value="GB">🇬🇧 Reino Unido</option>
                      <option value="OTHER">🌍 Outros</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-500" /> Observações Personalizadas (Salvas no Lead)
                  </label>
                  <textarea
                    rows={3}
                    disabled={importResultsMutation.isPending}
                    placeholder="Adicione observações da prospecção para a equipe comercial..."
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  />
                </div>
              </div>

              {/* Progress Bar indicator */}
              {(importResultsMutation.isPending || importProgress !== null) && (
                <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-emerald-500/40 space-y-2 animate-fadeIn shadow-inner">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                      <Loader2 className="w-4 h-4 animate-spin" /> Gravando e Higienizando Leads no CRM...
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {importProgress ? `${importProgress.current} / ${importProgress.total}` : '0 / ' + selectedResultIds.length} ({importProgress ? Math.round((importProgress.current / (importProgress.total || 1)) * 100) : 0}%)
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 h-full rounded-full transition-all duration-300 shadow-md"
                      style={{
                        width: `${Math.max(5, importProgress ? Math.round((importProgress.current / (importProgress.total || 1)) * 100) : 5)}%`,
                      }}
                    />
                  </div>

                  <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                    🔒 Verificando duplicidades por e-mail e aplicando tags no CRM... Por favor, aguarde.
                  </p>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={importResultsMutation.isPending}
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-700 dark:text-slate-300 rounded-lg font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBulkImport}
                  disabled={importResultsMutation.isPending || !audienceTag}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-lg font-semibold shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all"
                >
                  {importResultsMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gravando ({importProgress ? `${importProgress.current}/${importProgress.total}` : 'Aguarde...'})</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Confirmar e Gravar no CRM</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
