import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarDays, 
  Clock, 
  Flame, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Calendar as CalendarIcon, 
  ListFilter, 
  ChevronLeft, 
  ChevronRight, 
  Phone, 
  PhoneCall, 
  Copy, 
  MessageSquare, 
  Edit3, 
  Trash2, 
  Check, 
  Play, 
  Users, 
  Sparkles,
  Building,
  MapPin,
  ExternalLink,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  isPast, 
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
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useDialerAgenda, useMutateDialer, type ScheduledAppointmentItem } from './hooks/useDialer';
import { useSalespeople } from './hooks/useLeads';

export function DialerAgendaPage() {
  const navigate = useNavigate();
  const { data: agenda = [], isLoading } = useDialerAgenda();
  const { data: salespeople = [] } = useSalespeople();
  const { updateAppointment, deleteAppointment, isUpdatingAppointment } = useMutateDialer();

  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [statusFilter, setStatusFilter] = useState<'all' | 'today' | 'overdue' | 'upcoming' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
  const [editAssignedTo, setEditAssignedTo] = useState('');
  const [editStatus, setEditStatus] = useState('scheduled');

  // KPI Calculations
  const todayStart = startOfToday();

  const stats = useMemo(() => {
    let todayCount = 0;
    let overdueCount = 0;
    let upcomingCount = 0;
    let completedCount = 0;

    agenda.forEach(item => {
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

    return { todayCount, overdueCount, upcomingCount, completedCount, total: agenda.length };
  }, [agenda, todayStart]);

  // Filtered List
  const filteredAgenda = useMemo(() => {
    return agenda.filter(item => {
      if (!item.scheduled_for) return false;
      const date = parseISO(item.scheduled_for);

      // Status filter
      if (statusFilter === 'today' && !isToday(date)) return false;
      if (statusFilter === 'overdue' && (!isBefore(date, todayStart) || item.status !== 'scheduled')) return false;
      if (statusFilter === 'upcoming' && !isFuture(date)) return false;
      if (statusFilter === 'completed' && !['converted', 'completed'].includes(item.status)) return false;

      // Priority filter
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const company = (item.lead?.company_name || item.lead?.name || '').toLowerCase();
        const contact = (item.lead?.name || '').toLowerCase();
        const phone = (item.lead?.phone || '').toLowerCase();
        const notes = (item.scheduled_notes || '').toLowerCase();
        if (!company.includes(query) && !contact.includes(query) && !phone.includes(query) && !notes.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [agenda, statusFilter, priorityFilter, searchQuery, todayStart]);

  // Calendar calculations
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);
  const startOffset = (startDayOfWeek + 6) % 7; // Monday start

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
    setEditNotes(item.scheduled_notes || '');
    setEditAssignedTo(item.assigned_to || '');
    setEditStatus(item.status || 'scheduled');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const combinedIso = new Date(`${editDate}T${editTime}:00`).toISOString();
      await updateAppointment({
        queueItemId: editingItem.id,
        scheduled_for: combinedIso,
        scheduled_notes: editNotes,
        priority: editPriority,
        status: editStatus,
        assigned_to: editAssignedTo || null,
      });

      toast.success('Agendamento atualizado com sucesso!');
      setIsEditModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar agendamento');
    }
  };

  const handleCancelAppointment = async (queueItemId: string) => {
    if (!confirm('Deseja cancelar este agendamento de retorno?')) return;
    try {
      await deleteAppointment(queueItemId);
      toast.success('Agendamento cancelado com sucesso.');
    } catch (err: any) {
      toast.error('Erro ao cancelar agendamento');
    }
  };

  const handleMarkCompleted = async (queueItemId: string) => {
    try {
      await updateAppointment({
        queueItemId,
        status: 'converted',
      });
      toast.success('Agendamento marcado como concluído!');
    } catch (err: any) {
      toast.error('Erro ao concluir agendamento');
    }
  };

  const handleStartDialer = (item: ScheduledAppointmentItem) => {
    navigate(`/comercial/discador?campaignId=${item.campaign_id}&queueItemId=${item.id}`);
  };

  return (
    <div className="flex flex-col space-y-6 p-4 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
              Minha Agenda & Retornos (Callbacks)
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs">
                SDR & Telemarketing
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground">
              Acompanhe, reagende e atenda todos os retornos marcados com decisores de compras e engenheiros.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
              <CalendarIcon className="w-3.5 h-3.5 text-amber-500" /> Modo Calendário
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('list')}
              className={`h-8 text-xs font-semibold gap-1.5 rounded-lg ${
                viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5 text-indigo-500" /> Modo Lista ({agenda.length})
            </Button>
          </div>

          <Button
            size="sm"
            onClick={() => navigate('/comercial/discador')}
            className="h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-md shadow-emerald-600/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Abrir Cockpit Discador
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hoje */}
        <div 
          onClick={() => { setStatusFilter('today'); setViewMode('list'); }}
          className={`p-4 rounded-2xl bg-card border border-border shadow-sm cursor-pointer transition-all hover:border-amber-500/50 ${
            statusFilter === 'today' ? 'ring-2 ring-amber-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase">Agendados para Hoje</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{stats.todayCount}</span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">Prioritários do dia</span>
          </div>
        </div>

        {/* Atrasados */}
        <div 
          onClick={() => { setStatusFilter('overdue'); setViewMode('list'); }}
          className={`p-4 rounded-2xl bg-card border border-border shadow-sm cursor-pointer transition-all hover:border-rose-500/50 ${
            statusFilter === 'overdue' ? 'ring-2 ring-rose-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase">Atrasados / Pendentes</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{stats.overdueCount}</span>
            <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">Necessitam contato</span>
          </div>
        </div>

        {/* Próximos 7 Dias */}
        <div 
          onClick={() => { setStatusFilter('upcoming'); setViewMode('list'); }}
          className={`p-4 rounded-2xl bg-card border border-border shadow-sm cursor-pointer transition-all hover:border-indigo-500/50 ${
            statusFilter === 'upcoming' ? 'ring-2 ring-indigo-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase">Próximos 7 Dias</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground">{stats.upcomingCount}</span>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">Programados</span>
          </div>
        </div>

        {/* Concluídos */}
        <div 
          onClick={() => { setStatusFilter('completed'); setViewMode('list'); }}
          className={`p-4 rounded-2xl bg-card border border-border shadow-sm cursor-pointer transition-all hover:border-emerald-500/50 ${
            statusFilter === 'completed' ? 'ring-2 ring-emerald-500' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase">Atendidos / Concluídos</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.completedCount}</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Convertidos ou concluídos</span>
          </div>
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
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()); }}
                  className="h-7 text-xs border-input"
                >
                  Hoje
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
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sáb</span>
              <span>Dom</span>
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[90px] rounded-xl bg-muted/10 border border-transparent" />
              ))}

              {daysInMonth.map(day => {
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const isDayToday = isToday(day);

                // Find appointments on this day
                const dayAppointments = agenda.filter(item => {
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
                          +{dayAppointments.length - 2} mais
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
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h4 className="text-sm font-bold text-foreground capitalize">
                  {selectedDay ? format(selectedDay, "EEEE, dd 'de' MMMM", { locale: ptBR }) : 'Selecione um Dia'}
                </h4>
                <p className="text-[11px] text-muted-foreground">Compromissos agendados para este dia</p>
              </div>

              {selectedDay && (
                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs">
                  {agenda.filter(it => it.scheduled_for && isSameDay(parseISO(it.scheduled_for), selectedDay)).length} Agendados
                </Badge>
              )}
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {agenda
                .filter(it => it.scheduled_for && selectedDay && isSameDay(parseISO(it.scheduled_for), selectedDay))
                .map(item => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-muted/40 border border-border hover:border-amber-500/50 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400 font-mono">
                            {format(parseISO(item.scheduled_for), 'HH:mm')}
                          </span>
                          {item.priority === 'high' && (
                            <Badge className="bg-rose-500 text-white text-[9px] px-1 py-0">🔥 Urgente</Badge>
                          )}
                        </div>
                        <h5 className="text-sm font-bold text-foreground mt-0.5">
                          {item.lead?.company_name || item.lead?.name}
                        </h5>
                        <p className="text-[11px] text-muted-foreground">
                          {item.lead?.name || 'Responsável'} • {item.lead?.city || 'Espanha'}
                        </p>
                      </div>

                      <Badge className="bg-muted text-muted-foreground text-[10px] uppercase">
                        {item.status}
                      </Badge>
                    </div>

                    {/* Phone & contact */}
                    {item.lead?.phone && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                        <span className="font-mono">{item.lead.phone}</span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(item.lead!.phone!);
                              toast.success('Telefone copiado!');
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
                        <Edit3 className="w-3 h-3" /> Editar
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleStartDialer(item)}
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1 shadow-sm"
                      >
                        <PhoneCall className="w-3 h-3" /> Atender no Discador
                      </Button>
                    </div>
                  </div>
                ))}

              {selectedDay && agenda.filter(it => it.scheduled_for && isSameDay(parseISO(it.scheduled_for), selectedDay)).length === 0 && (
                <div className="p-8 text-center rounded-xl border border-dashed border-border space-y-2">
                  <CalendarDays className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs text-muted-foreground">Nenhum compromisso agendado para este dia.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View 2: List / Table View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar empresa, contato ou nota..."
                  className="pl-8 h-8 text-xs bg-background border-input"
                />
              </div>

              {/* Status pills */}
              <div className="bg-muted/60 p-0.5 rounded-xl flex items-center border border-border">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${statusFilter === 'all' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  Todos ({agenda.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('today')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${statusFilter === 'today' ? 'bg-amber-500 text-white' : 'text-muted-foreground'}`}
                >
                  Hoje ({stats.todayCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('overdue')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${statusFilter === 'overdue' ? 'bg-rose-500 text-white' : 'text-muted-foreground'}`}
                >
                  Atrasados ({stats.overdueCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('upcoming')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${statusFilter === 'upcoming' ? 'bg-indigo-500 text-white' : 'text-muted-foreground'}`}
                >
                  Próximos ({stats.upcomingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('completed')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${statusFilter === 'completed' ? 'bg-emerald-500 text-white' : 'text-muted-foreground'}`}
                >
                  Concluídos ({stats.completedCount})
                </button>
              </div>
            </div>

            {/* Priority filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-semibold">Prioridade:</span>
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="h-8 rounded-lg bg-background border border-input text-foreground text-xs px-2"
              >
                <option value="all">Todas as Prioridades</option>
                <option value="high">🔥 Alta Prioridade / Urgente</option>
                <option value="normal">⚡ Normal</option>
                <option value="low">⏳ Baixa</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    <th className="py-3 px-4">Data & Horário</th>
                    <th className="py-3 px-4">Empresa & Cidade</th>
                    <th className="py-3 px-4">Contato & Telefone</th>
                    <th className="py-3 px-4">Prioridade</th>
                    <th className="py-3 px-4">Observações do Agendamento</th>
                    <th className="py-3 px-4">Operador</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {filteredAgenda.map(item => {
                    const date = parseISO(item.scheduled_for);
                    const isDueToday = isToday(date);
                    const isOverdue = isBefore(date, todayStart) && item.status === 'scheduled';

                    return (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono">
                          <div className="flex flex-col">
                            <span className="font-bold text-foreground">
                              {format(date, "dd/MM/yyyy 'às' HH:mm")}
                            </span>
                            {isDueToday && (
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                ⏰ É HOJE
                              </span>
                            )}
                            {isOverdue && (
                              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                🚨 ATRASADO
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-foreground">{item.lead?.company_name || item.lead?.name}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-500" />
                            {item.lead?.city || 'Espanha'} • {item.lead?.sector || 'Geral'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-foreground font-medium">{item.lead?.name || 'Decisor'}</div>
                          <div className="text-muted-foreground font-mono text-[11px]">{item.lead?.phone || 'Sem telefone'}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge className={
                            item.priority === 'high' 
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' 
                              : item.priority === 'low'
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          }>
                            {item.priority === 'high' ? '🔥 Alta' : item.priority === 'low' ? '⏳ Baixa' : '⚡ Normal'}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          {item.scheduled_notes ? (
                            <div 
                              className="text-[11px] text-foreground/90 line-clamp-2"
                              dangerouslySetInnerHTML={{ __html: item.scheduled_notes }}
                            />
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">Sem anotações</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-xs">
                          <span className="text-foreground font-medium">
                            {item.assigned_user?.display_name || 'Equipe Geral'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge className="bg-muted text-foreground text-[10px] uppercase">
                            {item.status}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => handleStartDialer(item)}
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1 shadow-sm"
                              title="Abrir no Cockpit do Discador"
                            >
                              <PhoneCall className="w-3 h-3" /> Atender
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(item)}
                              className="h-7 text-xs border-input"
                              title="Editar / Reagendar"
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>

                            {item.status === 'scheduled' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkCompleted(item.id)}
                                className="h-7 text-xs text-emerald-600 hover:bg-emerald-500/10"
                                title="Marcar como Concluído"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelAppointment(item.id)}
                              className="h-7 text-xs text-muted-foreground hover:text-rose-500"
                              title="Cancelar Agendamento"
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
                        Nenhum agendamento encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Full Edit / Reschedule Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-2xl bg-card border-border text-foreground p-0 shadow-2xl">
          <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  Editar / Reagendar Retorno Comercial
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {editingItem ? `Empresa: ${editingItem.lead?.company_name || editingItem.lead?.name}` : 'Ajuste a data, horário e instruções'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Nova Data do Retorno</Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                  required
                  className="bg-background border-input text-foreground text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Novo Horário</Label>
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
                <Label className="text-xs font-bold text-foreground">Nível de Prioridade</Label>
                <select
                  value={editPriority}
                  onChange={(e: any) => setEditPriority(e.target.value)}
                  className="w-full h-9 rounded-lg bg-background border border-input text-foreground text-xs px-2"
                >
                  <option value="high">🔥 Alta Prioridade / Urgente</option>
                  <option value="normal">⚡ Normal</option>
                  <option value="low">⏳ Baixa</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Operador Responsável</Label>
                <select
                  value={editAssignedTo}
                  onChange={e => setEditAssignedTo(e.target.value)}
                  className="w-full h-9 rounded-lg bg-background border border-input text-foreground text-xs px-2"
                >
                  <option value="">Equipe Geral (Qualquer operador)</option>
                  {salespeople.map(sp => (
                    <option key={sp.id} value={sp.id}>{sp.display_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Status do Agendamento</Label>
              <select
                value={editStatus}
                onChange={e => setEditStatus(e.target.value)}
                className="w-full h-9 rounded-lg bg-background border border-input text-foreground text-xs px-2"
              >
                <option value="scheduled">📅 Agendado / Pendente</option>
                <option value="converted">🎉 Concluído / Atendido com Sucesso</option>
                <option value="no_answer">📞 Tentado / Sem Resposta</option>
                <option value="pending">🔄 Retornar à Fila Geral</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">
                Instruções / Anotações do Agendamento (Rich Text / Observações)
              </Label>
              <textarea
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                placeholder="Ex: Decisor pediu para ligar após às 15h. Tem parada técnica de caldeiraria no próximo mês..."
                rows={4}
                className="w-full p-3 rounded-xl bg-background border border-input text-foreground text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <DialogFooter className="p-4 border-t border-border bg-muted/20 flex justify-between items-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="border-input text-xs"
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={isUpdatingAppointment}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-5 gap-1.5 shadow-md shadow-amber-600/20"
              >
                <Check className="w-4 h-4" /> Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
