import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/shared/supabase/client';
import { useMarketingTemplates, useMarketingCampaigns, useMutateMarketing } from './hooks/useMarketing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Plus, 
  Mail, 
  Trash2,
  Calendar,
  Send,
  Users,
  Code,
  FileText,
  Play,
  Clock,
  CheckCircle,
  FileCode,
  Info,
  Eye,
  Loader2
} from 'lucide-react';
import { EmpresaSelector } from '@/features/operacoes/components/EmpresaSelector';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

// Parse config from HTML comment
const parseTemplateConfig = (html: string) => {
  if (!html) return null;
  const match = html.match(/<!-- TEMPLATE_CONFIG: (\{.*?\}) -->/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      console.error("Failed to parse template config JSON:", e);
    }
  }
  return null;
};

// Update HTML content from old and new config
const updateHtmlContent = (html: string, oldConfig: any, newConfig: any) => {
  let updatedHtml = html;
  
  const replaceValue = (oldVal: string, newVal: string) => {
    if (oldVal && newVal && oldVal !== newVal) {
      const escapedOld = oldVal.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      updatedHtml = updatedHtml.replace(new RegExp(escapedOld, 'g'), newVal);
    }
  };

  replaceValue(oldConfig.primaryColor, newConfig.primaryColor);
  replaceValue(oldConfig.accentColor, newConfig.accentColor);
  replaceValue(oldConfig.bannerUrl, newConfig.bannerUrl);
  replaceValue(oldConfig.sellerName, newConfig.sellerName);
  replaceValue(oldConfig.sellerTitle, newConfig.sellerTitle);
  replaceValue(oldConfig.sellerPhone, newConfig.sellerPhone);
  
  const oldConfigJson = JSON.stringify(oldConfig);
  const newConfigJson = JSON.stringify(newConfig);
  updatedHtml = updatedHtml.replace(
    `<!-- TEMPLATE_CONFIG: ${oldConfigJson} -->`,
    `<!-- TEMPLATE_CONFIG: ${newConfigJson} -->`
  );
  
  return updatedHtml;
};

