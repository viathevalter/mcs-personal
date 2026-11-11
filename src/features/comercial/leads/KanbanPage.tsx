import { useState, useMemo, useEffect } from 'react';
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
  Briefcase,
  Users,
  Globe,
  User,
  LayoutGrid,
  List,
  PhoneCall,
  CheckSquare,
  Square,
  Flame,
  Filter,
  Copy,
  Headphones,
  CheckCircle2,
  Send,
} from 'lucide-react';
import {
  useKanbanStages,
  useAllKanbanStages,
  useMutateKanban,
  useCommercialCampaignLeadScope,
  type KanbanStage,
} from './hooks/useKanban';
import {
  useLeads,
  useMutateLead,
  useSalespeople,
  useCommercialScope,
} from './hooks/useLeads';
import { useSalesScripts, useMutateDialer } from './hooks/useDialer';
import { Checkbox } from '@/components/ui/checkbox';
import { EmpresaSelector } from '@/features/operacoes/components/EmpresaSelector';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { detectLeadCountry } from './utils/leadCountryUtils';
import { useComercialLanguage } from './utils/comercialI18n';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Lead } from '../estimaciones/types';

// Helper to parse lead notes string into key-value budget request details
function parseBudgetNotes(notes?: string | null) {
  if (!notes) return null;
  const isBudgetForm =
    notes.includes('SOLICITAÇÃO DE ORÇAMENTO') ||
    notes.includes('Orçamento') ||
    notes.includes('Presupuesto') ||
    notes.includes('Devis');

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
    parsed: Object.keys(parsed).length > 0 ? parsed : null,
  };
}

