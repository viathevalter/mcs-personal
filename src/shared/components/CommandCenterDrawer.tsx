import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/shared/supabase/client';
import { useAuth } from '@/app/providers/AuthProvider';
import { useEmpresa } from '@/app/providers/EmpresaProvider';
import { toast } from 'sonner';
import {
  Layers,
  Plus,
  Calendar,
  MessageSquare,
  Mail,
  Bell,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  Building2,
  Send,
  RefreshCw,
  UserMinus,
  Sparkles,
  Search,
  Filter,
  ArrowRightLeft,
  Play,
  Check,
  X,
  FileText,
  Radar,
  Briefcase,
  User,
  GripVertical,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export type CommandCenterTab = 'tasks' | 'agenda' | 'chat' | 'email_ai' | 'notifications';

interface OpenDrawerOptions {
  tab?: CommandCenterTab;
  workerId?: string;
  pedidoId?: string;
  conversationId?: string;
  openNewTaskModal?: boolean;
  openResignationModal?: boolean;
}

interface CommandCenterContextType {
  isOpen: boolean;
  activeTab: CommandCenterTab;
  setActiveTab: (tab: CommandCenterTab) => void;
  openDrawer: (options?: OpenDrawerOptions) => void;
  closeDrawer: () => void;
  pendingTasksCount: number;
  unreadNotificationsCount: number;
  unreadChatCount: number;
  refreshAll: () => void;
}

const CommandCenterContext = createContext<CommandCenterContextType | undefined>(undefined);

export function useCommandCenter() {
  const ctx = useContext(CommandCenterContext);
  if (!ctx) {
    throw new Error('useCommandCenter must be used within CommandCenterProvider');
  }
  return ctx;
}

const SOLICITUD_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  hiring_withdrawal: { label: 'Desistência na Contratação', color: 'bg-rose-500/15 text-rose-600 border-rose-500/30' },
  order_postponement: { label: 'Prorrogação de Início', color: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  replacement: { label: 'Reemplazo (Substituição)', color: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  worker_resignation: { label: 'Pedido de Demissão (15 dias)', color: 'bg-purple-500/15 text-purple-600 border-purple-500/30' },
  offboarding: { label: 'Baixa de Trabalhador', color: 'bg-red-500/15 text-red-600 border-red-500/30' },
  order_extension: { label: 'Prorrogação de Obra', color: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  order_termination: { label: 'Finalização de Obra', color: 'bg-slate-500/15 text-slate-600 border-slate-500/30' },
  order_pause: { label: 'Pausa de Pedido', color: 'bg-orange-500/15 text-orange-600 border-orange-500/30' },
  order_cancellation: { label: 'Cancelamento de Pedido', color: 'bg-red-600/15 text-red-700 border-red-600/30' },
  incident: { label: 'Incidência / Direta', color: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30' },
};

const ORIGIN_BADGES: Record<string, { label: string; className: string }> = {
  playbook: { label: '⚡ Playbook', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' },
  manual: { label: '👤 Direta Setor/Pessoa', className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800' },
  chat: { label: '💬 MCS Chat', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' },
  email_ai: { label: '🤖 E-mail IA', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800' },
};

export function CommandCenterTrigger({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  const { openDrawer, pendingTasksCount, unreadNotificationsCount, unreadChatCount } = useCommandCenter();
  const totalBadge = pendingTasksCount + unreadChatCount;

  return (
    <button
      type="button"
      onClick={() => openDrawer()}
      className={
        variant === 'compact'
          ? 'relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 transition-all'
          : 'relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.01] transition-all cursor-pointer'
      }
      title="Abrir Super Gaveta Flutuante (Tarefas, Playbooks, Agenda e MCS Chat)"
    >
      <Layers className="w-4 h-4" />
      <span className="hidden md:inline">Central Operacional & Chat</span>
      <span className="md:hidden">Central</span>
      {totalBadge > 0 && (
        <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold bg-white text-indigo-700 rounded-full leading-none shadow-xs">
          {totalBadge > 99 ? '99+' : totalBadge}
        </span>
      )}
      {unreadNotificationsCount > 0 && (
        <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping absolute -top-0.5 -right-0.5" />
      )}
    </button>
  );
}

export function CommandCenterProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { selectedEmpresaId } = useEmpresa();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<CommandCenterTab>('tasks');

  // Data states
  const [tasks, setTasks] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [mcsUsers, setMcsUsers] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [originFilter, setOriginFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'COMPLETED' | 'MY_TASKS'>('OPEN');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals / Inline Forms inside Drawer
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [showResignationForm, setShowResignationForm] = useState(false);

  // New Direct Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDeptId, setNewTaskDeptId] = useState('');
  const [newTaskUserId, setNewTaskUserId] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [newTaskScheduledFor, setNewTaskScheduledFor] = useState('');
  const [newTaskWorkerId, setNewTaskWorkerId] = useState('');
  const [newTaskPedidoId, setNewTaskPedidoId] = useState('');
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Worker Resignation (Aviso Prévio 15d) Form State
  const [resignWorkerId, setResignWorkerId] = useState('');
  const [resignPedidoId, setResignPedidoId] = useState('');
  const [resignCumprira15Dias, setResignCumprira15Dias] = useState(true);
  const [resignUltimoDia, setResignUltimoDia] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [resignObservacoes, setResignObservacoes] = useState('');
  const [isSubmittingResign, setIsSubmittingResign] = useState(false);

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);

  // Email AI Copilot state
  const [emailInputSubject, setEmailInputSubject] = useState('');
  const [emailInputSender, setEmailInputSender] = useState('');
  const [emailInputBody, setEmailInputBody] = useState('');
  const [aiDetectedActions, setAiDetectedActions] = useState<any[]>([
    {
      id: 'sample-1',
      sender: 'obras@clientecorp.es',
      subject: 'Solicitud de reemplazo urgente - Obra Madrid Norte',
      snippet: 'Buenos días, necesitamos sustituir al oficial de primera en la obra de Madrid a partir del lunes por falta de adaptación...',
      suggestedDeptCode: 'OPERACOES',
      suggestedPriority: 'urgent',
      suggestedTitle: '[E-mail IA] Cliente solicitou Reemplazo na Obra Madrid Norte',
      category: 'Reemplazo Solicitado por E-mail',
      createdAt: new Date().toISOString()
    },
    {
      id: 'sample-2',
      sender: 'compras@constructora-sur.es',
      subject: 'Prórroga de pedido por 20 días adicionales',
      snippet: 'Confirmamos la extensión de los 4 trabajadores asignados al proyecto hasta final del próximo mes...',
      suggestedDeptCode: 'LOGISTICA',
      suggestedPriority: 'high',
      suggestedTitle: '[E-mail IA] Prorrogar alojamento e alocação (+20 dias) - Constructora Sur',
      category: 'Prorrogação de Obra via E-mail',
      createdAt: new Date().toISOString()
    }
  ]);

  const loadReferenceData = useCallback(async () => {
    if (!selectedEmpresaId) return;
    try {
      const [deptRes, usersRes, workersRes, pedidosRes] = await Promise.all([
        supabase
          .schema('core_common')
          .from('departments')
          .select('id, name, code')
          .eq('empresa_id', selectedEmpresaId)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('mcs_users')
          .select('id, name, email, department_id, role')
          .order('name'),
        supabase
          .schema('core_personal')
          .from('workers')
          .select('id, cod_colab, nome, telefono, status_trabajador')
          .eq('empresa_id', selectedEmpresaId)
          .order('nome')
          .limit(1000),
        supabase
          .schema('core_operacoes')
          .from('pedidos')
          .select('id, codigo, client_id, status_pedido, fecha_inicio_pedido, expected_end_date')
          .eq('empresa_id', selectedEmpresaId)
          .order('created_at', { ascending: false })
          .limit(150)
      ]);

      if (deptRes.data) setDepartments(deptRes.data);
      if (usersRes.data) setMcsUsers(usersRes.data);
      if (workersRes.data) setWorkers(workersRes.data);
      if (pedidosRes.data) setPedidos(pedidosRes.data);
    } catch (err) {
      console.error('Error loading CommandCenter reference data:', err);
    }
  }, [selectedEmpresaId]);

  const loadTasks = useCallback(async () => {
    if (!selectedEmpresaId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .schema('core_operacoes')
        .from('solicitud_tareas')
        .select(`
          *,
          department:departments(id, name, code),
          solicitud:solicitudes_operativas(id, codigo, title, tipo, status, priority, due_date, pedido_id, client_id, pergunta_respuesta)
        `)
        .eq('empresa_id', selectedEmpresaId)
        .order('created_at', { ascending: false })
        .limit(150);

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error loading tasks in CommandCenter:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedEmpresaId]);

  const loadConversations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(80);
      if (!error && data) {
        setConversations(data);
      }
    } catch (err) {
      console.error('Error loading chat conversations:', err);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(150);
      if (!error && data) {
        setChatMessages([...data].reverse());
      }
    } catch (err) {
      console.error('Error loading chat messages:', err);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .schema('core_common')
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(40);
      if (data) setNotifications(data);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  }, [user?.id]);

  const refreshAll = useCallback(() => {
    loadReferenceData();
    loadTasks();
    loadConversations();
    loadNotifications();
  }, [loadReferenceData, loadTasks, loadConversations, loadNotifications]);

  useEffect(() => {
    if (user && selectedEmpresaId) {
      refreshAll();
    }
  }, [user, selectedEmpresaId, refreshAll]);

  useEffect(() => {
    if (selectedConversation?.id) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation?.id, loadMessages]);

  // Realtime subscription for tasks and chat messages
  useEffect(() => {
    if (!selectedEmpresaId) return;
    const channel = supabase
      .channel(`command-center-live-${selectedEmpresaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'core_operacoes', table: 'solicitud_tareas', filter: `empresa_id=eq.${selectedEmpresaId}` },
        () => {
          loadTasks();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload: any) => {
          loadConversations();
          if (selectedConversation?.id && payload.new?.conversation_id === selectedConversation.id) {
            loadMessages(selectedConversation.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedEmpresaId, selectedConversation?.id, loadTasks, loadConversations, loadMessages]);

  const openDrawer = useCallback((options?: OpenDrawerOptions) => {
    if (options?.tab) setActiveTab(options.tab);
    if (options?.openNewTaskModal) {
      setShowNewTaskForm(true);
      setShowResignationForm(false);
      if (options.workerId) setNewTaskWorkerId(options.workerId);
      if (options.pedidoId) setNewTaskPedidoId(options.pedidoId);
    }
    if (options?.openResignationModal) {
      setShowResignationForm(true);
      setShowNewTaskForm(false);
      if (options.workerId) setResignWorkerId(options.workerId);
      if (options.pedidoId) setResignPedidoId(options.pedidoId);
    }
    if (options?.conversationId) {
      setActiveTab('chat');
      const found = conversations.find(c => c.id === options.conversationId);
      if (found) setSelectedConversation(found);
    } else if (options?.workerId && options?.tab === 'chat') {
      const found = conversations.find(c => c.worker_id === options.workerId);
      if (found) setSelectedConversation(found);
    }
    setIsOpen(true);
  }, [conversations]);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Maps for fast rendering
  const workersMap = useMemo(() => new Map(workers.map(w => [w.id, w])), [workers]);
  const pedidosMap = useMemo(() => new Map(pedidos.map(p => [p.id, p])), [pedidos]);
  const usersMap = useMemo(() => new Map(mcsUsers.map(u => [u.id, u])), [mcsUsers]);

  const pendingTasksCount = useMemo(
    () => tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
    [tasks]
  );

  const unreadNotificationsCount = useMemo(
    () => notifications.filter(n => !n.read_at && !n.is_read).length,
    [notifications]
  );

  const unreadChatCount = useMemo(
    () => conversations.reduce((acc, c) => acc + (Number(c.unread_count) || 0), 0),
    [conversations]
  );

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (statusFilter === 'OPEN' && (t.status === 'completed' || t.status === 'cancelled')) return false;
      if (statusFilter === 'COMPLETED' && t.status !== 'completed') return false;
      if (statusFilter === 'MY_TASKS') {
        const isMine = t.assigned_to === user?.id || t.assigned_to_user_id === user?.id;
        if (!isMine) return false;
      }
      if (deptFilter !== 'ALL') {
        const deptCode = (t.department?.code || '').toUpperCase();
        if (deptCode !== deptFilter) return false;
      }
      if (originFilter !== 'ALL') {
        const orig = t.task_origin || 'playbook';
        if (orig !== originFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const workerName = t.worker_id ? (workersMap.get(t.worker_id)?.nome || '').toLowerCase() : '';
        const pedidoCode = (t.solicitud?.codigo || (t.pedido_id ? pedidosMap.get(t.pedido_id)?.codigo : '') || '').toLowerCase();
        const match =
          (t.title || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          workerName.includes(q) ||
          pedidoCode.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, deptFilter, originFilter, searchQuery, user?.id, workersMap, pedidosMap]);

  // Handlers
  const handleCreateDirectTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpresaId || !newTaskTitle.trim()) {
      toast.error('Informe o título da tarefa.');
      return;
    }
    setIsSubmittingTask(true);
    try {
      const { error } = await supabase.schema('core_operacoes').rpc('criar_tarefa_direta', {
        p_empresa_id: selectedEmpresaId,
        p_title: newTaskTitle.trim(),
        p_description: newTaskDesc.trim() || null,
        p_department_id: newTaskDeptId || null,
        p_assigned_to_user_id: newTaskUserId || null,
        p_priority: newTaskPriority,
        p_scheduled_for: newTaskScheduledFor ? new Date(newTaskScheduledFor).toISOString() : null,
        p_worker_id: newTaskWorkerId || null,
        p_pedido_id: newTaskPedidoId || null,
        p_client_id: null,
        p_conversation_id: selectedConversation?.id || null,
        p_task_origin: 'manual',
        p_created_by: user?.id || null
      });
      if (error) throw error;

      toast.success('Tarefa enviada diretamente para o setor/pessoa!');
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskScheduledFor('');
      setShowNewTaskForm(false);
      loadTasks();
    } catch (err: any) {
      console.error('Error creating direct task:', err);
      toast.error(err.message || 'Erro ao criar tarefa direta');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleStartResignationPlaybook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpresaId || !resignWorkerId) {
      toast.error('Selecione o trabalhador que solicitou a baixa.');
      return;
    }
    setIsSubmittingResign(true);
    try {
      const { data, error } = await supabase.schema('core_operacoes').rpc('iniciar_baixa_trabalhador_chat', {
        p_empresa_id: selectedEmpresaId,
        p_worker_id: resignWorkerId,
        p_pedido_id: resignPedidoId || null,
        p_conversation_id: selectedConversation?.id || null,
        p_cumprira_15_dias: resignCumprira15Dias,
        p_ultimo_dia_trabalhado: resignUltimoDia || null,
        p_observacoes: resignObservacoes || null,
        p_user_id: user?.id || null
      });
      if (error) throw error;

      toast.success(
        `Playbook de Demissão/Aviso Prévio (${ (data as any)?.codigo || '' }) iniciado! Tarefas geradas para RH, Operações, Seguridade, Logística e Financeiro.`
      );
      setShowResignationForm(false);
      setResignObservacoes('');
      loadTasks();
    } catch (err: any) {
      console.error('Error starting worker resignation:', err);
      toast.error(err.message || 'Erro ao iniciar baixa de trabalhador');
    } finally {
      setIsSubmittingResign(false);
    }
  };

  const handleClientDecisionOnResignation = async (solicitudId: string, decisao: 'reemplazo' | 'baixa_definitiva') => {
    try {
      const { error } = await supabase.schema('core_operacoes').rpc('decidir_baixa_cliente', {
        p_solicitud_id: solicitudId,
        p_decisao: decisao,
        p_user_id: user?.id || null
      });
      if (error) throw error;

      if (decisao === 'reemplazo') {
        toast.success('Convertido em Reemplazo! Vaga de substituição aberta na Contratação Inicial.');
      } else {
        toast.success('Confirmada Baixa Definitiva sem substituição.');
      }
      loadTasks();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar decisão do cliente');
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const updatePayload: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      if (newStatus === 'completed') {
        updatePayload.completed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .schema('core_operacoes')
        .from('solicitud_tareas')
        .update(updatePayload)
        .eq('id', taskId);
      if (error) throw error;
      toast.success(newStatus === 'completed' ? 'Tarefa concluída!' : 'Status da tarefa atualizado!');
      loadTasks();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar tarefa');
    }
  };

  const handleAssignTaskPerson = async (taskId: string, personId: string) => {
    try {
      const { error } = await supabase
        .schema('core_operacoes')
        .from('solicitud_tareas')
        .update({
          assigned_to_user_id: personId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
      if (error) throw error;
      toast.success('Responsável atualizado na tarefa!');
      loadTasks();
    } catch (err: any) {
      toast.error('Erro ao atribuir responsável');
    }
  };

  const handleScheduleTask = async (taskId: string, dateTimeStr: string) => {
    try {
      const { error } = await supabase
        .schema('core_operacoes')
        .from('solicitud_tareas')
        .update({
          scheduled_for: dateTimeStr ? new Date(dateTimeStr).toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
      if (error) throw error;
      toast.success('Agendamento salvo na tarefa!');
      loadTasks();
    } catch (err: any) {
      toast.error('Erro ao agendar tarefa');
    }
  };

  const handleRunRadarD10 = async () => {
    if (!selectedEmpresaId) return;
    try {
      const { data, error } = await supabase.schema('core_operacoes').rpc('verificar_radar_d10_pedidos', {
        p_empresa_id: selectedEmpresaId
      });
      if (error) throw error;
      const count = (data as any)?.alertas_gerados || 0;
      if (count > 0) {
        toast.success(`Radar D-10 concluído: ${count} tarefa(s) preventiva(s) de fim de obra gerada(s)!`);
      } else {
        toast.info('Radar D-10 verificado: Nenhuma obra pendente nos próximos 10 dias sem alerta.');
      }
      loadTasks();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao executar Radar D-10');
    }
  };

  const handleAssignConversationAgent = async (conversationId: string, agentId: string) => {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update({ assigned_to: agentId || null, updated_at: new Date().toISOString() })
        .eq('id', conversationId);
      if (error) throw error;
      const agent = usersMap.get(agentId);
      toast.success(
        agent
          ? `Conversa atribuída para ${agent.name || agent.email} (mesmo número WhatsApp mantido!)`
          : 'Responsável da conversa liberado para a fila.'
      );
      setSelectedConversation((prev: any) => (prev ? { ...prev, assigned_to: agentId || null } : null));
      loadConversations();
    } catch (err: any) {
      toast.error('Erro ao transferir conversa');
    }
  };

  const handleSendChatMessage = async (customText?: string) => {
    const textToSend = (customText ?? chatInput).trim();
    if (!selectedConversation?.id || !textToSend) return;
    setIsSendingChat(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({
        conversation_id: selectedConversation.id,
        direction: 'outbound',
        sender_name: user?.email || 'MCS Operações',
        message_type: 'text',
        content: textToSend,
        status: 'sent'
      });
      if (error) throw error;

      await supabase
        .from('chat_conversations')
        .update({
          last_message_text: textToSend,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedConversation.id);

      if (!customText) setChatInput('');
      loadMessages(selectedConversation.id);
      loadConversations();
      toast.success('Mensagem registrada na conversa do MCS Chat!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar mensagem');
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleAnalyzeEmailWithAI = () => {
    if (!emailInputSubject.trim() && !emailInputBody.trim()) {
      toast.error('Preencha o assunto ou corpo do e-mail para o Copiloto IA analisar.');
      return;
    }
    const text = `${emailInputSubject} ${emailInputBody}`.toLowerCase();
    let suggestedDeptCode = 'OPERACOES';
    let suggestedPriority: 'low' | 'normal' | 'high' | 'urgent' = 'high';
    let category = 'Ação Operacional Detectada';

    if (text.includes('reemplazo') || text.includes('sustitu') || text.includes('substitu')) {
      suggestedDeptCode = 'OPERACOES';
      suggestedPriority = 'urgent';
      category = 'Reemplazo / Substituição de Trabalhador';
    } else if (text.includes('alojamiento') || text.includes('alojamento') || text.includes('fianza') || text.includes('cama')) {
      suggestedDeptCode = 'LOGISTICA';
      suggestedPriority = 'high';
      category = 'Logística / Alojamento & Fiança';
    } else if (text.includes('baja') || text.includes('baixa') || text.includes('renuncia') || text.includes('demiss')) {
      suggestedDeptCode = 'RH';
      suggestedPriority = 'urgent';
      category = 'Baixa / Aviso Prévio / Segurança Social';
    } else if (text.includes('factura') || text.includes('fatura') || text.includes('pago') || text.includes('horas')) {
      suggestedDeptCode = 'FINANCEIRO';
      suggestedPriority = 'normal';
      category = 'Faturamento / Fechamento de Horas';
    }

    const newDetection = {
      id: `ai-${Date.now()}`,
      sender: emailInputSender || 'cliente@externo.es',
      subject: emailInputSubject || 'E-mail Operacional Analisado',
      snippet: emailInputBody.slice(0, 180) || emailInputSubject,
      suggestedDeptCode,
      suggestedPriority,
      suggestedTitle: `[E-mail IA] ${emailInputSubject || category}`,
      category,
      createdAt: new Date().toISOString()
    };

    setAiDetectedActions(prev => [newDetection, ...prev]);
    setEmailInputSubject('');
    setEmailInputSender('');
    setEmailInputBody('');
    toast.success(`Copiloto IA classificou o e-mail para o setor ${suggestedDeptCode}!`);
  };

  const handleConvertAiEmailToTask = async (item: any) => {
    if (!selectedEmpresaId) return;
    const dept = departments.find(d => (d.code || '').toUpperCase() === item.suggestedDeptCode);
    try {
      const { error } = await supabase.schema('core_operacoes').rpc('criar_tarefa_direta', {
        p_empresa_id: selectedEmpresaId,
        p_title: item.suggestedTitle,
        p_description: `Origem: E-mail de ${item.sender}\nAssunto: ${item.subject}\nResumo IA: ${item.snippet}`,
        p_department_id: dept?.id || departments[0]?.id || null,
        p_assigned_to_user_id: null,
        p_priority: item.suggestedPriority || 'high',
        p_scheduled_for: null,
        p_worker_id: null,
        p_pedido_id: null,
        p_client_id: null,
        p_conversation_id: null,
        p_task_origin: 'email_ai',
        p_created_by: user?.id || null
      });
      if (error) throw error;
      setAiDetectedActions(prev => prev.filter(x => x.id !== item.id));
      toast.success(`Tarefa criada no setor ${item.suggestedDeptCode} a partir do E-mail!`);
      setActiveTab('tasks');
      loadTasks();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao converter e-mail em tarefa');
    }
  };

  // Draggable & Minimizable Floating Trigger State
  const [floatingPos, setFloatingPos] = useState<{ x: number; y: number } | null>(null);
  const [isFloatingMinimized, setIsFloatingMinimized] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mcs_command_center_minimized') === 'true';
    } catch {
      return false;
    }
  });
  const dragStateRef = useRef<{
    isDragging: boolean;
    hasMoved: boolean;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  }>({
    isDragging: false,
    hasMoved: false,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mcs_command_center_floating_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const clampedX = Math.max(12, Math.min(window.innerWidth - 80, parsed.x));
          const clampedY = Math.max(12, Math.min(window.innerHeight - 80, parsed.y));
          setFloatingPos({ x: clampedX, y: clampedY });
          return;
        }
      }
    } catch {}
    // Default position: right side, vertically centered/upper-half so it NEVER covers bottom-right "Salvar" buttons
    if (typeof window !== 'undefined') {
      setFloatingPos({
        x: Math.max(20, window.innerWidth - 275),
        y: Math.max(80, Math.round(window.innerHeight * 0.45))
      });
    }
  }, []);

  const handleFloatingPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-no-drag="true"]')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = floatingPos?.x ?? rect.left;
    const currentY = floatingPos?.y ?? rect.top;

    dragStateRef.current = {
      isDragging: true,
      hasMoved: false,
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentX,
      initialY: currentY
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleFloatingPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.isDragging) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragStateRef.current.hasMoved = true;
    }
    if (!dragStateRef.current.hasMoved) return;

    const maxW = typeof window !== 'undefined' ? window.innerWidth - 65 : 1200;
    const maxH = typeof window !== 'undefined' ? window.innerHeight - 60 : 800;
    const nextX = Math.max(8, Math.min(maxW, dragStateRef.current.initialX + dx));
    const nextY = Math.max(8, Math.min(maxH, dragStateRef.current.initialY + dy));
    setFloatingPos({ x: nextX, y: nextY });
  };

  const handleFloatingPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.isDragging) return;
    dragStateRef.current.isDragging = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (dragStateRef.current.hasMoved && floatingPos) {
      try {
        localStorage.setItem('mcs_command_center_floating_pos', JSON.stringify(floatingPos));
      } catch {}
    } else {
      openDrawer();
    }
  };

  const toggleFloatingMinimized = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isFloatingMinimized;
    setIsFloatingMinimized(next);
    try {
      localStorage.setItem('mcs_command_center_minimized', String(next));
    } catch {}
  };

  return (
    <CommandCenterContext.Provider
      value={{
        isOpen,
        activeTab,
        setActiveTab,
        openDrawer,
        closeDrawer,
        pendingTasksCount,
        unreadNotificationsCount,
        unreadChatCount,
        refreshAll
      }}
    >
      {children}

      {/* Botão Flutuante Global Arrastável (Pode mover para qualquer lugar da tela e minimizar) */}
      {user && !isOpen && (
        <div
          onPointerDown={handleFloatingPointerDown}
          onPointerMove={handleFloatingPointerMove}
          onPointerUp={handleFloatingPointerUp}
          style={
            floatingPos
              ? { left: `${floatingPos.x}px`, top: `${floatingPos.y}px` }
              : { right: '20px', top: '45%' }
          }
          title="Arraste para mover de lugar ou clique para abrir a Super Gaveta Operacional"
          className="fixed z-40 select-none touch-none"
        >
          <div className="group flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-indigo-600 dark:to-blue-600 text-white shadow-2xl border border-indigo-500/30 hover:border-indigo-400/60 transition-shadow cursor-grab active:cursor-grabbing">
            <GripVertical className="w-3.5 h-3.5 text-indigo-300/60 group-hover:text-indigo-200 shrink-0 -ml-1" />

            <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 shrink-0">
              <Layers className="w-4 h-4 text-indigo-300 group-hover:text-white" />
              {pendingTasksCount + unreadChatCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-rose-500 text-white rounded-full leading-none">
                  {pendingTasksCount + unreadChatCount}
                </span>
              )}
            </div>

            {!isFloatingMinimized && (
              <div className="text-left pr-1">
                <div className="text-xs font-bold tracking-tight whitespace-nowrap">Super Gaveta Operacional</div>
                <div className="text-[10px] text-indigo-200/80 whitespace-nowrap">
                  {pendingTasksCount} tarefas • {unreadChatCount} msgs chat
                </div>
              </div>
            )}

            <button
              type="button"
              data-no-drag="true"
              onClick={toggleFloatingMinimized}
              title={isFloatingMinimized ? 'Expandir botão' : 'Compactar botão'}
              className="p-1 rounded-lg text-indigo-300/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              {isFloatingMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
            </button>
          </div>
        </div>
      )}

      {/* OVERLAY + SUPER GAVETA FLUTUANTE */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-[1040px] h-full bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* TOP HEADER PREMIUM */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-500/20 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold tracking-tight">Central de Comando Operacional</h2>
                      <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 rounded-full border border-indigo-400/30">
                        Playbooks + Tarefas Diretas + MCS Chat + IA
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Substitui mensagens soltas do Teams e grupos de WhatsApp por tarefas auditáveis por Setor ou Pessoa
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowNewTaskForm(prev => !prev);
                      setShowResignationForm(false);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400/40 text-xs font-semibold gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nova Tarefa (Setor / Pessoa)
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowResignationForm(prev => !prev);
                      setShowNewTaskForm(false);
                    }}
                    className="bg-purple-600/90 hover:bg-purple-500 text-white border-purple-400/40 text-xs font-semibold gap-1.5"
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                    Baixa / Renúncia (15d)
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRunRadarD10}
                    className="bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30 text-xs font-semibold gap-1.5"
                    title="Verificar obras que vencem nos próximos 10 dias"
                  >
                    <Radar className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Radar D-10</span>
                  </Button>

                  <button
                    type="button"
                    onClick={refreshAll}
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300"
                    title="Atualizar dados"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-600 text-slate-300 hover:text-white transition-colors"
                    title="Fechar Gaveta"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* BARRA DE NAVEGAÇÃO DAS 5 ABAS */}
              <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('tasks')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'tasks'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Tarefas & Playbooks</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-indigo-500/20 text-indigo-300 font-bold">
                    {pendingTasksCount}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('agenda')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'agenda'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Agenda & Programadas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'chat'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Ponte MCS Chat (WhatsApp)</span>
                  {unreadChatCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-white text-emerald-700 font-bold">
                      {unreadChatCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('email_ai')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'email_ai'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>E-mail & Copiloto IA</span>
                  <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-amber-400/20 text-amber-200 font-bold">
                    {aiDetectedActions.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('notifications')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    activeTab === 'notifications'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Alertas</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-500 text-white font-bold">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* PAINEL EXPANSÍVEL 1: NOVA TAREFA DIRETA (SUBSTITUTO DO TEAMS) */}
            {showNewTaskForm && (
              <form
                onSubmit={handleCreateDirectTask}
                className="p-5 bg-indigo-50/80 dark:bg-indigo-950/30 border-b border-indigo-200 dark:border-indigo-800/60 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-indigo-600 text-white">Nova Tarefa Direta / Incidência</Badge>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Direcione para um Setor ou para uma Pessoa específica com agendamento opcional
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNewTaskForm(false)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Fechar [x]
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                      O que precisa ser feito? *
                    </label>
                    <input
                      type="text"
                      required
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      placeholder="Ex: Confirmar check-out de alojamento / Cobrar assinatura do contrato..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Setor Destino *
                    </label>
                    <select
                      value={newTaskDeptId}
                      onChange={e => setNewTaskDeptId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="">Selecione o Setor...</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Pessoa Específica (Opcional)
                    </label>
                    <select
                      value={newTaskUserId}
                      onChange={e => setNewTaskUserId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="">Qualquer pessoa do setor</option>
                      {mcsUsers.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.email} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Trabalhador Vinculado (Opcional)
                    </label>
                    <select
                      value={newTaskWorkerId}
                      onChange={e => setNewTaskWorkerId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="">Nenhum trabalhador específico</option>
                      {workers.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.cod_colab ? `${w.cod_colab} - ` : ''}{w.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Pedido / Obra (Opcional)
                    </label>
                    <select
                      value={newTaskPedidoId}
                      onChange={e => setNewTaskPedidoId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="">Nenhum pedido específico</option>
                      {pedidos.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.codigo} ({p.status_pedido})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Programar Data/Hora (Agenda)
                    </label>
                    <input
                      type="datetime-local"
                      value={newTaskScheduledFor}
                      onChange={e => setNewTaskScheduledFor(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Prioridade
                    </label>
                    <select
                      value={newTaskPriority}
                      onChange={e => setNewTaskPriority(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="low">Baixa</option>
                      <option value="normal">Normal</option>
                      <option value="high">Alta</option>
                      <option value="urgent">Urgente 🔥</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Observações / Contexto
                    </label>
                    <input
                      type="text"
                      value={newTaskDesc}
                      onChange={e => setNewTaskDesc(e.target.value)}
                      placeholder="Instruções adicionais..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowNewTaskForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmittingTask} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {isSubmittingTask ? 'Criando...' : 'Disparar Tarefa Agora'}
                  </Button>
                </div>
              </form>
            )}

            {/* PAINEL EXPANSÍVEL 2: FLUXO DE BAIXA A PEDIDO DO TRABALHADOR (CARTA DE RENÚNCIA + AVISO PRÉVIO 15 DIAS) */}
            {showResignationForm && (
              <form
                onSubmit={handleStartResignationPlaybook}
                className="p-5 bg-purple-50/90 dark:bg-purple-950/30 border-b border-purple-200 dark:border-purple-800/60 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-600 text-white">
                      Fluxo Oficial: Pedido de Demissão + Carta de Renúncia (15 Dias)
                    </Badge>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Dispara tarefas para RH/Chat, Consulta ao Cliente (Reemplazo vs Só Baixa), Seguridade, Logística e Financeiro
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowResignationForm(false)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Fechar [x]
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Trabalhador *
                    </label>
                    <select
                      required
                      value={resignWorkerId}
                      onChange={e => setResignWorkerId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="">Selecione o Trabalhador...</option>
                      {workers.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.cod_colab ? `${w.cod_colab} - ` : ''}{w.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Pedido Atual (Opcional)
                    </label>
                    <select
                      value={resignPedidoId}
                      onChange={e => setResignPedidoId(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="">Detectar / Selecionar Pedido...</option>
                      {pedidos.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.codigo}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Regra de Aviso Prévio (15 Dias) *
                    </label>
                    <select
                      value={resignCumprira15Dias ? 'sim' : 'nao'}
                      onChange={e => setResignCumprira15Dias(e.target.value === 'sim')}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium"
                    >
                      <option value="sim">✅ Cumprirá os 15 dias (Sem desconto)</option>
                      <option value="nao">⚠️ Saída imediata (Descontar das horas)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                      Último Dia Trabalhado *
                    </label>
                    <input
                      type="date"
                      required
                      value={resignUltimoDia}
                      onChange={e => setResignUltimoDia(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <input
                      type="text"
                      value={resignObservacoes}
                      onChange={e => setResignObservacoes(e.target.value)}
                      placeholder="Motivo informado pelo trabalhador no MCS Chat / Observações de retenção..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div className="flex justify-end items-center gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSubmittingResign}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isSubmittingResign ? 'Iniciando Playbook...' : 'Acionar Playbook de Demissão'}
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {/* CONTEÚDO PRINCIPAL DAS ABAS */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/60 dark:bg-slate-950">
              {/* ========================================================= */}
              {/* ABA 1: TAREFAS & PLAYBOOKS                                */}
              {/* ========================================================= */}
              {activeTab === 'tasks' && (
                <div className="space-y-4">
                  {/* Barra de Filtros */}
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          placeholder="Buscar tarefa, trabalhador, pedido..."
                          className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 w-56"
                        />
                      </div>

                      <select
                        value={deptFilter}
                        onChange={e => setDeptFilter(e.target.value)}
                        className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      >
                        <option value="ALL">🏢 Todos os Setores</option>
                        <option value="RH">RH / Gestão Pessoal</option>
                        <option value="CONTRATACAO">Contratação</option>
                        <option value="LOGISTICA">Logística / Alojamento</option>
                        <option value="SEGURIDAD_SOCIAL">Seguridade Social</option>
                        <option value="CONTRATOS">Contratos / Docs</option>
                        <option value="OPERACOES">Operações</option>
                        <option value="COMERCIAL">Comercial</option>
                        <option value="FINANCEIRO">Financeiro</option>
                      </select>

                      <select
                        value={originFilter}
                        onChange={e => setOriginFilter(e.target.value)}
                        className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      >
                        <option value="ALL">⚡ Todas as Origens</option>
                        <option value="playbook">⚡ Playbooks Automáticos</option>
                        <option value="manual">👤 Tarefas Diretas (Pessoa/Setor)</option>
                        <option value="chat">💬 Originadas no MCS Chat</option>
                        <option value="email_ai">🤖 Sugeridas pelo Agente de E-mail</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setStatusFilter('OPEN')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                          statusFilter === 'OPEN'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Pendentes ({pendingTasksCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('MY_TASKS')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                          statusFilter === 'MY_TASKS'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Para Mim
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('COMPLETED')}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                          statusFilter === 'COMPLETED'
                            ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Concluídas
                      </button>
                    </div>
                  </div>

                  {/* Lista de Tarefas */}
                  {filteredTasks.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-2">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto opacity-80" />
                      <h3 className="text-sm font-bold">Nenhuma tarefa encontrada neste filtro</h3>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        As tarefas geradas pelos 8 Playbooks Operacionais ou criadas diretamente para setores/pessoas aparecerão aqui em tempo real.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredTasks.map(task => {
                        const originInfo = ORIGIN_BADGES[task.task_origin || 'playbook'] || ORIGIN_BADGES.playbook;
                        const solType = task.solicitud?.tipo || 'incident';
                        const typeInfo = SOLICITUD_TYPE_LABELS[solType] || SOLICITUD_TYPE_LABELS.incident;
                        const worker = task.worker_id ? workersMap.get(task.worker_id) : null;
                        const pedido = task.pedido_id
                          ? pedidosMap.get(task.pedido_id)
                          : task.solicitud?.pedido_id
                          ? pedidosMap.get(task.solicitud.pedido_id)
                          : null;
                        const isResignationClientConsult =
                          solType === 'worker_resignation' &&
                          (task.title || '').toLowerCase().includes('consultar cliente');

                        return (
                          <div
                            key={task.id}
                            className={`p-4 rounded-xl bg-white dark:bg-slate-900 border transition-all shadow-xs ${
                              task.priority === 'urgent'
                                ? 'border-l-4 border-l-rose-500 border-slate-200 dark:border-slate-800'
                                : task.priority === 'high'
                                ? 'border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-800'
                                : 'border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${originInfo.className}`}>
                                  {originInfo.label}
                                </span>
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${typeInfo.color}`}>
                                  {typeInfo.label}
                                </span>
                                <Badge variant="outline" className="text-[10px] font-bold">
                                  🏢 {task.department?.name || 'Setor Geral'}
                                </Badge>
                                {task.solicitud?.codigo && (
                                  <Badge variant="secondary" className="text-[10px] font-mono">
                                    #{task.solicitud.codigo}
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Seletor rápido de pessoa responsável */}
                                <select
                                  value={task.assigned_to_user_id || ''}
                                  onChange={e => handleAssignTaskPerson(task.id, e.target.value)}
                                  className="px-2 py-1 text-[11px] rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                  title="Direcionar para uma pessoa específica"
                                >
                                  <option value="">👤 Atribuir Pessoa...</option>
                                  {mcsUsers.map(u => (
                                    <option key={u.id} value={u.id}>
                                      {u.name || u.email}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 whitespace-pre-line">
                                {task.description}
                              </p>
                            )}

                            {/* Metadados de Trabalhador, Pedido e Agendamento */}
                            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
                              {worker && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                                  <User className="w-3 h-3 text-indigo-500" />
                                  {worker.cod_colab ? `${worker.cod_colab} - ` : ''}{worker.nome}
                                </span>
                              )}
                              {pedido && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                                  <Briefcase className="w-3 h-3 text-blue-500" />
                                  Pedido: {pedido.codigo}
                                </span>
                              )}
                              {(task.scheduled_for || task.due_date) && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-medium">
                                  <Clock className="w-3 h-3" />
                                  Prazo/Agenda: {new Date(task.scheduled_for || task.due_date).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>

                            {/* BARRA DE DECISÃO DE 1 CLIQUE: CONSULTA AO CLIENTE NA BAIXA DE TRABALHADOR */}
                            {isResignationClientConsult && task.solicitud?.id && task.status !== 'completed' && (
                              <div className="mb-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex flex-wrap items-center justify-between gap-2">
                                <div className="text-xs font-semibold text-purple-900 dark:text-purple-200">
                                  🎯 Decisão do Cliente sobre a vaga do trabalhador em Aviso Prévio:
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleClientDecisionOnResignation(task.solicitud.id, 'reemplazo')}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-7 px-2.5"
                                  >
                                    🔄 Cliente quer Substituto (Abrir Reemplazo)
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleClientDecisionOnResignation(task.solicitud.id, 'baixa_definitiva')}
                                    className="border-purple-300 text-purple-800 dark:text-purple-200 text-xs h-7 px-2.5"
                                  >
                                    ✅ Confirmar Só Baixa (Sem Reposição)
                                  </Button>
                                </div>
                              </div>
                            )}

                            {/* AÇÕES DA TAREFA */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                              <div className="flex items-center gap-2">
                                <input
                                  type="datetime-local"
                                  defaultValue={task.scheduled_for ? task.scheduled_for.slice(0, 16) : ''}
                                  onBlur={e => {
                                    if (e.target.value) handleScheduleTask(task.id, e.target.value);
                                  }}
                                  className="px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                  title="Programar data/hora na Agenda"
                                />

                                {(task.conversation_id || task.worker_id) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      openDrawer({
                                        tab: 'chat',
                                        conversationId: task.conversation_id,
                                        workerId: task.worker_id
                                      })
                                    }
                                    className="h-7 text-xs gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Abrir no MCS Chat
                                  </Button>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                {task.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUpdateTaskStatus(task.id, 'in_progress')}
                                    className="h-7 text-xs gap-1"
                                  >
                                    <Play className="w-3 h-3" />
                                    Iniciar
                                  </Button>
                                )}
                                {task.status !== 'completed' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                                    className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Concluir Tarefa
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* ABA 2: AGENDA & TAREFAS PROGRAMADAS                       */}
              {/* ========================================================= */}
              {activeTab === 'agenda' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold">Agenda Operacional & Vencimentos Programados</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Acompanhe saídas de aviso prévio (15 dias), check-outs de alojamento agendados, baixas na Seguridade e alertas D-10 de fim de obra.
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setShowNewTaskForm(true)} className="bg-indigo-600 text-white text-xs gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Agendar Nova Tarefa
                    </Button>
                  </div>

                  <div className="space-y-2.5">
                    {tasks
                      .filter(t => t.status !== 'completed' && (t.scheduled_for || t.due_date))
                      .sort((a, b) => {
                        const da = new Date(a.scheduled_for || a.due_date).getTime();
                        const db = new Date(b.scheduled_for || b.due_date).getTime();
                        return da - db;
                      })
                      .map(task => {
                        const dt = new Date(task.scheduled_for || task.due_date);
                        const isOverdue = dt.getTime() < Date.now();
                        return (
                          <div
                            key={task.id}
                            className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3.5">
                              <div
                                className={`px-3 py-2 rounded-xl text-center min-w-[78px] border ${
                                  isOverdue
                                    ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300'
                                    : 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-300'
                                }`}
                              >
                                <div className="text-[10px] font-bold uppercase">
                                  {dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                </div>
                                <div className="text-xs font-extrabold">
                                  {dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <Badge variant="outline" className="text-[10px]">
                                    {task.department?.name || 'Setor'}
                                  </Badge>
                                  {isOverdue && (
                                    <Badge className="bg-rose-500 text-white text-[10px]">Vencida / Urgente</Badge>
                                  )}
                                </div>
                                <h4 className="text-sm font-bold">{task.title}</h4>
                                {task.description && (
                                  <p className="text-xs text-slate-500 line-clamp-1">{task.description}</p>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleUpdateTaskStatus(task.id, 'completed')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                            >
                              Concluir
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* ABA 3: PONTE MCS CHAT AO VIVO (WHATSAPP UNIFICADO)        */}
              {/* ========================================================= */}
              {activeTab === 'chat' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[620px]">
                  {/* Coluna Esquerda: Lista de Conversas */}
                  <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
                    <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Conversas MCS Chat ({conversations.length})
                        </span>
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                          Número Único Oficial
                        </Badge>
                      </div>
                      <input
                        type="text"
                        value={chatSearch}
                        onChange={e => setChatSearch(e.target.value)}
                        placeholder="Buscar trabalhador ou telefone..."
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                      {conversations
                        .filter(c => {
                          if (!chatSearch.trim()) return true;
                          const q = chatSearch.toLowerCase();
                          return (
                            (c.contact_name || '').toLowerCase().includes(q) ||
                            (c.contact_phone || '').toLowerCase().includes(q) ||
                            (c.last_message_text || '').toLowerCase().includes(q)
                          );
                        })
                        .map(conv => {
                          const assignedAgent = conv.assigned_to ? usersMap.get(conv.assigned_to) : null;
                          const isSelected = selectedConversation?.id === conv.id;
                          return (
                            <div
                              key={conv.id}
                              onClick={() => setSelectedConversation(conv)}
                              className={`p-3 cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-l-4 border-l-emerald-500'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                  {conv.contact_name || conv.contact_phone}
                                </span>
                                {Number(conv.unread_count) > 0 && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded-full">
                                    {conv.unread_count}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mb-1.5">
                                {conv.last_message_text || 'Sem mensagens recentes'}
                              </p>
                              <div className="flex items-center justify-between text-[10px] text-slate-400">
                                <span>📱 {conv.contact_phone}</span>
                                {assignedAgent ? (
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-medium">
                                    👤 {assignedAgent.name || assignedAgent.email}
                                  </span>
                                ) : (
                                  <span>Fila Geral</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* Coluna Direita: Conversa Ativa + Transferência de Atendente + Gatilhos */}
                  <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
                    {!selectedConversation ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                        <MessageSquare className="w-10 h-10 mb-2 text-emerald-500/60" />
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                          Selecione uma conversa do MCS Chat ao lado
                        </p>
                        <p className="text-xs max-w-sm mt-1">
                          Você pode transferir a conversa para a pessoa de Retenção/Aviso Prévio mantendo o mesmo número de WhatsApp ou enviar o Kit de Onboarding e Carta de Renúncia.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Topo da Conversa */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h4 className="text-sm font-bold">
                                {selectedConversation.contact_name || selectedConversation.contact_phone}
                              </h4>
                              <span className="text-[11px] text-slate-500">
                                WhatsApp: {selectedConversation.contact_phone}
                              </span>
                            </div>

                            {/* Transferir para Pessoa (ex: Retenção / Aviso Prévio) na mesma conversa */}
                            <div className="flex items-center gap-1.5">
                              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />
                              <select
                                value={selectedConversation.assigned_to || ''}
                                onChange={e => handleAssignConversationAgent(selectedConversation.id, e.target.value)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200"
                              >
                                <option value="">👤 Transferir Atendente (Mesmo Número)...</option>
                                {mcsUsers.map(u => (
                                  <option key={u.id} value={u.id}>
                                    Atendente: {u.name || u.email}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Botões Rápidos de Processo no Chat */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() =>
                                handleSendChatMessage(
                                  `Olá ${selectedConversation.contact_name || ''}! Seguem as informações oficiais do seu início na obra: Data de apresentação confirmada, endereço do alojamento reservado pela Logística e entrega de EPI programada. Qualquer dúvida fale conosco por este número único da MCS!`
                                )
                              }
                              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                            >
                              📋 Enviar Kit Onboarding (Início + Alojamento + EPI)
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleSendChatMessage(
                                  `Prezado(a) ${selectedConversation.contact_name || ''}, recebemos sua comunicação de desligamento. Conforme cláusula contratual de Aviso Prévio de 15 dias, enviamos em anexo a Carta de Renúncia para assinatura digital. Por favor confirme a data do seu último dia trabalhado.`
                                )
                              }
                              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 cursor-pointer"
                            >
                              📝 Enviar Carta de Renúncia (15 dias)
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (selectedConversation.worker_id) setResignWorkerId(selectedConversation.worker_id);
                                if (selectedConversation.pedido_id) setResignPedidoId(selectedConversation.pedido_id);
                                setShowResignationForm(true);
                              }}
                              className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                            >
                              🚪 Iniciar Playbook Baixa (15d)
                            </button>
                          </div>
                        </div>

                        {/* Histórico de Mensagens */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-100/70 dark:bg-slate-950/60">
                          {chatMessages.length === 0 ? (
                            <p className="text-center text-xs text-slate-400 py-8">
                              Nenhuma mensagem registrada nesta conversa.
                            </p>
                          ) : (
                            chatMessages.map(msg => {
                              const isOut = msg.direction === 'outbound';
                              return (
                                <div
                                  key={msg.id}
                                  className={`flex flex-col max-w-[82%] rounded-xl p-2.5 text-xs shadow-2xs ${
                                    isOut
                                      ? 'ml-auto bg-emerald-600 text-white'
                                      : 'mr-auto bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {msg.sender_name && (
                                    <span className={`text-[10px] font-bold mb-0.5 ${isOut ? 'text-emerald-100' : 'text-indigo-500'}`}>
                                      {msg.sender_name}
                                    </span>
                                  )}
                                  <p className="whitespace-pre-wrap">{msg.content}</p>
                                  <span className={`text-[9px] mt-1 self-end ${isOut ? 'text-emerald-100' : 'text-slate-400'}`}>
                                    {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>

                        {/* Input de Envio */}
                        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendChatMessage();
                              }
                            }}
                            placeholder="Digite uma mensagem para o trabalhador no MCS Chat..."
                            className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                          />
                          <Button
                            size="sm"
                            disabled={isSendingChat}
                            onClick={() => handleSendChatMessage()}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Enviar
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* ABA 4: E-MAIL & COPILOTO IA PESSOAL                       */}
              {/* ========================================================= */}
              {activeTab === 'email_ai' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <h3 className="text-sm font-bold">Agente Pessoal de E-mail (Copiloto IA Operacional)</h3>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        Analisa e-mails recebidos de clientes ou fornecedores (pedidos de reemplazo, prorrogações de obra, fianças de alojamento) e converte em tarefas com 1 clique.
                      </p>
                    </div>
                  </div>

                  {/* Simulador / Analisador Rápido de E-mail Recebido */}
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Analisar E-mail Recebido com IA e Roteamento Automático
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={emailInputSender}
                        onChange={e => setEmailInputSender(e.target.value)}
                        placeholder="Remetente (ex: cliente@construtora.es)"
                        className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                      <input
                        type="text"
                        value={emailInputSubject}
                        onChange={e => setEmailInputSubject(e.target.value)}
                        placeholder="Assunto do E-mail (ex: Solicitud de reemplazo / Prórroga de obra...)"
                        className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={emailInputBody}
                      onChange={e => setEmailInputBody(e.target.value)}
                      placeholder="Cole aqui o trecho do e-mail recebido para que o Agente IA identifique o setor, a prioridade e sugira a tarefa..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleAnalyzeEmailWithAI}
                        className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Processar E-mail com Copiloto IA
                      </Button>
                    </div>
                  </div>

                  {/* Lista de Ações Sugeridas pelo Agente de E-mail */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Sugestões do Agente de E-mail Prontas para Disparo ({aiDetectedActions.length})
                    </h4>
                    {aiDetectedActions.map(item => (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/60 shadow-xs flex flex-wrap items-center justify-between gap-4"
                      >
                        <div className="space-y-1 max-w-xl">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
                              🤖 {item.category}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              Setor Sugerido: {item.suggestedDeptCode}
                            </Badge>
                            <span className="text-[11px] text-slate-400">De: {item.sender}</span>
                          </div>
                          <h5 className="text-sm font-bold">{item.subject}</h5>
                          <p className="text-xs text-slate-500">{item.snippet}</p>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleConvertAiEmailToTask(item)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Converter em Tarefa no Setor {item.suggestedDeptCode}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* ABA 5: ALERTAS DA TORRE DE CONTROLE                       */}
              {/* ========================================================= */}
              {activeTab === 'notifications' && (
                <div className="space-y-3">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                      Nenhuma notificação pendente.
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3"
                      >
                        <div>
                          <div className="text-sm font-bold">{n.title}</div>
                          <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(n.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </CommandCenterContext.Provider>
  );
}
