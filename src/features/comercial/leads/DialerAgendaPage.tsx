import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarDays, 
  Clock, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Calendar as CalendarIcon, 
  ListFilter, 
  ChevronLeft, 
  ChevronRight, 
  PhoneCall, 
  Copy, 
  Edit3, 
  Trash2, 
  Check, 
  Play, 
  Users, 
  User,
  MapPin,
  Bold,
  Italic,
  Underline,
  List,
  Tag,
  Plus,
  X,
  Layers,
  CheckSquare,
  Square
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  format, 
  isSameDay, 
  isToday, 
  isFuture, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  addMonths, 
  subMonths, 
  getDay,
  parseISO,
  isBefore,
  startOfToday
} from 'date-fns';
import { ptBR, es, fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/app/providers/AuthProvider';
import {
  useDialerAgenda,
  useMutateDialer,
  useSalesScripts,
  extractTagsFromAppointment,
  type ScheduledAppointmentItem
} from './hooks/useDialer';
import { useSalespeople, useCommercialScope } from './hooks/useLeads';
import { useComercialLanguage } from './utils/comercialI18n';

const CUSTOM_TAGS_STORAGE_KEY = 'mcs_dialer_custom_callback_tags';

export function DialerAgendaPage() {
  const { tr, lang } = useComercialLanguage();
  const dateLocale = lang === 'fr' ? fr : lang === 'es' ? es : ptBR;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isCommercialOperator, activeProfile } = useCommercialScope();
  const { data: agenda = [] } = useDialerAgenda();
  const { data: salespeople = [] } = useSalespeople();
  const { data: scripts = [] } = useSalesScripts();
  const {
    updateAppointment,
    deleteAppointment,
    isUpdatingAppointment,
    createCampaignFromAgenda,
    isCreatingCampaignFromAgenda
  } = useMutateDialer();

  const [savedCustomTags, setSavedCustomTags] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_TAGS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const quickTags = useMemo(() => [
    tr('Decisor em reunião', 'Decisor en reunión', 'Décideur en réunion'),
    tr('Ligar à tarde', 'Llamar por la tarde', 'Appeler l’après-midi'),
    tr('Parada técnica', 'Parada técnica', 'Arrêt technique'),
    tr('Aguardando compras', 'Esperando compras', 'En attente achats'),
    tr('Pediu orçamento', 'Pidió presupuesto', 'A demandé un devis'),
    tr('Soldadores TIG/MIG', 'Soldadores TIG/MIG', 'Soudeurs TIG/MIG'),
    tr('Tubistas / Montadores', 'Tuberos / Montadores', 'Tuyauteurs / Monteurs'),
    tr('Urgente Obra', 'Urgente Obra', 'Urgent Chantier'),
  ], [tr]);

  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [operatorScope, setOperatorScope] = useState<'mine' | 'all'>('mine');
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'today' | 'overdue' | 'upcoming' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-select state for appointments
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());

  // Edit / Reschedule Modal State
  const [editingItem, setEditingItem] = useState<ScheduledAppointmentItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editPriority, setEditPriority] = useState<'high' | 'normal' | 'low'>('normal');
  const [editNotes, setEditNotes] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editCustomTagInput, setEditCustomTagInput] = useState('');
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editStatus, setEditStatus] = useState('scheduled');
  const editEditorRef = useRef<HTMLDivElement>(null);

  // Create Queue from Agenda Modal State
  const [isCreateQueueModalOpen, setIsCreateQueueModalOpen] = useState(false);
  const [newQueueTitle, setNewQueueTitle] = useState('');
  const [newQueueDescription, setNewQueueDescription] = useState('');
  const [newQueueAssignedTo, setNewQueueAssignedTo] = useState('');
  const [newQueueScriptId, setNewQueueScriptId] = useState('');
  const [queueTargetIds, setQueueTargetIds] = useState<string[]>([]);

  // Quick New Tag creation on Agenda Filter Bar
  const [newGlobalTagInput, setNewGlobalTagInput] = useState('');
  const [isAddingGlobalTag, setIsAddingGlobalTag] = useState(false);

  // Operator Scoping
  const myAppointmentsCount = useMemo(() => {
    if (!user?.id) return agenda.length;
    return agenda.filter(it => it.assigned_to === user.id || !it.assigned_to).length;
  }, [agenda, user?.id]);

  const scopedAgenda = useMemo(() => {
    return agenda.filter(item => {
      if (operatorScope === 'mine') {
        if (user?.id && item.assigned_to && item.assigned_to !== user.id) {
          return false;
        }
      } else if (selectedOperatorId !== 'all') {
        if (item.assigned_to !== selectedOperatorId) {
          return false;
        }
      }
      return true;
    });
  }, [agenda, operatorScope, selectedOperatorId, user?.id]);

  // Compute all unique tags and their counts across scopedAgenda + savedCustomTags
  const allAvailableTags = useMemo(() => {
    const counts = new Map<string, number>();
    scopedAgenda.forEach(item => {
      const itemTags = extractTagsFromAppointment(item.tags, item.scheduled_notes);
      itemTags.forEach(t => {
        counts.set(t, (counts.get(t) || 0) + 1);
      });
    });
    savedCustomTags.forEach(raw => {
      const clean = `#${raw.replace(/^#+/, '').trim()}`;
      if (clean.length > 1 && !counts.has(clean)) {
        counts.set(clean, 0);
      }
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [scopedAgenda, savedCustomTags]);

  // KPI Calculations
  const todayStart = startOfToday();

  const stats = useMemo(() => {
    let todayCount = 0;
    let overdueCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;

    scopedAgenda.forEach(item => {
      if (!item.scheduled_for) return;
      const date = parseISO(item.scheduled_for);

      if (['converted', 'completed'].includes(item.status)) {
        completedCount++;
      } else if (isToday(date)) {
        todayCount++;
      } else if (isBefore(date, todayStart) && item.status === 'scheduled') {
        overdueCount++;
      } else if (isFuture(date)) {
        upcomingCount++;
      }
    });

    return { todayCount, overdueCount, upcomingCount, completedCount, total: scopedAgenda.length };
  }, [scopedAgenda, todayStart]);

  // Filtered List (used by both List view and Calendar filter)
  const filteredAgenda = useMemo(() => {
    return scopedAgenda.filter(item => {
      if (!item.scheduled_for) return false;
      const date = parseISO(item.scheduled_for);

      // Status filter
      if (statusFilter === 'today' && !isToday(date)) return false;
      if (statusFilter === 'overdue' && (!isBefore(date, todayStart) || item.status !== 'scheduled')) return false;
      if (statusFilter === 'upcoming' && !isFuture(date)) return false;
      if (statusFilter === 'completed' && !['converted', 'completed'].includes(item.status)) return false;

      // Priority filter
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;

      // Tag filter
      if (tagFilter !== 'all') {
        const itemTags = extractTagsFromAppointment(item.tags, item.scheduled_notes);
        const matchesTag = itemTags.some(t => t.toLowerCase() === tagFilter.toLowerCase());
        if (!matchesTag) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const company = (item.lead?.company_name || item.lead?.name || '').toLowerCase();
        const contact = (item.lead?.name || '').toLowerCase();
        const phone = (item.lead?.phone || '').toLowerCase();
        const notes = (item.scheduled_notes || '').toLowerCase();
        const itemTags = extractTagsFromAppointment(item.tags, item.scheduled_notes).join(' ').toLowerCase();
        if (
          !company.includes(query) &&
          !contact.includes(query) &&
          !phone.includes(query) &&
          !notes.includes(query) &&
          !itemTags.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [scopedAgenda, statusFilter, priorityFilter, tagFilter, searchQuery, todayStart]);

  // Appointments for currently selected day in Calendar view (respecting tagFilter and searchQuery)
  const selectedDayAppointments = useMemo(() => {
    if (!selectedDay) return [];
    return filteredAgenda.filter(it => it.scheduled_for && isSameDay(parseISO(it.scheduled_for), selectedDay));
  }, [filteredAgenda, selectedDay]);

  // Calendar calculations
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  const startOffset = (startDayOfWeek + 6) % 7; // Monday start

  // Sync Rich Text in Edit Modal
  useEffect(() => {
    if (isEditModalOpen && editEditorRef.current) {
      editEditorRef.current.innerHTML = editNotes || '';
    }
  }, [isEditModalOpen]);

  const handleToggleSelectId = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleSelectAllFiltered = () => {
    const targetList = viewMode === 'calendar' ? selectedDayAppointments : filteredAgenda;
    const targetIds = targetList.map(it => it.id);
    const allSelected = targetIds.length > 0 && targetIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !targetIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...targetIds])));
    }
  };

  const handleCreateGlobalCustomTag = () => {
    const raw = newGlobalTagInput.replace(/^#+/, '').trim();
    if (!raw) return;
    if (!savedCustomTags.includes(raw)) {
      const next = [...savedCustomTags, raw];
      setSavedCustomTags(next);
      try {
        localStorage.setItem(CUSTOM_TAGS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
    }
    setNewGlobalTagInput('');
    setIsAddingGlobalTag(false);
    toast.success(tr(`Tag #${raw} criada e pronta para uso!`, `¡Etiqueta #${raw} creada!`, `Tag #${raw} créé !`));
  };

  const handleFormatEditCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editEditorRef.current) {
      setEditNotes(editEditorRef.current.innerHTML);
    }
  };

  const handleHighlightEditColor = (bgColor: string, textColor: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      toast.info(
        tr(
          'Selecione o texto que deseja destacar com cor.',
          'Seleccione el texto que desea resaltar con color.',
          'Sélectionnez le texte que vous souhaitez surligner.'
        )
      );
      return;
    }
    document.execCommand('backColor', false, bgColor);
    document.execCommand('foreColor', false, textColor);
    if (editEditorRef.current) {
      setEditNotes(editEditorRef.current.innerHTML);
    }
  };

  const handleToggleEditTag = (tagText: string) => {
    const cleanTag = `#${tagText.replace(/^#+/, '').trim()}`;
    setEditTags(prev =>
      prev.includes(cleanTag) ? prev.filter(t => t !== cleanTag) : [...prev, cleanTag]
    );
    if (editEditorRef.current && !editEditorRef.current.innerHTML.includes(cleanTag)) {
      const tagHtml = `<span style="background-color: #3b82f620; color: #3b82f6; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid #3b82f640; margin-right: 4px;">${cleanTag}</span> `;
      editEditorRef.current.innerHTML = `${tagHtml}${editEditorRef.current.innerHTML}`;
      setEditNotes(editEditorRef.current.innerHTML);
    }
  };

  const handleAddEditCustomTag = () => {
    const raw = editCustomTagInput.replace(/^#+/, '').trim();
    if (!raw) return;
    const cleanTag = `#${raw}`;
    if (!editTags.includes(cleanTag)) {
      setEditTags(prev => [...prev, cleanTag]);
    }
    if (!savedCustomTags.includes(raw)) {
      const next = [...savedCustomTags, raw];
      setSavedCustomTags(next);
      try {
        localStorage.setItem(CUSTOM_TAGS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
    }
    if (editEditorRef.current && !editEditorRef.current.innerHTML.includes(cleanTag)) {
      const tagHtml = `<span style="background-color: #3b82f620; color: #3b82f6; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid #3b82f640; margin-right: 4px;">${cleanTag}</span> `;
      editEditorRef.current.innerHTML = `${tagHtml}${editEditorRef.current.innerHTML}`;
      setEditNotes(editEditorRef.current.innerHTML);
    }
    setEditCustomTagInput('');
  };

  // Open Edit Modal
  const handleOpenEdit = (item: ScheduledAppointmentItem) => {
    setEditingItem(item);
    if (item.scheduled_for) {
      const d = parseISO(item.scheduled_for);
      setEditDate(format(d, 'yyyy-MM-dd'));
      setEditTime(format(d, 'HH:mm'));
    } else {
      setEditDate(format(new Date(), 'yyyy-MM-dd'));
      setEditTime('10:00');
    }
    setEditPriority(item.priority || 'normal');
    const noteText = item.scheduled_notes || '';
    setEditNotes(noteText);
    setEditTags(extractTagsFromAppointment(item.tags, item.scheduled_notes));
    setEditCustomTagInput('');
    if (editEditorRef.current) {
      editEditorRef.current.innerHTML = noteText;
    }
    setEditAssignedTo(item.assigned_to || user?.id || '');
    setEditStatus(item.status || 'scheduled');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const combinedIso = new Date(`${editDate}T${editTime}:00`).toISOString();
      const finalNotes = editEditorRef.current?.innerHTML || editNotes;
      await updateAppointment({
        queueItemId: editingItem.id,
        scheduled_for: combinedIso,
        scheduled_notes: finalNotes,
        priority: editPriority,
        status: editStatus,
        assigned_to: editAssignedTo || null,
        tags: editTags,
      });

      toast.success(
        tr('Agendamento atualizado com sucesso!', '¡Agendamiento actualizado con éxito!', 'Rendez-vous mis à jour avec succès !')
      );
      setIsEditModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || tr('Erro ao atualizar agendamento', 'Error al actualizar agendamiento', 'Erreur lors de la mise à jour'));
    }
  };

  const handleCancelAppointment = async (queueItemId: string) => {
    if (!confirm(
      tr(
        'Deseja cancelar este agendamento de retorno?',
        '¿Desea cancelar este agendamiento de retorno?',
        'Voulez-vous annuler ce rappel planifié ?'
      )
    )) return;
    try {
      await deleteAppointment(queueItemId);
      setSelectedIds(prev => prev.filter(id => id !== queueItemId));
      toast.success(tr('Agendamento cancelado com sucesso.', 'Agendamiento cancelado con éxito.', 'Rendez-vous annulé avec succès.'));
    } catch (err: any) {
      toast.error(tr('Erro ao cancelar agendamento', 'Error al cancelar agendamiento', 'Erreur lors de l’annulation'));
    }
  };

  const handleMarkCompleted = async (queueItemId: string) => {
    try {
      await updateAppointment({
        queueItemId,
        status: 'converted',
      });
      toast.success(tr('Agendamento marcado como concluído!', '¡Agendamiento marcado como completado!', 'Rendez-vous marqué comme terminé !'));
    } catch (err: any) {
      toast.error(tr('Erro ao concluir agendamento', 'Error al completar agendamiento', 'Erreur lors de la clôture'));
    }
  };

  // Call a single appointment in the Cockpit (works even if campaign_id is null!)
  const handleStartDialer = (item: ScheduledAppointmentItem) => {
    if (item.campaign_id) {
      navigate(`/comercial/discador?campaignId=${item.campaign_id}&queueItemId=${item.id}`);
    } else {
      navigate(`/comercial/discador?queueItemId=${item.id}`);
    }
  };

  // Call multiple selected or filtered appointments directly in the Cockpit
  const handleStartDialerBatch = (idsToCall?: string[]) => {
    const ids = idsToCall && idsToCall.length > 0
      ? idsToCall
      : selectedIds.length > 0
      ? selectedIds
      : (viewMode === 'calendar' ? selectedDayAppointments : filteredAgenda).map(it => it.id);

    if (ids.length === 0) {
      toast.error(
        tr(
          'Selecione pelo menos 1 agendamento para atender no Cockpit.',
          'Seleccione al menos 1 agendamiento para atender en el Cockpit.',
          'Sélectionnez au moins 1 rendez-vous à appeler dans le Cockpit.'
        )
      );
      return;
    }

    navigate(`/comercial/discador?queueItemIds=${ids.join(',')}`);
  };

  // Open Modal to Create a Work Queue (dialer_campaigns) from selected/filtered appointments
  const handleOpenCreateQueueModal = (customIds?: string[]) => {
    const ids = customIds && customIds.length > 0
      ? customIds
      : selectedIds.length > 0
      ? selectedIds
      : (viewMode === 'calendar' ? selectedDayAppointments : filteredAgenda).map(it => it.id);

    if (ids.length === 0) {
      toast.error(
        tr(
          'Selecione pelo menos 1 agendamento na Agenda para criar uma fila de trabalho.',
          'Seleccione al menos 1 agendamiento en la Agenda para crear una cola de trabajo.',
          'Sélectionnez au moins 1 rendez-vous dans l’Agenda pour créer une file de travail.'
        )
      );
      return;
    }

    setQueueTargetIds(ids);
    const dateLabel = format(selectedDay || new Date(), 'dd/MM/yyyy');
    const tagSuffix = tagFilter !== 'all' ? ` • ${tagFilter}` : '';
    setNewQueueTitle(`Fila de Retornos Agendados${tagSuffix} (${dateLabel})`);
    setNewQueueDescription(
      `Fila gerada a partir de ${ids.length} agendamento(s) da Agenda${tagSuffix}`
    );
    setNewQueueAssignedTo(activeProfile?.userId || user?.id || '');
    const defaultScript = scripts.find(s => s.is_default) || scripts[0];
    setNewQueueScriptId(defaultScript?.id || '');
    setIsCreateQueueModalOpen(true);
  };

  const handleConfirmCreateQueueFromAgenda = async (openCockpitAfter: boolean) => {
    if (!newQueueTitle.trim() || queueTargetIds.length === 0) return;

    try {
      const createdCampaign = await createCampaignFromAgenda({
        title: newQueueTitle.trim(),
        description: newQueueDescription.trim() || undefined,
        assigned_to: newQueueAssignedTo || null,
        script_id: newQueueScriptId || null,
        queue_item_ids: queueTargetIds,
      });

      setIsCreateQueueModalOpen(false);
      setSelectedIds([]);
      toast.success(
        tr(
          `🎉 Fila de trabalho "${createdCampaign.title}" criada com ${queueTargetIds.length} agendamento(s)!`,
          `🎉 ¡Cola de trabajo "${createdCampaign.title}" creada con ${queueTargetIds.length} agendamiento(s)!`,
          `🎉 File de travail "${createdCampaign.title}" créée avec ${queueTargetIds.length} rendez-vous !`
        )
      );

      if (openCockpitAfter) {
        navigate(`/comercial/discador?campaignId=${createdCampaign.id}&queueItemId=${queueTargetIds[0]}`);
      }
    } catch (err: any) {
      toast.error(
        err.message ||
          tr(
            'Erro ao criar fila de trabalho a partir da Agenda',
            'Error al crear cola de trabajo desde la Agenda',
            'Erreur lors de la création de la file de travail'
          )
      );
    }
  };

  const dayHeaders = useMemo(() => [
    tr('Seg', 'Lun', 'Lun'),
    tr('Ter', 'Mar', 'Mar'),
    tr('Qua', 'Mié', 'Mer'),
    tr('Qui', 'Jue', 'Jeu'),
    tr('Sex', 'Vie', 'Ven'),
    tr('Sáb', 'Sáb', 'Sam'),
    tr('Dom', 'Dom', 'Dim'),
  ], [tr]);

  return (
    <div className="flex flex-col space-y-5 p-4 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              {tr('Minha Agenda & Retornos (Callbacks)', 'Mi Agenda y Seguimientos (Callbacks)', 'Mon Agenda & Rappels (Callbacks)')}
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs">
                SDR & Telemarketing
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              {tr(
                'Organize por Tags, selecione clientes para ligar direto no Cockpit ou gere uma nova Fila de Trabalho a partir da Agenda.',
                'Organice por Etiquetas, seleccione clientes para llamar directo en el Cockpit o genere una nueva Cola de Trabajo desde la Agenda.',
                'Organisez par Tags, sélectionnez des clients à appeler dans le Cockpit ou créez une File de Travail depuis l’Agenda.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Operator Scope Switcher */}
          {!isCommercialOperator && (
            <div className="flex items-center gap-2">
              <div className="bg-muted/60 border border-border p-0.5 rounded-xl flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOperatorScope('mine')}
                  className={`h-8 text-xs font-bold gap-1.5 rounded-lg transition-all ${
                    operatorScope === 'mine' ? 'bg-amber-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <User className="w-3.5 h-3.5" /> {tr('Minha Agenda', 'Mi Agenda', 'Mon Agenda')} ({myAppointmentsCount})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOperatorScope('all')}
                  className={`h-8 text-xs font-bold gap-1.5 rounded-lg transition-all ${
                    operatorScope === 'all' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" /> {tr('Toda a Equipe', 'Todo el Equipo', 'Toute l’Équipe')} ({agenda.length})
                </Button>
              </div>

              {operatorScope === 'all' && (
                <select
                  value={selectedOperatorId}
                  onChange={e => setSelectedOperatorId(e.target.value)}
                  className="h-8 rounded-xl bg-card border border-input text-foreground text-xs px-2.5 shadow-sm font-medium"
                >
                  <option value="all">{tr('Todos os Operadores', 'Todos los Operadores', 'Tous les Opérateurs')} ({agenda.length})</option>
                  {salespeople.map(sp => (
                    <option key={sp.id} value={sp.id}>{sp.display_name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* View switcher */}
          <div className="bg-muted/60 border border-border p-0.5 rounded-xl flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('calendar')}
              className={`h-8 text-xs font-semibold gap-1.5 rounded-lg ${
                viewMode === 'calendar' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5 text-amber-500" /> {tr('Modo Calendário', 'Modo Calendario', 'Vue Calendrier')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('list')}
              className={`h-8 text-xs font-semibold gap-1.5 rounded-lg ${
                viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5 text-indigo-500" /> {tr('Modo Lista', 'Modo Lista', 'Vue Liste')} ({filteredAgenda.length})
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenCreateQueueModal()}
            className="h-9 border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold text-xs gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            {selectedIds.length > 0
              ? tr(`Criar Fila (${selectedIds.length})`, `Crear Cola (${selectedIds.length})`, `Créer File (${selectedIds.length})`)
              : tr('Criar Fila da Agenda', 'Crear Cola de Agenda', 'Créer File de l’Agenda')}
          </Button>

          <Button
            size="sm"
            onClick={() => handleStartDialerBatch()}
            className="h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-md shadow-emerald-600/20"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            {selectedIds.length > 0
              ? tr(`Ligar Selecionados (${selectedIds.length})`, `Llamar Seleccionados (${selectedIds.length})`, `Appeler Sélectionnés (${selectedIds.length})`)
              : tr('Atender no Cockpit', 'Atender en Cockpit', 'Appeler dans le Cockpit')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hoje */}
        <div 
          onClick={() => { setStatusFilter(statusFilter === 'today' ? 'all' : 'today'); setViewMode('list'); }}
          className={`p-4 rounded-2xl bg-card border border-border shadow-sm cursor-pointer transition-all hover:border-amber-500/50 ${
            statusFilter === 'today' ? 'ring-2 ring-amber-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase">
              {tr('Agendados para Hoje', 'Agendados para Hoy', 'Planifiés Aujourd’hui')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{stats.todayCount}</span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
              {tr('Prioritários do dia', 'Prioritarios del día', 'Prioritaires du jour')}
            </span>
          </div>
        </div>

        {/* Atrasados */}
        <div 
          onClick={() => { setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue'); setViewMode('list'); }}
          className={`p-4 rounded-2xl bg-card border border-border shadow-sm cursor-pointer transition-all hover:border-rose-500/50 ${
            statusFilter === 'overdue' ? 'ring-2 ring-rose-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase">
              {tr('Atrasados / Pendentes', 'Atrasados / Pendientes', 'En Retard / En Attente')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.overdueCount}</span>
            <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
              {tr('Necessitam contato', 'Requieren contacto', 'Nécessitent un appel')}
            </span>
          </div>
        </div>

        {/* Próximos */}
        <div 
          onClick={() => { setStatusFilter(statusFilter === 'upcoming' ? 'all' : 'upcoming'); setViewMode('list'); }}
          className={`p-4 rounded-2xl bg-card border border-border shadow-sm cursor-pointer transition-all hover:border-indigo-500/50 ${
            statusFilter === 'upcoming' ? 'ring-2 ring-indigo-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase">
              {tr('Próximos Agendamentos', 'Próximos Agendamientos', 'Prochains Rendez-vous')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{stats.upcomingCount}</span>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
              {tr('Programados', 'Programados', 'Programmés')}
            </span>
          </div>
        </div>

        {/* Concluídos */}
        <div 
          onClick={() => { setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed'); setViewMode('list'); }}
          className={`p-4 rounded-2xl bg-card border border-border shadow-sm cursor-pointer transition-all hover:border-emerald-500/50 ${
            statusFilter === 'completed' ? 'ring-2 ring-emerald-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase">
              {tr('Atendidos / Concluídos', 'Atendidos / Completados', 'Traités / Terminés')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.completedCount}</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              {tr('Convertidos ou concluídos', 'Convertidos o completados', 'Convertis ou terminés')}
            </span>
          </div>
        </div>
      </div>

      {/* Tags Filter & Search Bar (Always visible in both Calendar & List modes) */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={tr(
                'Buscar por empresa, decisor, telefone, #tag ou anotação...',
                'Buscar por empresa, decisor, teléfono, #etiqueta o nota...',
                'Rechercher par entreprise, contact, téléphone, #tag ou note...'
              )}
              className="pl-8 h-9 text-xs bg-background border-input"
            />
          </div>

          {/* Selection Actions Banner */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAllFiltered}
              className="h-8 text-xs border-input gap-1.5"
            >
              <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
              {selectedIds.length > 0
                ? tr(`Selecionados: ${selectedIds.length}`, `Seleccionados: ${selectedIds.length}`, `Sélectionnés : ${selectedIds.length}`)
                : viewMode === 'calendar'
                ? tr('Selecionar Todos do Dia', 'Seleccionar Todos del Día', 'Tout Sélectionner (Jour)')
                : tr('Selecionar Todos Filtrados', 'Seleccionar Todos Filtrados', 'Tout Sélectionner (Filtrés)')}
            </Button>

            {selectedIds.length > 0 && (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleStartDialerBatch(selectedIds)}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  {tr(
                    `Ir para o Cockpit com ${selectedIds.length} Agendamento(s)`,
                    `Ir al Cockpit con ${selectedIds.length} Agendamiento(s)`,
                    `Ouvrir dans le Cockpit (${selectedIds.length})`
                  )}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleOpenCreateQueueModal(selectedIds)}
                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  {tr(
                    `Criar Fila de Trabalho (${selectedIds.length})`,
                    `Crear Cola de Trabajo (${selectedIds.length})`,
                    `Créer File de Travail (${selectedIds.length})`
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds([])}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  {tr('Limpar Seleção', 'Limpiar Selección', 'Effacer')}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tag Filter Pills + Create Custom Tag */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border">
          <span className="text-[11px] font-bold text-muted-foreground uppercase flex items-center gap-1 mr-1">
            <Tag className="w-3.5 h-3.5 text-indigo-500" />
            {tr('Filtrar por Tag:', 'Filtrar por Etiqueta:', 'Filtrer par Tag :')}
          </span>

          <button
            type="button"
            onClick={() => setTagFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              tagFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-muted/60 hover:bg-muted text-muted-foreground'
            }`}
          >
            {tr('Todas as Tags', 'Todas las Etiquetas', 'Tous les Tags')} ({scopedAgenda.length})
          </button>

          {allAvailableTags.map(([tag, count]) => {
            const isSelected = tagFilter.toLowerCase() === tag.toLowerCase();
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setTagFilter(isSelected ? 'all' : tag)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-bold'
                    : 'bg-background hover:bg-muted text-foreground border-border'
                }`}
              >
                <span>{tag}</span>
                <span className={`text-[10px] px-1 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                  {count}
                </span>
              </button>
            );
          })}

          {isAddingGlobalTag ? (
            <div className="flex items-center gap-1 ml-1">
              <Input
                value={newGlobalTagInput}
                onChange={e => setNewGlobalTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateGlobalCustomTag();
                  } else if (e.key === 'Escape') {
                    setIsAddingGlobalTag(false);
                  }
                }}
                placeholder={tr('Nome da tag...', 'Nombre de etiqueta...', 'Nom du tag...')}
                className="h-7 w-40 text-xs bg-background border-input"
                autoFocus
              />
              <Button
                type="button"
                size="sm"
                onClick={handleCreateGlobalCustomTag}
                className="h-7 px-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                <Check className="w-3 h-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingGlobalTag(false)}
                className="h-7 px-1.5 text-xs"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingGlobalTag(true)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold border border-dashed border-indigo-500/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" />
              {tr('Nova Tag', 'Nueva Etiqueta', 'Nouveau Tag')}
            </button>
          )}
        </div>
      </div>

      {/* View 1: Calendar View */}
      {viewMode === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Month Calendar (8 cols) */}
          <div className="lg:col-span-8 p-6 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            {/* Navigation */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-foreground capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()); }}
                  className="h-7 text-xs border-input"
                >
                  {tr('Hoje', 'Hoy', 'Aujourd’hui')}
                </Button>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground uppercase">
              {dayHeaders.map((dh, idx) => (
                <span key={idx}>{dh}</span>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[90px] rounded-xl bg-muted/10 border border-transparent" />
              ))}

              {daysInMonth.map(day => {
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const isDayToday = isToday(day);

                const dayAppointments = filteredAgenda.filter(item => {
                  if (!item.scheduled_for) return false;
                  return isSameDay(parseISO(item.scheduled_for), day);
                });

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={`min-h-[90px] p-2 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/5 shadow-sm'
                        : isDayToday
                        ? 'border-indigo-500/40 bg-indigo-500/5'
                        : 'border-border/60 bg-muted/20 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${
                        isDayToday 
                          ? 'w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black' 
                          : 'text-foreground'
                      }`}>
                        {format(day, 'd')}
                      </span>

                      {dayAppointments.length > 0 && (
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-amber-500 text-white">
                          {dayAppointments.length}
                        </span>
                      )}
                    </div>

                    {/* Mini Appointment Pills */}
                    <div className="space-y-1 mt-1 overflow-hidden">
                      {dayAppointments.slice(0, 2).map((apt, i) => (
                        <div
                          key={i}
                          onClick={(e) => { e.stopPropagation(); handleOpenEdit(apt); }}
                          className={`text-[10px] truncate px-1.5 py-0.5 rounded font-medium border flex items-center gap-1 ${
                            apt.priority === 'high'
                              ? 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300'
                              : 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300'
                          }`}
                          title={`${format(parseISO(apt.scheduled_for), 'HH:mm')} - ${apt.lead?.company_name || apt.lead?.name}`}
                        >
                          <Clock className="w-2.5 h-2.5 shrink-0" />
                          <span className="font-bold">{format(parseISO(apt.scheduled_for), 'HH:mm')}</span>
                          <span className="truncate">{apt.lead?.company_name || apt.lead?.name}</span>
                        </div>
                      ))}

                      {dayAppointments.length > 2 && (
                        <span className="text-[9px] text-muted-foreground font-semibold block text-center">
                          +{dayAppointments.length - 2} {tr('mais', 'más', 'de plus')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Agenda Side Panel (4 cols) */}
          <div className="lg:col-span-4 p-5 rounded-2xl bg-card border border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3 gap-2">
              <div>
                <h4 className="text-sm font-bold text-foreground capitalize">
                  {selectedDay
                    ? format(selectedDay, "EEEE, dd MMM", { locale: dateLocale })
                    : tr('Selecione um Dia', 'Seleccione un Día', 'Sélectionnez un Jour')}
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  {tr('Selecione clientes para ligar ou criar fila', 'Seleccione clientes para llamar o crear cola', 'Sélectionnez des clients à appeler ou mettre en file')}
                </p>
              </div>

              {selectedDayAppointments.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenCreateQueueModal(selectedDayAppointments.map(a => a.id))}
                    className="h-7 px-2 text-[11px] border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-bold gap-1"
                    title={tr('Criar Fila com os Agendamentos deste Dia', 'Crear Cola con los Agendamientos de este Día', 'Créer File avec les Rendez-vous du Jour')}
                  >
                    <Layers className="w-3 h-3" />
                    {tr('Criar Fila do Dia', 'Cola del Día', 'File du Jour')}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
              {selectedDayAppointments.map(item => {
                const isChecked = selectedIds.includes(item.id);
                const itemTags = extractTagsFromAppointment(item.tags, item.scheduled_notes);

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all space-y-3 ${
                      isChecked
                        ? 'bg-indigo-500/10 border-indigo-500 shadow-sm'
                        : 'bg-muted/40 border-border hover:border-amber-500/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectId(item.id)}
                          className="mt-0.5 text-indigo-600 dark:text-indigo-400 hover:scale-110 transition-transform"
                          title={tr('Selecionar agendamento', 'Seleccionar agendamiento', 'Sélectionner ce rendez-vous')}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 fill-indigo-600/20" />
                          ) : (
                            <Square className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">
                              {format(parseISO(item.scheduled_for), 'HH:mm')}
                            </span>
                            {item.priority === 'high' && (
                              <Badge className="bg-rose-500 text-white text-[9px] px-1 py-0">
                                🔥 {tr('Urgente', 'Urgente', 'Urgent')}
                              </Badge>
                            )}
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              item.assigned_to === user?.id 
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30' 
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              <User className="w-2.5 h-2.5" />
                              {item.assigned_to === user?.id 
                                ? tr('Você', 'Tú', 'Vous')
                                : (item.assigned_user?.display_name || tr('Equipe Geral', 'Equipo General', 'Équipe'))}
                            </span>
                          </div>
                          <h5 className="text-sm font-bold text-foreground mt-0.5">
                            {item.lead?.company_name || item.lead?.name}
                          </h5>
                          <p className="text-[11px] text-muted-foreground">
                            {item.lead?.name || tr('Responsável', 'Responsable', 'Responsable')} • {item.lead?.city || tr('Espanha', 'España', 'Espagne')}
                          </p>
                          {(item.campaign?.title || item.origin_campaign_title) && (
                            <p className="text-[10px] text-muted-foreground/80 mt-0.5 flex items-center gap-1">
                              <Layers className="w-2.5 h-2.5 text-indigo-400" />
                              {item.campaign?.title || `${item.origin_campaign_title} (${tr('Preservado', 'Preservado', 'Conservé')})`}
                            </p>
                          )}
                        </div>
                      </div>

                      <Badge className="bg-muted text-muted-foreground text-[10px] uppercase">
                        {item.status}
                      </Badge>
                    </div>

                    {/* Tags Badges */}
                    {itemTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {itemTags.map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setTagFilter(tagFilter === tag ? 'all' : tag)}
                            className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[10px] font-bold flex items-center gap-1 hover:bg-indigo-500/25 transition-colors"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Phone & contact */}
                    {item.lead?.phone && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                        <span className="font-mono font-semibold text-foreground">{item.lead.phone}</span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(item.lead!.phone!);
                              toast.success(tr('Telefone copiado!', '¡Teléfono copiado!', 'Téléphone copié !'));
                            }}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Notes preview */}
                    {item.scheduled_notes && (
                      <div 
                        className="text-[11px] p-2 rounded-lg bg-background/80 border border-border text-foreground/90 leading-relaxed max-h-20 overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: item.scheduled_notes }}
                      />
                    )}

                    {/* Quick actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(item)}
                        className="h-7 text-xs border-input gap-1"
                      >
                        <Edit3 className="w-3 h-3" /> {tr('Editar / Tags', 'Editar / Tags', 'Modifier / Tags')}
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleStartDialer(item)}
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1 shadow-sm"
                      >
                        <PhoneCall className="w-3 h-3" /> {tr('Atender no Discador', 'Atender en Marcador', 'Appeler dans le Dialer')}
                      </Button>
                    </div>
                  </div>
                );
              })}

              {selectedDay && selectedDayAppointments.length === 0 && (
                <div className="p-8 text-center rounded-xl border border-dashed border-border space-y-2">
                  <CalendarDays className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    {tr('Nenhum compromisso agendado para este dia.', 'Ningún compromiso agendado para este día.', 'Aucun rendez-vous planifié pour ce jour.')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View 2: List / Table View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Status & Priority Sub-Filter Bar */}
          <div className="p-3.5 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-muted/60 p-0.5 rounded-xl flex items-center border border-border">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${statusFilter === 'all' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  {tr('Todos', 'Todos', 'Tous')} ({scopedAgenda.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('today')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${statusFilter === 'today' ? 'bg-amber-500 text-white' : 'text-muted-foreground'}`}
                >
                  {tr('Hoje', 'Hoy', 'Aujourd’hui')} ({stats.todayCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('overdue')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${statusFilter === 'overdue' ? 'bg-rose-500 text-white' : 'text-muted-foreground'}`}
                >
                  {tr('Atrasados', 'Atrasados', 'En Retard')} ({stats.overdueCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('upcoming')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${statusFilter === 'upcoming' ? 'bg-indigo-500 text-white' : 'text-muted-foreground'}`}
                >
                  {tr('Próximos', 'Próximos', 'À Venir')} ({stats.upcomingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('completed')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${statusFilter === 'completed' ? 'bg-emerald-500 text-white' : 'text-muted-foreground'}`}
                >
                  {tr('Concluídos', 'Completados', 'Terminés')} ({stats.completedCount})
                </button>
              </div>
            </div>

            {/* Priority filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-semibold">
                {tr('Prioridade:', 'Prioridad:', 'Priorité :')}
              </span>
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="h-8 rounded-lg bg-background border border-input text-foreground text-xs px-2"
              >
                <option value="all">{tr('Todas as Prioridades', 'Todas las Prioridades', 'Toutes les Priorités')}</option>
                <option value="high">🔥 {tr('Alta Prioridade / Urgente', 'Alta Prioridad / Urgente', 'Haute Priorité / Urgent')}</option>
                <option value="normal">⚡ Normal</option>
                <option value="low">⏳ {tr('Baixa', 'Baja', 'Basse')}</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-3 w-10 text-center">
                      <button
                        type="button"
                        onClick={handleSelectAllFiltered}
                        className="text-indigo-600 dark:text-indigo-400"
                        title={tr('Selecionar Todos', 'Seleccionar Todos', 'Tout Sélectionner')}
                      >
                        {filteredAgenda.length > 0 && filteredAgenda.every(it => selectedIds.includes(it.id)) ? (
                          <CheckSquare className="w-4 h-4 mx-auto" />
                        ) : (
                          <Square className="w-4 h-4 mx-auto text-muted-foreground" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-4">{tr('Data & Horário', 'Fecha y Hora', 'Date & Heure')}</th>
                    <th className="py-3 px-4">{tr('Empresa & Origem', 'Empresa y Origen', 'Entreprise & Origine')}</th>
                    <th className="py-3 px-4">{tr('Contato & Telefone', 'Contacto y Teléfono', 'Contact & Téléphone')}</th>
                    <th className="py-3 px-4">{tr('Tags & Prioridade', 'Etiquetas y Prioridad', 'Tags & Priorité')}</th>
                    <th className="py-3 px-4">{tr('Observações do Agendamento', 'Observaciones del Agendamiento', 'Notes du Rendez-vous')}</th>
                    <th className="py-3 px-4">{tr('Operador', 'Operador', 'Opérateur')}</th>
                    <th className="py-3 px-4 text-right">{tr('Ações', 'Acciones', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {filteredAgenda.map(item => {
                    const date = parseISO(item.scheduled_for);
                    const isDueToday = isToday(date);
                    const isOverdue = isBefore(date, todayStart) && item.status === 'scheduled';
                    const isChecked = selectedIds.includes(item.id);
                    const itemTags = extractTagsFromAppointment(item.tags, item.scheduled_notes);

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isChecked ? 'bg-indigo-500/10' : 'hover:bg-muted/30'
                        }`}
                      >
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectId(item.id)}
                            className="text-indigo-600 dark:text-indigo-400"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 mx-auto fill-indigo-600/20" />
                            ) : (
                              <Square className="w-4 h-4 mx-auto text-muted-foreground" />
                            )}
                          </button>
                        </td>

                        <td className="py-3.5 px-4 font-mono">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">
                              {format(date, "dd/MM/yyyy '•' HH:mm")}
                            </span>
                            {isDueToday && (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                ⏰ {tr('É HOJE', 'ES HOY', 'AUJOURD’HUI')}
                              </span>
                            )}
                            {isOverdue && (
                              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                🚨 {tr('ATRASADO', 'ATRASADO', 'EN RETARD')}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-foreground">{item.lead?.company_name || item.lead?.name}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-500" />
                            {item.lead?.city || tr('Espanha', 'España', 'Espagne')} • {item.lead?.sector || tr('Geral', 'General', 'Général')}
                          </div>
                          {(item.campaign?.title || item.origin_campaign_title) && (
                            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium mt-0.5 flex items-center gap-1">
                              <Layers className="w-2.5 h-2.5" />
                              {item.campaign?.title || `${item.origin_campaign_title} (${tr('Preservado', 'Preservado', 'Conservé')})`}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-foreground font-medium">{item.lead?.name || tr('Decisor', 'Decisor', 'Décideur')}</div>
                          <div className="text-muted-foreground font-mono text-[11px]">{item.lead?.phone || tr('Sem telefone', 'Sin teléfono', 'Sans téléphone')}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge className={
                              item.priority === 'high' 
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[10px]' 
                                : item.priority === 'low'
                                ? 'bg-muted text-muted-foreground text-[10px]'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px]'
                            }>
                              {item.priority === 'high'
                                ? `🔥 ${tr('Alta', 'Alta', 'Haute')}`
                                : item.priority === 'low'
                                ? `⏳ ${tr('Baixa', 'Baja', 'Basse')}`
                                : '⚡ Normal'}
                            </Badge>

                            {itemTags.map(tag => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => setTagFilter(tagFilter === tag ? 'all' : tag)}
                                className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[10px] font-bold hover:bg-indigo-500/25"
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          {item.scheduled_notes ? (
                            <div 
                              className="text-[11px] text-foreground/90 line-clamp-2"
                              dangerouslySetInnerHTML={{ __html: item.scheduled_notes }}
                            />
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">
                              {tr('Sem anotações', 'Sin notas', 'Sans notes')}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs">
                          <span className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-md text-[11px] ${
                            item.assigned_to === user?.id
                              ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30'
                              : 'text-foreground bg-muted/60'
                          }`}>
                            <User className="w-3 h-3" />
                            {item.assigned_to === user?.id
                              ? tr('Você', 'Tú', 'Vous')
                              : (item.assigned_user?.display_name || tr('Equipe Geral', 'Equipo General', 'Équipe'))}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleStartDialer(item)}
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1 shadow-sm"
                              title={tr('Abrir no Cockpit do Discador com este cliente selecionado', 'Abrir en el Cockpit del Marcador con este cliente seleccionado', 'Ouvrir dans le Cockpit Dialer')}
                            >
                              <PhoneCall className="w-3 h-3" /> {tr('Atender', 'Atender', 'Appeler')}
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(item)}
                              className="h-7 text-xs border-input"
                              title={tr('Editar / Tags / Reagendar', 'Editar / Etiquetas / Reagendar', 'Modifier / Tags / Replanifier')}
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>

                            {item.status === 'scheduled' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkCompleted(item.id)}
                                className="h-7 text-xs text-emerald-600 hover:bg-emerald-500/10"
                                title={tr('Marcar como Concluído', 'Marcar como Completado', 'Marquer comme Terminé')}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelAppointment(item.id)}
                              className="h-7 text-xs text-muted-foreground hover:text-rose-500"
                              title={tr('Cancelar Agendamento', 'Cancelar Agendamiento', 'Annuler le Rendez-vous')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredAgenda.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-muted-foreground text-xs">
                        {tr(
                          'Nenhum agendamento encontrado com os filtros selecionados.',
                          'Ningún agendamiento encontrado con los filtros seleccionados.',
                          'Aucun rendez-vous trouvé avec les filtres sélectionnés.'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Full Edit / Reschedule + Tags Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto bg-card border-border text-foreground p-0 shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  {tr('Editar / Reagendar Retorno & Tags', 'Editar / Reagendar Retorno y Etiquetas', 'Modifier / Replanifier le Rappel & Tags')}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {editingItem
                    ? `${tr('Empresa:', 'Empresa:', 'Entreprise :')} ${editingItem.lead?.company_name || editingItem.lead?.name}`
                    : tr('Ajuste a data, horário, tags e instruções', 'Ajuste la fecha, hora, etiquetas e instrucciones', 'Ajustez la date, l’heure, les tags et les instructions')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  {tr('Nova Data do Retorno', 'Nueva Fecha del Retorno', 'Nouvelle Date du Rappel')}
                </Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  required
                  className="bg-background border-input text-foreground text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  {tr('Novo Horário', 'Nueva Hora', 'Nouvelle Heure')}
                </Label>
                <Input
                  type="time"
                  value={editTime}
                  onChange={e => setEditTime(e.target.value)}
                  required
                  className="bg-background border-input text-foreground text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  {tr('Nível de Prioridade', 'Nivel de Prioridad', 'Niveau de Priorité')}
                </Label>
                <select
                  value={editPriority}
                  onChange={(e: any) => setEditPriority(e.target.value)}
                  className="w-full h-9 rounded-lg bg-background border border-input text-foreground text-xs px-2"
                >
                  <option value="high">🔥 {tr('Alta Prioridade / Urgente', 'Alta Prioridad / Urgente', 'Haute Priorité / Urgent')}</option>
                  <option value="normal">⚡ Normal</option>
                  <option value="low">⏳ {tr('Baixa', 'Baja', 'Basse')}</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  {tr('Operador Responsável', 'Operador Responsable', 'Opérateur Responsable')}
                </Label>
                <select
                  value={editAssignedTo}
                  onChange={e => setEditAssignedTo(e.target.value)}
                  className="w-full h-9 rounded-lg bg-background border border-input text-foreground text-xs px-2"
                >
                  {user && (
                    <option value={user.id}>👤 {tr('Atribuir a Mim (Você)', 'Asignarme a Mí (Tú)', 'M’attribuer (Vous)')}</option>
                  )}
                  {salespeople
                    .filter(sp => sp.id !== user?.id)
                    .map(sp => (
                      <option key={sp.id} value={sp.id}>{sp.display_name}</option>
                    ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                {tr('Status do Agendamento', 'Estado del Agendamiento', 'Statut du Rendez-vous')}
              </Label>
              <select
                value={editStatus}
                onChange={e => setEditStatus(e.target.value)}
                className="w-full h-9 rounded-lg bg-background border border-input text-foreground text-xs px-2"
              >
                <option value="scheduled">📅 {tr('Agendado / Pendente', 'Agendado / Pendiente', 'Planifié / En Attente')}</option>
                <option value="converted">🎉 {tr('Concluído / Atendido com Sucesso', 'Completado / Atendido con Éxito', 'Terminé / Traité avec Succès')}</option>
                <option value="no_answer">📞 {tr('Tentado / Sem Resposta', 'Intentado / Sin Respuesta', 'Tenté / Sans Réponse')}</option>
                <option value="pending">🔄 {tr('Retornar à Fila Geral', 'Devolver a la Cola General', 'Remettre dans la File Générale')}</option>
              </select>
            </div>

            {/* Structured Tags Manager in Edit Modal */}
            <div className="p-3.5 rounded-xl bg-muted/30 border border-border space-y-2.5">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-500" />
                {tr('Tags do Agendamento (Para Achar e Filtrar na Agenda)', 'Etiquetas del Agendamiento', 'Tags du Rendez-vous')}
              </Label>

              <div className="flex items-center gap-1.5">
                <Input
                  value={editCustomTagInput}
                  onChange={e => setEditCustomTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddEditCustomTag();
                    }
                  }}
                  placeholder={tr('Criar nova tag personalizada (ex: Obra Bilbao, Ligar Sexta)...', 'Crear nueva etiqueta personalizada...', 'Créer un nouveau tag personnalisé...')}
                  className="h-8 text-xs bg-background border-input"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddEditCustomTag}
                  disabled={!editCustomTagInput.trim()}
                  className="h-8 px-3 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {tr('Criar Tag', 'Crear Tag', 'Créer Tag')}
                </Button>
              </div>

              {editTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {editTags.map(t => (
                    <Badge
                      key={t}
                      onClick={() => setEditTags(prev => prev.filter(x => x !== t))}
                      className="bg-indigo-600 text-white hover:bg-indigo-500 text-[11px] font-bold px-2 py-0.5 flex items-center gap-1 cursor-pointer"
                    >
                      {t}
                      <X className="w-3 h-3" />
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 pt-1">
                {Array.from(new Set([...quickTags, ...savedCustomTags])).map(tagText => {
                  const cleanTag = `#${tagText.replace(/^#+/, '').trim()}`;
                  const isActive = editTags.includes(cleanTag);
                  return (
                    <button
                      key={tagText}
                      type="button"
                      onClick={() => handleToggleEditTag(tagText)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium border transition-colors ${
                        isActive
                          ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500 font-bold'
                          : 'bg-background hover:bg-muted text-foreground border-border'
                      }`}
                    >
                      {isActive ? `✓ ${cleanTag}` : `+ ${cleanTag}`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                {tr(
                  'Instruções & Observações do Agendamento (Rich Text)',
                  'Instrucciones y Observaciones del Agendamiento (Rich Text)',
                  'Instructions & Observations du Rendez-vous (Rich Text)'
                )}
              </Label>
              <div className="rounded-2xl border border-border bg-background shadow-sm overflow-hidden flex flex-col">
                {/* Formatting Toolbar */}
                <div className="p-2 border-b border-border bg-muted/40 flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFormatEditCommand('bold')}
                    className="h-7 w-7 p-0 text-foreground hover:bg-muted"
                    title="Bold"
                  >
                    <Bold className="w-3.5 h-3.5 font-bold" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFormatEditCommand('italic')}
                    className="h-7 w-7 p-0 text-foreground hover:bg-muted"
                    title="Italic"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFormatEditCommand('underline')}
                    className="h-7 w-7 p-0 text-foreground hover:bg-muted"
                    title="Underline"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFormatEditCommand('insertUnorderedList')}
                    className="h-7 w-7 p-0 text-foreground hover:bg-muted"
                    title="List"
                  >
                    <List className="w-3.5 h-3.5" />
                  </Button>

                  <div className="h-4 w-px bg-border mx-1" />

                  {/* Color Highlighters */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleHighlightEditColor('#fef08a', '#854d0e')}
                      className="w-5 h-5 rounded-full bg-yellow-300 border border-yellow-500 hover:scale-110 transition-transform"
                    />
                    <button
                      type="button"
                      onClick={() => handleHighlightEditColor('#bbf7d0', '#166534')}
                      className="w-5 h-5 rounded-full bg-emerald-300 border border-emerald-500 hover:scale-110 transition-transform"
                    />
                    <button
                      type="button"
                      onClick={() => handleHighlightEditColor('#fecdd3', '#9f1239')}
                      className="w-5 h-5 rounded-full bg-rose-300 border border-rose-500 hover:scale-110 transition-transform"
                    />
                    <button
                      type="button"
                      onClick={() => handleHighlightEditColor('#bfdbfe', '#1e40af')}
                      className="w-5 h-5 rounded-full bg-blue-300 border border-blue-500 hover:scale-110 transition-transform"
                    />
                  </div>
                </div>

                {/* Editable Area */}
                <div
                  ref={editEditorRef}
                  contentEditable
                  onInput={() => {
                    if (editEditorRef.current) setEditNotes(editEditorRef.current.innerHTML);
                  }}
                  className="p-3.5 min-h-[120px] max-h-[200px] overflow-y-auto text-xs text-foreground leading-relaxed focus:outline-none"
                />
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-border bg-muted/20 flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="border-input text-xs"
              >
                {tr('Cancelar', 'Cancelar', 'Annuler')}
              </Button>

              <Button
                type="submit"
                disabled={isUpdatingAppointment}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-5 gap-1.5 shadow-md shadow-amber-600/20"
              >
                <Check className="w-4 h-4" /> {tr('Salvar Alterações', 'Guardar Cambios', 'Enregistrer les Modifications')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Create Work Queue (dialer_campaigns) from Selected Agenda Appointments */}
      <Dialog open={isCreateQueueModalOpen} onOpenChange={setIsCreateQueueModalOpen}>
        <DialogContent className="sm:max-w-lg bg-card border-border text-foreground p-0 shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  {tr(
                    'Criar Fila de Trabalho a partir da Agenda',
                    'Crear Cola de Trabajo desde la Agenda',
                    'Créer une File de Travail depuis l’Agenda'
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {tr(
                    `${queueTargetIds.length} agendamento(s) serão agrupados em um novo Trabalho no Power Dialer mantendo suas datas, notas e tags.`,
                    `${queueTargetIds.length} agendamiento(s) se agruparán en un nuevo Trabajo en el Power Dialer manteniendo sus fechas, notas y etiquetas.`,
                    `${queueTargetIds.length} rendez-vous seront regroupés dans un nouveau Lot Power Dialer en conservant dates, notes et tags.`
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                {tr('Nome da Nova Fila / Trabalho', 'Nombre de la Nueva Cola / Trabajo', 'Nom de la Nouvelle File / Lot')}
              </Label>
              <Input
                value={newQueueTitle}
                onChange={e => setNewQueueTitle(e.target.value)}
                placeholder={tr('Ex: Retornos Agendados - Orçamentos Pendentes', 'Ej: Seguimientos Agendados - Presupuestos', 'Ex: Rappels Planifiés')}
                className="bg-background border-input text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                {tr('Descrição / Objetivo (Opcional)', 'Descripción / Objetivo (Opcional)', 'Description / Objectif (Optionnel)')}
              </Label>
              <Input
                value={newQueueDescription}
                onChange={e => setNewQueueDescription(e.target.value)}
                placeholder={tr('Ex: Clientes que pediram retorno esta semana', 'Ej: Clientes que pidieron llamada esta semana', 'Ex: Clients à rappeler cette semaine')}
                className="bg-background border-input text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  {tr('Operador Responsável', 'Operador Responsable', 'Opérateur Responsable')}
                </Label>
                <select
                  value={newQueueAssignedTo}
                  onChange={e => setNewQueueAssignedTo(e.target.value)}
                  className="w-full h-9 rounded-lg bg-background border border-input text-foreground text-xs px-2"
                >
                  {user && (
                    <option value={user.id}>👤 {tr('Atribuir a Mim (Você)', 'Asignarme a Mí (Tú)', 'M’attribuer (Vous)')}</option>
                  )}
                  {salespeople
                    .filter(sp => sp.id !== user?.id)
                    .map(sp => (
                      <option key={sp.id} value={sp.id}>{sp.display_name}</option>
                    ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">
                  {tr('Script de Abordagem', 'Guion de Abordaje', 'Script d’Appel')}
                </Label>
                <select
                  value={newQueueScriptId}
                  onChange={e => setNewQueueScriptId(e.target.value)}
                  className="w-full h-9 rounded-lg bg-background border border-input text-foreground text-xs px-2"
                >
                  <option value="">{tr('Padrão / Sem Script Fixo', 'Estándar / Sin Guion Fijo', 'Standard / Sans Script')}</option>
                  {scripts.map(sc => (
                    <option key={sc.id} value={sc.id}>{sc.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-border bg-muted/20 flex flex-wrap justify-between items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateQueueModalOpen(false)}
              className="border-input text-xs"
            >
              {tr('Cancelar', 'Cancelar', 'Annuler')}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isCreatingCampaignFromAgenda || !newQueueTitle.trim()}
                onClick={() => handleConfirmCreateQueueFromAgenda(false)}
                className="border-indigo-500/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold"
              >
                <Layers className="w-3.5 h-3.5 mr-1.5" />
                {tr('Apenas Criar Fila', 'Solo Crear Cola', 'Créer la File Seule')}
              </Button>

              <Button
                type="button"
                disabled={isCreatingCampaignFromAgenda || !newQueueTitle.trim()}
                onClick={() => handleConfirmCreateQueueFromAgenda(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                {tr('Criar Fila & Ligar no Cockpit', 'Crear Cola y Llamar en Cockpit', 'Créer File & Appeler')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