export function KanbanPage() {
  const navigate = useNavigate();
  const { tr, isSpanish, isFrench } = useComercialLanguage();
  const { selectedEmpresaId, currentEmpresa } = useEmpresa();

  const {
    isCommercialOperator,
    loggedCommercialProfile,
    activeCommercialProfile,
    selectedCommercialKey,
    selectCommercialOperator,
    allProfiles,
  } = useCommercialScope();

  const effectiveProfile = isCommercialOperator ? loggedCommercialProfile : activeCommercialProfile;
  const effectiveEmpresaId = effectiveProfile?.empresaId || selectedEmpresaId;
  const effectiveAssignedTo = effectiveProfile?.userId || null;
  const effectiveCountry = effectiveProfile?.country || null;

  const [selectedCampaignFilter, setSelectedCampaignFilter] = useState<string>('all_campaigns');

  // Reset campaign filter when active commercial or company changes
  useEffect(() => {
    setSelectedCampaignFilter('all_campaigns');
  }, [effectiveEmpresaId, effectiveAssignedTo]);

  // Queries & Mutations
  const { data: salespeople = [] } = useSalespeople();
  const { data: stages = [], isLoading: loadingStages } = useKanbanStages(effectiveEmpresaId);
  const { data: allStages = [] } = useAllKanbanStages();
  const { data: leads = [], isLoading: loadingLeads } = useLeads({
    empresaId: effectiveEmpresaId,
    assignedTo: effectiveAssignedTo,
  });

  const {
    campaigns: commercialCampaigns,
    activeStage1LeadIds,
    specificCampaignLeadIds,
    isLoadingScope,
  } = useCommercialCampaignLeadScope({
    empresaId: effectiveEmpresaId,
    assignedTo: effectiveAssignedTo,
    selectedCampaignKey: selectedCampaignFilter,
  });

  const activeStage1Set = useMemo(() => new Set(activeStage1LeadIds), [activeStage1LeadIds]);
  const specificCampaignSet = useMemo(
    () => (specificCampaignLeadIds ? new Set(specificCampaignLeadIds) : null),
    [specificCampaignLeadIds]
  );

  const { createStage, updateStage, deleteStage, reorderStages, moveLead } = useMutateKanban(effectiveEmpresaId);
  const { createLead, updateLead } = useMutateLead();
  const { data: salesScripts = [] } = useSalesScripts();
  const { createCampaign } = useMutateDialer();

  const salespersonMap = useMemo(() => {
    const map = new Map<string, string>();
    allProfiles.forEach(p => map.set(p.userId, p.displayName));
    salespeople.forEach(u => {
      if (!map.has(u.id)) {
        map.set(u.id, u.display_name || u.email);
      }
    });
    return map;
  }, [salespeople, allProfiles]);

  const stageIdToOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    allStages.forEach(st => {
      map.set(st.id, st.order_index);
    });
    return map;
  }, [allStages]);

  // Local UI State
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Dialer Queue Modal State
  const [isCreateDialerOpen, setIsCreateDialerOpen] = useState(false);
  const [dialerTitle, setDialerTitle] = useState('');
  const [dialerDesc, setDialerDesc] = useState('');
  const [dialerAssignedTo, setDialerAssignedTo] = useState<string>('unassigned');
  const [dialerScriptId, setDialerScriptId] = useState<string>('none');
  const [isSubmittingDialer, setIsSubmittingDialer] = useState(false);

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
    assigned_to: '',
  });

  // Dynamic Stage Name Translation Helper (PT / ES / FR / IT)
  const isItalian = effectiveProfile?.language === 'it' || effectiveCountry === 'IT';
  const getStageTitle = (stage: KanbanStage) => {
    const lower = stage.name.toLowerCase();
    if (isItalian) {
      if (lower.includes('novo') || lower.includes('sem contato')) return 'Nuovo / In Coda';
      if (lower.includes('e-mail enviado') || lower.includes('email enviado')) return 'E-mail Inviata';
      if (lower.includes('lido') || lower.includes('clicado')) return 'E-mail Letta / Cliccata';
      if (lower.includes('liga') || lower.includes('llamada')) return 'Chiamata Telefonica';
      if (lower.includes('whatsapp')) return 'Contatto WhatsApp';
      if (lower.includes('orçamento') || lower.includes('presupuesto')) return 'Preventivo Richiesto';
      if (lower.includes('negociação') || lower.includes('negociacion')) return 'In Negoziazione';
      if (lower.includes('convertido')) return 'Convertito';
      if (lower.includes('perdido') || lower.includes('desvinculado')) return 'Perso / Disiscritto';
    }
    if (isFrench) {
      if (lower.includes('novo') || lower.includes('sem contato')) return 'Nouveau / En File';
      if (lower.includes('e-mail enviado') || lower.includes('email enviado')) return 'E-mail Envoyé';
      if (lower.includes('lido') || lower.includes('clicado')) return 'E-mail Lu / Cliqué';
      if (lower.includes('liga') || lower.includes('llamada')) return 'Appel Téléphonique';
      if (lower.includes('whatsapp')) return 'Contact par WhatsApp';
      if (lower.includes('orçamento') || lower.includes('presupuesto')) return 'Devis Demandé';
      if (lower.includes('negociação') || lower.includes('negociacion')) return 'En Négociation';
      if (lower.includes('convertido')) return 'Converti';
      if (lower.includes('perdido') || lower.includes('desvinculado')) return 'Perdu / Désabonné';
    }
    if (isSpanish) {
      if (stage.name_es) return stage.name_es;
      if (lower.includes('novo') || lower.includes('sem contato')) return 'Nuevo / En Cola';
      if (lower.includes('e-mail enviado') || lower.includes('email enviado')) return 'Correo Enviado';
      if (lower.includes('lido') || lower.includes('clicado')) return 'Correo Leído / Clicado';
      if (lower.includes('liga') || lower.includes('llamada')) return 'Llamada';
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
      toast.success(
        tr(
          'Etapa do lead atualizada!',
          '¡Etapa del prospecto actualizada!',
          'Étape du prospect mise à jour !'
        )
      );
    } catch {
      toast.error(
        tr(
          'Erro ao mover lead',
          'Error al mover el prospecto',
          'Erreur lors du déplacement du prospect'
        )
      );
    }
  };

  // Stage Config Handlers
  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim()) {
      toast.error(
        tr(
          'O nome do estágio é obrigatório',
          'El nombre de la etapa es obligatorio',
          'Le nom de l’étape est obligatoire'
        )
      );
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
      toast.success(
        tr(
          'Novo estágio criado com sucesso!',
          '¡Nueva etapa creada con éxito!',
          'Nouvelle étape créée avec succès !'
        )
      );
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
      toast.error(
        tr(
          'O nome do estágio não pode ser vazio.',
          'El nombre de la etapa no puede estar vacío.',
          'Le nom de l’étape ne peut pas être vide.'
        )
      );
      return;
    }

    try {
      await updateStage({
        id: stageId,
        payload: {
          name: editingStageName.trim(),
          name_es: editingStageNameEs.trim() || undefined,
          color: editingStageColor,
        },
      });
      toast.success(
        tr(
          'Estágio atualizado com sucesso!',
          '¡Etapa actualizada con éxito!',
          'Étape mise à jour avec succès !'
        )
      );
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
      order_index: idx + 1,
    }));

    try {
      await reorderStages(payload);
    } catch {
      toast.error(
        tr(
          'Erro ao reordenar estágios',
          'Error al reordenar las etapas',
          'Erreur lors de la réorganisation des étapes'
        )
      );
    }
  };

  const handleDeleteStage = async (id: string) => {
    if (
      confirm(
        tr(
          'Tem certeza que deseja excluir este estágio?',
          '¿Está seguro de que desea eliminar esta etapa?',
          'Êtes-vous sûr de vouloir supprimer cette étape ?'
        )
      )
    ) {
      try {
        await deleteStage(id);
        toast.success(
          tr(
            'Estágio excluído com sucesso.',
            'Etapa eliminada con éxito.',
            'Étape supprimée avec succès.'
          )
        );
      } catch (err: any) {
        toast.error(err.message || 'Erro ao excluir estágio');
      }
    }
  };

  const handleCreateNewLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadData.name || !newLeadData.company_name) {
      toast.error(
        tr(
          'Nome e Empresa são obrigatórios.',
          'Nombre y Empresa son obligatorios.',
          'Le nom et l’entreprise sont obligatoires.'
        )
      );
      return;
    }

    try {
      // Default to stage 2 or stage 1 if manually adding in Kanban
      const defaultStage = newLeadData.stage_id || (stages[1]?.id ?? stages[0]?.id ?? '');
      const ownerId =
        effectiveAssignedTo ||
        (newLeadData.assigned_to && newLeadData.assigned_to !== 'unassigned'
          ? newLeadData.assigned_to
          : null);

      await createLead({
        name: newLeadData.name,
        company_name: newLeadData.company_name,
        email: newLeadData.email || '',
        phone: newLeadData.phone || undefined,
        notes: newLeadData.notes || undefined,
        stage_id: defaultStage,
        assigned_to: ownerId,
        empresa_id: effectiveEmpresaId || undefined,
      });
      toast.success(
        tr(
          'Lead criado com sucesso no funil!',
          '¡Prospecto creado con éxito en el embudo!',
          'Prospect créé avec succès dans l’entonnoir !'
        )
      );
      setIsNewLeadOpen(false);
      setNewLeadData({
        name: '',
        email: '',
        phone: '',
        company_name: '',
        notes: '',
        stage_id: '',
        assigned_to: '',
      });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar lead');
    }
  };

  const handleLeadStageChange = async (leadId: string, stageId: string) => {
    try {
      await moveLead({ leadId, stageId });
      toast.success(
        tr(
          'Etapa do lead atualizada!',
          '¡Etapa del prospecto actualizada!',
          'Étape du prospect mise à jour !'
        )
      );
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(prev => (prev ? { ...prev, stage_id: stageId } : null));
      }
    } catch {
      toast.error(
        tr(
          'Erro ao alterar estágio',
          'Error al cambiar la etapa',
          'Erreur lors du changement d’étape'
        )
      );
    }
  };

  const handleLeadAssignedChange = async (leadId: string, newAssignedTo: string) => {
    if (isCommercialOperator) return;
    try {
      const targetVal = newAssignedTo === 'unassigned' ? null : newAssignedTo;
      await updateLead({
        id: leadId,
        payload: { assigned_to: targetVal },
      });
      toast.success(
        tr(
          'Responsável comercial atualizado!',
          '¡Responsable comercial actualizado!',
          'Responsable commercial mis à jour !'
        )
      );
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(prev => (prev ? { ...prev, assigned_to: targetVal } : null));
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atribuir vendedor');
    }
  };

  // Base leads strictly scoped to the commercial operator's company, userId, and country
  const scopedCommercialLeads = useMemo(() => {
    return leads.filter(lead => {
      if (lead.empresa_id && effectiveEmpresaId && lead.empresa_id !== effectiveEmpresaId) {
        return false;
      }
      if (effectiveAssignedTo && lead.assigned_to !== effectiveAssignedTo) {
        return false;
      }
      if (effectiveCountry) {
        const c = detectLeadCountry(lead);
        const matchesCountry =
          effectiveCountry === 'FR' ? c === 'FR' || c === 'BE' : c === effectiveCountry;
        if (!matchesCountry) return false;
      }
      return true;
    });
  }, [leads, effectiveEmpresaId, effectiveAssignedTo, effectiveCountry]);

  // Count how many cold uncontacted leads exist (for optional toggle info)
  const coldUncontactedCount = useMemo(() => {
    return scopedCommercialLeads.filter(lead => {
      const orderIdx = lead.stage_id ? stageIdToOrderMap.get(lead.stage_id) ?? 1 : 1;
      return orderIdx === 1 && !activeStage1Set.has(lead.id);
    }).length;
  }, [scopedCommercialLeads, stageIdToOrderMap, activeStage1Set]);

  // Filtered Leads for the Kanban (strictly campaign/funnel scoped by default)
  const filteredLeads = useMemo(() => {
    return scopedCommercialLeads.filter(lead => {
      // 1. Campaign scope filter
      if (selectedCampaignFilter === 'all_campaigns') {
        const orderIdx = lead.stage_id ? stageIdToOrderMap.get(lead.stage_id) ?? 1 : 1;
        const isEngagedOrSent = orderIdx >= 2;
        const isInActiveQueue = activeStage1Set.has(lead.id);
        const hasBudgetRequest = parseBudgetNotes(lead.notes)?.isBudgetForm;
        if (!isEngagedOrSent && !isInActiveQueue && !hasBudgetRequest) {
          return false;
        }
      } else if (selectedCampaignFilter !== 'all_including_cold') {
        if (!specificCampaignSet || !specificCampaignSet.has(lead.id)) {
          return false;
        }
      }

      // 2. Search filter
      if (!searchTerm.trim()) return true;
      const search = searchTerm.toLowerCase();
      return (
        lead.name.toLowerCase().includes(search) ||
        (lead.email && lead.email.toLowerCase().includes(search)) ||
        (lead.company_name && lead.company_name.toLowerCase().includes(search)) ||
        (lead.phone && lead.phone.includes(search)) ||
        (lead.notes && lead.notes.toLowerCase().includes(search))
      );
    });
  }, [
    scopedCommercialLeads,
    selectedCampaignFilter,
    stageIdToOrderMap,
    activeStage1Set,
    specificCampaignSet,
    searchTerm,
  ]);

  const getLeadsInStage = (stage: KanbanStage) => {
    return filteredLeads
      .filter(lead => {
        if (lead.stage_id === stage.id) return true;
        const leadOrderIndex = lead.stage_id ? stageIdToOrderMap.get(lead.stage_id) : undefined;
        if (leadOrderIndex !== undefined) {
          return leadOrderIndex === stage.order_index;
        }
        return stage.order_index === 1;
      })
      .sort((a, b) => {
        const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
        const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
        return timeB - timeA;
      });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const locale = isFrench ? 'fr-FR' : isSpanish ? 'es-ES' : 'pt-PT';
    return new Date(dateString).toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Lido / Clicado Stage detection & lead count (prioritize stage name over order_index)
  const lidoStage = useMemo(() => {
    return (
      stages.find(
        s =>
          s.name.toLowerCase().includes('lido') ||
          s.name.toLowerCase().includes('clicad') ||
          (s.name_es && (s.name_es.toLowerCase().includes('leído') || s.name_es.toLowerCase().includes('clicad')))
      ) || stages.find(s => s.order_index === 3)
    );
  }, [stages]);

  const countLidoLeads = useMemo(() => {
    if (!lidoStage) return 0;
    return filteredLeads.filter(lead => {
      if (lead.stage_id === lidoStage.id) return true;
      const leadOrderIndex = lead.stage_id ? stageIdToOrderMap.get(lead.stage_id) : undefined;
      return leadOrderIndex === lidoStage.order_index;
    }).length;
  }, [filteredLeads, lidoStage, stageIdToOrderMap]);

  // List Mode Filtered Leads
  const listFilteredLeads = useMemo(() => {
    return filteredLeads
      .filter(lead => {
        if (selectedStageFilter === 'all') return true;
        const stage = stages.find(s => s.id === selectedStageFilter);
        if (!stage) return true;
        if (lead.stage_id === stage.id) return true;
        const leadOrderIndex = lead.stage_id ? stageIdToOrderMap.get(lead.stage_id) : undefined;
        if (leadOrderIndex !== undefined) {
          return leadOrderIndex === stage.order_index;
        }
        return stage.order_index === 1;
      })
      .sort((a, b) => {
        const timeA = new Date(a.updated_at || a.created_at || 0).getTime();
        const timeB = new Date(b.updated_at || b.created_at || 0).getTime();
        return timeB - timeA;
      });
  }, [filteredLeads, selectedStageFilter, stages, stageIdToOrderMap]);

  // Pagination for List Mode
  const totalPages = Math.max(1, Math.ceil(listFilteredLeads.length / pageSize));
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return listFilteredLeads.slice(start, start + pageSize);
  }, [listFilteredLeads, currentPage, pageSize]);

  // Lead helper for Stage Object
  const getStageForLead = (lead: Lead): KanbanStage | undefined => {
    if (lead.stage_id) {
      const directMatch = stages.find(s => s.id === lead.stage_id);
      if (directMatch) return directMatch;
      const order = stageIdToOrderMap.get(lead.stage_id);
      if (order !== undefined) {
        const orderMatch = stages.find(s => s.order_index === order);
        if (orderMatch) return orderMatch;
      }
    }
    return stages.find(s => s.order_index === 1) || stages[0];
  };

  // Selection handlers
  const isAllCurrentPageSelected =
    paginatedLeads.length > 0 && paginatedLeads.every(l => selectedLeadIds.includes(l.id));
  const isAllFilteredSelected =
    listFilteredLeads.length > 0 && listFilteredLeads.every(l => selectedLeadIds.includes(l.id));

  const handleSelectCurrentPage = (checked: boolean) => {
    if (checked) {
      const pageIds = paginatedLeads.map(l => l.id);
      setSelectedLeadIds(prev => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIdSet = new Set(paginatedLeads.map(l => l.id));
      setSelectedLeadIds(prev => prev.filter(id => !pageIdSet.has(id)));
    }
  };

  const handleSelectAllFiltered = () => {
    const allIds = listFilteredLeads.map(l => l.id);
    setSelectedLeadIds(allIds);
  };

  const handleClearSelection = () => {
    setSelectedLeadIds([]);
  };

  const handleToggleLead = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedLeadIds(prev => [...prev, id]);
    } else {
      setSelectedLeadIds(prev => prev.filter(item => item !== id));
    }
  };

  // Open Dialer Modal
  const handleOpenCreateDialer = () => {
    if (selectedLeadIds.length === 0) {
      toast.error(
        tr(
          'Selecione ao menos um lead para gerar a fila de ligação.',
          'Seleccione al menos un prospecto para generar la cola de llamadas.',
          'Sélectionnez au moins un prospect pour générer la file d’appels.'
        )
      );
      return;
    }
    const currentFilterStage = stages.find(s => s.id === selectedStageFilter);
    const stageLabel = currentFilterStage
      ? getStageTitle(currentFilterStage)
      : lidoStage && selectedStageFilter === lidoStage.id
      ? tr('Leads Clicados', 'Prospectos Clicados', 'Prospects Cliqués')
      : tr('Prospectos', 'Prospectos', 'Prospects');
    const operatorLabel = effectiveProfile?.displayName || currentEmpresa?.name || 'Comercial';
    const defaultTitle = `${tr('Fila Telemarketing', 'Cola Telemarketing', 'File Télémarketing')} - ${stageLabel} (${operatorLabel} - ${new Date().toLocaleDateString('pt-PT')})`;
    setDialerTitle(defaultTitle);
    setDialerDesc(
      tr(
        `${selectedLeadIds.length} prospectos selecionados a partir do Funil de Vendas.`,
        `${selectedLeadIds.length} prospectos seleccionados desde el Embudo de Ventas.`,
        `${selectedLeadIds.length} prospects sélectionnés depuis l’Entonnoir de Ventes.`
      )
    );
    setDialerAssignedTo(effectiveAssignedTo || 'unassigned');
    setIsCreateDialerOpen(true);
  };

  // Submit Dialer Queue
  const handleCreateDialerQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialerTitle.trim()) {
      toast.error(
        tr(
          'Por favor, informe o título da campanha de discagem.',
          'Por favor, indique el título de la cola de llamadas.',
          'Veuillez saisir le titre de la file d’appels.'
        )
      );
      return;
    }
    if (selectedLeadIds.length === 0) {
      toast.error(
        tr(
          'Nenhum lead selecionado.',
          'Ningún prospecto seleccionado.',
          'Aucun prospect sélectionné.'
        )
      );
      return;
    }

    setIsSubmittingDialer(true);
    try {
      const assignedOperatorId =
        effectiveAssignedTo || (dialerAssignedTo === 'unassigned' ? null : dialerAssignedTo);

      const campaign = await createCampaign({
        title: dialerTitle.trim(),
        description: dialerDesc.trim() || undefined,
        assigned_to: assignedOperatorId,
        script_id: dialerScriptId === 'none' ? null : dialerScriptId,
        lead_ids: selectedLeadIds,
      });

      toast.success(
        tr(
          `Fila de ligação "${campaign.title}" criada com sucesso no Discador!`,
          `¡Cola de llamadas "${campaign.title}" creada con éxito en el Marcador!`,
          `File d’appels "${campaign.title}" créée avec succès dans le Composeur !`
        ),
        {
          action: {
            label: tr('Ir para Discador', 'Ir al Marcador', 'Aller au Composeur'),
            onClick: () => navigate(`/comercial/discador?campaignId=${campaign.id}`),
          },
        }
      );

      setIsCreateDialerOpen(false);
      setSelectedLeadIds([]);
      navigate(`/comercial/discador?campaignId=${campaign.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao gerar fila de discagem.');
    } finally {
      setIsSubmittingDialer(false);
    }
  };

  return (
    <div className="flex flex-col space-y-5 p-4 sm:p-6 max-w-[1700px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                <span>
                  {tr('Funil de Vendas', 'Embudo de Ventas', 'Entonnoir de Ventes')}
                </span>
                <Badge
                  variant="outline"
                  className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-bold text-xs"
                >
                  {filteredLeads.length} Leads
                </Badge>
                {effectiveProfile && (
                  <Badge className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold px-2.5 py-0.5">
                    {effectiveProfile.flag} {effectiveProfile.displayName} • {effectiveProfile.empresaNome} ({effectiveProfile.country})
                  </Badge>
                )}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {tr(
                  'Acompanhe em tempo real apenas os prospectos enviados nas suas campanhas e filas de atendimento',
                  'Siga en tiempo real únicamente los prospectos enviados en sus campañas y colas de atención',
                  'Suivez en temps réel uniquement les prospects envoyés dans vos campagnes et files d’appels'
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Seletor de Empresa apenas para Admin */}
          {!isCommercialOperator && <EmpresaSelector />}

          <Button
            onClick={() => setIsNewLeadOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold shadow-sm gap-2"
          >
            <Plus className="h-4 w-4" />
            {tr('+ Novo Lead', '+ Nuevo Lead', '+ Nouveau Prospect')}
          </Button>
          {!isCommercialOperator && (
            <Button
              onClick={() => setIsConfigOpen(true)}
              variant="outline"
              className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 gap-2"
            >
              <Settings className="h-4 w-4" />
              {tr('Configurar Etapas', 'Configurar Etapas', 'Configurer les Étapes')}
            </Button>
          )}
        </div>
      </div>

      {/* Commercial Scope & Campaign Isolation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl shadow-sm">
        {isCommercialOperator && loggedCommercialProfile ? (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/40 text-xs px-3 py-1.5 font-bold flex items-center gap-2">
              <span>{loggedCommercialProfile.flag}</span>
              <span>
                {tr('Operação Exclusiva:', 'Operación Exclusiva:', 'Opération Exclusive :')}{' '}
                {loggedCommercialProfile.displayName} • {loggedCommercialProfile.empresaNome} (
                {loggedCommercialProfile.countryLabel})
              </span>
            </Badge>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-amber-500" />
              {tr('Operador Comercial:', 'Operador Comercial:', 'Opérateur Commercial :')}
            </span>
            {allProfiles.map(prof => {
              const isActive = selectedCommercialKey === prof.key;
              return (
                <button
                  key={prof.key}
                  type="button"
                  onClick={() => selectCommercialOperator(prof.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm font-bold ring-2 ring-amber-500/30'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{prof.flag}</span>
                  <span>{prof.displayName}</span>
                  <span className="text-[10px] opacity-75">
                    ({prof.empresaCodigo} • {prof.country})
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Campaign Filter Selector */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5 text-amber-500" />
            {tr('Campanha / Origem:', 'Campaña / Origen:', 'Campagne / Origine :')}
          </span>
          <Select
            value={selectedCampaignFilter}
            onValueChange={val => {
              setSelectedCampaignFilter(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[360px] h-9 text-xs bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 font-semibold rounded-xl">
              <SelectValue
                placeholder={tr(
                  'Filtrar por campanha enviada...',
                  'Filtrar por campaña enviada...',
                  'Filtrer par campagne envoyée...'
                )}
              />
            </SelectTrigger>
            <SelectContent className="max-h-[360px]">
              <SelectItem value="all_campaigns" className="text-xs font-bold">
                📬{' '}
                {tr(
                  'Todas as Minhas Campanhas & Atendimentos',
                  'Todas Mis Campañas y Atenciones',
                  'Toutes Mes Campagnes et Suivis'
                )}
              </SelectItem>

              {commercialCampaigns.map(camp => (
                <SelectItem
                  key={`${camp.kind}:${camp.id}`}
                  value={`${camp.kind}:${camp.id}`}
                  className="text-xs"
                >
                  {camp.kind === 'dialer' ? '📞 ' : '📧 '}
                  {camp.title} ({camp.total_leads} leads)
                </SelectItem>
              ))}

              {coldUncontactedCount > 0 && (
                <SelectItem value="all_including_cold" className="text-xs text-slate-500">
                  📂{' '}
                  {tr(
                    `Incluir Base Fria Não Enviada (+${coldUncontactedCount} em Novo)`,
                    `Incluir Base Fría No Enviada (+${coldUncontactedCount} en Nuevo)`,
                    `Inclure la Base Froide Non Envoyée (+${coldUncontactedCount} en Nouveau)`
                  )}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filter Toolbar & View Switcher */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder={tr(
                'Buscar lead por nome, empresa, e-mail...',
                'Buscar prospecto por nombre, empresa, correo...',
                'Rechercher un prospect par nom, entreprise, e-mail...'
              )}
              className="pl-10 bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-900 dark:text-slate-100 focus-visible:ring-amber-500 focus-visible:border-amber-500 h-10 rounded-xl text-xs sm:text-sm"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          {searchTerm && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            >
              {tr('Limpar busca', 'Limpiar búsqueda', 'Effacer la recherche')}
            </Button>
          )}
        </div>

        {/* View Switcher & Quick Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Filter: Clicados / Lidos */}
          {lidoStage && (
            <Button
              type="button"
              variant={selectedStageFilter === lidoStage.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (selectedStageFilter === lidoStage.id) {
                  setSelectedStageFilter('all');
                } else {
                  setSelectedStageFilter(lidoStage.id);
                  setViewMode('list');
                }
                setCurrentPage(1);
              }}
              className={
                selectedStageFilter === lidoStage.id
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border-none shadow-sm gap-2 h-10 px-3.5'
                  : 'border-amber-400/60 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold gap-2 h-10 px-3.5'
              }
              title={tr(
                'Filtrar prospectos que abriram ou clicaram nos e-mails',
                'Filtrar prospectos que abrieron o hicieron clic en los correos',
                'Filtrer les prospects ayant ouvert ou cliqué sur les e-mails'
              )}
            >
              <Flame className="h-4 w-4 fill-amber-500 text-amber-500" />
              <span>
                {tr(
                  'E-mail Clicado / Lido',
                  'Correo Leído / Clicado',
                  'E-mail Lu / Cliqué'
                )}
              </span>
              <Badge className="ml-1 bg-amber-600 text-white dark:bg-amber-500 dark:text-slate-950 text-xs px-2 py-0.5 font-bold">
                {countLidoLeads}
              </Badge>
            </Button>
          )}

          {/* View Mode Toggle: Kanban vs Lista */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200 dark:border-slate-700'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-200 dark:border-slate-700'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <List className="h-4 w-4" />
              <span>
                {tr(
                  'Lista & Telemarketing',
                  'Lista y Telemarketing',
                  'Liste & Télémarketing'
                )}
              </span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="flex flex-col space-y-4">
          {/* List Toolbar: Stage Filter, Bulk Selection & Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              {/* Filter by Stage Dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5" />
                  {tr('Filtrar Etapa:', 'Filtrar Etapa:', 'Filtrer l’Étape :')}
                </span>
                <Select
                  value={selectedStageFilter}
                  onValueChange={val => {
                    setSelectedStageFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[230px] h-9 text-xs bg-slate-50 dark:bg-slate-950 font-medium">
                    <SelectValue
                      placeholder={tr(
                        'Todas as etapas',
                        'Todas las etapas',
                        'Toutes les étapes'
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-semibold">
                      {tr('Todas as Etapas', 'Todas las Etapas', 'Toutes les Étapes')} (
                      {filteredLeads.length})
                    </SelectItem>
                    {stages.map(st => {
                      const count = getLeadsInStage(st).length;
                      return (
                        <SelectItem key={st.id} value={st.id} className="text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: st.color }}
                            />
                            <span className="truncate">{getStageTitle(st)}</span>
                            <span className="text-slate-400 text-[11px] font-mono">({count})</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Select Buttons */}
              <div className="flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectCurrentPage(!isAllCurrentPageSelected)}
                  className="h-8 text-xs gap-1.5 font-medium"
                >
                  {isAllCurrentPageSelected ? (
                    <CheckSquare className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <Square className="h-3.5 w-3.5 text-slate-400" />
                  )}
                  <span>
                    {isAllCurrentPageSelected
                      ? tr('Desmarcar Página', 'Desmarcar Página', 'Désélectionner la Page')
                      : tr('Selecionar Página', 'Seleccionar Página', 'Sélectionner la Page')}
                  </span>
                </Button>

                {listFilteredLeads.length > paginatedLeads.length && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={isAllFilteredSelected ? handleClearSelection : handleSelectAllFiltered}
                    className="h-8 text-xs gap-1.5 font-medium"
                  >
                    <span>
                      {isAllFilteredSelected
                        ? tr('Desmarcar Todos', 'Desmarcar Todos', 'Tout Désélectionner')
                        : `${tr('Selecionar Todos', 'Seleccionar Todos', 'Tout Sélectionner')} (${listFilteredLeads.length})`}
                    </span>
                  </Button>
                )}
              </div>
            </div>

            {/* Bulk Action: Gerar Fila no Discador */}
            <div className="flex items-center gap-2.5">
              {selectedLeadIds.length > 0 && (
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/80 px-3 py-1.5 rounded-xl text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span className="font-bold text-amber-900 dark:text-amber-200">
                    {selectedLeadIds.length}{' '}
                    {tr('selecionados', 'seleccionados', 'sélectionnés')}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-amber-600 hover:text-amber-800 dark:hover:text-amber-200 text-[11px] underline ml-1 font-medium"
                  >
                    {tr('Limpar', 'Limpiar', 'Effacer')}
                  </button>
                </div>
              )}

              <Button
                type="button"
                onClick={handleOpenCreateDialer}
                disabled={selectedLeadIds.length === 0}
                className={`gap-2 h-9 font-bold text-xs shadow-sm transition-all rounded-xl ${
                  selectedLeadIds.length > 0
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 ring-2 ring-amber-500/20'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <PhoneCall className="h-3.5 w-3.5" />
                <span>
                  {tr(
                    'Gerar Fila no Discador',
                    'Generar Cola en el Marcador',
                    'Générer une File d’Appels'
                  )}{' '}
                  ({selectedLeadIds.length})
                </span>
              </Button>
            </div>
          </div>

          {/* Leads Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 w-12 text-center">
                      <Checkbox
                        checked={isAllCurrentPageSelected}
                        onCheckedChange={handleSelectCurrentPage}
                        aria-label="Select page"
                      />
                    </th>
                    <th className="p-3.5">
                      {tr('Empresa / Lead', 'Empresa / Prospecto', 'Entreprise / Prospect')}
                    </th>
                    <th className="p-3.5">{tr('Contato', 'Contacto', 'Contact')}</th>
                    <th className="p-3.5">{tr('Telefone', 'Teléfono', 'Téléphone')}</th>
                    <th className="p-3.5">{tr('E-mail', 'Correo', 'E-mail')}</th>
                    <th className="p-3.5">
                      {tr('Etapa Funil', 'Etapa del Embudo', 'Étape Entonnoir')}
                    </th>
                    <th className="p-3.5">
                      {tr('Responsável', 'Responsable', 'Responsable')}
                    </th>
                    <th className="p-3.5 text-right">{tr('Ações', 'Acciones', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {loadingLeads || isLoadingScope ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">
                        {tr(
                          'Carregando prospectos das suas campanhas...',
                          'Cargando prospectos de sus campañas...',
                          'Chargement des prospects de vos campagnes...'
                        )}
                      </td>
                    </tr>
                  ) : paginatedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400">
                        {tr(
                          'Nenhum prospecto encontrado nas campanhas selecionadas.',
                          'No se encontraron prospectos en las campañas seleccionadas.',
                          'Aucun prospect trouvé dans les campagnes sélectionnées.'
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginatedLeads.map(lead => {
                      const isSelected = selectedLeadIds.includes(lead.id);
                      const stage = getStageForLead(lead);
                      const isBudget = parseBudgetNotes(lead.notes)?.isBudgetForm;
                      const assignedName = lead.assigned_to
                        ? salespersonMap.get(lead.assigned_to)
                        : null;

                      return (
                        <tr
                          key={lead.id}
                          onClick={() => {
                            setSelectedLead(lead);
                            setIsDetailsOpen(true);
                          }}
                          className={`cursor-pointer transition-colors hover:bg-amber-50/40 dark:hover:bg-amber-950/20 ${
                            isSelected ? 'bg-amber-50/60 dark:bg-amber-950/30' : ''
                          }`}
                        >
                          <td className="p-3.5 text-center" onClick={e => e.stopPropagation()}>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={checked => handleToggleLead(lead.id, !!checked)}
                              aria-label={`Select ${lead.company_name || lead.name}`}
                            />
                          </td>
                          <td className="p-3.5 font-medium">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm">
                                  {lead.company_name || lead.name}
                                </span>
                                {isBudget && (
                                  <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] px-1.5 py-0">
                                    {tr('Orçamento', 'Presupuesto', 'Devis')}
                                  </Badge>
                                )}
                              </div>
                              {lead.website && (
                                <a
                                  href={
                                    lead.website.startsWith('http')
                                      ? lead.website
                                      : `https://${lead.website}`
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 mt-0.5"
                                >
                                  <Globe className="h-3 w-3" />
                                  <span>
                                    {lead.website
                                      .replace(/^https?:\/\/(www\.)?/, '')
                                      .replace(/\/$/, '')}
                                  </span>
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="p-3.5 text-xs text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>{lead.name}</span>
                            </div>
                          </td>
                          <td className="p-3.5 text-xs" onClick={e => e.stopPropagation()}>
                            {lead.phone ? (
                              <div className="flex items-center gap-2">
                                <a
                                  href={`tel:${lead.phone}`}
                                  className="flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                                >
                                  <PhoneCall className="h-3.5 w-3.5" />
                                  <span>{lead.phone}</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(lead.phone || '');
                                    toast.success(
                                      tr(
                                        'Telefone copiado!',
                                        '¡Teléfono copiado!',
                                        'Téléphone copié !'
                                      )
                                    );
                                  }}
                                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">
                                {tr('Sem telefone', 'Sin teléfono', 'Sans téléphone')}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-xs text-slate-600 dark:text-slate-400">
                            {lead.email ? (
                              <div className="flex items-center gap-1.5 max-w-[220px] truncate">
                                <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span className="truncate" title={lead.email}>
                                  {lead.email}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">
                                {tr('Sem e-mail', 'Sin correo', 'Sans e-mail')}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-xs">
                            {stage ? (
                              <Badge
                                variant="outline"
                                className="font-semibold text-[11px] gap-1.5 border"
                                style={{
                                  borderColor: stage.color,
                                  color: stage.color,
                                  backgroundColor: `${stage.color}15`,
                                }}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: stage.color }}
                                />
                                {getStageTitle(stage)}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-slate-400">
                                -
                              </Badge>
                            )}
                          </td>
                          <td className="p-3.5 text-xs text-slate-600 dark:text-slate-400">
                            <Badge
                              variant="outline"
                              className="text-[11px] bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                            >
                              👤 {assignedName || effectiveProfile?.displayName || '-'}
                            </Badge>
                          </td>
                          <td className="p-3.5 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setIsDetailsOpen(true);
                                }}
                                className="h-7 px-2 text-xs text-slate-500 hover:text-amber-600"
                              >
                                {tr('Detalhes', 'Detalles', 'Détails')}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>
                  {tr('Exibindo', 'Mostrando', 'Affichage de')}{' '}
                  <strong>
                    {paginatedLeads.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
                  </strong>{' '}
                  {tr('a', 'a', 'à')}{' '}
                  <strong>{Math.min(currentPage * pageSize, listFilteredLeads.length)}</strong>{' '}
                  {tr('de', 'de', 'sur')} <strong>{listFilteredLeads.length}</strong>{' '}
                  {tr('prospectos', 'prospectos', 'prospects')}
                </span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span>{tr('Por página:', 'Por página:', 'Par page :')}</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={val => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-7 w-16 text-xs bg-white dark:bg-slate-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25" className="text-xs">
                      25
                    </SelectItem>
                    <SelectItem value="50" className="text-xs">
                      50
                    </SelectItem>
                    <SelectItem value="100" className="text-xs">
                      100
                    </SelectItem>
                    <SelectItem value="250" className="text-xs">
                      250
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2 font-medium">
                  {tr('Página', 'Página', 'Page')} {currentPage} {tr('de', 'de', 'sur')}{' '}
                  {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Kanban Board Horizontal Scrolling Area */
        <div className="flex gap-4 overflow-x-auto pb-6 items-start min-h-[650px] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
          {loadingStages || loadingLeads || isLoadingScope ? (
            <div className="flex justify-center items-center w-full py-24 text-slate-500 dark:text-slate-400">
              {tr(
                'Carregando funil de vendas das suas campanhas...',
                'Cargando embudo de ventas de sus campañas...',
                'Chargement de l’entonnoir de ventes de vos campagnes...'
              )}
            </div>
          ) : stages.length === 0 ? (
            <div className="flex flex-col items-center justify-center w-full py-24 text-center">
              <Layers className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-3" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                {tr(
                  'Nenhuma etapa do funil configurada',
                  'Ninguna etapa del embudo configurada',
                  'Aucune étape de l’entonnoir configurée'
                )}
              </h3>
            </div>
          ) : (
            stages.map(stage => {
              const stageLeads = getLeadsInStage(stage);
              const stageTitle = getStageTitle(stage);

              return (
                <div
                  key={stage.id}
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(e, stage.id)}
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
                      <div className="flex flex-col items-center justify-center py-12 text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-white/40 dark:bg-slate-950/20 text-center px-3">
                        <Sparkles className="h-5 w-5 mb-1.5 opacity-40 text-amber-500" />
                        <span>
                          {tr(
                            'Nenhum prospecto nesta etapa',
                            'Ningún prospecto en esta etapa',
                            'Aucun prospect à cette étape'
                          )}
                        </span>
                      </div>
                    ) : (
                      <>
                        {stageLeads.slice(0, 80).map(lead => {
                          const budgetInfo = parseBudgetNotes(lead.notes);
                          const assignedName = lead.assigned_to
                            ? salespersonMap.get(lead.assigned_to)
                            : effectiveProfile?.displayName;

                          return (
                            <div
                              key={lead.id}
                              draggable
                              onDragStart={e => handleDragStart(e, lead.id)}
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
                                  <span className="truncate">
                                    {lead.company_name ||
                                      tr('Sem Empresa', 'Sin Empresa', 'Sans Entreprise')}
                                  </span>
                                </span>
                                {budgetInfo?.isBudgetForm && (
                                  <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-[10px] px-1.5 py-0">
                                    {tr('Orçamento', 'Presupuesto', 'Devis')}
                                  </Badge>
                                )}
                              </div>

                              {/* Lead Name */}
                              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                {lead.name}
                              </h4>

                              {/* Salesperson Assigned Badge */}
                              {assignedName && (
                                <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-md w-fit">
                                  <User className="h-3 w-3 shrink-0" />
                                  <span className="truncate max-w-[170px]">{assignedName}</span>
                                </div>
                              )}

                              {/* Budget Form Snippet if present */}
                              {budgetInfo?.parsed && (
                                <div className="bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 rounded-lg p-2 text-[11px] space-y-1 text-slate-600 dark:text-slate-300">
                                  {budgetInfo.parsed['Perfis Profissionais Requeridos'] && (
                                    <div className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1 truncate">
                                      <Briefcase className="h-3 w-3 shrink-0" />
                                      <span className="truncate">
                                        {budgetInfo.parsed['Perfis Profissionais Requeridos']}
                                      </span>
                                    </div>
                                  )}
                                  {budgetInfo.parsed['Quantidade de Operários'] && (
                                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                      <Users className="h-3 w-3 shrink-0" />
                                      <span>
                                        {budgetInfo.parsed['Quantidade de Operários']}{' '}
                                        {tr('Operários', 'Operarios', 'Ouvriers')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Contact Info Footer */}
                              <div className="pt-2 border-t border-slate-100 dark:border-slate-900 flex flex-col gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                {lead.website && (
                                  <a
                                    href={
                                      lead.website.startsWith('http')
                                        ? lead.website
                                        : `https://${lead.website}`
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="flex items-center gap-1.5 truncate text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline font-medium"
                                  >
                                    <Globe className="h-3 w-3 shrink-0 text-blue-500" />
                                    <span className="truncate">
                                      {lead.website
                                        .replace(/^https?:\/\/(www\.)?/, '')
                                        .replace(/\/$/, '')}
                                    </span>
                                    <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-70" />
                                  </a>
                                )}
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
                                    {formatDate(lead.updated_at || lead.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {stageLeads.length > 80 && (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center space-y-1 mt-1">
                            <p className="text-xs text-amber-700 dark:text-amber-300 font-bold">
                              {tr(
                                `Mostrando os 80 primeiros de ${stageLeads.length} leads nesta etapa.`,
                                `Mostrando los 80 primeros de ${stageLeads.length} prospectos en esta etapa.`,
                                `Affichage des 80 premiers sur ${stageLeads.length} prospects à cette étape.`
                              )}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStageFilter(stage.id);
                                  setViewMode('list');
                                }}
                                className="text-amber-600 dark:text-amber-400 underline font-semibold hover:text-amber-700"
                              >
                                {tr(
                                  'Ver todos em Modo Lista',
                                  'Ver todos en Modo Lista',
                                  'Voir tout en Mode Liste'
                                )}
                              </button>
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Create Dialer Queue Dialog */}
      <Dialog open={isCreateDialerOpen} onOpenChange={setIsCreateDialerOpen}>
        <DialogContent className="sm:max-w-[540px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Headphones className="h-5 w-5 text-amber-500" />
              <span>
                {tr(
                  'Gerar Fila no Discador de Telemarketing',
                  'Generar Cola en el Marcador de Telemarketing',
                  'Générer une File d’Appels dans le Composeur'
                )}
              </span>
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs">
              {tr(
                'Configure a nova fila de ligação para iniciar os atendimentos no Cockpit de Prospecção.',
                'Configure la nueva cola de llamadas para iniciar las atenciones en el Cockpit de Prospección.',
                'Configurez la nouvelle file d’appels pour démarrer la prospection dans le Cockpit.'
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateDialerQueue} className="space-y-4 py-2">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="font-semibold text-amber-900 dark:text-amber-300">
                  {tr(
                    'Total de contatos na fila:',
                    'Total de contactos en la cola:',
                    'Total des contacts dans la file :'
                  )}
                </span>
              </div>
              <Badge className="bg-amber-500 text-slate-950 font-extrabold text-sm px-2.5 py-0.5">
                {selectedLeadIds.length} Leads
              </Badge>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dialer_title" className="text-xs font-semibold">
                {tr(
                  'Nome da Fila / Campanha',
                  'Nombre de la Cola / Campaña',
                  'Nom de la File / Campagne'
                )}{' '}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dialer_title"
                value={dialerTitle}
                onChange={e => setDialerTitle(e.target.value)}
                required
                className="bg-slate-50 dark:bg-slate-950 text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dialer_desc" className="text-xs font-semibold">
                {tr(
                  'Descrição ou Instruções',
                  'Descripción o Instrucciones',
                  'Description ou Instructions'
                )}
              </Label>
              <Input
                id="dialer_desc"
                value={dialerDesc}
                onChange={e => setDialerDesc(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  {tr('Script de Vendas', 'Guion de Ventas', 'Script de Vente')}
                </Label>
                <Select value={dialerScriptId} onValueChange={setDialerScriptId}>
                  <SelectTrigger className="bg-slate-50 dark:bg-slate-950 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">
                      {tr(
                        'Sem Script Pré-definido',
                        'Sin Guion Predefinido',
                        'Sans Script Prédéfini'
                      )}
                    </SelectItem>
                    {salesScripts.map(sc => (
                      <SelectItem key={sc.id} value={sc.id} className="text-xs">
                        📜 {sc.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  {tr('Operador Comercial', 'Operador Comercial', 'Opérateur Commercial')}
                </Label>
                <div className="h-9 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 flex items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {effectiveProfile
                    ? `${effectiveProfile.flag} ${effectiveProfile.displayName}`
                    : tr('Operador Ativo', 'Operador Activo', 'Opérateur Actif')}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialerOpen(false)}
                disabled={isSubmittingDialer}
                className="text-xs"
              >
                {tr('Cancelar', 'Cancelar', 'Annuler')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingDialer}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 text-xs"
              >
                <PhoneCall className="h-4 w-4" />
                {isSubmittingDialer
                  ? tr('Criando...', 'Creando...', 'Création...')
                  : tr(
                      'Criar Fila e Iniciar',
                      'Crear Cola e Iniciar',
                      'Créer la File et Démarrer'
                    )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Lead Modal */}
      <Dialog open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen}>
        <DialogContent className="sm:max-w-[480px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {tr('Novo Lead', 'Nuevo Prospecto', 'Nouveau Prospect')}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
              {tr(
                'Cadastre um novo prospecto manualmente no seu funil comercial.',
                'Registre un nuevo prospecto manualmente en su embudo comercial.',
                'Enregistrez manuellement un nouveau prospect dans votre entonnoir commercial.'
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateNewLeadSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="company_name">
                {tr(
                  'Empresa / Razão Social',
                  'Empresa / Razón Social',
                  'Entreprise / Raison Sociale'
                )}{' '}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="company_name"
                value={newLeadData.company_name}
                onChange={e => setNewLeadData(prev => ({ ...prev, company_name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="lead_name">
                {tr('Nome do Contato', 'Nombre del Contacto', 'Nom du Contact')}{' '}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="lead_name"
                value={newLeadData.name}
                onChange={e => setNewLeadData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">{tr('E-mail', 'Correo', 'E-mail')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={newLeadData.email}
                  onChange={e => setNewLeadData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">
                  {tr('Telefone / WhatsApp', 'Teléfono / WhatsApp', 'Téléphone / WhatsApp')}
                </Label>
                <Input
                  id="phone"
                  value={newLeadData.phone}
                  onChange={e => setNewLeadData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="stage_id">
                  {tr('Estágio Inicial', 'Etapa Inicial', 'Étape Initiale')}
                </Label>
                <Select
                  value={newLeadData.stage_id || (stages[1]?.id ?? stages[0]?.id ?? '')}
                  onValueChange={val => setNewLeadData(prev => ({ ...prev, stage_id: val }))}
                >
                  <SelectTrigger>
                    <SelectValue />
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
                <Label>
                  {tr('Responsável Comercial', 'Responsable Comercial', 'Responsable Commercial')}
                </Label>
                <div className="h-10 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 flex items-center text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {effectiveProfile
                    ? `${effectiveProfile.flag} ${effectiveProfile.displayName}`
                    : '-'}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">
                {tr('Observações', 'Observaciones', 'Observations')}
              </Label>
              <Input
                id="notes"
                value={newLeadData.notes}
                onChange={e => setNewLeadData(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsNewLeadOpen(false)}>
                {tr('Cancelar', 'Cancelar', 'Annuler')}
              </Button>
              <Button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
              >
                {tr('Salvar Lead', 'Guardar Prospecto', 'Enregistrer le Prospect')}
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
                  {tr(
                    'Detalhes do Lead e Orçamento',
                    'Detalles del Prospecto y Presupuesto',
                    'Détails du Prospect et Devis'
                  )}
                </span>
                {parseBudgetNotes(selectedLead.notes)?.isBudgetForm && (
                  <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                    {tr(
                      'Formulário de Orçamento',
                      'Formulario de Presupuesto',
                      'Formulaire de Devis'
                    )}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
                {tr(
                  'Informações completas do contato e histórico comercial',
                  'Información completa del contacto e historial comercial',
                  'Informations complètes du contact et historique commercial'
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-2">
              {/* Stage & Assigned Salesperson Quick Switcher Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {tr('Etapa do Funil:', 'Etapa del Embudo:', 'Étape de l’Entonnoir :')}
                  </span>
                  <Select
                    value={selectedLead.stage_id || ''}
                    onValueChange={val => handleLeadStageChange(selectedLead.id, val)}
                  >
                    <SelectTrigger className="w-full h-8 text-xs font-semibold bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                      <SelectValue />
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

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    {tr(
                      'Responsável Comercial:',
                      'Responsable Comercial:',
                      'Responsable Commercial :'
                    )}
                  </span>
                  {isCommercialOperator ? (
                    <div className="h-8 px-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center text-xs font-semibold">
                      👤{' '}
                      {(selectedLead.assigned_to && salespersonMap.get(selectedLead.assigned_to)) ||
                        effectiveProfile?.displayName}
                    </div>
                  ) : (
                    <Select
                      value={selectedLead.assigned_to || 'unassigned'}
                      onValueChange={val => handleLeadAssignedChange(selectedLead.id, val)}
                    >
                      <SelectTrigger className="w-full h-8 text-xs font-semibold bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned" className="text-xs">
                          {tr('Sem Atribuição', 'Sin Asignación', 'Non Assigné')}
                        </SelectItem>
                        {salespeople.map(u => (
                          <SelectItem key={u.id} value={u.id} className="text-xs">
                            👤 {u.display_name || u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Contact Main Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">
                    {tr(
                      'Empresa / Razão Social',
                      'Empresa / Razón Social',
                      'Entreprise / Raison Sociale'
                    )}
                  </Label>
                  <p className="font-semibold text-sm flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <Building className="h-4 w-4 text-amber-500 shrink-0" />
                    {selectedLead.company_name || 'N/A'}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">
                    {tr('Pessoa de Contato', 'Persona de Contacto', 'Personne de Contact')}
                  </Label>
                  <p className="font-semibold text-sm flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <UserCheck className="h-4 w-4 text-amber-500 shrink-0" />
                    {selectedLead.name}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">
                    {tr('E-mail', 'Correo', 'E-mail')}
                  </Label>
                  {selectedLead.email ? (
                    <a
                      href={`mailto:${selectedLead.email}`}
                      className="font-medium text-sm text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1.5 truncate"
                    >
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="truncate">{selectedLead.email}</span>
                    </a>
                  ) : (
                    <p className="text-sm text-slate-400">
                      {tr('Não informado', 'No informado', 'Non renseigné')}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 dark:text-slate-400">
                    {tr('Telefone / WhatsApp', 'Teléfono / WhatsApp', 'Téléphone / WhatsApp')}
                  </Label>
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
                    <p className="text-sm text-slate-400">
                      {tr('Não informado', 'No informado', 'Non renseigné')}
                    </p>
                  )}
                </div>

                {selectedLead.website && (
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs text-slate-500 dark:text-slate-400">
                      {tr(
                        'Site Oficial da Empresa',
                        'Sitio Web Oficial',
                        'Site Web Officiel'
                      )}
                    </Label>
                    <a
                      href={
                        selectedLead.website.startsWith('http')
                          ? selectedLead.website
                          : `https://${selectedLead.website}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 truncate"
                    >
                      <Globe className="h-4 w-4 shrink-0 text-blue-500" />
                      <span className="truncate">{selectedLead.website}</span>
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-70" />
                    </a>
                  </div>
                )}
              </div>

              {/* Budget Request Structured Breakdown (if present) */}
              {parseBudgetNotes(selectedLead.notes)?.parsed && (
                <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 border-b border-amber-200/80 dark:border-amber-800/60 pb-2">
                    <Briefcase className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                      {tr(
                        'Especificações da Demanda / Obra',
                        'Especificaciones de la Demanda / Obra',
                        'Spécifications de la Demande / Chantier'
                      )}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {Object.entries(parseBudgetNotes(selectedLead.notes)!.parsed!).map(
                      ([key, val]) => (
                        <div key={key} className="space-y-0.5">
                          <span className="text-slate-500 dark:text-slate-400 font-medium block">
                            {key}:
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                            {val}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Raw Notes if not structured */}
              {selectedLead.notes && !parseBudgetNotes(selectedLead.notes)?.parsed && (
                <div className="space-y-1 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                  <Label className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    {tr(
                      'Observações do Contato',
                      'Observaciones del Contacto',
                      'Observations du Contact'
                    )}
                  </Label>
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {selectedLead.notes}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="border-t pt-4 flex items-center justify-between gap-3">
              <Button
                type="button"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 shadow-sm"
                onClick={() => {
                  navigate(`/comercial/estimaciones/nueva?lead_id=${selectedLead.id}`);
                }}
              >
                <Sparkles className="h-4 w-4" />
                {tr('Gerar Estimativa', 'Generar Estimación', 'Générer un Devis')}
              </Button>
              <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                {tr('Fechar', 'Cerrar', 'Fermer')}
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
              {tr(
                'Configuração dos Estágios do Funil',
                'Configuración de las Etapas del Embudo',
                'Configuration des Étapes de l’Entonnoir'
              )}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleCreateStage}
            className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 my-2"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="stageName" className="text-xs font-semibold">
                  Nome (PT) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="stageName"
                  className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-xs h-9"
                  value={newStageName}
                  onChange={e => setNewStageName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stageNameEs" className="text-xs font-semibold">
                  Nombre (ES)
                </Label>
                <Input
                  id="stageNameEs"
                  className="bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-xs h-9"
                  value={newStageNameEs}
                  onChange={e => setNewStageNameEs(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="stageColor" className="text-xs font-semibold">
                  {tr('Cor:', 'Color:', 'Couleur :')}
                </Label>
                <Input
                  id="stageColor"
                  type="color"
                  className="w-8 h-8 p-0 border rounded-lg cursor-pointer shrink-0"
                  value={newStageColor}
                  onChange={e => setNewStageColor(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-9 px-4"
              >
                <Plus className="h-4 w-4 mr-1" />
                {tr('Adicionar Estágio', 'Añadir Etapa', 'Ajouter une Étape')}
              </Button>
            </div>
          </form>

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
                        <Input
                          className="h-8 text-xs bg-white dark:bg-slate-900"
                          value={editingStageName}
                          onChange={e => setEditingStageName(e.target.value)}
                        />
                        <Input
                          className="h-8 text-xs bg-white dark:bg-slate-900"
                          value={editingStageNameEs}
                          onChange={e => setEditingStageNameEs(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <Input
                          type="color"
                          className="w-7 h-7 p-0 border rounded cursor-pointer"
                          value={editingStageColor}
                          onChange={e => setEditingStageColor(e.target.value)}
                        />
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2"
                            onClick={() => handleSaveEditStage(stage.id)}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            {tr('Salvar', 'Guardar', 'Enregistrer')}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => setEditingStageId(null)}
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            {tr('Cancelar', 'Cancelar', 'Annuler')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveStageOrder(idx, 'left')}
                            className="text-slate-400 hover:text-slate-900 disabled:opacity-20"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === stages.length - 1}
                            onClick={() => handleMoveStageOrder(idx, 'right')}
                            className="text-slate-400 hover:text-slate-900 disabled:opacity-20"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                          {getStageTitle(stage)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
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

          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setIsConfigOpen(false)}>
              {tr('Fechar', 'Cerrar', 'Fermer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