export function CampaignsPage() {
  const { t, i18n } = useTranslation();
  const { selectedEmpresaId } = useEmpresa();
  const { data: templates = [], isLoading: loadingTemplates } = useMarketingTemplates();
  const { data: campaigns = [], isLoading: loadingCampaigns } = useMarketingCampaigns();
  
  const { 
    createTemplate, 
    updateTemplate, 
    deleteTemplate, 
    createCampaign, 
    startCampaign, 
    deleteCampaign 
  } = useMutateMarketing();

  const [activeTab, setActiveTab] = useState('campaigns');
  const queryClient = useQueryClient();

  // Query: Fila de disparos/leads associados a cada campanha
  const { data: queueCounts = {}, refetch: refetchQueueCounts } = useQuery({
    queryKey: ['campaign_queue_counts', selectedEmpresaId, campaigns],
    queryFn: async () => {
      if (!selectedEmpresaId) return {};
      const { data, error } = await supabase
        .schema('core_comercial')
        .from('marketing_campaign_queue')
        .select('campaign_id');

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((item: any) => {
        counts[item.campaign_id] = (counts[item.campaign_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!selectedEmpresaId && campaigns.length > 0,
  });

  // Query: Estágios do Kanban da empresa (para filtro)
  const { data: kanbanStages = [] } = useQuery({
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
      return data;
    },
    enabled: !!selectedEmpresaId,
  });

  // State: Seleção de Destinatários / Público-Alvo
  const [isAudienceModalOpen, setIsAudienceModalOpen] = useState(false);
  const [selectedCampaignIdForAudience, setSelectedCampaignIdForAudience] = useState<string | null>(null);
  const [audienceFilters, setAudienceFilters] = useState({
    stageId: '',
    origin: '',
    intelligence: 'all', // 'all', 'never_sent', 'no_active'
    sectorKeyword: '',
    cargoKeyword: '',
    provinceKeyword: '',
    limit: '',
    offset: '',
  });
  const [allLeads, setAllLeads] = useState<any[]>([]);
  const [allQueuedLeads, setAllQueuedLeads] = useState<any[]>([]);
  const [loadingAudienceLeads, setLoadingAudienceLeads] = useState(false);
  const [isSavingAudience, setIsSavingAudience] = useState(false);

  // Saved Audiences feature
  const [savedAudiences, setSavedAudiences] = useState<any[]>([]);
  const [audienceSaveName, setAudienceSaveName] = useState('');
  const [shouldSaveAsPreset, setShouldSaveAsPreset] = useState(false);
  const [isNewAudienceDialogOpen, setIsNewAudienceDialogOpen] = useState(false); // To build and save an audience directly in the audiences tab
  const [viewLeadsAudience, setViewLeadsAudience] = useState<any | null>(null); // For viewing leads inside a saved audience

  // Grid Selection & Search & Pagination
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [leadGridSearch, setLeadGridSearch] = useState('');
  const [gridPage, setGridPage] = useState(1);

  useEffect(() => {
    if (selectedEmpresaId) {
      const stored = localStorage.getItem(`mcs_marketing_audiences_${selectedEmpresaId}`);
      if (stored) {
        try {
          setSavedAudiences(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse saved audiences:", e);
        }
      } else {
        setSavedAudiences([]);
      }
    }
  }, [selectedEmpresaId]);

  const saveAudiencesToLocalStorage = (newAudiences: any[]) => {
    setSavedAudiences(newAudiences);
    if (selectedEmpresaId) {
      localStorage.setItem(`mcs_marketing_audiences_${selectedEmpresaId}`, JSON.stringify(newAudiences));
    }
  };

  // Form states - Templates
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState({
    title: '',
    subject: '',
    html_content: '',
  });

  // Preview state - Templates
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  // Customizer state - Templates
  const [templateVisualFields, setTemplateVisualFields] = useState({
    primaryColor: '#061f3d',
    accentColor: '#f97316',
    bannerUrl: '',
    sellerName: 'Alex Archiles',
    sellerTitle: 'Comercial',
    sellerPhone: '645 56 74 01',
  });
  const [hasVisualConfig, setHasVisualConfig] = useState(false);
  const [activeEditorTab, setActiveEditorTab] = useState('visual');

  // Form states - Campaigns
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    title: '',
    template_id: '',
  });

  // Scheduling state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [scheduleDateTime, setScheduleDateTime] = useState('');

  // Handle Templates
  const handleOpenCreateTemplate = () => {
    setSelectedTemplateId(null);
    setTemplateForm({ title: '', subject: '', html_content: '' });
    setHasVisualConfig(false);
    setActiveEditorTab('code');
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tmpl: any) => {
    setSelectedTemplateId(tmpl.id);
    let html = tmpl.html_content || '';
    
    // Parse config comment
    let config = parseTemplateConfig(html);
    
    // If no config found but it's our LoginPro template, initialize default config
    if (!config && html.includes("OFRECEMOS MANO DE OBRA CUALIFICADA")) {
      config = {
        primaryColor: '#061f3d',
        accentColor: '#f97316',
        bannerUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
        sellerName: 'Alex Archiles',
        sellerTitle: 'Comercial',
        sellerPhone: '645 56 74 01'
      };
      // Append config to HTML so it's tracked
      html = html + `\n<!-- TEMPLATE_CONFIG: ${JSON.stringify(config)} -->`;
    }
    
    setTemplateForm({
      title: tmpl.title,
      subject: tmpl.subject,
      html_content: html,
    });
    
    if (config) {
      setTemplateVisualFields(config);
      setHasVisualConfig(true);
      setActiveEditorTab('visual');
    } else {
      setHasVisualConfig(false);
      setActiveEditorTab('code');
    }
    
    setIsTemplateModalOpen(true);
  };

  const handleOpenPreviewTemplate = (tmpl: any) => {
    setPreviewTemplate(tmpl);
    setPreviewMode('desktop');
    setIsPreviewOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.title || !templateForm.subject || !templateForm.html_content) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    let finalHtml = templateForm.html_content;
    if (hasVisualConfig) {
      const oldConfig = parseTemplateConfig(finalHtml);
      if (oldConfig) {
        finalHtml = updateHtmlContent(finalHtml, oldConfig, templateVisualFields);
      }
    }

    try {
      if (selectedTemplateId) {
        await updateTemplate({ id: selectedTemplateId, payload: { ...templateForm, html_content: finalHtml } });
        toast.success('Template atualizado com sucesso!');
      } else {
        await createTemplate({ ...templateForm, html_content: finalHtml });
        toast.success('Novo template criado com sucesso!');
      }
      setIsTemplateModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar template');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('Deseja mesmo excluir este template?')) {
      try {
        await deleteTemplate(id);
        toast.success('Template excluído com sucesso.');
      } catch (err: any) {
        toast.error(err.message || 'Erro ao excluir template');
      }
    }
  };

  // Handle Campaigns
  const handleOpenCreateCampaign = () => {
    setCampaignForm({ title: '', template_id: '' });
    setIsCampaignModalOpen(true);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignForm.title || !campaignForm.template_id) {
      toast.error('Defina o título da campanha e o template associado.');
      return;
    }

    try {
      await createCampaign(campaignForm);
      toast.success('Campanha em rascunho criada com sucesso!');
      setIsCampaignModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar campanha');
    }
  };

  const handleStartCampaignImmediate = async (campaignId: string) => {
    if (confirm('Deseja iniciar o disparo dessa campanha agora? Os e-mails serão agendados em fila de forma pausada.')) {
      try {
        await startCampaign({ campaignId });
        toast.success('Campanha iniciada! A fila de disparos começou a ser processada.');
      } catch (err: any) {
        toast.error(err.message || 'Erro ao iniciar campanha');
      }
    }
  };

  const handleOpenScheduleCampaign = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setScheduleDateTime('');
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaignId || !scheduleDateTime) return;

    try {
      await startCampaign({
        campaignId: selectedCampaignId,
        scheduledAt: new Date(scheduleDateTime).toISOString(),
      });
      toast.success('Campanha agendada com sucesso!');
      setIsScheduleModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao agendar campanha');
    }
  };

  // Handle Audience / Target Selector
  const handleOpenAudienceModal = async (campaignId: string) => {
    setSelectedCampaignIdForAudience(campaignId);
    setAudienceFilters({
      stageId: '',
      origin: '',
      intelligence: 'all',
    });
    setLoadingAudienceLeads(true);
    setIsAudienceModalOpen(true);
    
    try {
      // 1. Fetch all leads for current company
      const { data: leads, error: leadsErr } = await supabase
        .schema('core_comercial')
        .from('leads')
        .select('*')
        .eq('empresa_id', selectedEmpresaId)
        .order('name', { ascending: true });

      if (leadsErr) throw leadsErr;
      setAllLeads(leads || []);

      // 2. Fetch all queue items (history) to check for opt-out/active rules
      const { data: queue, error: queueErr } = await supabase
        .schema('core_comercial')
        .from('marketing_campaign_queue')
        .select('lead_id, status');

      if (queueErr) throw queueErr;
      setAllQueuedLeads(queue || []);
    } catch (err: any) {
      toast.error('Erro ao carregar leads da empresa: ' + err.message);
    } finally {
      setLoadingAudienceLeads(false);
    }
  };

  const getFilteredLeads = () => {
    let filtered = allLeads.filter(l => {
      // 1. Filter by stage
      if (audienceFilters.stageId && l.stage_id !== audienceFilters.stageId) {
        return false;
      }

      // 2. Filter by origin
      if (audienceFilters.origin && l.origen_lead !== audienceFilters.origin) {
        return false;
      }

      // 3. Filter by Sector Keyword
      if (audienceFilters.sectorKeyword) {
        const keyword = audienceFilters.sectorKeyword.toLowerCase();
        const sectorText = (l.sector || '').toLowerCase();
        const serviceText = (l.servicio_producto || '').toLowerCase();
        const companyText = (l.company_name || '').toLowerCase();
        const notesText = (l.notes || '').toLowerCase();
        if (!sectorText.includes(keyword) && !serviceText.includes(keyword) && !companyText.includes(keyword) && !notesText.includes(keyword)) {
          return false;
        }
      }

      // 4. Filter by Cargo Keyword
      if (audienceFilters.cargoKeyword) {
        const keyword = audienceFilters.cargoKeyword.toLowerCase();
        const cargoText = (l.cargo || '').toLowerCase();
        const nameText = (l.name || '').toLowerCase();
        if (!cargoText.includes(keyword) && !nameText.includes(keyword)) {
          return false;
        }
      }

      // 5. Filter by Province/Location Keyword
      if (audienceFilters.provinceKeyword) {
        const keyword = audienceFilters.provinceKeyword.toLowerCase();
        const provinceText = (l.province || '').toLowerCase();
        const regionText = (l.region_id || '').toLowerCase();
        const cityText = (l.city || '').toLowerCase();
        if (!provinceText.includes(keyword) && !regionText.includes(keyword) && !cityText.includes(keyword)) {
          return false;
        }
      }

      // 6. Filter by intelligence rule
      if (audienceFilters.intelligence === 'never_sent') {
        const hasBeenSent = allQueuedLeads.some(q => q.lead_id === l.id);
        if (hasBeenSent) return false;
      }

      if (audienceFilters.intelligence === 'no_active') {
        const hasActiveCampaign = allQueuedLeads.some(q => 
          q.lead_id === l.id && (q.status === 'pending' || q.status === 'sending')
        );
        if (hasActiveCampaign) return false;
      }

      // Must have valid email address and not be opted out
      if (!l.email || !l.email.includes('@')) return false;
      const isOptedOut = (l.name || '').startsWith('[DESCADASTRADO]') || (l.notes || '').includes('[Opt-out]');
      return !isOptedOut;
    });

    // 7. Apply limit and offset (Division of audience for batching)
    const offsetVal = parseInt(audienceFilters.offset) || 0;
    const limitVal = parseInt(audienceFilters.limit);
    
    if (offsetVal > 0) {
      filtered = filtered.slice(offsetVal);
    }
    
    if (!isNaN(limitVal) && limitVal > 0) {
      filtered = filtered.slice(0, limitVal);
    }

    return filtered;
  };

  const getFilteredAndSearchedLeads = () => {
    const filtered = getFilteredLeads();
    if (!leadGridSearch) return filtered;
    const term = leadGridSearch.toLowerCase();
    return filtered.filter(l => 
      (l.name || '').toLowerCase().includes(term) ||
      (l.email || '').toLowerCase().includes(term) ||
      (l.company_name || '').toLowerCase().includes(term)
    );
  };

  const handleToggleSelectAll = (checked: boolean) => {
    const visibleFiltered = getFilteredAndSearchedLeads();
    const newSelected = new Set(selectedLeadIds);
    visibleFiltered.forEach(l => {
      if (checked) {
        newSelected.add(l.id);
      } else {
        newSelected.delete(l.id);
      }
    });
    setSelectedLeadIds(newSelected);
  };

  const handleToggleSelectLead = (leadId: string, checked: boolean) => {
    const newSelected = new Set(selectedLeadIds);
    if (checked) {
      newSelected.add(leadId);
    } else {
      newSelected.delete(leadId);
    }
    setSelectedLeadIds(newSelected);
  };

  useEffect(() => {
    if ((isAudienceModalOpen || isNewAudienceDialogOpen) && allLeads.length > 0) {
      const filtered = getFilteredLeads();
      setSelectedLeadIds(new Set(filtered.map(l => l.id)));
      setGridPage(1);
      setLeadGridSearch('');
    }
  }, [
    isAudienceModalOpen,
    isNewAudienceDialogOpen,
    audienceFilters.stageId,
    audienceFilters.origin,
    audienceFilters.sectorKeyword,
    audienceFilters.cargoKeyword,
    audienceFilters.provinceKeyword,
    audienceFilters.limit,
    audienceFilters.offset,
    audienceFilters.intelligence,
    allLeads
  ]);

  const handleSaveAudience = async () => {
    if (!selectedCampaignIdForAudience) return;
    setIsSavingAudience(true);

    try {
      const filteredLeads = allLeads.filter(l => selectedLeadIds.has(l.id));

      // If saving as a reusable audience preset
      if (shouldSaveAsPreset && audienceSaveName) {
        const newPreset = {
          id: crypto.randomUUID(),
          name: audienceSaveName,
          filters: { ...audienceFilters },
          created_at: new Date().toISOString()
        };
        const updated = [newPreset, ...savedAudiences];
        saveAudiencesToLocalStorage(updated);
        toast.success(`Público Salvo "${audienceSaveName}" criado com sucesso!`);
      }

      // Delete existing queue for this campaign
      const { error: deleteErr } = await supabase
        .schema('core_comercial')
        .from('marketing_campaign_queue')
        .delete()
        .eq('campaign_id', selectedCampaignIdForAudience);

      if (deleteErr) throw deleteErr;

      // Insert new queue items
      if (filteredLeads.length > 0) {
        const queueItems = filteredLeads.map(l => ({
          campaign_id: selectedCampaignIdForAudience,
          lead_id: l.id,
          status: 'pending',
        }));

        const { error: insertErr } = await supabase
          .schema('core_comercial')
          .from('marketing_campaign_queue')
          .insert(queueItems);

        if (insertErr) throw insertErr;
      }

      toast.success(`Público-alvo definido! ${filteredLeads.length} leads inseridos na fila.`);
      setIsAudienceModalOpen(false);
      setShouldSaveAsPreset(false);
      setAudienceSaveName('');
      refetchQueueCounts();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao definir público-alvo');
    } finally {
      setIsSavingAudience(false);
    }
  };

  const handleLoadAudiencePreset = (preset: any) => {
    setAudienceFilters({ ...preset.filters });
    toast.success(`Filtros do público "${preset.name}" carregados.`);
  };

  const handleDeleteAudiencePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja mesmo excluir este público salvo?')) {
      const updated = savedAudiences.filter(a => a.id !== id);
      saveAudiencesToLocalStorage(updated);
      toast.success('Público salvo excluído.');
    }
  };

  const handleCreateNewAudiencePreset = () => {
    if (!audienceSaveName) {
      toast.error('Preencha o nome do público.');
      return;
    }
    const newPreset = {
      id: crypto.randomUUID(),
      name: audienceSaveName,
      filters: { ...audienceFilters },
      created_at: new Date().toISOString()
    };
    const updated = [newPreset, ...savedAudiences];
    saveAudiencesToLocalStorage(updated);
    toast.success(`Público Salvo "${audienceSaveName}" criado com sucesso!`);
    setIsNewAudienceDialogOpen(false);
    setAudienceSaveName('');
  };

  const handleDeleteCampaign = async (id: string) => {
    if (confirm('Deseja mesmo excluir esta campanha e sua fila associada?')) {
      try {
        await deleteCampaign(id);
        toast.success('Campanha excluída com sucesso.');
      } catch (err: any) {
        toast.error(err.message || 'Erro ao excluir campanha');
      }
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const locale = i18n.resolvedLanguage === 'en' ? 'en-US' : i18n.resolvedLanguage === 'es' ? 'es-ES' : 'pt-PT';
    return new Date(dateString).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="bg-slate-200 text-slate-800 text-xs px-2.5 py-0.5 rounded-full font-medium">Rascunho</span>;
      case 'scheduled':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit"><Clock size={12}/> Agendado</span>;
      case 'sending':
        return <span className="bg-yellow-100 text-yellow-800 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit animate-pulse"><Play size={12}/> Enviando</span>;
      case 'completed':
        return <span className="bg-green-100 text-green-800 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit"><CheckCircle size={12}/> Concluído</span>;
      case 'paused':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-0.5 rounded-full font-medium">Pausado</span>;
      default:
        return <span className="bg-slate-200 text-slate-800 text-xs px-2.5 py-0.5 rounded-full font-medium">{status}</span>;
    }
  };

  const visibleLeadsForGrid = getFilteredAndSearchedLeads();
  const leadsPerPage = 50;
  const totalPages = Math.ceil(visibleLeadsForGrid.length / leadsPerPage);
  const paginatedLeads = visibleLeadsForGrid.slice((gridPage - 1) * leadsPerPage, gridPage * leadsPerPage);

  return (
    <div className="flex flex-col space-y-6 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Mail className="h-8 w-8 text-yellow-500" />
            Campanhas de Marketing
          </h1>
          <p className="text-muted-foreground">
            Dispare e-mails HTML customizados e acompanhe o funil de e-mails em lote
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <EmpresaSelector />
          {activeTab === 'campaigns' && (
            <Button onClick={handleOpenCreateCampaign} className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold shadow-lg shadow-yellow-500/10">
              <Plus className="mr-2 h-4 w-4" />
              Nova Campanha
            </Button>
          )}
          {activeTab === 'templates' && (
            <Button onClick={handleOpenCreateTemplate} className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold shadow-lg shadow-yellow-500/10">
              <Plus className="mr-2 h-4 w-4" />
              Criar Template HTML
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-950 border p-1 rounded-xl w-fit">
          <TabsTrigger value="campaigns" className="rounded-lg">Campanhas</TabsTrigger>
          <TabsTrigger value="templates" className="rounded-lg">Templates de E-mail</TabsTrigger>
          <TabsTrigger value="audiences" className="rounded-lg font-medium">Públicos / Segmentos</TabsTrigger>
        </TabsList>

        {/* Tab CAMPANHAS */}
        <TabsContent value="campaigns" className="mt-4">
          {loadingCampaigns ? (
            <div className="text-center py-20 text-muted-foreground">Carregando campanhas...</div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-20 text-muted-foreground border border-dashed rounded-xl bg-card">
              <Send className="h-12 w-12 text-slate-400 mb-2" />
              <p className="font-semibold">Nenhuma campanha criada</p>
              <p className="text-sm">Clique em "Nova Campanha" para preparar o primeiro disparo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((camp) => (
                <div key={camp.id} className="bg-card border p-5 rounded-xl shadow-sm hover:shadow transition-all flex flex-col justify-between min-h-[255px]">
                  <div>
                    <div className="flex justify-between items-start mb-2.5">
                      {getStatusBadge(camp.status)}
                      <div className="flex gap-1.5">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                          onClick={() => handleDeleteCampaign(camp.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base truncate mb-1">{camp.title}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-2">
                      <FileText size={12} />
                      Template: <span className="font-medium truncate max-w-[150px]">{camp.marketing_templates?.title || 'Sem template'}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mb-2">
                      <Calendar size={11} />
                      Criado em: {formatDate(camp.created_at)}
                    </p>
                    {camp.scheduled_at && (
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1.5 mt-1 mb-2">
                        <Clock size={11} />
                        Agendado para: {formatDate(camp.scheduled_at)}
                      </p>
                    )}
                    
                    {/* Target Audience status info */}
                    <div className="mt-3 flex items-center justify-between border-t pt-2.5">
                      <span className="text-xs text-muted-foreground">Destinatários:</span>
                      {camp.status === 'draft' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAudienceModal(camp.id)}
                          className="text-xs py-1 h-7 border-dashed border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
                        >
                          {queueCounts[camp.id] ? `${queueCounts[camp.id]} leads` : 'Configurar público...'}
                        </Button>
                      ) : (
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {queueCounts[camp.id] || 0} leads
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Campaign Actions */}
                  {camp.status === 'draft' && (
                    <div className="flex gap-2 mt-4 pt-3 border-t">
                      <Button 
                        size="sm" 
                        onClick={() => handleStartCampaignImmediate(camp.id)}
                        disabled={!queueCounts[camp.id]}
                        className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
                      >
                        <Play size={12} className="mr-1.5" />
                        Disparar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleOpenScheduleCampaign(camp.id)}
                        disabled={!queueCounts[camp.id]}
                        className="flex-1 border-slate-300 dark:border-slate-800"
                      >
                        <Clock size={12} className="mr-1.5" />
                        Agendar
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab TEMPLATES */}
        <TabsContent value="templates" className="mt-4">
          {loadingTemplates ? (
            <div className="text-center py-20 text-muted-foreground">Carregando templates...</div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-20 text-muted-foreground border border-dashed rounded-xl bg-card">
              <FileCode className="h-12 w-12 text-slate-400 mb-2" />
              <p className="font-semibold">Nenhum template HTML cadastrado</p>
              <p className="text-sm">Clique em "Criar Template HTML" para colar códigos desenvolvidos no Canva.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((tmpl) => (
                <div key={tmpl.id} className="bg-card border p-5 rounded-xl shadow-sm hover:shadow transition-all flex flex-col justify-between h-[180px]">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-slate-100 dark:bg-slate-950 border text-slate-600 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded font-mono flex items-center gap-1">
                        <Code size={10} /> HTML
                      </span>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                          onClick={() => handleDeleteTemplate(tmpl.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                    <h3 
                      className="font-semibold text-slate-900 dark:text-slate-100 text-base truncate mb-1 cursor-pointer hover:text-yellow-500 transition-colors"
                      onClick={() => handleOpenEditTemplate(tmpl)}
                    >
                      {tmpl.title}
                    </h3>
                    <p className="text-xs text-slate-500 mb-2 truncate">
                      Assunto: <span className="font-medium text-slate-700 dark:text-slate-300">{tmpl.subject}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                      <Calendar size={11} />
                      Atualizado em: {formatDate(tmpl.updated_at || tmpl.created_at)}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t flex justify-between items-center">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleOpenPreviewTemplate(tmpl)}
                      className="text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-350 font-semibold flex items-center gap-1.5"
                    >
                      <Eye size={13} /> Visualizar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleOpenEditTemplate(tmpl)}
                      className="text-yellow-500 hover:text-yellow-600 font-semibold"
                    >
                      Editar HTML
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab PÚBLICOS / SEGMENTOS */}
        <TabsContent value="audiences" className="mt-4">
          <div className="flex justify-between items-center mb-4 bg-slate-50 dark:bg-slate-900 border rounded-xl p-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Segmentos e Públicos Reutilizáveis</h2>
              <p className="text-xs text-muted-foreground">Crie e gerencie públicos filtrados para disparos rápidos e organizados em lotes.</p>
            </div>
            <Button 
              onClick={async () => {
                // Fetch leads to preview
                setLoadingAudienceLeads(true);
                setIsNewAudienceDialogOpen(true);
                setAudienceFilters({
                  stageId: '',
                  origin: '',
                  intelligence: 'all',
                  sectorKeyword: '',
                  cargoKeyword: '',
                  provinceKeyword: '',
                  limit: '',
                  offset: '',
                });
                try {
                  const { data: leads } = await supabase
                    .schema('core_comercial')
                    .from('leads')
                    .select('*')
                    .eq('empresa_id', selectedEmpresaId)
                    .order('name', { ascending: true });
                  setAllLeads(leads || []);
                } catch(e) {}
                setLoadingAudienceLeads(false);
              }} 
              className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Novo Público Salvo
            </Button>
          </div>

          {savedAudiences.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-20 text-muted-foreground border border-dashed rounded-xl bg-card">
              <Users className="h-12 w-12 text-slate-400 mb-2" />
              <p className="font-semibold text-slate-900 dark:text-slate-100">Nenhum público salvo</p>
              <p className="text-xs text-slate-550 max-w-[320px] text-center mt-1">Crie públicos reutilizáveis filtrando setores (ex: Caldeirarias), cidades (ex: Sevilha), ou limitando a quantidade para disparos fracionados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedAudiences.map((aud) => {
                return (
                  <div key={aud.id} className="bg-card border p-5 rounded-xl shadow-sm hover:shadow transition-all flex flex-col justify-between min-h-[185px]">
                    <div>
                      <div className="flex justify-between items-start mb-2.5">
                        <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-500 text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold">
                          SEGMENTO
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                          onClick={(e) => handleDeleteAudiencePreset(aud.id, e)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-base truncate mb-1">
                        {aud.name}
                      </h3>
                      <div className="text-[11px] text-slate-500 space-y-1 mt-2.5 border-t pt-2">
                        {aud.filters.sectorKeyword && (
                          <div>Atividade: <strong className="text-slate-700 dark:text-slate-350">"{aud.filters.sectorKeyword}"</strong></div>
                        )}
                        {aud.filters.stageId && (
                          <div>Estágio Kanban: <strong className="text-slate-700 dark:text-slate-350">Ativo</strong></div>
                        )}
                        {aud.filters.provinceKeyword && (
                          <div>Província/Cidade: <strong className="text-slate-700 dark:text-slate-350">"{aud.filters.provinceKeyword}"</strong></div>
                        )}
                        {aud.filters.origin && (
                          <div>Origem: <strong className="text-slate-700 dark:text-slate-350">"{aud.filters.origin}"</strong></div>
                        )}
                        {(aud.filters.limit || aud.filters.offset) && (
                          <div>Loteamento: <strong className="text-slate-700 dark:text-slate-350">Qtd: {aud.filters.limit || 'Sem Limite'} / Pular: {aud.filters.offset || '0'}</strong></div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t flex justify-between items-center">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={async () => {
                          setViewLeadsAudience(aud);
                          setLoadingAudienceLeads(true);
                          try {
                            const { data: leads } = await supabase
                              .schema('core_comercial')
                              .from('leads')
                              .select('*')
                              .eq('empresa_id', selectedEmpresaId);
                            setAllLeads(leads || []);
                            setAllQueuedLeads([]);
                          } catch (e) {}
                          setLoadingAudienceLeads(false);
                        }}
                        className="text-slate-500 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-350 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Eye size={13} /> Ver Leads
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          setCampaignForm({ title: `Campanha - ${aud.name}`, template_id: '' });
                          setAudienceFilters({ ...aud.filters });
                          setIsCampaignModalOpen(true);
                          toast.success(`Defina o template. O público "${aud.name}" foi pré-carregado!`);
                        }}
                        className="text-yellow-600 hover:text-yellow-700 dark:text-yellow-500 dark:hover:text-yellow-400 text-xs font-semibold"
                      >
                        Nova Campanha
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Template Modal */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col justify-between">
          <DialogHeader>
            <DialogTitle>{selectedTemplateId ? 'Editar Template de E-mail' : 'Criar Template HTML'}</DialogTitle>
            <DialogDescription>
              Cole o HTML bruto do Canva, Stripo ou editor próprio. Use as tags dinâmicas para personalizar.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTemplate} className="space-y-4 overflow-y-auto pr-1 flex-1 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="tmplTitle">Título Interno</Label>
                <Input
                  id="tmplTitle"
                  placeholder="Ex: Apresentação Mastercorp 2026"
                  value={templateForm.title}
                  onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tmplSubject">Assunto do E-mail</Label>
                <Input
                  id="tmplSubject"
                  placeholder="Ex: Oportunidade comercial para a {{company_name}}"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                />
              </div>
            </div>

            {/* Caixa Informativa sobre Placeholders */}
            <div className="bg-slate-50 dark:bg-slate-900 border p-3 rounded-lg flex gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <Info size={16} className="text-yellow-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Tags de Personalização Disponíveis:</p>
                <p>Use `{"{{name}}"}` para o contato, `{"{{company_name}}"}` para a empresa, e `{"{{email}}"}` ou `{"{{phone}}"}` para os dados cadastrais. Elas serão trocadas automaticamente antes de disparar.</p>
              </div>
            </div>

            {hasVisualConfig ? (
              <Tabs value={activeEditorTab} onValueChange={setActiveEditorTab} className="w-full">
                <TabsList className="bg-slate-100 dark:bg-slate-900 border p-0.5 rounded-lg w-fit mb-3">
                  <TabsTrigger value="visual" className="rounded-md text-xs py-1">Customizador Visual (Fácil)</TabsTrigger>
                  <TabsTrigger value="code" className="rounded-md text-xs py-1">Código HTML</TabsTrigger>
                </TabsList>
                
                <TabsContent value="visual" className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="visBanner">URL da Imagem do Banner (Soldador)</Label>
                      <Input
                        id="visBanner"
                        placeholder="Cole a URL da imagem pública..."
                        value={templateVisualFields.bannerUrl}
                        onChange={(e) => setTemplateVisualFields({ ...templateVisualFields, bannerUrl: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="visPrimaryColor">Cor Header/Footer</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            id="visPrimaryColor"
                            type="color"
                            className="w-10 h-9 p-0.5 border cursor-pointer shrink-0"
                            value={templateVisualFields.primaryColor}
                            onChange={(e) => setTemplateVisualFields({ ...templateVisualFields, primaryColor: e.target.value })}
                          />
                          <Input
                            type="text"
                            className="flex-1 text-xs h-9"
                            value={templateVisualFields.primaryColor}
                            onChange={(e) => setTemplateVisualFields({ ...templateVisualFields, primaryColor: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="visAccentColor">Cor de Destaque</Label>
                        <div className="flex gap-2 items-center">
                          <Input
                            id="visAccentColor"
                            type="color"
                            className="w-10 h-9 p-0.5 border cursor-pointer shrink-0"
                            value={templateVisualFields.accentColor}
                            onChange={(e) => setTemplateVisualFields({ ...templateVisualFields, accentColor: e.target.value })}
                          />
                          <Input
                            type="text"
                            className="flex-1 text-xs h-9"
                            value={templateVisualFields.accentColor}
                            onChange={(e) => setTemplateVisualFields({ ...templateVisualFields, accentColor: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="visSellerName">Nome do Vendedor</Label>
                      <Input
                        id="visSellerName"
                        value={templateVisualFields.sellerName}
                        onChange={(e) => setTemplateVisualFields({ ...templateVisualFields, sellerName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="visSellerTitle">Cargo / Título</Label>
                      <Input
                        id="visSellerTitle"
                        value={templateVisualFields.sellerTitle}
                        onChange={(e) => setTemplateVisualFields({ ...templateVisualFields, sellerTitle: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5 col-span-1 md:col-span-2">
                      <Label htmlFor="visSellerPhone">Telefone de Contato</Label>
                      <Input
                        id="visSellerPhone"
                        value={templateVisualFields.sellerPhone}
                        onChange={(e) => setTemplateVisualFields({ ...templateVisualFields, sellerPhone: e.target.value })}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="code" className="space-y-1.5 flex flex-col h-[280px]">
                  <Label htmlFor="tmplHtml">Código HTML do Template</Label>
                  <Textarea
                    id="tmplHtml"
                    className="font-mono text-xs flex-1 resize-none"
                    placeholder="<html>...</html>"
                    value={templateForm.html_content}
                    onChange={(e) => setTemplateForm({ ...templateForm, html_content: e.target.value })}
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <div className="space-y-1.5 flex flex-col h-[280px]">
                <Label htmlFor="tmplHtml">Código HTML do Template</Label>
                <Textarea
                  id="tmplHtml"
                  placeholder="<html><body><h1>Olá {{name}}...</h1></body></html>"
                  className="font-mono text-xs flex-1 resize-none"
                  value={templateForm.html_content}
                  onChange={(e) => setTemplateForm({ ...templateForm, html_content: e.target.value })}
                />
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsTemplateModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold">
                Salvar Template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Campaign Modal */}
      <Dialog open={isCampaignModalOpen} onOpenChange={setIsCampaignModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Criar Nova Campanha de E-mail</DialogTitle>
            <DialogDescription>
              Selecione o template de marketing cadastrado para criar um rascunho de campanha.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCampaign} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="campTitle">Título da Campanha</Label>
              <Input
                id="campTitle"
                placeholder="Ex: Campanha Junho / Lojas de Varejo"
                value={campaignForm.title}
                onChange={(e) => setCampaignForm({ ...campaignForm, title: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="campTemplate">Template HTML Associado</Label>
              <select
                id="campTemplate"
                className="w-full border rounded-md p-2 text-sm bg-card"
                value={campaignForm.template_id}
                onChange={(e) => setCampaignForm({ ...campaignForm, template_id: e.target.value })}
              >
                <option value="">Selecione um template...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCampaignModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold">
                Criar Rascunho
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Schedule Modal */}
      <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Agendar Disparo de Campanha</DialogTitle>
            <DialogDescription>
              Defina a data e hora em que a campanha será ativada para iniciar o envio pausado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSchedule} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="scheduleDate">Data e Hora de Disparo</Label>
              <Input
                id="scheduleDate"
                type="datetime-local"
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsScheduleModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold">
                Agendar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Preview Template Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[800px] lg:max-w-[900px] max-h-[90vh] flex flex-col p-6">
          <DialogHeader className="border-b pb-3">
            <div className="flex justify-between items-center mr-6">
              <div>
                <DialogTitle>Visualização do Template</DialogTitle>
                <DialogDescription>
                  Visualização em tempo real de como o e-mail será recebido pelo cliente.
                </DialogDescription>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-900 border rounded-lg p-0.5">
                <Button
                  type="button"
                  variant={previewMode === 'desktop' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode('desktop')}
                  className="text-xs py-1 h-7 rounded-md px-3 font-semibold"
                >
                  Desktop
                </Button>
                <Button
                  type="button"
                  variant={previewMode === 'mobile' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewMode('mobile')}
                  className="text-xs py-1 h-7 rounded-md px-3 font-semibold"
                >
                  Mobile
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 py-4 flex flex-col justify-center items-center bg-slate-50 dark:bg-slate-950/40 rounded-xl border p-2 overflow-hidden">
            {previewTemplate ? (
              <div 
                className="transition-all duration-300 border rounded-xl shadow-lg bg-white dark:bg-white overflow-hidden flex flex-col"
                style={{ width: previewMode === 'mobile' ? '375px' : '100%', height: '55vh' }}
              >
                {/* Simulated email header */}
                <div className="bg-slate-50 border-b p-3 text-xs text-slate-500 space-y-1">
                  <div><strong>Assunto:</strong> <span className="text-slate-800">{previewTemplate.subject}</span></div>
                  <div><strong>De:</strong> <span className="text-slate-800">Alex Archiles &lt;alex@mail.gestaologinpro.com&gt;</span></div>
                </div>
                <iframe 
                  srcDoc={(() => {
                    let html = previewTemplate.html_content;
                    const testFormUrl = `${window.location.origin}/public/novo-lead?empresa_id=${selectedEmpresaId || ''}`;
                    const testPresupuestoUrl = `${window.location.origin}/public/solicitar-presupuesto?empresa_id=${selectedEmpresaId || ''}`;
                    const testOptOutUrl = `${window.location.origin}/public/coleta-dados/exemplo?opt_out=1`;
                    html = html
                      .replace(/\{\{\s*name\s*\}\}/g, "Cliente Exemplo")
                      .replace(/\{\{\s*company_name\s*\}\}/g, "Empresa Exemplo Ltda")
                      .replace(/\{\{\s*email\s*\}\}/g, "cliente@exemplo.com")
                      .replace(/\{\{\s*phone\s*\}\}/g, "+351 912 345 678")
                      .replace(/\{\{\s*form_url\s*\}\}/g, testFormUrl)
                      .replace(/\{\{\s*presupuesto_url\s*\}\}/g, testPresupuestoUrl)
                      .replace(/\{\{\s*opt_out_url\s*\}\}/g, testOptOutUrl)
                      .replace(/\{\{\s*unsubscribe_url\s*\}\}/g, testOptOutUrl);
                    return html;
                  })()} 
                  title="Preview" 
                  className="w-full flex-1 border-0"
                />
              </div>
            ) : (
              <div className="text-muted-foreground text-xs">Nenhum template selecionado</div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button type="button" onClick={() => setIsPreviewOpen(false)} className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Target Audience Dialog */}
      <Dialog open={isAudienceModalOpen} onOpenChange={setIsAudienceModalOpen}>
        <DialogContent className="sm:max-w-[980px] max-h-[90vh] flex flex-col justify-between p-6">
          <DialogHeader className="border-b pb-2">
            <DialogTitle>Configurar Público-Alvo da Campanha</DialogTitle>
            <DialogDescription>
              Filtre e selecione exatamente quais leads receberão os e-mails desta campanha.
            </DialogDescription>
          </DialogHeader>

          {loadingAudienceLeads ? (
            <div className="flex-1 py-20 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
              <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
              Carregando leads da empresa...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden flex-1 py-2 text-sm max-h-[65vh]">
              
              {/* Left Column: Filtros de Segmentação (col-span-5) */}
              <div className="lg:col-span-5 space-y-4 overflow-y-auto pr-3 lg:border-r max-h-[60vh] scrollbar-thin">
                <div>
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-400 mb-2">Filtros Gerais</h3>
                </div>

                {/* Carregamento de Presets */}
                {savedAudiences.length > 0 && (
                  <div className="space-y-1.5 border-b pb-3">
                    <Label className="font-semibold text-slate-700 dark:text-slate-350 text-xs">Carregar Público Salvo (Preset)</Label>
                    <select
                      className="w-full h-9 border rounded-lg bg-card px-3 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
                      onChange={(e) => {
                        const preset = savedAudiences.find(a => a.id === e.target.value);
                        if (preset) handleLoadAudiencePreset(preset);
                      }}
                      defaultValue=""
                    >
                      <option value="">Selecione um público salvo...</option>
                      {savedAudiences.map((aud: any) => (
                        <option key={aud.id} value={aud.id}>{aud.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="audStage" className="text-xs">Estágio (Kanban)</Label>
                    <select
                      id="audStage"
                      value={audienceFilters.stageId}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, stageId: e.target.value })}
                      className="w-full h-9 border rounded-lg bg-card px-3 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
                    >
                      <option value="">Todos os Estágios</option>
                      {kanbanStages.map((stage: any) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="audOrigin" className="text-xs">Origem</Label>
                    <select
                      id="audOrigin"
                      value={audienceFilters.origin}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, origin: e.target.value })}
                      className="w-full h-9 border rounded-lg bg-card px-3 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
                    >
                      <option value="">Todas as Origens</option>
                      {Array.from(new Set(allLeads.map(l => l.origen_lead).filter(Boolean))).map((origin: any) => (
                        <option key={origin} value={origin}>
                          {origin}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="audSector" className="text-xs">Setor / Atividade (Palavra-chave)</Label>
                  <Input
                    id="audSector"
                    placeholder="Ex: caldeiraria, soldador, metal..."
                    className="h-9 text-xs"
                    value={audienceFilters.sectorKeyword}
                    onChange={(e) => setAudienceFilters({ ...audienceFilters, sectorKeyword: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="audCargo" className="text-xs">Cargo / Contato</Label>
                    <Input
                      id="audCargo"
                      placeholder="Ex: diretor, compras..."
                      className="h-9 text-xs"
                      value={audienceFilters.cargoKeyword}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, cargoKeyword: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="audProvince" className="text-xs">Província / Cidade</Label>
                    <Input
                      id="audProvince"
                      placeholder="Ex: Sevilha, Madrid..."
                      className="h-9 text-xs"
                      value={audienceFilters.provinceKeyword}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, provinceKeyword: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t pt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="audLimit" className="text-xs font-semibold text-amber-600 dark:text-amber-400">Lote: Limite Máximo</Label>
                    <Input
                      id="audLimit"
                      type="number"
                      placeholder="Ex: 500"
                      className="h-9 text-xs"
                      value={audienceFilters.limit}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, limit: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="audOffset" className="text-xs font-semibold text-amber-600 dark:text-amber-400">Lote: Pular (Offset)</Label>
                    <Input
                      id="audOffset"
                      type="number"
                      placeholder="Ex: 0"
                      className="h-9 text-xs"
                      value={audienceFilters.offset}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, offset: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 border-t pt-3">
                  <Label htmlFor="audIntel" className="text-xs">Filtro Antispam / Frequência</Label>
                  <select
                    id="audIntel"
                    value={audienceFilters.intelligence}
                    onChange={(e) => setAudienceFilters({ ...audienceFilters, intelligence: e.target.value })}
                    className="w-full h-9 border rounded-lg bg-card px-3 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
                  >
                    <option value="all">Enviar para todos que atendem aos filtros</option>
                    <option value="never_sent">Apenas quem NUNCA recebeu campanha</option>
                    <option value="no_active">Apenas quem não tem campanhas ativas</option>
                  </select>
                </div>

                {/* Salvar como preset */}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="saveAsPreset"
                      checked={shouldSaveAsPreset}
                      onChange={(e) => setShouldSaveAsPreset(e.target.checked)}
                      className="rounded border-slate-350 text-yellow-500 focus:ring-yellow-500/20 h-4 w-4"
                    />
                    <Label htmlFor="saveAsPreset" className="cursor-pointer font-semibold text-xs text-slate-700 dark:text-slate-300">Salvar como Público Reutilizável</Label>
                  </div>
                  {shouldSaveAsPreset && (
                    <div className="space-y-1.5 pl-6">
                      <Label htmlFor="saveName" className="text-[10px]">Nome do Público Salvo</Label>
                      <Input
                        id="saveName"
                        placeholder="Ex: Caldeirarias - Lote 1"
                        className="h-8 text-xs"
                        value={audienceSaveName}
                        onChange={(e) => setAudienceSaveName(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Galeria e Seleção de Leads (col-span-7) */}
              <div className="lg:col-span-7 flex flex-col justify-between overflow-hidden max-h-[60vh]">
                <div className="mb-2">
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-400 mb-2">Destinatários Selecionados</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Pesquisar por nome, empresa ou e-mail na lista..."
                      className="h-9 text-xs"
                      value={leadGridSearch}
                      onChange={(e) => {
                        setLeadGridSearch(e.target.value);
                        setGridPage(1);
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 border rounded-lg p-2.5 mb-2 text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="selAllLeads"
                      checked={visibleLeadsForGrid.length > 0 && visibleLeadsForGrid.every(l => selectedLeadIds.has(l.id))}
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-yellow-500 focus:ring-yellow-500/20 h-4 w-4 cursor-pointer"
                    />
                    <Label htmlFor="selAllLeads" className="font-semibold cursor-pointer text-slate-700 dark:text-slate-300">Selecionar Todos do Filtro</Label>
                  </div>
                  <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-500 font-bold px-2.5 py-0.5 rounded-full text-xs">
                    {selectedLeadIds.size} selecionados
                  </span>
                </div>

                {/* Lista de Leads */}
                <div className="flex-1 overflow-y-auto space-y-2 border rounded-xl p-3 bg-slate-50/40 dark:bg-slate-950/20 scrollbar-thin">
                  {paginatedLeads.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground text-xs">Nenhum lead encontrado com estes filtros.</div>
                  ) : (
                    paginatedLeads.map((l: any) => {
                      const stageName = kanbanStages.find((s: any) => s.id === l.stage_id)?.name || 'Sem estágio';
                      return (
                        <div key={l.id} className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-900 rounded-lg border text-xs hover:bg-slate-50/50 dark:hover:bg-slate-950/50 transition-colors">
                          <div className="flex items-center gap-3 truncate max-w-[320px]">
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.has(l.id)}
                              onChange={(e) => handleToggleSelectLead(l.id, e.target.checked)}
                              className="rounded border-slate-300 text-yellow-500 focus:ring-yellow-500/20 h-4 w-4 cursor-pointer shrink-0"
                            />
                            <div className="truncate">
                              <p className="font-semibold truncate text-slate-800 dark:text-slate-200">{l.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{l.company_name} | {l.email}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[9px] text-slate-600 dark:text-slate-400 border font-medium">
                              {stageName}
                            </span>
                            {l.province && (
                              <p className="text-[9px] text-slate-450 mt-0.5">{l.province}</p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-3 border-t pt-2.5 bg-background">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={gridPage === 1}
                      onClick={() => setGridPage(p => Math.max(1, p - 1))}
                      className="h-8 text-xs py-1"
                    >
                      Anterior
                    </Button>
                    <span className="text-[11px] text-slate-500 font-medium">Página {gridPage} de {totalPages}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={gridPage === totalPages}
                      onClick={() => setGridPage(p => Math.min(totalPages, p + 1))}
                      className="h-8 text-xs py-1"
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setIsAudienceModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleSaveAudience} 
              disabled={loadingAudienceLeads || isSavingAudience || selectedLeadIds.size === 0}
              className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
            >
              {isSavingAudience ? 'Salvando...' : 'Salvar Público'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Criar Público Reutilizável (Sem Campanha Associada) */}
      <Dialog open={isNewAudienceDialogOpen} onOpenChange={setIsNewAudienceDialogOpen}>
        <DialogContent className="sm:max-w-[980px] max-h-[90vh] flex flex-col justify-between p-6">
          <DialogHeader className="border-b pb-2">
            <DialogTitle>Criar Novo Público Salvo</DialogTitle>
            <DialogDescription>
              Filtre e selecione os leads que farão parte deste segmento reutilizável.
            </DialogDescription>
          </DialogHeader>

          {loadingAudienceLeads ? (
            <div className="flex-1 py-20 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
              <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
              Carregando leads da empresa...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden flex-1 py-2 text-sm max-h-[65vh]">
              
              {/* Left Column: Filtros de Segmentação (col-span-5) */}
              <div className="lg:col-span-5 space-y-4 overflow-y-auto pr-3 lg:border-r max-h-[60vh] scrollbar-thin">
                <div>
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-400 mb-2">Filtros Gerais</h3>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newAudSaveName" className="text-xs">Nome do Público Salvo</Label>
                  <Input
                    id="newAudSaveName"
                    placeholder="Ex: Caldeirarias da Espanha - Lote 1"
                    className="h-9 text-xs"
                    value={audienceSaveName}
                    onChange={(e) => setAudienceSaveName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="newAudStage" className="text-xs">Estágio (Kanban)</Label>
                    <select
                      id="newAudStage"
                      value={audienceFilters.stageId}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, stageId: e.target.value })}
                      className="w-full h-9 border rounded-lg bg-card px-3 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
                    >
                      <option value="">Todos os Estágios</option>
                      {kanbanStages.map((stage: any) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="newAudOrigin" className="text-xs">Origem</Label>
                    <select
                      id="newAudOrigin"
                      value={audienceFilters.origin}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, origin: e.target.value })}
                      className="w-full h-9 border rounded-lg bg-card px-3 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
                    >
                      <option value="">Todas as Origens</option>
                      {Array.from(new Set(allLeads.map(l => l.origen_lead).filter(Boolean))).map((origin: any) => (
                        <option key={origin} value={origin}>
                          {origin}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newAudSector" className="text-xs">Setor / Atividade (Palavra-chave)</Label>
                  <Input
                    id="newAudSector"
                    placeholder="Ex: caldeiraria, soldador, metal..."
                    className="h-9 text-xs"
                    value={audienceFilters.sectorKeyword}
                    onChange={(e) => setAudienceFilters({ ...audienceFilters, sectorKeyword: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="newAudCargo" className="text-xs">Cargo / Contato</Label>
                    <Input
                      id="newAudCargo"
                      placeholder="Ex: diretor, compras..."
                      className="h-9 text-xs"
                      value={audienceFilters.cargoKeyword}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, cargoKeyword: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="newAudProvince" className="text-xs">Província / Cidade</Label>
                    <Input
                      id="newAudProvince"
                      placeholder="Ex: Sevilha, Madrid..."
                      className="h-9 text-xs"
                      value={audienceFilters.provinceKeyword}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, provinceKeyword: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t pt-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="newAudLimit" className="text-xs font-semibold text-amber-600 dark:text-amber-400">Lote: Limite Máximo</Label>
                    <Input
                      id="newAudLimit"
                      type="number"
                      placeholder="Ex: 500"
                      className="h-9 text-xs"
                      value={audienceFilters.limit}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, limit: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="newAudOffset" className="text-xs font-semibold text-amber-600 dark:text-amber-400">Lote: Pular (Offset)</Label>
                    <Input
                      id="newAudOffset"
                      type="number"
                      placeholder="Ex: 0"
                      className="h-9 text-xs"
                      value={audienceFilters.offset}
                      onChange={(e) => setAudienceFilters({ ...audienceFilters, offset: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Galeria e Seleção de Leads (col-span-7) */}
              <div className="lg:col-span-7 flex flex-col justify-between overflow-hidden max-h-[60vh]">
                <div className="mb-2">
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-400 mb-2">Membros do Segmento</h3>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Pesquisar por nome, empresa ou e-mail na lista..."
                      className="h-9 text-xs"
                      value={leadGridSearch}
                      onChange={(e) => {
                        setLeadGridSearch(e.target.value);
                        setGridPage(1);
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 border rounded-lg p-2.5 mb-2 text-xs">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="newSelAllLeads"
                      checked={visibleLeadsForGrid.length > 0 && visibleLeadsForGrid.every(l => selectedLeadIds.has(l.id))}
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-yellow-500 focus:ring-yellow-500/20 h-4 w-4 cursor-pointer"
                    />
                    <Label htmlFor="newSelAllLeads" className="font-semibold cursor-pointer text-slate-700 dark:text-slate-300">Selecionar Todos do Filtro</Label>
                  </div>
                  <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-500 font-bold px-2.5 py-0.5 rounded-full text-xs">
                    {selectedLeadIds.size} selecionados
                  </span>
                </div>

                {/* Lista de Leads */}
                <div className="flex-1 overflow-y-auto space-y-2 border rounded-xl p-3 bg-slate-50/40 dark:bg-slate-950/20 scrollbar-thin">
                  {paginatedLeads.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground text-xs">Nenhum lead encontrado com estes filtros.</div>
                  ) : (
                    paginatedLeads.map((l: any) => {
                      const stageName = kanbanStages.find((s: any) => s.id === l.stage_id)?.name || 'Sem estágio';
                      return (
                        <div key={l.id} className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-900 rounded-lg border text-xs hover:bg-slate-50/50 dark:hover:bg-slate-950/50 transition-colors">
                          <div className="flex items-center gap-3 truncate max-w-[320px]">
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.has(l.id)}
                              onChange={(e) => handleToggleSelectLead(l.id, e.target.checked)}
                              className="rounded border-slate-300 text-yellow-500 focus:ring-yellow-500/20 h-4 w-4 cursor-pointer shrink-0"
                            />
                            <div className="truncate">
                              <p className="font-semibold truncate text-slate-800 dark:text-slate-200">{l.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{l.company_name} | {l.email}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[9px] text-slate-600 dark:text-slate-400 border font-medium">
                              {stageName}
                            </span>
                            {l.province && (
                              <p className="text-[9px] text-slate-450 mt-0.5">{l.province}</p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-3 border-t pt-2.5 bg-background">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={gridPage === 1}
                      onClick={() => setGridPage(p => Math.max(1, p - 1))}
                      className="h-8 text-xs py-1"
                    >
                      Anterior
                    </Button>
                    <span className="text-[11px] text-slate-500 font-medium">Página {gridPage} de {totalPages}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={gridPage === totalPages}
                      onClick={() => setGridPage(p => Math.min(totalPages, p + 1))}
                      className="h-8 text-xs py-1"
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setIsNewAudienceDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={handleCreateNewAudiencePreset} 
              disabled={loadingAudienceLeads || selectedLeadIds.size === 0 || !audienceSaveName}
              className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
            >
              Criar Público Salvo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Visualizar Leads do Público */}
      <Dialog open={!!viewLeadsAudience} onOpenChange={(open) => !open && setViewLeadsAudience(null)}>
        <DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col justify-between p-6">
          <DialogHeader className="border-b pb-3">
            <DialogTitle>Membros do Público: {viewLeadsAudience?.name}</DialogTitle>
            <DialogDescription>
              Lista de todos os leads cadastrados no CRM que correspondem a este segmento.
            </DialogDescription>
          </DialogHeader>

          {loadingAudienceLeads ? (
            <div className="flex-1 py-10 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
              <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
              Processando lista...
            </div>
          ) : (
            <div className="flex-1 py-4 overflow-y-auto space-y-2 max-h-[55vh] pr-1">
              <div className="flex justify-between items-center mb-3 bg-slate-50 dark:bg-slate-900 border rounded-lg p-2.5 text-xs">
                <span>Total de membros:</span>
                <span className="font-bold text-yellow-600 dark:text-yellow-500">{viewLeadsAudience ? getFilteredLeads().length : 0} leads</span>
              </div>
              
              {viewLeadsAudience && getFilteredLeads().length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs">Nenhum lead correspondente no banco.</div>
              ) : (
                <div className="space-y-2">
                  {viewLeadsAudience && getFilteredLeads().map((l: any) => {
                    const stageName = kanbanStages.find((s: any) => s.id === l.stage_id)?.name || 'Sem estágio';
                    return (
                      <div key={l.id} className="p-3 border rounded-lg bg-card text-xs flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{l.name}</p>
                          <p className="text-[10px] text-slate-500">{l.company_name} | {l.email}</p>
                        </div>
                        <div className="text-right">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-400 border font-medium">
                            {stageName}
                          </span>
                          {l.province && (
                            <p className="text-[9px] text-slate-400 mt-1">{l.province}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-3 border-t">
            <Button type="button" onClick={() => setViewLeadsAudience(null)} className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
