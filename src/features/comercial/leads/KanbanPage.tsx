import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeads, useMutateLead } from './hooks/useLeads';
import { useKanbanStages, useMutateKanban, type KanbanStage } from './hooks/useKanban';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  Search, 
  Building, 
  Mail, 
  Phone, 
  Settings,
  Trash2,
  Calendar,
  Layers,
  FileText,
  MessageSquare,
  Users,
  MapPin,
  Clock,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Edit2,
  Check,
  X,
  Sparkles,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { EmpresaSelector } from '@/features/operacoes/components/EmpresaSelector';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { Lead } from '../estimaciones/types';

// Helper to parse notes string into key-value budget request details
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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { selectedEmpresaId } = useEmpresa();
  const { data: stages = [], isLoading: loadingStages } = useKanbanStages();
  const { data: leads = [], isLoading: loadingLeads } = useLeads();
  const { createStage, updateStage, deleteStage, moveLead, reorderStages } = useMutateKanban();
  const { updateLead, createLead } = useMutateLead();

  const [searchTerm, setSearchTerm] = useState('');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);

  // New Stage form states
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#f59e0b');

  // Inline Stage Edit state
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editingStageName, setEditingStageName] = useState('');
  const [editingStageColor, setEditingStageColor] = useState('');

  // New Lead form state
  const [newLeadData, setNewLeadData] = useState({
    name: '',
    email: '',
    phone: '',
    company_name: '',
    notes: '',
    stage_id: ''
  });

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    if (!leadId) return;

    try {
      await moveLead({ leadId, stageId });
      toast.success(t('comercialKanban.moveSuccess', 'Estágio do lead atualizado!'));
    } catch (err: any) {
      toast.error(err.message || t('comercialKanban.moveError', 'Erro ao mover lead'));
    }
  };

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) {
      toast.error('O nome do estágio é obrigatório');
      return;
    }

    try {
      const orderIndex = stages.length > 0 ? Math.max(...stages.map(s => s.order_index)) + 1 : 1;
      await createStage({
        name: newStageName,
        color: newStageColor,
        order_index: orderIndex,
      });
      toast.success(t('comercialKanban.stageCreated', 'Novo estágio criado com sucesso!'));
      setNewStageName('');
      setNewStageColor('#f59e0b');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar estágio');
    }
  };

  const handleStartEditStage = (stage: KanbanStage) => {
    setEditingStageId(stage.id);
    setEditingStageName(stage.name);
    setEditingStageColor(stage.color);
  };

  const handleSaveEditStage = async (id: string) => {
    if (!editingStageName.trim()) return;
    try {
      await updateStage({
        id,
        payload: {
          name: editingStageName,
          color: editingStageColor
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
      if (selectedLead) {
        setSelectedLead({ ...selectedLead, stage_id: stageId });
      }
      toast.success(t('comercialKanban.moveSuccess', 'Estágio atualizado!'));
    } catch (err: any) {
      toast.error(err.message || 'Erro ao mover lead');
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

  const getLeadsInStage = (stageId: string) => {
    return filteredLeads.filter(lead => lead.stage_id === stageId);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const locale = i18n.resolvedLanguage === 'es' ? 'es-ES' : 'pt-PT';
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
            Novo Lead
          </Button>
          <Button 
            onClick={() => setIsConfigOpen(true)} 
            variant="outline" 
            className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 gap-2"
          >
            <Settings className="h-4 w-4" />
            {t('comercialKanban.configStages', 'Configurar Estágios')}
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
          <div className="flex flex-col justify-center items-center w-full py-20 text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/50">
            <Layers className="h-12 w-12 text-slate-400 mb-3" />
            <p className="font-semibold text-lg">{t('comercialKanban.noStages', 'Nenhum estágio do funil configurado')}</p>
            <p className="text-sm">{t('comercialKanban.noStagesDesc', 'Clique em "Configurar Estágios" para começar.')}</p>
          </div>
        ) : (
          stages.map(stage => {
            const stageLeads = getLeadsInStage(stage.id);
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
                      {stage.name}
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
                              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-bold shrink-0">
                                Orçamento
                              </Badge>
                            )}
                          </div>

                          {/* Lead Name */}
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors leading-snug">
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
                                  {budgetInfo.parsed['Endereço da obra e Código Postal'] && (
                                    <span className="truncate ml-1">• {budgetInfo.parsed['Endereço da obra e Código Postal']}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Email & Phone */}
                          <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400 pt-1">
                            {lead.email && (
                              <div className="flex items-center gap-1.5 truncate">
                                <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                <span className="truncate">{lead.email}</span>
                              </div>
                            )}
                            {lead.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                <span>{lead.phone}</span>
                              </div>
                            )}
                          </div>

                          {/* Card Footer */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-900 flex justify-between items-center text-[10px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {lead.created_at ? formatDate(lead.created_at) : ''}
                            </span>
                            <span className="text-amber-600 dark:text-amber-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                              Ver Detalhes <ArrowRight className="h-3 w-3" />
                            </span>
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

      {/* Lead Details & Budget Breakdown Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-[650px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
          {selectedLead && (() => {
            const budgetInfo = parseBudgetNotes(selectedLead.notes);

            return (
              <>
                <DialogHeader className="space-y-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between pr-6">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                      {selectedLead.name}
                    </DialogTitle>
                    {budgetInfo?.isBudgetForm && (
                      <Badge className="bg-amber-500 text-slate-950 font-bold">
                        Formulário de Orçamento
                      </Badge>
                    )}
                  </div>
                  <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
                    {t('comercialKanban.leadDetailsDesc', 'Informações completas do contato e proposta/orçamento solicitado')}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Move Stage Quick Action */}
                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t('comercialKanban.moveLeadTo', 'Mover para Estágio:')}
                    </span>
                    <Select
                      value={selectedLead.stage_id || ''}
                      onValueChange={(val) => handleLeadStageChange(selectedLead.id, val)}
                    >
                      <SelectTrigger className="w-[220px] bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 h-9 text-xs">
                        <SelectValue placeholder="Selecione o estágio" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map(s => (
                          <SelectItem key={s.id} value={s.id} className="text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                              <span>{s.name}</span>
                            </div>
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
                          className="font-medium text-sm text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-2"
                        >
                          <Mail className="h-4 w-4 shrink-0" />
                          {selectedLead.email}
                        </a>
                      ) : (
                        <p className="text-sm text-slate-400">Não informado</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-slate-500 dark:text-slate-400">Telefone / Celular</Label>
                      {selectedLead.phone ? (
                        <a 
                          href={`https://wa.me/${selectedLead.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-sm text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-2"
                        >
                          <Phone className="h-4 w-4 shrink-0" />
                          {selectedLead.phone}
                        </a>
                      ) : (
                        <p className="text-sm text-slate-400">Não informado</p>
                      )}
                    </div>
                  </div>

                  {/* Budget Request Breakdown Section */}
                  {budgetInfo?.parsed ? (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                        <FileText className="h-4 w-4 text-amber-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          {t('comercialKanban.budgetRequestHeader', 'Dados da Solicitação de Orçamento')}
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Object.entries(budgetInfo.parsed).map(([key, val]) => (
                          <div 
                            key={key} 
                            className="bg-amber-500/5 border border-amber-500/15 p-3 rounded-xl space-y-1"
                          >
                            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide block">
                              {key}
                            </span>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                              {val}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : selectedLead.notes ? (
                    <div className="space-y-2 pt-2">
                      <Label className="text-xs text-slate-500 dark:text-slate-400">Observações / Notas</Label>
                      <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm whitespace-pre-wrap">
                        {selectedLead.notes}
                      </div>
                    </div>
                  ) : null}
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
                    {t('comercialKanban.createEstimate', 'Gerar Orçamento / Estimativa')}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDetailsOpen(false)}
                    className="border-slate-300 dark:border-slate-700"
                  >
                    Fechar
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Stage Management Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-[540px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t('comercialKanban.configStages', 'Configuração dos Estágios do Funil')}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
              Altere nomes, cores e ordens das colunas do seu funil de vendas.
            </DialogDescription>
          </DialogHeader>

          {/* Add New Stage Form */}
          <form onSubmit={handleCreateStage} className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 my-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('comercialKanban.addStage', 'Adicionar Novo Estágio')}
            </h4>
            <div className="grid grid-cols-3 gap-3 items-end">
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="stageName" className="text-xs">{t('comercialKanban.stageName', 'Nome do Estágio')}</Label>
                <Input
                  id="stageName"
                  placeholder="Ex: Negociação"
                  className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-sm"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stageColor" className="text-xs">{t('comercialKanban.stageColor', 'Cor')}</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="stageColor"
                    type="color"
                    className="w-10 h-10 p-0 border rounded-lg cursor-pointer shrink-0"
                    value={newStageColor}
                    onChange={(e) => setNewStageColor(e.target.value)}
                  />
                  <Button type="submit" size="icon" className="h-10 w-10 bg-amber-500 hover:bg-amber-600 text-slate-950 shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </form>

          {/* Existing Stages List with Reordering & Inline Editing */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {t('comercialKanban.activeStages', 'Estágios Ativos')}
            </h4>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {stages.map((stage, idx) => {
                const isEditing = editingStageId === stage.id;

                return (
                  <div 
                    key={stage.id} 
                    className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-sm gap-3"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="color"
                          className="w-8 h-8 p-0 border rounded cursor-pointer shrink-0"
                          value={editingStageColor}
                          onChange={(e) => setEditingStageColor(e.target.value)}
                        />
                        <Input
                          className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 flex-1"
                          value={editingStageName}
                          onChange={(e) => setEditingStageName(e.target.value)}
                        />
                        <Button 
                          type="button" 
                          size="icon" 
                          className="h-8 w-8 bg-emerald-500 hover:bg-emerald-600 text-white"
                          onClick={() => handleSaveEditStage(stage.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => setEditingStageId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
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
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === stages.length - 1}
                              onClick={() => handleMoveStageOrder(idx, 'right')}
                              className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-20"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <span 
                            className="w-3.5 h-3.5 rounded-full shrink-0" 
                            style={{ backgroundColor: stage.color }}
                          />
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                            {stage.name}
                          </span>
                          {stage.is_system && (
                            <span className="text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                              {t('comercialKanban.systemStage', 'Sistema')}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                            onClick={() => handleStartEditStage(stage)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          {!stage.is_system && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 w-8"
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

          <DialogFooter className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button onClick={() => setIsConfigOpen(false)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Lead Dialog */}
      <Dialog open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen}>
        <DialogContent className="sm:max-w-[480px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle>Criar Novo Lead</DialogTitle>
            <DialogDescription>Cadastre um novo contato manualmente no funil de vendas.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNewLeadSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="leadCompany">Empresa / Razão Social *</Label>
              <Input
                id="leadCompany"
                required
                placeholder="Ex: Caldecor Metalurgia"
                className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800"
                value={newLeadData.company_name}
                onChange={(e) => setNewLeadData({ ...newLeadData, company_name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="leadName">Nome do Contato *</Label>
              <Input
                id="leadName"
                required
                placeholder="Ex: Marcos Silva"
                className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800"
                value={newLeadData.name}
                onChange={(e) => setNewLeadData({ ...newLeadData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="leadEmail">E-mail</Label>
                <Input
                  id="leadEmail"
                  type="email"
                  placeholder="contato@empresa.com"
                  className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800"
                  value={newLeadData.email}
                  onChange={(e) => setNewLeadData({ ...newLeadData, email: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="leadPhone">Telefone</Label>
                <Input
                  id="leadPhone"
                  placeholder="+34 612345678"
                  className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800"
                  value={newLeadData.phone}
                  onChange={(e) => setNewLeadData({ ...newLeadData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Estágio Inicial</Label>
              <Select
                value={newLeadData.stage_id}
                onValueChange={(val) => setNewLeadData({ ...newLeadData, stage_id: val })}
              >
                <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800">
                  <SelectValue placeholder="Selecione o estágio inicial" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        <span>{s.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="leadNotes">Observações</Label>
              <Textarea
                id="leadNotes"
                placeholder="Anotações ou detalhes iniciais..."
                className="bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800"
                value={newLeadData.notes}
                onChange={(e) => setNewLeadData({ ...newLeadData, notes: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
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
    </div>
  );
}
