import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Settings,
  Search,
  Building,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  FileText,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Edit2,
  Check,
  X,
  UserCheck,
  ExternalLink,
  MessageCircle,
  Clock,
  Briefcase,
  Users,
  MapPin,
  Send,
  Globe
} from 'lucide-react';
import { useKanbanStages, useAllKanbanStages, useMutateKanban, KanbanStage } from './hooks/useKanban';
import { useLeads, useMutateLead } from './hooks/useLeads';
import { EmpresaSelector } from '@/features/operacoes/components/EmpresaSelector';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Lead } from '../estimaciones/types';

// Helper to parse lead notes string into key-value budget request details
function parseBudgetNotes(notes?: string | null) {
  if (!notes) return null;
  const isBudgetForm = notes.includes('SOLICITAÇÃO DE ORÇAMENTO') || notes.includes('Orçamento') || notes.includes('Presupuesto');
  
  const parsed: Record<string, string> = {};
  const lines = notes.split('\n');

  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('•')) {
      const parts = trimmed.substring(1).split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        parsed[key] = value;
      }
    }
  });

  return {
    isBudgetForm,
    raw: notes,
    parsed: Object.keys(parsed).length > 0 ? parsed : null
  };
}

export function KanbanPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isSpanish = (i18n.language || i18n.resolvedLanguage || '').toLowerCase().startsWith('es');

  // Queries & Mutations
  const { data: stages = [], isLoading: loadingStages } = useKanbanStages();
  const { data: allStages = [] } = useAllKanbanStages();
  const { data: leads = [], isLoading: loadingLeads } = useLeads();
  const { createStage, updateStage, deleteStage, reorderStages, moveLead } = useMutateKanban();
  const { createLead } = useMutateLead();

  const stageIdToOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    allStages.forEach(st => {
      map.set(st.id, st.order_index);
    });
    return map;
  }, [allStages]);

  // Local UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  
  // Selected Lead Details Modal State
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Stage Creation State
  const [newStageName, setNewStageName] = useState('');
  const [newStageNameEs, setNewStageNameEs] = useState('');
  const [newStageColor, setNewStageColor] = useState('#3b82f6');

  // Stage Inline Editing State
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState('');
  const [editingStageNameEs, setEditingStageNameEs] = useState('');
  const [editingStageColor, setEditingStageColor] = useState('#3b82f6');

  // New Lead Form State
  const [newLeadData, setNewLeadData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    notes: '',
    stage_id: '',
  });

  // Dynamic Stage Name Translation Helper
  const getStageTitle = (stage: KanbanStage) => {
    if (isSpanish) {
      if (stage.name_es) return stage.name_es;
      const lower = stage.name.toLowerCase();
      if (lower.includes('novo') || lower.includes('sem contato')) return 'Nuevo / Sin Contacto';
      if (lower.includes('e-mail enviado') || lower.includes('email enviado')) return 'Correo Enviado';
      if (lower.includes('lido') || lower.includes('clicado')) return 'Correo Leído / Clicado';
      if (lower.includes('whatsapp')) return 'Contacto por WhatsApp';
      if (lower.includes('orçamento') || lower.includes('presupuesto')) return 'Presupuesto Solicitado';
      if (lower.includes('negociação') || lower.includes('negociacion')) return 'En Negociación';
      if (lower.includes('convertido')) return 'Convertido';
      if (lower.includes('perdido') || lower.includes('desvinculado')) return 'Perdido / Desvinculado';
    }
    return stage.name;
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    if (!leadId) return;

    try {
      await moveLead({ leadId, stageId: targetStageId });
      toast.success(t('comercialKanban.moveSuccess', 'Etapa do lead atualizada!'));
    } catch (err: any) {
      toast.error(t('comercialKanban.moveError', 'Erro ao mover lead'));
    }
  };

  // Stage Config Handlers
  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) {
      toast.error('O nome do estágio é obrigatório');
      return;
    }

    try {
      const nextIndex = stages.length + 1;
      await createStage({
        name: newStageName.trim(),
        name_es: newStageNameEs.trim() || undefined,
        color: newStageColor,
        order_index: nextIndex,
      });
      toast.success(t('comercialKanban.stageCreated', 'Novo estágio criado com sucesso!'));
      setNewStageName('');
      setNewStageNameEs('');
      setNewStageColor('#3b82f6');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar estágio');
    }
  };

  const handleStartEditStage = (stage: KanbanStage) => {
    setEditingStageId(stage.id);
    setEditingStageName(stage.name);
    setEditingStageNameEs(stage.name_es || '');
    setEditingStageColor(stage.color);
  };

  const handleSaveEditStage = async (stageId: string) => {
    if (!editingStageName.trim()) {
      toast.error('O nome do estágio não pode ser vazio.');
      return;
    }

    try {
      await updateStage({
        id: stageId,
        payload: {
          name: editingStageName.trim(),
          name_es: editingStageNameEs.trim() || undefined,
          color: editingStageColor,
        }
      });
      toast.success(t('comercialKanban.stageUpdated', 'Estágio atualizado com sucesso!'));
      setEditingStageId(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar estágio');
    }
  };

  const handleMoveStageOrder = async (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stages.length) return;

    const newStages = [...stages];
    const temp = newStages[index];
    newStages[index] = newStages[targetIndex];
    newStages[targetIndex] = temp;

    const payload = newStages.map((s, idx) => ({
      id: s.id,
      order_index: idx + 1
    }));

    try {
      await reorderStages(payload);
    } catch (err: any) {
      toast.error('Erro ao reordenar estágios');
    }
  };

  const handleDeleteStage = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este estágio? Leads associados ficarão sem estágio definido.')) {
      try {
        await deleteStage(id);
        toast.success(t('comercialKanban.stageDeleted', 'Estágio excluído com sucesso.'));
      } catch (err: any) {
        toast.error(err.message || 'Erro ao excluir estágio');
      }
    }
  };

  const handleCreateNewLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadData.name || !newLeadData.company_name) {
      toast.error('Nome e Empresa são obrigatórios.');
      return;
    }

    try {
      const defaultStage = newLeadData.stage_id || (stages[0]?.id ?? '');
      await createLead({
        ...newLeadData,
        stage_id: defaultStage
      });
      toast.success('Lead criado com sucesso!');
      setIsNewLeadOpen(false);
      setNewLeadData({ name: '', email: '', phone: '', company_name: '', notes: '', stage_id: '' });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar lead');
    }
  };

  const handleLeadStageChange = async (leadId: string, stageId: string) => {
    try {
      await moveLead({ leadId, stageId });
      toast.success(t('comercialKanban.moveSuccess', 'Estágio do lead atualizado!'));
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, stage_id: stageId } : null);
      }
    } catch (err: any) {
      toast.error(t('comercialKanban.moveError', 'Erro ao alterar estágio'));
    }
  };

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const search = searchTerm.toLowerCase();
      return (
        lead.name.toLowerCase().includes(search) ||
        lead.email.toLowerCase().includes(search) ||
        (lead.company_name && lead.company_name.toLowerCase().includes(search)) ||
        (lead.phone && lead.phone.includes(search)) ||
        (lead.notes && lead.notes.toLowerCase().includes(search))
      );
    });
  }, [leads, searchTerm]);

  const getLeadsInStage = (stage: KanbanStage) => {
    return filteredLeads.filter(lead => {
      if (lead.stage_id === stage.id) return true;
      const leadOrderIndex = lead.stage_id ? stageIdToOrderMap.get(lead.stage_id) : undefined;
      if (leadOrderIndex !== undefined) {
        return leadOrderIndex === stage.order_index;
      }
      return stage.order_index === 1;
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const locale = isSpanish ? 'es-ES' : 'pt-PT';
    return new Date(dateString).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="flex flex-col space-y-6 p-4 sm:p-6 max-w-[1700px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                {t('comercialKanban.title', 'Funil de Vendas')}
                <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold text-xs">
                  {leads.length} Leads
                </Badge>
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('comercialKanban.subtitle', 'Acompanhe o engajamento e a negociação dos seus leads em tempo real')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <EmpresaSelector />
          <Button 
            onClick={() => setIsNewLeadOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold shadow-sm gap-2"
          >
            <Plus className="h-4 w-4" />
            {isSpanish ? '+ Nuevo Lead' : '+ Novo Lead'}
          </Button>
          <Button 
            onClick={() => setIsConfigOpen(true)} 
            variant="outline" 
            className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 gap-2"
          >
            <Settings className="h-4 w-4" />
            {t('comercialKanban.configStages', 'Configurar Etapas')}
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder={t('comercialKanban.searchPlaceholder', 'Buscar lead por nome, empresa, e-mail...')}
            className="pl-10 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus-visible:ring-amber-500 focus-visible:border-amber-500 h-10 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {searchTerm && (
          <Button 
            variant="ghost" 
            onClick={() => setSearchTerm('')}
            className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          >
            Limpar busca
          </Button>
        )}
      </div>

      {/* Kanban Board Horizontal Scrolling Area */}
      <div className="flex gap-4 overflow-x-auto pb-6 items-start min-h-[650px] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
        {loadingStages || loadingLeads ? (
          <div className="flex justify-center items-center w-full py-24 text-slate-500 dark:text-slate-400">
            {t('comercialKanban.loading', 'Carregando funil de vendas...')}
          </div>
        ) : stages.length === 0 ? (
          <div className="flex flex-col items-center justify-center w-full py-24 text-center">
            <Layers className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {t('comercialKanban.noStages', 'Nenhuma etapa do funil configurada')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 max-w-sm">
              {t('comercialKanban.noStagesDesc', 'Clique em "Configurar Etapas" para começar.')}
            </p>
            <Button onClick={() => setIsConfigOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
              {t('comercialKanban.configStages', 'Configurar Etapas')}
            </Button>
          </div>
        ) : (
          stages.map(stage => {
            const stageLeads = getLeadsInStage(stage);
            const stageTitle = getStageTitle(stage);

            return (
              <div
                key={stage.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
                className="flex flex-col w-80 shrink-0 bg-slate-100/90 dark:bg-slate-900/90 rounded-2xl p-3.5 border border-slate-200/90 dark:border-slate-800 shadow-sm"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3.5 px-1 pt-0.5">
                  <div className="flex items-center gap-2.5">
                    <span 
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm ring-2 ring-white dark:ring-slate-900" 
                      style={{ backgroundColor: stage.color }}
                    />
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate max-w-[190px]">
                      {stageTitle}
                    </h3>
                  </div>
                  <span className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full text-slate-700 dark:text-slate-300 shadow-2xs">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Column Body (Leads List) */}
                <div className="flex flex-col gap-3 overflow-y-auto max-h-[620px] min-h-[450px] pr-0.5">
                  {stageLeads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-white/40 dark:bg-slate-950/20">
                      <Sparkles className="h-5 w-5 mb-1.5 opacity-40 text-amber-500" />
                      {t('comercialKanban.emptyStage', 'Arraste leads para cá')}
                    </div>
                  ) : (
                    stageLeads.map(lead => {
                      const budgetInfo = parseBudgetNotes(lead.notes);

                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onClick={() => {
                            setSelectedLead(lead);
                            setIsDetailsOpen(true);
                          }}
                          className="group relative bg-white dark:bg-slate-950 hover:border-amber-500/80 dark:hover:border-amber-500/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all duration-200 space-y-2.5"
                        >
                          {/* Top Card Bar: Company & Budget Badge */}
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate max-w-[160px]">
                              <Building className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span className="truncate">{lead.company_name || 'Sem Empresa'}</span>
                            </span>
                            {budgetInfo?.isBudgetForm && (
                              <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] px-1.5 py-0">
                                Orçamento
                              </Badge>
                            )}
                          </div>

                          {/* Lead Name */}
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                            {lead.name}
                          </h4>

                          {/* Budget Form Snippet if present */}
                          {budgetInfo?.parsed && (
                            <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 rounded-lg p-2 text-[11px] space-y-1 text-slate-600 dark:text-slate-300">
                              {budgetInfo.parsed['Perfis Profissionais Requeridos'] && (
                                <div className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1 truncate">
                                  <Briefcase className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{budgetInfo.parsed['Perfis Profissionais Requeridos']}</span>
                                </div>
                              )}
                              {budgetInfo.parsed['Quantidade de Operários'] && (
                                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                  <Users className="h-3 w-3 shrink-0" />
                                  <span>{budgetInfo.parsed['Quantidade de Operários']} Operários</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Contact Info Footer */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-900 flex flex-col gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                            {lead.email && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Mail className="h-3 w-3 shrink-0 text-slate-400" />
                                <span className="truncate">{lead.email}</span>
                              </div>
                            )}
                            {lead.phone && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                                <span>{lead.phone}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(lead.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Lead Modal */}
      <Dialog open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen}>
        <DialogContent className="sm:max-w-[480px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {isSpanish ? 'Nuevo Lead' : 'Novo Lead'}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
              Cadastre um novo prospecto manualmente no funil de vendas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNewLeadSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="company_name">Empresa / Razão Social <span className="text-red-500">*</span></Label>
              <Input
                id="company_name"
                placeholder="Ex: Construções Silva Ltda"
                value={newLeadData.company_name}
                onChange={(e) => setNewLeadData(prev => ({ ...prev, company_name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lead_name">Nome do Contato <span className="text-red-500">*</span></Label>
              <Input
                id="lead_name"
                placeholder="Ex: João da Silva"
                value={newLeadData.name}
                onChange={(e) => setNewLeadData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contato@empresa.com"
                  value={newLeadData.email}
                  onChange={(e) => setNewLeadData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefone / WhatsApp</Label>
                <Input
                  id="phone"
                  placeholder="+351 912 345 678"
                  value={newLeadData.phone}
                  onChange={(e) => setNewLeadData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="stage_id">Estágio Inicial</Label>
              <Select
                value={newLeadData.stage_id || (stages[0]?.id ?? '')}
                onValueChange={(val) => setNewLeadData(prev => ({ ...prev, stage_id: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estágio" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {getStageTitle(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Observações</Label>
              <Input
                id="notes"
                placeholder="Detalhes adicionais sobre o contato..."
                value={newLeadData.notes}
                onChange={(e) => setNewLeadData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsNewLeadOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
                Salvar Lead
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lead Details & Budget Request Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        {selectedLead && (
          <DialogContent className="sm:max-w-[650px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-amber-500" />
                  {t('comercialKanban.leadDetailsTitle', 'Detalles del Lead y Presupuesto')}
                </span>
                {parseBudgetNotes(selectedLead.notes)?.isBudgetForm && (
                  <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                    Formulário de Orçamento
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
                {t('comercialKanban.leadDetailsDesc', 'Información completa del contacto y propuesta/presupuesto solicitado')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              {/* Stage Quick Switcher Bar */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('comercialKanban.moveLeadTo', 'Mover a la Etapa:')}
                </span>
                <Select
                  value={selectedLead.stage_id || ''}
                  onValueChange={(val) => handleLeadStageChange(selectedLead.id, val)}
                >
                  <SelectTrigger className="w-[220px] h-8 text-xs font-semibold bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                    <SelectValue placeholder="Selecione a etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map(s => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">
                        {getStageTitle(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Contact Main Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Empresa / Razão Social</Label>
                  <p className="font-semibold text-sm flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <Building className="h-4 w-4 text-amber-500 shrink-0" />
                    {selectedLead.company_name || 'N/A'}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Pessoa de Contato</Label>
                  <p className="font-semibold text-sm flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <UserCheck className="h-4 w-4 text-amber-500 shrink-0" />
                    {selectedLead.name}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">E-mail</Label>
                  {selectedLead.email ? (
                    <a 
                      href={`mailto:${selectedLead.email}`}
                      className="font-medium text-sm text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1.5 truncate"
                    >
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="truncate">{selectedLead.email}</span>
                    </a>
                  ) : (
                    <p className="text-sm text-slate-400">Não informado</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Telefone / WhatsApp</Label>
                  {selectedLead.phone ? (
                    <a 
                      href={`https://wa.me/${selectedLead.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-sm text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5"
                    >
                      <MessageCircle className="h-4 w-4 shrink-0" />
                      <span>{selectedLead.phone}</span>
                    </a>
                  ) : (
                    <p className="text-sm text-slate-400">Não informado</p>
                  )}
                </div>
              </div>

              {/* Parsed Budget Form Specifications Grid */}
              {(() => {
                const budgetDetails = parseBudgetNotes(selectedLead.notes);
                if (!budgetDetails?.parsed) return null;

                return (
                  <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {t('comercialKanban.budgetRequestHeader', 'Datos de la Solicitud de Presupuesto')}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 p-4 rounded-xl">
                      {Object.entries(budgetDetails.parsed).map(([key, val]) => (
                        <div key={key} className="space-y-0.5 bg-white dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block">
                            {key}
                          </span>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                            {val}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Raw Notes fallback if not parsed */}
              {!parseBudgetNotes(selectedLead.notes)?.parsed && selectedLead.notes && (
                <div className="space-y-2 pt-2">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">Observações / Notas</Label>
                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm whitespace-pre-wrap">
                    {selectedLead.notes}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 border-t border-slate-200 dark:border-slate-800 flex-col sm:flex-row gap-2">
              <Button
                onClick={() => {
                  setIsDetailsOpen(false);
                  navigate(`/comercial/estimaciones/new?lead_id=${selectedLead.id}`);
                }}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {t('comercialKanban.createEstimate', 'Generar Estimación')}
              </Button>
              <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Stage Management Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-[580px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Globe className="h-5 w-5 text-amber-500" />
              {t('comercialKanban.configStages', 'Configuração dos Estágios do Funil')}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
              Defina os nomes em Português e Espanhol, cores e a ordem das colunas do seu funil comercial.
            </DialogDescription>
          </DialogHeader>

          {/* Add New Stage Form */}
          <form onSubmit={handleCreateStage} className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 my-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('comercialKanban.addStage', 'Adicionar Novo Estágio')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="stageName" className="text-xs font-semibold">Nome (Português) <span className="text-red-500">*</span></Label>
                <Input
                  id="stageName"
                  placeholder="Ex: Em Negociação"
                  className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-xs h-9"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stageNameEs" className="text-xs font-semibold">Nombre (Español)</Label>
                <Input
                  id="stageNameEs"
                  placeholder="Ej: En Negociación"
                  className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-xs h-9"
                  value={newStageNameEs}
                  onChange={(e) => setNewStageNameEs(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="stageColor" className="text-xs font-semibold">Cor da Coluna:</Label>
                <Input
                  id="stageColor"
                  type="color"
                  className="w-8 h-8 p-0 border rounded-lg cursor-pointer shrink-0"
                  value={newStageColor}
                  onChange={(e) => setNewStageColor(e.target.value)}
                />
              </div>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-9 px-4">
                <Plus className="h-4 w-4 mr-1" />
                {t('comercialKanban.addStage', 'Adicionar Estágio')}
              </Button>
            </div>
          </form>

          {/* Existing Stages List with Reordering & Inline Editing */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('comercialKanban.activeStages', 'Estágios Ativos')}
            </h4>
            
            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {stages.map((stage, idx) => {
                const isEditing = editingStageId === stage.id;

                return (
                  <div 
                    key={stage.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm gap-3"
                  >
                    {isEditing ? (
                      <div className="flex flex-col space-y-2 w-full">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px] text-slate-400">Nome (PT)</Label>
                            <Input
                              className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                              value={editingStageName}
                              onChange={(e) => setEditingStageName(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-slate-400">Nombre (ES)</Label>
                            <Input
                              className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                              value={editingStageNameEs}
                              onChange={(e) => setEditingStageNameEs(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-2">
                            <Label className="text-[10px] text-slate-400">Cor:</Label>
                            <Input
                              type="color"
                              className="w-7 h-7 p-0 border rounded cursor-pointer shrink-0"
                              value={editingStageColor}
                              onChange={(e) => setEditingStageColor(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              type="button" 
                              size="sm"
                              className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2"
                              onClick={() => handleSaveEditStage(stage.id)}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" /> Salvar
                            </Button>
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => setEditingStageId(null)}
                            >
                              <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          {/* Reorder Buttons */}
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveStageOrder(idx, 'left')}
                              className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-20"
                              title="Mover para esquerda"
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === stages.length - 1}
                              onClick={() => handleMoveStageOrder(idx, 'right')}
                              className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-20"
                              title="Mover para direita"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <span 
                            className="w-3.5 h-3.5 rounded-full shrink-0" 
                            style={{ backgroundColor: stage.color }}
                          />

                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                              {stage.name}
                            </span>
                            {stage.name_es && (
                              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                ES: {stage.name_es}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-500 hover:text-amber-600"
                            onClick={() => handleStartEditStage(stage)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>

                          {!stage.is_system && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-slate-400 hover:text-red-600"
                              onClick={() => handleDeleteStage(stage.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
